const pool = require("../config/db");

async function generateReportData(operational_location_id, month, year) {
  const result = await pool.query(
    `SELECT
       w.id AS worker_id,
       w.staff_id,
       w.full_name,
       w.phone_number,
       w.national_id_nin,
       COUNT(att.id)::int AS days_worked,
       COALESCE(ARRAY_AGG(EXTRACT(DAY FROM att.attendance_date)::int) FILTER (WHERE att.id IS NOT NULL), '{}') AS days_present_array
     FROM assignments a
     JOIN workers w ON w.id = a.worker_id
     LEFT JOIN attendance att
       ON att.assignment_id = a.id
       AND EXTRACT(MONTH FROM att.attendance_date) = $2
       AND EXTRACT(YEAR FROM att.attendance_date) = $3
     WHERE a.operational_location_id = $1
       AND a.effective_from <= (make_date($3::int, $2::int, 1) + interval '1 month' - interval '1 day')
       AND (a.effective_to IS NULL OR a.effective_to >= make_date($3::int, $2::int, 1))
     GROUP BY w.id, w.staff_id, w.full_name, w.phone_number, w.national_id_nin, a.effective_to
     HAVING (a.effective_to IS NULL OR COUNT(att.id) > 0)
     ORDER BY w.full_name`,
    [operational_location_id, month, year],
  );
  return result.rows;
}

async function submitReport({
  operational_location_id,
  period_month,
  period_year,
  submitted_by,
}) {
  const result = await pool.query(
    `INSERT INTO report_verifications (operational_location_id, period_month, period_year, submitted_by, status)
     VALUES ($1, $2, $3, $4, 'submitted')
     RETURNING *`,
    [operational_location_id, period_month, period_year, submitted_by],
  );
  return result.rows[0];
}

async function verifyReport(id, verified_by) {
  const result = await pool.query(
    `UPDATE report_verifications
     SET status = 'verified', verified_by = $1, verified_at = now()
     WHERE id = $2 AND status = 'submitted'
     RETURNING *`,
    [verified_by, id],
  );
  return result.rows[0];
}

async function getReportStatus(operational_location_id, month, year) {
  const result = await pool.query(
    `SELECT * FROM report_verifications
     WHERE operational_location_id = $1 AND period_month = $2 AND period_year = $3`,
    [operational_location_id, month, year],
  );
  return result.rows[0];
}

async function getPendingVerifications() {
  const result = await pool.query(
    `SELECT rv.*, ol.name AS location_name
     FROM report_verifications rv
     JOIN operational_locations ol ON ol.id = rv.operational_location_id
     WHERE rv.status = 'submitted'
     ORDER BY rv.submitted_at`,
  );
  return result.rows;
}

async function getDashboardStats() {
  const workers = await pool.query("SELECT COUNT(*)::int FROM workers WHERE status = 'active'");
  const divisions = await pool.query("SELECT COUNT(*)::int FROM divisions");
  const units = await pool.query("SELECT COUNT(*)::int FROM operational_units");
  const locations = await pool.query("SELECT COUNT(*)::int FROM operational_locations");
  const pendingTransfers = await pool.query("SELECT COUNT(*)::int FROM transfers WHERE status = 'pending'");
  
  const today = new Date().toISOString().slice(0, 10);
  const attendanceToday = await pool.query("SELECT COUNT(*)::int FROM attendance WHERE attendance_date = $1", [today]);
  
  return {
    active_workers: workers.rows[0].count,
    total_divisions: divisions.rows[0].count,
    total_units: units.rows[0].count,
    total_locations: locations.rows[0].count,
    pending_transfers: pendingTransfers.rows[0].count,
    attendance_today: attendanceToday.rows[0].count
  };
}

// Division-scoped pending reports — for division_admin
async function getPendingVerificationsByDivision(divisionId) {
  const result = await pool.query(
    `SELECT rv.*, ol.name AS location_name
     FROM report_verifications rv
     JOIN operational_locations ol ON ol.id = rv.operational_location_id
     JOIN operational_units ou ON ou.id = ol.operational_unit_id
     WHERE rv.status = 'submitted'
       AND ou.division_id = $1
     ORDER BY rv.submitted_at`,
    [divisionId]
  );
  return result.rows;
}

// Division-scoped dashboard stats for division_admin
async function getDashboardStatsByDivision(divisionId) {
  const workers = await pool.query(
    `SELECT COUNT(DISTINCT w.id)::int AS count
     FROM workers w
     JOIN assignments a ON a.worker_id = w.id AND a.effective_to IS NULL
     WHERE a.division_id = $1 AND w.status = 'active'`,
    [divisionId]
  );
  const units = await pool.query(
    "SELECT COUNT(*)::int AS count FROM operational_units WHERE division_id = $1",
    [divisionId]
  );
  const locations = await pool.query(
    `SELECT COUNT(*)::int AS count FROM operational_locations ol
     JOIN operational_units ou ON ou.id = ol.operational_unit_id
     WHERE ou.division_id = $1`,
    [divisionId]
  );
  const pendingTransfers = await pool.query(
    `SELECT COUNT(*)::int AS count FROM transfers t
     JOIN assignments a ON a.id = t.from_assignment_id
     WHERE a.division_id = $1 AND t.status = 'pending'`,
    [divisionId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const attendanceToday = await pool.query(
    `SELECT COUNT(*)::int AS count FROM attendance att
     JOIN assignments a ON a.id = att.assignment_id
     WHERE a.division_id = $1 AND att.attendance_date = $2`,
    [divisionId, today]
  );
  const pendingReports = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM report_verifications rv
     JOIN operational_locations ol ON ol.id = rv.operational_location_id
     JOIN operational_units ou ON ou.id = ol.operational_unit_id
     WHERE ou.division_id = $1 AND rv.status = 'submitted'`,
    [divisionId]
  );
  return {
    active_workers:    workers.rows[0].count,
    total_divisions:   1,
    total_units:       units.rows[0].count,
    total_locations:   locations.rows[0].count,
    pending_transfers: pendingTransfers.rows[0].count,
    attendance_today:  attendanceToday.rows[0].count,
    pending_reports:   pendingReports.rows[0].count,
  };
}

// Generate report data across multiple locations (e.g. all blocks in a hostel or all hostels)
async function generateMultipleLocationsReportData(operational_location_ids, month, year) {
  if (!Array.isArray(operational_location_ids) || operational_location_ids.length === 0) {
    return [];
  }
  const result = await pool.query(
    `SELECT
       w.id AS worker_id,
       w.staff_id,
       w.full_name,
       w.phone_number,
       w.national_id_nin,
       ol.id AS location_id,
       ol.name AS location_name,
       ou.id AS unit_id,
       ou.name AS unit_name,
       COUNT(att.id)::int AS days_worked,
       COALESCE(ARRAY_AGG(EXTRACT(DAY FROM att.attendance_date)::int) FILTER (WHERE att.id IS NOT NULL), '{}') AS days_present_array
     FROM assignments a
     JOIN workers w ON w.id = a.worker_id
     JOIN operational_locations ol ON ol.id = a.operational_location_id
     JOIN operational_units ou ON ou.id = ol.operational_unit_id
     LEFT JOIN attendance att
       ON att.assignment_id = a.id
       AND EXTRACT(MONTH FROM att.attendance_date) = $2
       AND EXTRACT(YEAR FROM att.attendance_date) = $3
     WHERE a.operational_location_id = ANY($1::int[])
       AND a.effective_from <= (make_date($3::int, $2::int, 1) + interval '1 month' - interval '1 day')
       AND (a.effective_to IS NULL OR a.effective_to >= make_date($3::int, $2::int, 1))
     GROUP BY w.id, w.staff_id, w.full_name, w.phone_number, w.national_id_nin, ol.id, ol.name, ou.id, ou.name, a.effective_to
     HAVING (a.effective_to IS NULL OR COUNT(att.id) > 0)
     ORDER BY ol.name, w.full_name`,
    [operational_location_ids, month, year],
  );
  return result.rows;
}

// Master Division-Wide / All Hostels Aggregate Report
async function generateDivisionAggregateReport(division_id, month, year) {
  const params = [month, year];
  let divFilter = "";

  if (division_id) {
    params.push(division_id);
    divFilter = ` AND ou.division_id = $${params.length} `;
  }

  const query = `
    SELECT
      w.id AS worker_id,
      w.staff_id,
      w.full_name,
      w.phone_number,
      w.national_id_nin,
      ol.id AS location_id,
      ol.name AS location_name,
      ou.id AS unit_id,
      ou.name AS unit_name,
      d.id AS division_id,
      d.name AS division_name,
      COUNT(att.id)::int AS days_worked,
      COALESCE(ARRAY_AGG(EXTRACT(DAY FROM att.attendance_date)::int) FILTER (WHERE att.id IS NOT NULL), '{}') AS days_present_array,
      rv.status AS verification_status
    FROM assignments a
    JOIN workers w ON w.id = a.worker_id
    JOIN operational_locations ol ON ol.id = a.operational_location_id
    JOIN operational_units ou ON ou.id = ol.operational_unit_id
    JOIN divisions d ON d.id = ou.division_id
    LEFT JOIN attendance att
      ON att.assignment_id = a.id
      AND EXTRACT(MONTH FROM att.attendance_date) = $1
      AND EXTRACT(YEAR FROM att.attendance_date) = $2
    LEFT JOIN report_verifications rv
      ON rv.operational_location_id = ol.id
      AND rv.period_month = $1
      AND rv.period_year = $2
    WHERE 
      a.effective_from <= (make_date($2::int, $1::int, 1) + interval '1 month' - interval '1 day')
      AND (a.effective_to IS NULL OR a.effective_to >= make_date($2::int, $1::int, 1))
      ${divFilter}
    GROUP BY w.id, w.staff_id, w.full_name, w.phone_number, w.national_id_nin, ol.id, ol.name, ou.id, ou.name, d.id, d.name, rv.status, a.effective_to
    HAVING (a.effective_to IS NULL OR COUNT(att.id) > 0)
    ORDER BY d.name, ou.name, ol.name, w.full_name
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

// Batch submit reports for multiple locations
async function submitBatchReports({ operational_location_ids, period_month, period_year, submitted_by }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const submitted = [];
    for (const locId of operational_location_ids) {
      // Check existing
      const check = await client.query(
        `SELECT * FROM report_verifications
         WHERE operational_location_id = $1 AND period_month = $2 AND period_year = $3`,
        [locId, period_month, period_year]
      );
      if (check.rows.length > 0) {
        if (check.rows[0].status === "not_submitted") {
          const upd = await client.query(
            `UPDATE report_verifications
             SET status = 'submitted', submitted_by = $1, submitted_at = now()
             WHERE id = $2 RETURNING *`,
            [submitted_by, check.rows[0].id]
          );
          submitted.push(upd.rows[0]);
        }
      } else {
        const ins = await client.query(
          `INSERT INTO report_verifications (operational_location_id, period_month, period_year, submitted_by, status)
           VALUES ($1, $2, $3, $4, 'submitted')
           RETURNING *`,
          [locId, period_month, period_year, submitted_by]
        );
        submitted.push(ins.rows[0]);
      }
    }
    await client.query("COMMIT");
    return submitted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Batch verify reports
async function verifyBatchReports({ verification_ids, verified_by }) {
  const result = await pool.query(
    `UPDATE report_verifications
     SET status = 'verified', verified_by = $1, verified_at = now()
     WHERE id = ANY($2::int[]) AND status = 'submitted'
     RETURNING *`,
    [verified_by, verification_ids]
  );
  return result.rows;
}

module.exports = {
  generateReportData,
  generateMultipleLocationsReportData,
  generateDivisionAggregateReport,
  submitReport,
  submitBatchReports,
  verifyReport,
  verifyBatchReports,
  getReportStatus,
  getPendingVerifications,
  getPendingVerificationsByDivision,
  getDashboardStats,
  getDashboardStatsByDivision,
};

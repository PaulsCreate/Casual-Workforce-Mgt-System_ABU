const pool = require("../config/db");

async function logAbsence({ assignment_id, absence_date, reason, logged_by }) {
  const result = await pool.query(
    `INSERT INTO absence_logs (assignment_id, absence_date, reason, logged_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (assignment_id, absence_date)
     DO UPDATE SET reason = EXCLUDED.reason, logged_by = EXCLUDED.logged_by, created_at = now()
     RETURNING *`,
    [assignment_id, absence_date, reason.trim(), logged_by]
  );
  return result.rows[0];
}

async function getAbsenceLogsForAssignment(assignment_id) {
  const result = await pool.query(
    `SELECT al.*, u.username AS logged_by_username
     FROM absence_logs al
     JOIN users u ON u.id = al.logged_by
     WHERE al.assignment_id = $1
     ORDER BY al.absence_date DESC`,
    [assignment_id]
  );
  return result.rows;
}

// Fetch absence logs for a location on a given date — used by attendance page
async function getAbsenceLogsForLocationOnDate(location_id, date) {
  const result = await pool.query(
    `SELECT al.*, w.full_name, w.staff_id, a.id AS assignment_id
     FROM absence_logs al
     JOIN assignments a ON a.id = al.assignment_id
     JOIN workers w ON w.id = a.worker_id
     WHERE a.operational_location_id = $1 AND al.absence_date = $2`,
    [location_id, date]
  );
  return result.rows;
}

async function deleteAbsenceLog(assignment_id, absence_date) {
  const result = await pool.query(
    `DELETE FROM absence_logs WHERE assignment_id = $1 AND absence_date = $2 RETURNING *`,
    [assignment_id, absence_date]
  );
  return result.rows[0];
}

module.exports = {
  logAbsence,
  getAbsenceLogsForAssignment,
  getAbsenceLogsForLocationOnDate,
  deleteAbsenceLog,
};

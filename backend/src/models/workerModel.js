const pool = require("../config/db");

async function createWorker({
  staff_id,
  full_name,
  phone_number,
  appointment_date,
  national_id_nin,
  next_of_kin_name,
  next_of_kin_phone,
  photo_url,
}) {
  const result = await pool.query(
    `INSERT INTO workers (
       staff_id, full_name, phone_number, appointment_date,
       national_id_nin,
       next_of_kin_name, next_of_kin_phone, photo_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      staff_id,
      full_name,
      phone_number || null,
      appointment_date,
      national_id_nin || null,
      next_of_kin_name || null,
      next_of_kin_phone || null,
      photo_url || null,
    ],
  );
  return result.rows[0];
}

async function getAllWorkers(division_id) {
  if (division_id) {
    const result = await pool.query(
      `SELECT 
         w.*,
         d.name AS division_name,
         ou.name AS unit_name,
         ol.name AS location_name,
         a.id AS active_assignment_id,
         a.division_id,
         a.operational_unit_id,
         a.operational_location_id
       FROM workers w
       JOIN assignments a ON a.worker_id = w.id AND a.effective_to IS NULL
       LEFT JOIN divisions d ON d.id = a.division_id
       LEFT JOIN operational_units ou ON ou.id = a.operational_unit_id
       LEFT JOIN operational_locations ol ON ol.id = a.operational_location_id
       WHERE a.division_id = $1
       ORDER BY w.full_name`,
      [division_id],
    );
    return result.rows;
  }
  const result = await pool.query(
    `SELECT 
       w.*,
       d.name AS division_name,
       ou.name AS unit_name,
       ol.name AS location_name,
       a.id AS active_assignment_id,
       a.division_id,
       a.operational_unit_id,
       a.operational_location_id
     FROM workers w
     LEFT JOIN assignments a ON a.worker_id = w.id AND a.effective_to IS NULL
     LEFT JOIN divisions d ON d.id = a.division_id
     LEFT JOIN operational_units ou ON ou.id = a.operational_unit_id
     LEFT JOIN operational_locations ol ON ol.id = a.operational_location_id
     ORDER BY w.full_name`,
  );
  return result.rows;
}

async function getWorkerById(id) {
  const result = await pool.query(
    `SELECT 
       w.*,
       d.name AS division_name,
       ou.name AS unit_name,
       ol.name AS location_name,
       a.id AS active_assignment_id,
       a.division_id,
       a.operational_unit_id,
       a.operational_location_id
     FROM workers w
     LEFT JOIN assignments a ON a.worker_id = w.id AND a.effective_to IS NULL
     LEFT JOIN divisions d ON d.id = a.division_id
     LEFT JOIN operational_units ou ON ou.id = a.operational_unit_id
     LEFT JOIN operational_locations ol ON ol.id = a.operational_location_id
     WHERE w.id = $1`,
    [id],
  );
  return result.rows[0];
}

async function getWorkerDossier(id) {
  const worker = await getWorkerById(id);
  if (!worker) return null;

  // Assignment history (past & present deployments)
  const historyRes = await pool.query(
    `SELECT 
       a.*,
       d.name AS division_name,
       ou.name AS unit_name,
       ol.name AS location_name
     FROM assignments a
     LEFT JOIN divisions d ON d.id = a.division_id
     LEFT JOIN operational_units ou ON ou.id = a.operational_unit_id
     LEFT JOIN operational_locations ol ON ol.id = a.operational_location_id
     WHERE a.worker_id = $1
     ORDER BY a.effective_from DESC, a.created_at DESC`,
    [id],
  );

  // Lifetime attendance statistics
  const attRes = await pool.query(
    `SELECT 
       COUNT(att.id) AS total_present,
       COUNT(DISTINCT TO_CHAR(att.attendance_date, 'YYYY-MM')) AS total_months_active
     FROM attendance att
     JOIN assignments a ON a.id = att.assignment_id
     WHERE a.worker_id = $1`,
    [id],
  );

  const stats = attRes.rows[0] || { total_present: 0, total_months_active: 0 };

  return {
    worker,
    assignments: historyRes.rows,
    attendance_stats: {
      total_present: Number(stats.total_present) || 0,
      total_recorded_days: Number(stats.total_present) || 0,
      total_months_active: Number(stats.total_months_active) || 0,
    },
  };
}

async function updateWorker(
  id,
  {
    full_name,
    phone_number,
    status,
    national_id_nin,
    next_of_kin_name,
    next_of_kin_phone,
  },
) {
  const result = await pool.query(
    `UPDATE workers 
     SET full_name = $1, 
         phone_number = $2, 
         status = $3,
         national_id_nin = $4,
         next_of_kin_name = $5,
         next_of_kin_phone = $6
     WHERE id = $7 
     RETURNING *`,
    [
      full_name,
      phone_number || null,
      status,
      national_id_nin || null,
      next_of_kin_name || null,
      next_of_kin_phone || null,
      id,
    ],
  );
  return result.rows[0];
}

async function updateWorkerPhoto(id, photo_url) {
  const result = await pool.query(
    `UPDATE workers SET photo_url = $1 WHERE id = $2 RETURNING *`,
    [photo_url, id],
  );
  return result.rows[0];
}

// Bulk create workers and their initial station deployments in a transaction
async function createBatchWorkers(workersList) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const createdWorkers = [];

    for (const w of workersList) {
      const wRes = await client.query(
        `INSERT INTO workers (
           staff_id, full_name, phone_number, appointment_date,
           national_id_nin,
           next_of_kin_name, next_of_kin_phone
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          w.staff_id,
          w.full_name,
          w.phone_number || null,
          w.appointment_date || new Date().toISOString().split("T")[0],
          w.national_id_nin || null,
          w.next_of_kin_name || null,
          w.next_of_kin_phone || null,
        ],
      );
      const newWorker = wRes.rows[0];

      // Auto-assign location if location_id is provided
      if (w.operational_location_id) {
        const locRes = await client.query(
          `SELECT ol.id AS location_id, ou.id AS unit_id, ou.division_id
           FROM operational_locations ol
           JOIN operational_units ou ON ou.id = ol.operational_unit_id
           WHERE ol.id = $1`,
          [w.operational_location_id],
        );

        if (locRes.rows.length > 0) {
          const loc = locRes.rows[0];
          await client.query(
            `INSERT INTO assignments (worker_id, division_id, operational_unit_id, operational_location_id, effective_from)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newWorker.id,
              loc.division_id,
              loc.unit_id,
              loc.location_id,
              w.appointment_date || new Date().toISOString().split("T")[0],
            ],
          );
        }
      }

      createdWorkers.push(newWorker);
    }

    await client.query("COMMIT");
    return createdWorkers;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createWorker,
  getAllWorkers,
  getWorkerById,
  getWorkerDossier,
  updateWorker,
  updateWorkerPhoto,
  createBatchWorkers,
};

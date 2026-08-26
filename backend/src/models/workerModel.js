const pool = require("../config/db");

async function createWorker({
  staff_id,
  full_name,
  phone_number,
  appointment_date,
}) {
  const result = await pool.query(
    `INSERT INTO workers (staff_id, full_name, phone_number, appointment_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [staff_id, full_name, phone_number || null, appointment_date],
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
      [division_id]
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
     ORDER BY w.full_name`
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
    [id]
  );
  return result.rows[0];
}

async function updateWorker(id, { full_name, phone_number, status }) {
  const result = await pool.query(
    `UPDATE workers SET full_name = $1, phone_number = $2, status = $3 WHERE id = $4 RETURNING *`,
    [full_name, phone_number || null, status, id],
  );
  return result.rows[0];
}

module.exports = { createWorker, getAllWorkers, getWorkerById, updateWorker };

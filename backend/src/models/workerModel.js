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

async function getAllWorkers() {
  const result = await pool.query("SELECT * FROM workers ORDER BY full_name");
  return result.rows;
}

async function getWorkerById(id) {
  const result = await pool.query("SELECT * FROM workers WHERE id = $1", [id]);
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

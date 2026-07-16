const pool = require("../config/db");

async function getActiveAssignmentForWorker(worker_id) {
  const result = await pool.query(
    `SELECT * FROM assignments WHERE worker_id = $1 AND effective_to IS NULL`,
    [worker_id],
  );
  return result.rows[0];
}

async function getAssignmentHistoryForWorker(worker_id) {
  const result = await pool.query(
    `SELECT * FROM assignments WHERE worker_id = $1 ORDER BY effective_from DESC`,
    [worker_id],
  );
  return result.rows;
}

async function createInitialAssignment({
  worker_id,
  division_id,
  operational_unit_id,
  operational_location_id,
  supervisor_id,
  effective_from,
}) {
  const result = await pool.query(
    `INSERT INTO assignments (worker_id, division_id, operational_unit_id, operational_location_id, supervisor_id, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      worker_id,
      division_id,
      operational_unit_id,
      operational_location_id,
      supervisor_id,
      effective_from,
    ],
  );
  return result.rows[0];
}

// Closes the current assignment and opens a new one, atomically, as part of a transfer.
async function executeTransfer({
  current_assignment_id,
  worker_id,
  to_division_id,
  to_operational_unit_id,
  to_operational_location_id,
  supervisor_id,
  effective_date,
  transfer_id,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE assignments SET effective_to = $1 WHERE id = $2`,
      [effective_date, current_assignment_id],
    );

    const newAssignment = await client.query(
      `INSERT INTO assignments (worker_id, division_id, operational_unit_id, operational_location_id, supervisor_id, effective_from, transfer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        worker_id,
        to_division_id,
        to_operational_unit_id,
        to_operational_location_id,
        supervisor_id,
        effective_date,
        transfer_id,
      ],
    );

    await client.query("COMMIT");
    return newAssignment.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getActiveAssignmentForWorker,
  getAssignmentHistoryForWorker,
  createInitialAssignment,
  executeTransfer,
};

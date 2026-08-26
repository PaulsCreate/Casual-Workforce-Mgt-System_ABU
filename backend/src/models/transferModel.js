const pool = require("../config/db");
const { executeTransfer } = require("./assignmentModel");

async function createTransfer({
  worker_id,
  from_assignment_id,
  to_division_id,
  to_operational_unit_id,
  to_operational_location_id,
  transfer_type,
  reason,
  requested_by,
}) {
  const result = await pool.query(
    `INSERT INTO transfers (worker_id, from_assignment_id, to_division_id, to_operational_unit_id, to_operational_location_id, transfer_type, reason, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      worker_id,
      from_assignment_id,
      to_division_id,
      to_operational_unit_id,
      to_operational_location_id,
      transfer_type,
      reason || null,
      requested_by,
    ],
  );
  return result.rows[0];
}

async function completeTransfer({
  transfer_id,
  worker_id,
  current_assignment_id,
  to_division_id,
  to_operational_unit_id,
  to_operational_location_id,
  effective_date,
  authorized_by,
  transfer_letter_reference,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE assignments SET effective_to = $1 WHERE id = $2`,
      [effective_date, current_assignment_id],
    );

    const newAssignment = await client.query(
      `INSERT INTO assignments (worker_id, division_id, operational_unit_id, operational_location_id, effective_from, transfer_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        worker_id,
        to_division_id,
        to_operational_unit_id,
        to_operational_location_id,
        effective_date,
        transfer_id,
      ],
    );

    const updatedTransfer = await client.query(
      `UPDATE transfers
       SET status = 'completed', authorized_by = $1, transfer_letter_reference = $2, decided_at = now()
       WHERE id = $3
       RETURNING *`,
      [authorized_by || null, transfer_letter_reference || null, transfer_id],
    );

    await client.query("COMMIT");
    return {
      transfer: updatedTransfer.rows[0],
      assignment: newAssignment.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function rejectTransfer(transfer_id) {
  const result = await pool.query(
    `UPDATE transfers SET status = 'rejected', decided_at = now() WHERE id = $1 AND status = 'pending' RETURNING *`,
    [transfer_id],
  );
  return result.rows[0];
}

async function getTransferById(id) {
  const result = await pool.query("SELECT * FROM transfers WHERE id = $1", [
    id,
  ]);
  return result.rows[0];
}

async function getTransfersForWorker(worker_id) {
  const result = await pool.query(
    "SELECT * FROM transfers WHERE worker_id = $1 ORDER BY requested_at DESC",
    [worker_id],
  );
  return result.rows;
}

async function getTransfersByStatus(status, divisionId) {
  if (divisionId) {
    const result = await pool.query(
      "SELECT * FROM transfers WHERE status = $1 AND to_division_id = $2 ORDER BY requested_at",
      [status, divisionId],
    );
    return result.rows;
  }
  const result = await pool.query(
    "SELECT * FROM transfers WHERE status = $1 ORDER BY requested_at",
    [status],
  );
  return result.rows;
}

module.exports = {
  createTransfer,
  completeTransfer,
  rejectTransfer,
  getTransferById,
  getTransfersForWorker,
  getTransfersByStatus,
};

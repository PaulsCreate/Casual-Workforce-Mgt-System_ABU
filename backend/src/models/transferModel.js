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
  let query = `
    SELECT 
      t.*,
      w.full_name AS worker_name,
      w.staff_id,
      from_d.name AS from_division_name,
      to_d.name AS to_division_name,
      from_ou.name AS from_unit_name,
      to_ou.name AS to_unit_name,
      from_ol.name AS from_location_name,
      to_ol.name AS to_location_name,
      u.username AS requested_by_username
    FROM transfers t
    JOIN workers w ON w.id = t.worker_id
    JOIN assignments from_a ON from_a.id = t.from_assignment_id
    JOIN divisions from_d ON from_d.id = from_a.division_id
    JOIN operational_units from_ou ON from_ou.id = from_a.operational_unit_id
    JOIN operational_locations from_ol ON from_ol.id = from_a.operational_location_id
    JOIN divisions to_d ON to_d.id = t.to_division_id
    JOIN operational_units to_ou ON to_ou.id = t.to_operational_unit_id
    JOIN operational_locations to_ol ON to_ol.id = t.to_operational_location_id
    LEFT JOIN users u ON u.id = t.requested_by
    WHERE t.status = $1
  `;
  const params = [status];

  if (divisionId) {
    params.push(divisionId);
    query += ` AND (t.to_division_id = $${params.length} OR from_a.division_id = $${params.length})`;
  }

  query += ` ORDER BY t.requested_at DESC`;

  const result = await pool.query(query, params);
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

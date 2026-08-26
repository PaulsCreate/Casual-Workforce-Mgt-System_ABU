const pool = require("../config/db");

async function logAction({ user_id, action, entity_type, entity_id, details }) {
  const result = await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      user_id || null,
      action,
      entity_type,
      entity_id || null,
      details ? JSON.stringify(details) : null,
    ]
  );
  return result.rows[0];
}

async function getAuditLogs() {
  const result = await pool.query(
    `SELECT al.*, u.full_name as user_full_name, u.username as user_username
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 100`
  );
  return result.rows;
}

module.exports = { logAction, getAuditLogs };

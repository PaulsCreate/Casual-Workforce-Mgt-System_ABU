const pool = require("../config/db");

async function findByUsername(username) {
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return result.rows[0];
}

async function findById(id) {
  const result = await pool.query(
    "SELECT id, full_name, username, email, role, division_id, is_active, created_at FROM users WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

async function createUser({
  full_name,
  username,
  email,
  password_hash,
  role,
  division_id,
}) {
  const result = await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, role, division_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, username, email, role, division_id, is_active, created_at`,
    [
      full_name,
      username,
      email || null,
      password_hash,
      role,
      division_id || null,
    ],
  );
  return result.rows[0];
}

async function getAllUsers(role) {
  let query = "SELECT id, full_name, username, email, role, division_id, is_active, created_at FROM users";
  const params = [];
  if (role) {
    query += " WHERE role = $1";
    params.push(role);
  }
  query += " ORDER BY full_name";
  const result = await pool.query(query, params);
  return result.rows;
}

// Returns supervisors (and optionally all users) scoped to a specific division
async function getUsersByDivision(divisionId, role) {
  let query =
    "SELECT id, full_name, username, email, role, division_id, is_active, created_at FROM users WHERE division_id = $1";
  const params = [divisionId];
  if (role) {
    query += " AND role = $2";
    params.push(role);
  }
  query += " ORDER BY full_name";
  const result = await pool.query(query, params);
  return result.rows;
}

// Soft-deactivate a user (division_admin can only deactivate supervisors in their division)
async function deactivateUser(id) {
  const result = await pool.query(
    `UPDATE users SET is_active = false WHERE id = $1
     RETURNING id, full_name, username, role, division_id, is_active`,
    [id]
  );
  return result.rows[0];
}

// Reactivate a previously deactivated user
async function reactivateUser(id) {
  const result = await pool.query(
    `UPDATE users SET is_active = true WHERE id = $1
     RETURNING id, full_name, username, role, division_id, is_active`,
    [id]
  );
  return result.rows[0];
}

module.exports = { findByUsername, findById, createUser, getAllUsers, getUsersByDivision, deactivateUser, reactivateUser };

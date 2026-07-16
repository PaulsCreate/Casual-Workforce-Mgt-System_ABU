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

module.exports = { findByUsername, findById, createUser };

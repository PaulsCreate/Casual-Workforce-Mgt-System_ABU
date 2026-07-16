const pool = require("../config/db");

async function createDivision({ name, description }) {
  const result = await pool.query(
    `INSERT INTO divisions (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [name, description || null],
  );
  return result.rows[0];
}

async function getAllDivisions() {
  const result = await pool.query("SELECT * FROM divisions ORDER BY name");
  return result.rows;
}

async function getDivisionById(id) {
  const result = await pool.query("SELECT * FROM divisions WHERE id = $1", [
    id,
  ]);
  return result.rows[0];
}

async function updateDivision(id, { name, description }) {
  const result = await pool.query(
    `UPDATE divisions SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
    [name, description || null, id],
  );
  return result.rows[0];
}

async function deleteDivision(id) {
  const result = await pool.query(
    "DELETE FROM divisions WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
}

module.exports = {
  createDivision,
  getAllDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision,
};

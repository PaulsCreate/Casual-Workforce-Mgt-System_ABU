const pool = require("../config/db");

async function createOperationalUnit({ division_id, name, description }) {
  const result = await pool.query(
    `INSERT INTO operational_units (division_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [division_id, name, description || null],
  );
  return result.rows[0];
}

async function getAllOperationalUnits(division_id) {
  if (division_id) {
    const result = await pool.query(
      "SELECT * FROM operational_units WHERE division_id = $1 ORDER BY name",
      [division_id],
    );
    return result.rows;
  }
  const result = await pool.query(
    "SELECT * FROM operational_units ORDER BY division_id, name",
  );
  return result.rows;
}

async function getOperationalUnitById(id) {
  const result = await pool.query(
    "SELECT * FROM operational_units WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

async function getOperationalUnitWithDivisionById(id) {
  const result = await pool.query(
    `SELECT ou.*, d.name AS division_name
     FROM operational_units ou
     JOIN divisions d ON d.id = ou.division_id
     WHERE ou.id = $1`,
    [id],
  );
  return result.rows[0];
}

async function updateOperationalUnit(id, { name, description }) {
  const result = await pool.query(
    `UPDATE operational_units SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
    [name, description || null, id],
  );
  return result.rows[0];
}

async function deleteOperationalUnit(id) {
  const result = await pool.query(
    "DELETE FROM operational_units WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
}

module.exports = {
  createOperationalUnit,
  getAllOperationalUnits,
  getOperationalUnitById,
  getOperationalUnitWithDivisionById,
  updateOperationalUnit,
  deleteOperationalUnit,
};

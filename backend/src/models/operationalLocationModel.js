const pool = require("../config/db");

async function createOperationalLocation({
  operational_unit_id,
  name,
  description,
}) {
  const result = await pool.query(
    `INSERT INTO operational_locations (operational_unit_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [operational_unit_id, name, description || null],
  );
  return result.rows[0];
}

async function getAllOperationalLocations(operational_unit_id) {
  if (operational_unit_id) {
    const result = await pool.query(
      "SELECT * FROM operational_locations WHERE operational_unit_id = $1 ORDER BY name",
      [operational_unit_id],
    );
    return result.rows;
  }
  const result = await pool.query(
    "SELECT * FROM operational_locations ORDER BY operational_unit_id, name",
  );
  return result.rows;
}

async function getOperationalLocationById(id) {
  const result = await pool.query(
    "SELECT * FROM operational_locations WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

async function updateOperationalLocation(id, { name, description }) {
  const result = await pool.query(
    `UPDATE operational_locations SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
    [name, description || null, id],
  );
  return result.rows[0];
}

async function deleteOperationalLocation(id) {
  const result = await pool.query(
    "DELETE FROM operational_locations WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
}

module.exports = {
  createOperationalLocation,
  getAllOperationalLocations,
  getOperationalLocationById,
  updateOperationalLocation,
  deleteOperationalLocation,
};

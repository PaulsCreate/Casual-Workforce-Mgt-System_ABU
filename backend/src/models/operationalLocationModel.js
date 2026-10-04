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

async function getOrCreateUnitWideLocation(operational_unit_id) {
  const result = await pool.query(
    `INSERT INTO operational_locations (operational_unit_id, name, description)
     VALUES ($1, 'Unit-wide (no specific location)', 'Internal assignment location for units without a specific worksite')
     ON CONFLICT (operational_unit_id, name)
     DO UPDATE SET description = EXCLUDED.description
     RETURNING *`,
    [operational_unit_id],
  );
  return result.rows[0];
}

async function getAllOperationalLocations(operational_unit_id, division_id) {
  if (operational_unit_id) {
    let query = `
      SELECT ol.* FROM operational_locations ol
      JOIN operational_units ou ON ou.id = ol.operational_unit_id
      WHERE ol.operational_unit_id = $1
    `;
    const params = [operational_unit_id];
    if (division_id) {
      query += " AND ou.division_id = $2";
      params.push(division_id);
    }
    query += " ORDER BY ol.name";
    const result = await pool.query(query, params);
    return result.rows;
  }
  if (division_id) {
    const result = await pool.query(
      `SELECT ol.* FROM operational_locations ol
       JOIN operational_units ou ON ou.id = ol.operational_unit_id
       WHERE ou.division_id = $1
       ORDER BY ol.operational_unit_id, ol.name`,
      [division_id]
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
  getOrCreateUnitWideLocation,
  getAllOperationalLocations,
  getOperationalLocationById,
  updateOperationalLocation,
  deleteOperationalLocation,
};

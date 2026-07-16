const pool = require("../config/db");

async function addSupervisor(location_id, user_id) {
  const result = await pool.query(
    `INSERT INTO location_supervisors (location_id, user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [location_id, user_id],
  );
  return result.rows[0];
}

async function removeSupervisor(location_id, user_id) {
  const result = await pool.query(
    `DELETE FROM location_supervisors WHERE location_id = $1 AND user_id = $2 RETURNING *`,
    [location_id, user_id],
  );
  return result.rows[0];
}

async function getSupervisorsForLocation(location_id) {
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.is_active
     FROM location_supervisors ls
     JOIN users u ON u.id = ls.user_id
     WHERE ls.location_id = $1
     ORDER BY u.full_name`,
    [location_id],
  );
  return result.rows;
}

async function getLocationsForSupervisor(user_id) {
  const result = await pool.query(
    `SELECT ol.id, ol.name, ol.operational_unit_id
     FROM location_supervisors ls
     JOIN operational_locations ol ON ol.id = ls.location_id
     WHERE ls.user_id = $1
     ORDER BY ol.name`,
    [user_id],
  );
  return result.rows;
}

module.exports = {
  addSupervisor,
  removeSupervisor,
  getSupervisorsForLocation,
  getLocationsForSupervisor,
};

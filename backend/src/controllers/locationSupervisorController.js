const pool = require("../config/db");
const {
  addSupervisor,
  removeSupervisor,
  getSupervisorsForLocation,
  getLocationsForSupervisor,
} = require("../models/locationSupervisorModel");

async function assign(req, res) {
  try {
    const { location_id, user_id, apply_to_hostel } = req.body;
    if (!location_id || !user_id) {
      return res
        .status(400)
        .json({ error: "location_id and user_id are required" });
    }

    const userCheck = await pool.query("SELECT role, division_id FROM users WHERE id = $1", [
      user_id,
    ]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: "That user does not exist" });
    }
    if (userCheck.rows[0].role !== "supervisor") {
      return res
        .status(400)
        .json({
          error:
            "Only users with the supervisor role can be assigned to a location",
        });
    }

    const targetLocRes = await pool.query(
      `SELECT ol.id, ol.name, ol.operational_unit_id, ou.division_id 
       FROM operational_locations ol
       JOIN operational_units ou ON ou.id = ol.operational_unit_id
       WHERE ol.id = $1`,
      [location_id]
    );

    if (targetLocRes.rows.length === 0) {
      return res.status(404).json({ error: "That location does not exist" });
    }

    const targetLoc = targetLocRes.rows[0];

    if (req.user.role === "division_admin") {
      if (Number(targetLoc.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied. Location is not in your division." });
      }
      if (Number(userCheck.rows[0].division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied. Supervisor is not in your division." });
      }
    }

    // If apply_to_hostel is true and location name has " — " prefix (e.g. "Ramat Hall — Block A")
    if (apply_to_hostel && targetLoc.name.includes(" — ")) {
      const hostelPrefix = targetLoc.name.split(" — ")[0].trim();
      const matchingLocs = await pool.query(
        `SELECT id FROM operational_locations 
         WHERE operational_unit_id = $1 AND name LIKE $2`,
        [targetLoc.operational_unit_id, `${hostelPrefix} — %`]
      );

      for (const loc of matchingLocs.rows) {
        await pool.query(
          `INSERT INTO location_supervisors (location_id, user_id) 
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [loc.id, user_id]
        );
      }

      return res.status(201).json({ 
        message: `Supervisor assigned to all ${matchingLocs.rows.length} blocks in ${hostelPrefix}`,
        count: matchingLocs.rows.length 
      });
    }

    const link = await addSupervisor(location_id, user_id);
    res.status(201).json(link);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          error: "That supervisor is already assigned to this location",
        });
    }
    if (err.code === "23503") {
      return res.status(400).json({ error: "That location does not exist" });
    }
    console.error("Assign supervisor error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong assigning the supervisor" });
  }
}

async function unassign(req, res) {
  try {
    const { location_id, user_id, apply_to_hostel } = req.body;
    const targetLocRes = await pool.query(
      `SELECT ol.id, ol.name, ol.operational_unit_id, ou.division_id 
       FROM operational_locations ol
       JOIN operational_units ou ON ou.id = ol.operational_unit_id
       WHERE ol.id = $1`,
      [location_id]
    );

    if (targetLocRes.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    const targetLoc = targetLocRes.rows[0];

    if (req.user.role === "division_admin") {
      if (Number(targetLoc.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied. Location is not in your division." });
      }
    }

    if (apply_to_hostel && targetLoc.name.includes(" — ")) {
      const hostelPrefix = targetLoc.name.split(" — ")[0].trim();
      await pool.query(
        `DELETE FROM location_supervisors 
         WHERE user_id = $1 AND location_id IN (
           SELECT id FROM operational_locations 
           WHERE operational_unit_id = $2 AND name LIKE $3
         )`,
        [user_id, targetLoc.operational_unit_id, `${hostelPrefix} — %`]
      );
      return res.json({ message: `Supervisor removed from all blocks in ${hostelPrefix}` });
    }

    const link = await removeSupervisor(location_id, user_id);
    if (!link) {
      return res
        .status(404)
        .json({ error: "That supervisor is not assigned to this location" });
    }
    res.json({ message: "Supervisor removed from location", link });
  } catch (err) {
    console.error("Unassign supervisor error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong removing the supervisor" });
  }
}

async function listForLocation(req, res) {
  try {
    if (req.user.role === "division_admin") {
      const location = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [req.params.locationId, req.user.division_id]
      );
      if (location.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const supervisors = await getSupervisorsForLocation(req.params.locationId);
    res.json(supervisors);
  } catch (err) {
    console.error("List supervisors error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching supervisors" });
  }
}

async function listForSupervisor(req, res) {
  try {
    if (req.user.role === "division_admin") {
      const u = await pool.query("SELECT division_id FROM users WHERE id = $1", [req.params.userId]);
      if (u.rows.length === 0 || Number(u.rows[0].division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const locations = await getLocationsForSupervisor(req.params.userId);
    res.json(locations);
  } catch (err) {
    console.error("List locations error:", err);
    res.status(500).json({ error: "Something went wrong fetching locations" });
  }
}

module.exports = { assign, unassign, listForLocation, listForSupervisor };

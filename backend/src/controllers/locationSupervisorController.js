const pool = require("../config/db");
const {
  addSupervisor,
  removeSupervisor,
  getSupervisorsForLocation,
  getLocationsForSupervisor,
} = require("../models/locationSupervisorModel");

async function assign(req, res) {
  try {
    const { location_id, user_id } = req.body;
    if (!location_id || !user_id) {
      return res
        .status(400)
        .json({ error: "location_id and user_id are required" });
    }

    const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [
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
    const { location_id, user_id } = req.body;
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
    const locations = await getLocationsForSupervisor(req.params.userId);
    res.json(locations);
  } catch (err) {
    console.error("List locations error:", err);
    res.status(500).json({ error: "Something went wrong fetching locations" });
  }
}

module.exports = { assign, unassign, listForLocation, listForSupervisor };

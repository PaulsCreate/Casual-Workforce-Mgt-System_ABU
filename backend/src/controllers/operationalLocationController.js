const {
  createOperationalLocation,
  getAllOperationalLocations,
  getOperationalLocationById,
  updateOperationalLocation,
  deleteOperationalLocation,
} = require("../models/operationalLocationModel");

async function create(req, res) {
  try {
    const { operational_unit_id, name, description } = req.body;
    if (!operational_unit_id || !name) {
      return res
        .status(400)
        .json({ error: "operational_unit_id and name are required" });
    }
    const location = await createOperationalLocation({
      operational_unit_id,
      name,
      description,
    });
    res.status(201).json(location);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          error:
            "That location name already exists under this operational unit",
        });
    }
    if (err.code === "23503") {
      return res
        .status(400)
        .json({ error: "That operational unit does not exist" });
    }
    console.error("Create operational location error:", err);
    res
      .status(500)
      .json({
        error: "Something went wrong creating the operational location",
      });
  }
}

async function list(req, res) {
  try {
    const locations = await getAllOperationalLocations(
      req.query.operational_unit_id,
    );
    res.json(locations);
  } catch (err) {
    console.error("List operational locations error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching operational locations" });
  }
}

async function getOne(req, res) {
  try {
    const location = await getOperationalLocationById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Operational location not found" });
    }
    res.json(location);
  } catch (err) {
    console.error("Get operational location error:", err);
    res
      .status(500)
      .json({
        error: "Something went wrong fetching the operational location",
      });
  }
}

async function update(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Location name is required" });
    }
    const location = await updateOperationalLocation(req.params.id, {
      name,
      description,
    });
    if (!location) {
      return res.status(404).json({ error: "Operational location not found" });
    }
    res.json(location);
  } catch (err) {
    console.error("Update operational location error:", err);
    res
      .status(500)
      .json({
        error: "Something went wrong updating the operational location",
      });
  }
}

async function remove(req, res) {
  try {
    const location = await deleteOperationalLocation(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Operational location not found" });
    }
    res.json({ message: "Operational location deleted", location });
  } catch (err) {
    if (err.code === "23503") {
      return res
        .status(409)
        .json({
          error:
            "Cannot delete a location that still has assignments, supervisors, or attendance tied to it",
        });
    }
    console.error("Delete operational location error:", err);
    res
      .status(500)
      .json({
        error: "Something went wrong deleting the operational location",
      });
  }
}

module.exports = { create, list, getOne, update, remove };

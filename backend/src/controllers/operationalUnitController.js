const {
  createOperationalUnit,
  getAllOperationalUnits,
  getOperationalUnitById,
  updateOperationalUnit,
  deleteOperationalUnit,
} = require("../models/operationalUnitModel");

async function create(req, res) {
  try {
    const { division_id, name, description } = req.body;
    if (!division_id || !name) {
      return res
        .status(400)
        .json({ error: "division_id and name are required" });
    }

    if (req.user.role === "division_admin" && Number(division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied. Cannot create units in another division." });
    }
    const unit = await createOperationalUnit({
      division_id,
      name,
      description,
    });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          error:
            "That operational unit name already exists under this division",
        });
    }
    if (err.code === "23503") {
      return res.status(400).json({ error: "That division does not exist" });
    }
    console.error("Create operational unit error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong creating the operational unit" });
  }
}

async function list(req, res) {
  try {
    let divisionId = req.query.division_id;
    if (req.user.role === "division_admin") {
      divisionId = req.user.division_id;
    }
    const units = await getAllOperationalUnits(divisionId);
    res.json(units);
  } catch (err) {
    console.error("List operational units error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching operational units" });
  }
}

async function getOne(req, res) {
  try {
    const unit = await getOperationalUnitById(req.params.id);
    if (!unit) {
      return res.status(404).json({ error: "Operational unit not found" });
    }
    if (req.user.role === "division_admin" && Number(unit.division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(unit);
  } catch (err) {
    console.error("Get operational unit error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching the operational unit" });
  }
}

async function update(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ error: "Operational unit name is required" });
    }
    const existing = await getOperationalUnitById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Operational unit not found" });
    }
    if (req.user.role === "division_admin" && Number(existing.division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied. Cannot modify units outside your division." });
    }

    const unit = await updateOperationalUnit(req.params.id, {
      name,
      description,
    });
    res.json(unit);
  } catch (err) {
    console.error("Update operational unit error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong updating the operational unit" });
  }
}

async function remove(req, res) {
  try {
    const existing = await getOperationalUnitById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Operational unit not found" });
    }
    if (req.user.role === "division_admin" && Number(existing.division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied. Cannot delete units outside your division." });
    }

    const unit = await deleteOperationalUnit(req.params.id);
    res.json({ message: "Operational unit deleted", unit });
  } catch (err) {
    if (err.code === "23503") {
      return res
        .status(409)
        .json({
          error:
            "Cannot delete a unit that still has operational locations under it",
        });
    }
    console.error("Delete operational unit error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong deleting the operational unit" });
  }
}

module.exports = { create, list, getOne, update, remove };

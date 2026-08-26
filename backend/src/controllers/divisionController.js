const {
  createDivision,
  getAllDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision,
} = require("../models/divisionModel");

async function create(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Division name is required" });
    }
    const division = await createDivision({ name, description });
    res.status(201).json(division);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "A division with that name already exists" });
    }
    console.error("Create division error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong creating the division" });
  }
}

async function list(req, res) {
  try {
    if (req.user.role === "division_admin") {
      const division = await getDivisionById(req.user.division_id);
      return res.json(division ? [division] : []);
    }
    const divisions = await getAllDivisions();
    res.json(divisions);
  } catch (err) {
    console.error("List divisions error:", err);
    res.status(500).json({ error: "Something went wrong fetching divisions" });
  }
}

async function getOne(req, res) {
  try {
    const division = await getDivisionById(req.params.id);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    if (req.user.role === "division_admin" && Number(division.id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(division);
  } catch (err) {
    console.error("Get division error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching the division" });
  }
}

async function update(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Division name is required" });
    }
    const division = await updateDivision(req.params.id, { name, description });
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json(division);
  } catch (err) {
    console.error("Update division error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong updating the division" });
  }
}

async function remove(req, res) {
  try {
    const division = await deleteDivision(req.params.id);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json({ message: "Division deleted", division });
  } catch (err) {
    if (err.code === "23503") {
      return res
        .status(409)
        .json({
          error:
            "Cannot delete a division that still has operational units under it",
        });
    }
    console.error("Delete division error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong deleting the division" });
  }
}

module.exports = { create, list, getOne, update, remove };

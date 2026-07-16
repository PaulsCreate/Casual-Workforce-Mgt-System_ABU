const {
  getActiveAssignmentForWorker,
  getAssignmentHistoryForWorker,
  createInitialAssignment,
  executeTransfer,
} = require("../models/assignmentModel");
const pool = require("../config/db");

async function createAssignment(req, res) {
  try {
    const {
      worker_id,
      division_id,
      operational_unit_id,
      operational_location_id,
      supervisor_id,
      effective_from,
    } = req.body;

    if (
      !worker_id ||
      !division_id ||
      !operational_unit_id ||
      !operational_location_id ||
      !supervisor_id ||
      !effective_from
    ) {
      return res
        .status(400)
        .json({
          error:
            "worker_id, division_id, operational_unit_id, operational_location_id, supervisor_id, and effective_from are all required",
        });
    }

    const existing = await getActiveAssignmentForWorker(worker_id);
    if (existing) {
      return res
        .status(409)
        .json({
          error:
            "This worker already has an active assignment. Use the transfer endpoint to reassign them.",
        });
    }

    const assignment = await createInitialAssignment({
      worker_id,
      division_id,
      operational_unit_id,
      operational_location_id,
      supervisor_id,
      effective_from,
    });
    res.status(201).json(assignment);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "This worker already has an active assignment" });
    }
    if (err.code === "23503") {
      return res
        .status(400)
        .json({
          error:
            "One of the referenced ids (worker, division, unit, location, or supervisor) does not exist",
        });
    }
    console.error("Create assignment error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong creating the assignment" });
  }
}

async function getHistory(req, res) {
  try {
    const history = await getAssignmentHistoryForWorker(req.params.workerId);
    res.json(history);
  } catch (err) {
    console.error("Get assignment history error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching assignment history" });
  }
}

async function getCurrent(req, res) {
  try {
    const assignment = await getActiveAssignmentForWorker(req.params.workerId);
    if (!assignment) {
      return res
        .status(404)
        .json({ error: "This worker has no active assignment" });
    }
    res.json(assignment);
  } catch (err) {
    console.error("Get current assignment error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching the current assignment" });
  }
}

module.exports = { createAssignment, getHistory, getCurrent };

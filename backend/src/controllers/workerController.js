const {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
} = require("../models/workerModel");
const { logAction } = require("../models/auditLogModel");
const { createInitialAssignment } = require("../models/assignmentModel");

async function create(req, res) {
  try {
    const { 
      staff_id, 
      full_name, 
      phone_number, 
      appointment_date,
      division_id,
      operational_unit_id,
      operational_location_id,
      effective_date
    } = req.body;

    if (!staff_id || !full_name || !appointment_date) {
      return res
        .status(400)
        .json({
          error: "staff_id, full_name, and appointment_date are required",
        });
    }

    if (req.user.role === "division_admin" && division_id && Number(division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied. Cannot deploy to a different division." });
    }

    const worker = await createWorker({
      staff_id,
      full_name,
      phone_number,
      appointment_date,
    });

    await logAction({
      user_id: req.user.id,
      action: "create_worker",
      entity_type: "worker",
      entity_id: worker.id,
      details: { staff_id: worker.staff_id, full_name: worker.full_name },
    });

    if (division_id && operational_unit_id && operational_location_id && effective_date) {
      await createInitialAssignment({
        worker_id: worker.id,
        division_id,
        operational_unit_id,
        operational_location_id,
        effective_from: effective_date,
      });
      // Note: in a production setting with complex rules, worker + assignment 
      // creation could be wrapped in a single database transaction. 
      // For this project, sequential execution is acceptable.
    }

    res.status(201).json(worker);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "A worker with that staff_id already exists" });
    }
    console.error("Create worker error:", err);
    res.status(500).json({ error: "Something went wrong creating the worker" });
  }
}

async function list(req, res) {
  try {
    let divisionId = null;
    if (req.user.role === "division_admin") {
      divisionId = req.user.division_id;
    }
    const workers = await getAllWorkers(divisionId);
    res.json(workers);
  } catch (err) {
    console.error("List workers error:", err);
    res.status(500).json({ error: "Something went wrong fetching workers" });
  }
}

async function getOne(req, res) {
  try {
    const worker = await getWorkerById(req.params.id);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    if (req.user.role === "division_admin" && Number(worker.division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(worker);
  } catch (err) {
    console.error("Get worker error:", err);
    res.status(500).json({ error: "Something went wrong fetching the worker" });
  }
}

async function update(req, res) {
  try {
    const { full_name, phone_number, status } = req.body;
    if (!full_name || !status) {
      return res
        .status(400)
        .json({ error: "full_name and status are required" });
    }
    const worker = await updateWorker(req.params.id, {
      full_name,
      phone_number,
      status,
    });
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    await logAction({
      user_id: req.user.id,
      action: "update_worker",
      entity_type: "worker",
      entity_id: worker.id,
      details: { full_name: worker.full_name, status: worker.status },
    });
    res.json(worker);
  } catch (err) {
    console.error("Update worker error:", err);
    res.status(500).json({ error: "Something went wrong updating the worker" });
  }
}

module.exports = { create, list, getOne, update };

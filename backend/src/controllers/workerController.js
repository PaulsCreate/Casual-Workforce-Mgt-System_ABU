const {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
} = require("../models/workerModel");

async function create(req, res) {
  try {
    const { staff_id, full_name, phone_number, appointment_date } = req.body;
    if (!staff_id || !full_name || !appointment_date) {
      return res
        .status(400)
        .json({
          error: "staff_id, full_name, and appointment_date are required",
        });
    }
    const worker = await createWorker({
      staff_id,
      full_name,
      phone_number,
      appointment_date,
    });
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
    const workers = await getAllWorkers();
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
    res.json(worker);
  } catch (err) {
    console.error("Update worker error:", err);
    res.status(500).json({ error: "Something went wrong updating the worker" });
  }
}

module.exports = { create, list, getOne, update };

const {
  createWorker,
  getAllWorkers,
  getWorkerById,
  getWorkerDossier,
  updateWorker,
  updateWorkerPhoto,
  createBatchWorkers,
} = require("../models/workerModel");
const { logAction } = require("../models/auditLogModel");
const { createInitialAssignment } = require("../models/assignmentModel");
const {
  getOrCreateUnitWideLocation,
  getOperationalLocationById,
} = require("../models/operationalLocationModel");
const {
  getOperationalUnitWithDivisionById,
} = require("../models/operationalUnitModel");
const path = require("path");
const fs = require("fs");

async function create(req, res) {
  try {
    const {
      staff_id,
      full_name,
      phone_number,
      appointment_date,
      national_id_nin,
      next_of_kin_name,
      next_of_kin_phone,
      division_id,
      operational_unit_id,
      operational_location_id,
      effective_date,
    } = req.body;

    if (!staff_id || !full_name || !appointment_date) {
      return res.status(400).json({
        error: "staff_id, full_name, and appointment_date are required",
      });
    }

    if (
      req.user.role === "division_admin" &&
      division_id &&
      Number(division_id) !== Number(req.user.division_id)
    ) {
      return res.status(403).json({
        error: "Access denied. Cannot deploy to a different division.",
      });
    }

    const hasAssignmentDetails = [
      division_id,
      operational_unit_id,
      operational_location_id,
      effective_date,
    ].some((value) => value !== undefined && value !== null && value !== "");
    let assignment = null;

    if (hasAssignmentDetails) {
      if (!division_id || !operational_unit_id || !effective_date) {
        return res.status(400).json({
          error: "division_id, operational_unit_id, and effective_date are required for deployment",
        });
      }

      const unit = await getOperationalUnitWithDivisionById(operational_unit_id);
      if (!unit || Number(unit.division_id) !== Number(division_id)) {
        return res.status(400).json({
          error: "The selected operational unit does not belong to that division",
        });
      }

      const isHealthDivision = unit.division_name.toLowerCase().includes("health");
      let locationId = operational_location_id;
      if (!locationId && !isHealthDivision) {
        return res.status(400).json({
          error: "An operational location is required for this division",
        });
      }
      if (locationId) {
        const location = await getOperationalLocationById(locationId);
        if (
          !location ||
          Number(location.operational_unit_id) !== Number(operational_unit_id)
        ) {
          return res.status(400).json({
            error: "The selected operational location does not belong to that unit",
          });
        }
      }

      assignment = {
        division_id,
        operational_unit_id,
        operational_location_id: locationId || null,
        effective_from: effective_date,
      };
    }

    const worker = await createWorker({
      staff_id,
      full_name,
      phone_number,
      appointment_date,
      national_id_nin,

      next_of_kin_name,
      next_of_kin_phone,
    });

    await logAction({
      user_id: req.user.id,
      action: "create_worker",
      entity_type: "worker",
      entity_id: worker.id,
      details: { staff_id: worker.staff_id, full_name: worker.full_name },
    });

    if (assignment) {
      if (!assignment.operational_location_id) {
        const unitWideLocation = await getOrCreateUnitWideLocation(
          assignment.operational_unit_id,
        );
        assignment.operational_location_id = unitWideLocation.id;
      }
      await createInitialAssignment({
        worker_id: worker.id,
        ...assignment,
      });
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
    if (
      req.user.role === "division_admin" &&
      Number(worker.division_id) !== Number(req.user.division_id)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(worker);
  } catch (err) {
    console.error("Get worker error:", err);
    res.status(500).json({ error: "Something went wrong fetching the worker" });
  }
}

async function dossier(req, res) {
  try {
    const data = await getWorkerDossier(req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Worker not found" });
    }
    if (
      req.user.role === "division_admin" &&
      Number(data.worker.division_id) !== Number(req.user.division_id)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(data);
  } catch (err) {
    console.error("Get worker dossier error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching worker dossier" });
  }
}

async function update(req, res) {
  try {
    const {
      full_name,
      phone_number,
      status,
      national_id_nin,
      bank_name,
      account_number,
      next_of_kin_name,
      next_of_kin_phone,
    } = req.body;

    if (!full_name || !status) {
      return res
        .status(400)
        .json({ error: "full_name and status are required" });
    }
    const worker = await updateWorker(req.params.id, {
      full_name,
      phone_number,
      status,
      national_id_nin,
      next_of_kin_name,
      next_of_kin_phone,
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

async function uploadPhoto(req, res) {
  try {
    const workerId = req.params.id;
    const worker = await getWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    let photoUrl = null;

    if (req.file) {
      // Multer upload
      photoUrl = `/uploads/worker_photos/${req.file.filename}`;
    } else if (req.body.image_data) {
      // Base64 dataURI
      const base64Data = req.body.image_data.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      const ext =
        req.body.image_data.substring(
          req.body.image_data.indexOf("/") + 1,
          req.body.image_data.indexOf(";base64"),
        ) || "png";
      const filename = `worker_${workerId}_${Date.now()}.${ext}`;
      const uploadPath = path.join(
        __dirname,
        "../../uploads/worker_photos",
        filename,
      );
      fs.writeFileSync(uploadPath, Buffer.from(base64Data, "base64"));
      photoUrl = `/uploads/worker_photos/${filename}`;
    } else {
      return res
        .status(400)
        .json({ error: "No image file or image_data provided" });
    }

    const updated = await updateWorkerPhoto(workerId, photoUrl);

    await logAction({
      user_id: req.user.id,
      action: "upload_worker_photo",
      entity_type: "worker",
      entity_id: workerId,
      details: { photo_url: photoUrl },
    });

    res.json({
      message: "Worker photo updated successfully",
      worker: updated,
      photo_url: photoUrl,
    });
  } catch (err) {
    console.error("Upload worker photo error:", err);
    res.status(500).json({ error: "Something went wrong saving worker photo" });
  }
}

async function bulkImport(req, res) {
  try {
    const { workers } = req.body;
    if (!Array.isArray(workers) || workers.length === 0) {
      return res
        .status(400)
        .json({ error: "workers array is required and must not be empty" });
    }

    const created = await createBatchWorkers(workers);

    await logAction({
      user_id: req.user.id,
      action: "bulk_import_workers",
      entity_type: "worker",
      details: {
        count: created.length,
        staff_ids: created.map((w) => w.staff_id),
      },
    });

    res.status(201).json({
      message: `Successfully registered ${created.length} worker(s)`,
      count: created.length,
      workers: created,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "One or more workers have duplicate staff IDs that already exist.",
      });
    }
    console.error("Bulk import workers error:", err);
    res.status(500).json({
      error: "Something went wrong processing bulk worker registration",
    });
  }
}

// ── Bulk Photo Upload (ZIP) ──────────────────────────────────────────────
// Accepts a ZIP file. Extracts images, matches each by staff_id found
// anywhere in the filename. Saves matched photos, returns summary.
async function bulkUploadPhotos(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "A ZIP file is required" });
    }

    const AdmZip = require("adm-zip");
    const pool = require("../config/db");
    const uploadsDir = path.join(__dirname, "../../uploads/worker_photos");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries().filter((e) => {
      if (e.isDirectory) return false;
      const name = e.name.toLowerCase();
      return name.endsWith(".jpg") || name.endsWith(".jpeg") ||
             name.endsWith(".png") || name.endsWith(".webp");
    });

    if (entries.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "No image files found in the ZIP" });
    }

    // Load all workers once
    const { rows: workers } = await pool.query("SELECT id, staff_id FROM workers");

    const matched = [];
    const unmatched = [];

    for (const entry of entries) {
      const nameWithoutExt = path.basename(entry.name, path.extname(entry.name));
      const ext = path.extname(entry.name) || ".jpg";

      // Match by staff_id appearing anywhere in the filename (case-insensitive)
      const worker = workers.find((w) =>
        nameWithoutExt.toLowerCase().includes(w.staff_id.toLowerCase())
      );

      if (worker) {
        const filename = `worker_${worker.id}_${Date.now()}${ext}`;
        const savePath = path.join(uploadsDir, filename);
        fs.writeFileSync(savePath, entry.getData());
        const photoUrl = `/uploads/worker_photos/${filename}`;
        await pool.query("UPDATE workers SET photo_url = $1 WHERE id = $2", [
          photoUrl,
          worker.id,
        ]);
        matched.push({ staff_id: worker.staff_id, filename: entry.name });
      } else {
        unmatched.push(entry.name);
      }
    }

    fs.unlinkSync(req.file.path); // clean up temp ZIP

    await logAction({
      user_id: req.user.id,
      action: "bulk_upload_photos",
      entity_type: "worker",
      details: { matched: matched.length, unmatched: unmatched.length },
    });

    res.json({
      message: `${matched.length} photo(s) matched and saved.`,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      matched,
      unmatched,
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Bulk upload photos error:", err);
    res.status(500).json({ error: "Something went wrong processing the ZIP" });
  }
}

module.exports = {
  create,
  list,
  getOne,
  dossier,
  update,
  uploadPhoto,
  bulkImport,
  bulkUploadPhotos,
};

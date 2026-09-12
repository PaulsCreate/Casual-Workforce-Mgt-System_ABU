const {
  logAbsence,
  getAbsenceLogsForAssignment,
  getAbsenceLogsForLocationOnDate,
  deleteAbsenceLog,
} = require("../models/absenceLogModel");
const { getAssignmentById } = require("../models/assignmentModel");
const { isSupervisorForAssignment } = require("../models/attendanceModel");
const { logAction } = require("../models/auditLogModel");
const pool = require("../config/db");

async function log(req, res) {
  try {
    const { assignment_id, absence_date, reason } = req.body;

    if (!assignment_id || !absence_date || !reason?.trim()) {
      return res
        .status(400)
        .json({ error: "assignment_id, absence_date, and reason are required" });
    }

    const assignment = await getAssignmentById(assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (assignment.effective_to !== null) {
      return res
        .status(400)
        .json({ error: "Cannot log absence against a closed assignment" });
    }

    if (req.user.role === "supervisor") {
      const authorized = await isSupervisorForAssignment(
        req.user.id,
        assignment_id
      );
      if (!authorized) {
        return res.status(403).json({
          error: "You do not supervise this worker's current location",
        });
      }
    } else if (req.user.role === "division_admin") {
      if (Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res
          .status(403)
          .json({ error: "Access denied. Assignment not in your division." });
      }
    }

    const record = await logAbsence({
      assignment_id,
      absence_date,
      reason,
      logged_by: req.user.id,
    });

    await logAction({
      user_id: req.user.id,
      action: "log_absence",
      entity_type: "absence_logs",
      entity_id: record.id,
      details: { assignment_id, absence_date, reason },
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("Log absence error:", err);
    res.status(500).json({ error: "Something went wrong logging absence" });
  }
}

async function forAssignment(req, res) {
  try {
    const assignment_id = req.params.assignmentId;

    if (req.user.role === "division_admin") {
      const assignment = await getAssignmentById(assignment_id);
      if (
        !assignment ||
        Number(assignment.division_id) !== Number(req.user.division_id)
      ) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const logs = await getAbsenceLogsForAssignment(assignment_id);
    res.json(logs);
  } catch (err) {
    console.error("Get absence logs error:", err);
    res.status(500).json({ error: "Something went wrong fetching absence logs" });
  }
}

async function forLocationOnDate(req, res) {
  try {
    if (req.user.role === "division_admin") {
      const check = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [req.params.locationId, req.user.division_id]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const logs = await getAbsenceLogsForLocationOnDate(
      req.params.locationId,
      req.params.date
    );
    res.json(logs);
  } catch (err) {
    console.error("Get location absence logs error:", err);
    res.status(500).json({ error: "Something went wrong fetching absence logs" });
  }
}

async function remove(req, res) {
  try {
    const { assignment_id, absence_date } = req.body;
    if (!assignment_id || !absence_date) {
      return res
        .status(400)
        .json({ error: "assignment_id and absence_date are required" });
    }

    const assignment = await getAssignmentById(assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "supervisor") {
      const authorized = await isSupervisorForAssignment(req.user.id, assignment_id);
      if (!authorized) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (req.user.role === "division_admin") {
      if (Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const removed = await deleteAbsenceLog(assignment_id, absence_date);
    if (!removed) {
      return res.status(404).json({ error: "Absence log not found" });
    }

    res.json({ message: "Absence log removed", record: removed });
  } catch (err) {
    console.error("Delete absence log error:", err);
    res.status(500).json({ error: "Something went wrong removing absence log" });
  }
}

module.exports = { log, forAssignment, forLocationOnDate, remove };

const {
  isSupervisorForAssignment,
  markAttendance,
  unmarkAttendance,
  getAttendanceForAssignment,
  countDaysWorked,
  getAttendanceForLocationOnDate,
} = require("../models/attendanceModel");
const { getAssignmentById } = require("../models/assignmentModel");
const { logAction } = require("../models/auditLogModel");
const pool = require("../config/db");

async function mark(req, res) {
  try {
    const { assignment_id, attendance_date } = req.body;

    if (!assignment_id || !attendance_date) {
      return res
        .status(400)
        .json({ error: "assignment_id and attendance_date are required" });
    }

    const assignment = await getAssignmentById(assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (assignment.effective_to !== null) {
      return res
        .status(400)
        .json({ error: "Cannot mark attendance against a closed assignment" });
    }

    // Supervisors can only mark attendance for workers at locations they
    // actually supervise. Administrators can mark attendance anywhere,
    // for correction/oversight purposes.
    if (req.user.role === "supervisor") {
      const authorized = await isSupervisorForAssignment(
        req.user.id,
        assignment_id,
      );
      if (!authorized) {
        return res
          .status(403)
          .json({
            error: "You do not supervise this worker's current location",
          });
      }
    } else if (req.user.role === "division_admin") {
      if (Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied. Assignment is not in your division." });
      }
    }

    const record = await markAttendance({
      assignment_id,
      attendance_date,
      marked_by: req.user.id,
      capture_method: "web",
    });

    await logAction({
      user_id: req.user.id,
      action: "mark_attendance",
      entity_type: "attendance",
      entity_id: record.id,
      details: { assignment_id, attendance_date },
    });

    res.status(201).json(record);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          error:
            "Attendance has already been marked for this worker on this date",
        });
    }
    console.error("Mark attendance error:", err);
    res.status(500).json({ error: "Something went wrong marking attendance" });
  }
}

async function forAssignment(req, res) {
  try {
    const { month, year } = req.query;
    if (req.user.role === "division_admin") {
      const assignment = await getAssignmentById(req.params.assignmentId);
      if (!assignment || Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const records = await getAttendanceForAssignment(
      req.params.assignmentId,
      month,
      year,
    );
    res.json(records);
  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ error: "Something went wrong fetching attendance" });
  }
}

async function summary(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ error: "month and year query params are required" });
    }
    if (req.user.role === "division_admin") {
      const assignment = await getAssignmentById(req.params.assignmentId);
      if (!assignment || Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const days_worked = await countDaysWorked(
      req.params.assignmentId,
      month,
      year,
    );
    res.json({
      assignment_id: req.params.assignmentId,
      month: Number(month),
      year: Number(year),
      days_worked,
    });
  } catch (err) {
    console.error("Attendance summary error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong calculating the summary" });
  }
}

async function forLocationOnDate(req, res) {
  try {
    if (req.user.role === "division_admin") {
      const locationCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [req.params.locationId, req.user.division_id]
      );
      if (locationCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const records = await getAttendanceForLocationOnDate(
      req.params.locationId,
      req.params.date,
    );
    res.json(records);
  } catch (err) {
    console.error("Location attendance error:", err);
    res
      .status(500)
      .json({
        error: "Something went wrong fetching attendance for this location",
      });
  }
}

async function markBatch(req, res) {
  const client = await pool.connect();
  try {
    const { assignment_ids, attendance_date } = req.body;
    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0 || !attendance_date) {
      return res.status(400).json({ error: "assignment_ids array and attendance_date are required" });
    }

    await client.query("BEGIN");
    let markedCount = 0;

    for (const assignment_id of assignment_ids) {
      const assignmentRes = await client.query(
        "SELECT * FROM assignments WHERE id = $1",
        [assignment_id]
      );
      if (assignmentRes.rows.length === 0) continue;
      const assignment = assignmentRes.rows[0];
      if (assignment.effective_to !== null) continue;

      if (req.user.role === "supervisor") {
        const supCheck = await client.query(
          "SELECT 1 FROM location_supervisors WHERE user_id = $1 AND location_id = $2",
          [req.user.id, assignment.operational_location_id]
        );
        if (supCheck.rows.length === 0) continue;
      } else if (req.user.role === "division_admin") {
        if (Number(assignment.division_id) !== Number(req.user.division_id)) continue;
      }

      await client.query(
        `INSERT INTO attendance (assignment_id, attendance_date, marked_by, capture_method)
         VALUES ($1, $2, $3, 'web')
         ON CONFLICT (assignment_id, attendance_date) DO NOTHING`,
        [assignment_id, attendance_date, req.user.id]
      );
      markedCount++;
    }

    await client.query("COMMIT");
    res.json({ message: `Successfully marked present for ${markedCount} worker(s)`, marked_count: markedCount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Mark batch attendance error:", err);
    res.status(500).json({ error: "Something went wrong marking batch attendance" });
  } finally {
    client.release();
  }
}

async function unmark(req, res) {
  try {
    const { assignment_id, attendance_date } = req.body;

    if (!assignment_id || !attendance_date) {
      return res
        .status(400)
        .json({ error: "assignment_id and attendance_date are required" });
    }

    const assignment = await getAssignmentById(assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "supervisor") {
      const authorized = await isSupervisorForAssignment(
        req.user.id,
        assignment_id,
      );
      if (!authorized) {
        return res
          .status(403)
          .json({
            error: "You do not supervise this worker's current location",
          });
      }
    } else if (req.user.role === "division_admin") {
      if (Number(assignment.division_id) !== Number(req.user.division_id)) {
        return res.status(403).json({ error: "Access denied. Assignment is not in your division." });
      }
    }

    const removed = await unmarkAttendance({ assignment_id, attendance_date });
    if (!removed) {
      return res.status(404).json({ error: "Attendance record not found for this date" });
    }

    await logAction({
      user_id: req.user.id,
      action: "unmark_attendance",
      entity_type: "attendance",
      entity_id: removed.id,
      details: { assignment_id, attendance_date },
    });

    res.json({ message: "Attendance unmarked successfully", record: removed });
  } catch (err) {
    console.error("Unmark attendance error:", err);
    res.status(500).json({ error: "Something went wrong unmarking attendance" });
  }
}

module.exports = { mark, markBatch, unmark, forAssignment, summary, forLocationOnDate };

const {
  generateReportData,
  generateMultipleLocationsReportData,
  generateDivisionAggregateReport,
  submitReport,
  submitBatchReports,
  verifyReport,
  verifyBatchReports,
  getReportStatus,
  getPendingVerifications,
  getPendingVerificationsByDivision,
  getDashboardStats,
  getDashboardStatsByDivision,
} = require("../models/reportModel");
const { logAction } = require("../models/auditLogModel");
const pool = require("../config/db");

async function generate(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ error: "month and year query params are required" });
    }

    if (req.user.role === "division_admin") {
      const locationCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [req.params.locationId, req.user.division_id]
      );
      if (locationCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Location is not in your division." });
      }
    } else if (req.user.role === "supervisor") {
      const supervisorCheck = await pool.query(
        `SELECT 1 FROM location_supervisors 
         WHERE location_id = $1 AND user_id = $2`,
        [req.params.locationId, req.user.id]
      );
      if (supervisorCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. You do not supervise this location." });
      }
    }

    const data = await generateReportData(req.params.locationId, month, year);
    const status = await getReportStatus(req.params.locationId, month, year);
    res.json({
      operational_location_id: Number(req.params.locationId),
      month: Number(month),
      year: Number(year),
      status: status ? status.status : "not_submitted",
      report_id: status ? status.id : null,
      workers: data,
    });
  } catch (err) {
    console.error("Generate report error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong generating the report" });
  }
}

// Generate report across multiple locations (Hostel / Consolidated)
async function generateMultiple(req, res) {
  try {
    const { location_ids, month, year } = req.query;
    if (!location_ids || !month || !year) {
      return res.status(400).json({ error: "location_ids, month, and year are required" });
    }

    const locIds = location_ids.split(",").map(Number).filter(Boolean);
    if (locIds.length === 0) {
      return res.status(400).json({ error: "Valid location_ids required" });
    }

    // Permission check for supervisor / division_admin
    if (req.user.role === "supervisor") {
      const supCheck = await pool.query(
        `SELECT location_id FROM location_supervisors WHERE user_id = $1 AND location_id = ANY($2::int[])`,
        [req.user.id, locIds]
      );
      const allowed = supCheck.rows.map((r) => r.location_id);
      if (allowed.length === 0) {
        return res.status(403).json({ error: "Access denied. You do not supervise these locations." });
      }
    } else if (req.user.role === "division_admin") {
      const divCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = ANY($1::int[]) AND ou.division_id = $2`,
        [locIds, req.user.division_id]
      );
      if (divCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Locations are not in your division." });
      }
    }

    const workers = await generateMultipleLocationsReportData(locIds, month, year);

    // Get statuses for each location
    const statuses = await Promise.all(
      locIds.map((lid) => getReportStatus(lid, month, year))
    );

    const isAllVerified = statuses.every((s) => s && s.status === "verified");
    const isAllSubmitted = statuses.every((s) => s && (s.status === "submitted" || s.status === "verified"));
    const isAnySubmitted = statuses.some((s) => s && s.status === "submitted");

    let aggregateStatus = "not_submitted";
    if (isAllVerified) aggregateStatus = "verified";
    else if (isAllSubmitted) aggregateStatus = "submitted";
    else if (isAnySubmitted) aggregateStatus = "submitted";

    res.json({
      location_ids: locIds,
      month: Number(month),
      year: Number(year),
      status: aggregateStatus,
      statuses: statuses.filter(Boolean),
      workers,
    });
  } catch (err) {
    console.error("Generate multiple locations report error:", err);
    res.status(500).json({ error: "Something went wrong generating multi-location report" });
  }
}

// Master Division-Wide Aggregate
async function divisionAggregate(req, res) {
  try {
    const { division_id, month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year query params are required" });
    }

    let targetDivId = division_id ? Number(division_id) : null;
    if (req.user.role === "division_admin") {
      targetDivId = req.user.division_id;
    }

    const workers = await generateDivisionAggregateReport(targetDivId, month, year);
    res.json({
      division_id: targetDivId,
      month: Number(month),
      year: Number(year),
      total_workers: workers.length,
      workers,
    });
  } catch (err) {
    console.error("Division aggregate report error:", err);
    res.status(500).json({ error: "Something went wrong generating master division report" });
  }
}

async function submit(req, res) {
  try {
    const { operational_location_id, period_month, period_year } = req.body;
    if (!operational_location_id || !period_month || !period_year) {
      return res
        .status(400)
        .json({
          error:
            "operational_location_id, period_month, and period_year are required",
        });
    }

    if (req.user.role === "division_admin") {
      const locationCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [operational_location_id, req.user.division_id]
      );
      if (locationCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Location is not in your division." });
      }
    } else if (req.user.role === "supervisor") {
      const supervisorCheck = await pool.query(
        `SELECT 1 FROM location_supervisors 
         WHERE location_id = $1 AND user_id = $2`,
        [operational_location_id, req.user.id]
      );
      if (supervisorCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. You do not supervise this location." });
      }
    }

    const report = await submitReport({
      operational_location_id,
      period_month,
      period_year,
      submitted_by: req.user.id,
    });
    res.status(201).json(report);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          error:
            "A report for this location and period has already been submitted",
        });
    }
    console.error("Submit report error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong submitting the report" });
  }
}

// Batch Submit (e.g. All blocks in a Hostel)
async function submitBatch(req, res) {
  try {
    const { operational_location_ids, period_month, period_year } = req.body;
    if (!Array.isArray(operational_location_ids) || operational_location_ids.length === 0 || !period_month || !period_year) {
      return res.status(400).json({ error: "operational_location_ids array, period_month, and period_year are required" });
    }

    if (req.user.role === "division_admin") {
      const locCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = ANY($1::int[]) AND ou.division_id = $2`,
        [operational_location_ids, req.user.division_id]
      );
      if (locCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Locations not in your division." });
      }
    } else if (req.user.role === "supervisor") {
      const supCheck = await pool.query(
        `SELECT location_id FROM location_supervisors WHERE user_id = $1 AND location_id = ANY($2::int[])`,
        [req.user.id, operational_location_ids]
      );
      if (supCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. You do not supervise these locations." });
      }
    }

    const submitted = await submitBatchReports({
      operational_location_ids,
      period_month,
      period_year,
      submitted_by: req.user.id,
    });

    await logAction({
      user_id: req.user.id,
      action: "submit_batch_reports",
      entity_type: "report",
      details: { operational_location_ids, period_month, period_year },
    });

    res.status(201).json({ message: `Successfully submitted monthly register for ${submitted.length} location(s)`, submitted });
  } catch (err) {
    console.error("Submit batch reports error:", err);
    res.status(500).json({ error: "Something went wrong submitting batch reports" });
  }
}

async function verify(req, res) {
  try {
    const reportCheck = await pool.query(
      "SELECT operational_location_id FROM report_verifications WHERE id = $1",
      [req.params.id]
    );
    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    const locId = reportCheck.rows[0].operational_location_id;

    if (req.user.role === "division_admin") {
      const locationCheck = await pool.query(
        `SELECT ol.id FROM operational_locations ol
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE ol.id = $1 AND ou.division_id = $2`,
        [locId, req.user.division_id]
      );
      if (locationCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Report location is not in your division." });
      }
    }

    const report = await verifyReport(req.params.id, req.user.id);
    if (!report) {
      return res
        .status(404)
        .json({ error: "Report not found or already verified" });
    }
    await logAction({
      user_id: req.user.id,
      action: "verify_report",
      entity_type: "report",
      entity_id: report.id,
      details: {
        operational_location_id: report.operational_location_id,
        period_month: report.period_month,
        period_year: report.period_year,
      },
    });
    res.json(report);
  } catch (err) {
    console.error("Verify report error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong verifying the report" });
  }
}

// Batch Verify (e.g. All blocks in a Hostel or all pending in a Unit)
async function verifyBatch(req, res) {
  try {
    const { verification_ids } = req.body;
    if (!Array.isArray(verification_ids) || verification_ids.length === 0) {
      return res.status(400).json({ error: "verification_ids array is required" });
    }

    if (req.user.role === "division_admin") {
      const check = await pool.query(
        `SELECT rv.id FROM report_verifications rv
         JOIN operational_locations ol ON ol.id = rv.operational_location_id
         JOIN operational_units ou ON ou.id = ol.operational_unit_id
         WHERE rv.id = ANY($1::int[]) AND ou.division_id = $2`,
        [verification_ids, req.user.division_id]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: "Access denied. Reports not in your division." });
      }
    }

    const verified = await verifyBatchReports({
      verification_ids,
      verified_by: req.user.id,
    });

    await logAction({
      user_id: req.user.id,
      action: "verify_batch_reports",
      entity_type: "report",
      details: { verification_ids },
    });

    res.json({ message: `Successfully verified ${verified.length} report(s)`, verified });
  } catch (err) {
    console.error("Verify batch reports error:", err);
    res.status(500).json({ error: "Something went wrong verifying batch reports" });
  }
}

async function pending(req, res) {
  try {
    let reports;
    if (req.user.role === "division_admin" && req.user.division_id) {
      reports = await getPendingVerificationsByDivision(req.user.division_id);
    } else {
      reports = await getPendingVerifications();
    }
    res.json(reports);
  } catch (err) {
    console.error("Pending reports error:", err);
    res.status(500).json({ error: "Something went wrong fetching pending reports" });
  }
}

async function dashboardStats(req, res) {
  try {
    let stats;
    if (req.user.role === "division_admin" && req.user.division_id) {
      stats = await getDashboardStatsByDivision(req.user.division_id);
    } else {
      stats = await getDashboardStats();
    }
    res.json(stats);
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Something went wrong fetching dashboard stats" });
  }
}

module.exports = {
  generate,
  generateMultiple,
  divisionAggregate,
  submit,
  submitBatch,
  verify,
  verifyBatch,
  pending,
  dashboardStats,
};

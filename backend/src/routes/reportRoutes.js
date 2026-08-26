const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/reportController");

router.use(authenticate);

// Generate the monthly register (single location)
router.get("/location/:locationId", controller.generate);

// Generate monthly register for multiple locations (Hostel / Consolidated)
router.get("/location-batch", controller.generateMultiple);

// Master Division-Wide Aggregate Report
router.get("/division-aggregate", authorize("administrator", "division_admin"), controller.divisionAggregate);

// Supervisor and division_admin can submit; submit controller validates ownership
router.post("/submit", authorize("administrator", "division_admin", "supervisor"), controller.submit);
router.post("/submit-batch", authorize("administrator", "division_admin", "supervisor"), controller.submitBatch);

// Dashboard stats — both admin roles see their respective scoped stats
router.get("/dashboard/stats", authorize("administrator", "division_admin"), controller.dashboardStats);

// Pending reports awaiting verification — admin and division_admin only
router.get("/pending", authorize("administrator", "division_admin"), controller.pending);

// Verify a single report — admin and division_admin only
router.post("/:id/verify", authorize("administrator", "division_admin"), controller.verify);

// Batch verify reports — admin and division_admin only
router.post("/verify-batch", authorize("administrator", "division_admin"), controller.verifyBatch);

module.exports = router;

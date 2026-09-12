const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/absenceLogController");

router.use(authenticate);

// Log or update an absence reason
router.post(
  "/",
  authorize("administrator", "supervisor", "division_admin"),
  controller.log
);
// Remove an absence log entry
router.delete(
  "/",
  authorize("administrator", "supervisor", "division_admin"),
  controller.remove
);
// Get all absence logs for an assignment (worker dossier view)
router.get("/assignment/:assignmentId", controller.forAssignment);
// Get absence logs for a location on a given date (attendance page)
router.get("/location/:locationId/date/:date", controller.forLocationOnDate);

module.exports = router;

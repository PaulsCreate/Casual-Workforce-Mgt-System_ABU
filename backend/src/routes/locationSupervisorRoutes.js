const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/locationSupervisorController");

router.use(authenticate);

router.post("/", authorize("administrator", "division_admin"), controller.assign);
router.delete("/", authorize("administrator", "division_admin"), controller.unassign);
router.get("/location/:locationId", controller.listForLocation);
router.get("/supervisor/:userId", controller.listForSupervisor);

module.exports = router;

const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/assignmentController");

router.use(authenticate);

router.post("/", authorize("administrator", "division_admin"), controller.createAssignment);
router.get("/worker/:workerId/history", controller.getHistory);
router.get("/worker/:workerId/current", controller.getCurrent);

module.exports = router;

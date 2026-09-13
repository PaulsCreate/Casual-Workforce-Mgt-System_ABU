const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/transferController");

router.use(authenticate);

// Create transfer: Both Central Administrator and Division Admin can initiate
router.post("/", authorize("administrator", "division_admin"), controller.create);

// Worker transfer history: Accessible to both admins
router.get("/worker/:workerId", authorize("administrator", "division_admin"), controller.history);

// Cross-division approval workflow: STRICTLY RESTRICTED TO CENTRAL ADMINISTRATOR
router.get("/pending", authorize("administrator"), controller.pending);
router.post("/:id/approve", authorize("administrator"), controller.approve);
router.post("/:id/reject", authorize("administrator"), controller.reject);

module.exports = router;

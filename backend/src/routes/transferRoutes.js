const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/transferController");

router.use(authenticate);
router.use(authorize("administrator"));

router.post("/", controller.create);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);
router.get("/worker/:workerId", controller.history);
router.get("/pending", controller.pending);

module.exports = router;

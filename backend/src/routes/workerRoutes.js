const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/workerController");

router.use(authenticate);

// division_admin can also create, view, and update workers in their division
router.post("/", authorize("administrator", "division_admin"), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.put("/:id", authorize("administrator", "division_admin"), controller.update);

module.exports = router;

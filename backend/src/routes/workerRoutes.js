const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/workerController");

router.use(authenticate);

router.post("/", authorize("administrator"), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.put("/:id", authorize("administrator"), controller.update);

module.exports = router;

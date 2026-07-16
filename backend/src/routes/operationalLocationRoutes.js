const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/operationalLocationController");

router.use(authenticate);

router.post("/", authorize("administrator"), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.put("/:id", authorize("administrator"), controller.update);
router.delete("/:id", authorize("administrator"), controller.remove);

module.exports = router;

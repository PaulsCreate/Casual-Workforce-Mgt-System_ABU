const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const divisionController = require("../controllers/divisionController");

router.use(authenticate);

router.post("/", authorize("administrator"), divisionController.create);
router.get("/", divisionController.list);
router.get("/:id", divisionController.getOne);
router.put("/:id", authorize("administrator"), divisionController.update);
router.delete("/:id", authorize("administrator"), divisionController.remove);

module.exports = router;

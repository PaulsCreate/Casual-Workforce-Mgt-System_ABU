const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { list, getOne, create, deactivate, reactivate } = require("../controllers/userController");

router.use(authenticate);

// Both admin and division_admin can list and view users (controller enforces division scoping)
router.get("/", list);
router.get("/:id", getOne);

// Both admin and division_admin can create users (controller enforces role restriction)
router.post("/", authorize("administrator", "division_admin"), create);

// Both admin and division_admin can deactivate/reactivate (controller enforces scoping)
router.patch("/:id/deactivate", authorize("administrator", "division_admin"), deactivate);
router.patch("/:id/reactivate", authorize("administrator", "division_admin"), reactivate);

module.exports = router;

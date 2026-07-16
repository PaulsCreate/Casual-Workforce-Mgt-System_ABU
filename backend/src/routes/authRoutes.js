const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post("/login", login);

module.exports = router;

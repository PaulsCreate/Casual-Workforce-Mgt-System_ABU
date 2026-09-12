const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { login, changePassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

// Login Rate Limiter: max 15 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many login attempts from this network. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post("/login", loginLimiter, login);

router.post("/change-password", authenticate, changePassword);

module.exports = router;

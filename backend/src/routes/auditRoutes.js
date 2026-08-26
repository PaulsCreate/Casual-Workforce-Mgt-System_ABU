const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { getAuditLogs } = require("../models/auditLogModel");

router.use(authenticate);
router.use(authorize("administrator"));

router.get("/", async (req, res) => {
  try {
    const logs = await getAuditLogs();
    res.json(logs);
  } catch (err) {
    console.error("List audit logs error:", err);
    res.status(500).json({ error: "Something went wrong fetching audit logs" });
  }
});

module.exports = router;

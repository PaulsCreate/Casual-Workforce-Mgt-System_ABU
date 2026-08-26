const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const divisionRoutes = require("./routes/divisionRoutes");
const operationalUnitRoutes = require("./routes/operationalUnitRoutes");
const operationalLocationRoutes = require("./routes/operationalLocationRoutes");
const locationSupervisorRoutes = require("./routes/locationSupervisorRoutes");
const workerRoutes = require("./routes/workerRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const transferRoutes = require("./routes/transferRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "Server Running Well.." });
});

app.use("/api/divisions", divisionRoutes);
app.use("/api/operational-units", operationalUnitRoutes);
app.use("/api/operational-locations", operationalLocationRoutes);
app.use("/api/location-supervisors", locationSupervisorRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit-logs", auditRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CSATMS backend is Running on port ${PORT}`);
});

module.exports = app;

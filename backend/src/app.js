const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const divisionRoutes = require("./routes/divisionRoutes");
const operationalUnitRoutes = require("./routes/operationalUnitRoutes");
const operationalLocationRoutes = require("./routes/operationalLocationRoutes");

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("CSATMS backend is Running on port ${PORT}");
});

module.exports = app;

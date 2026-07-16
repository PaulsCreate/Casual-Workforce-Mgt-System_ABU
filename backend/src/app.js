const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "Server Running Well.." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("CSATMS backend is Running on port ${PORT}");
});

module.exports = app;

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const studentsRoutes = require("./routes/studentsRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const goalRoutes = require("./routes/goalRoutes");
const riskRuleRoutes = require("./routes/riskRuleRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "AcadAlert API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api", meetingRoutes);
app.use("/api", goalRoutes);
app.use("/api", riskRuleRoutes);

module.exports = app;
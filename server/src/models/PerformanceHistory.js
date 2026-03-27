const mongoose = require("mongoose");

const performanceHistorySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    semester: { type: Number, required: true },
    cgpa: { type: Number, required: true },
    riskScore: { type: Number, default: 0 },
    warningLevel: { type: String, default: "Safe" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PerformanceHistory", performanceHistorySchema);

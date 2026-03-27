const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    totalRiskScore: { type: Number, required: true },
    riskStatus: { type: String, required: true },
    breakdown: [
      {
        rule: { type: String, required: true },
        description: { type: String, required: true },
        points: { type: Number, required: true },
      },
    ],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warning", warningSchema);

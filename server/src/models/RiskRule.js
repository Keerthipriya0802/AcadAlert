const mongoose = require("mongoose");

const riskRuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiskRule", riskRuleSchema);

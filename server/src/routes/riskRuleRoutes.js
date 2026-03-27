const express = require("express");
const RiskRule = require("../models/RiskRule");

const router = express.Router();

const LEGACY_PARAMETER_TO_KEY = {
  attendance: "attendanceBelow80",
  periodicalTest: "periodicalBelow25",
  standingArrear: "standingArrear",
  skillLevel: "skillLevelAtMost4",
  cgpa: "cgpaAtMost7",
  discipline: "disciplineComplaint",
  project: "projectsBelow1",
  activityPoints: "activityAtMost5000",
  rewardPoints: "rewardBelowClassAverage",
  certification: "certificationsBelow1",
  achievement: "achievementsBelow1",
  continuousPerformance: "continuousPoorPerformance",
};

const KEY_TO_LEGACY_PARAMETER = Object.fromEntries(
  Object.entries(LEGACY_PARAMETER_TO_KEY).map(([legacy, key]) => [key, legacy])
);

function normalizeRule(rule) {
  return {
    _id: rule._id,
    key: rule.key || LEGACY_PARAMETER_TO_KEY[rule.parameter] || rule.parameter || "",
    description: rule.description || rule.message || "",
    points: Number(rule.points ?? rule.riskPoints ?? 0),
  };
}

function getRuleQueryByKey(key) {
  const mappedLegacy = KEY_TO_LEGACY_PARAMETER[key];
  return {
    $or: [
      { key },
      { parameter: key },
      ...(mappedLegacy ? [{ parameter: mappedLegacy }] : []),
    ],
  };
}

router.get("/risk-rules", async (req, res) => {
  try {
    const rules = await RiskRule.find().lean();
    const normalized = rules.map(normalizeRule).sort((a, b) => a.key.localeCompare(b.key));
    return res.json(normalized);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch risk rules", error: error.message });
  }
});

router.put("/risk-rules/:key", async (req, res) => {
  try {
    const { points, description } = req.body;
    const key = req.params.key;
    const query = getRuleQueryByKey(key);

    const rule = await RiskRule.findOneAndUpdate(
      query,
      {
        $set: {
          key,
          description,
          points: Number(points),
          message: description,
          riskPoints: Number(points),
        },
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ message: "Risk rule not found" });
    }

    return res.json(rule);
  } catch (error) {
    return res.status(400).json({ message: "Failed to update risk rule", error: error.message });
  }
});

router.post("/risk-rules", async (req, res) => {
  try {
    const { key, points, description } = req.body;
    if (!key || typeof points === "undefined" || !description) {
      return res.status(400).json({ message: "key, points and description are required" });
    }

    const normalizedKey = String(key).trim();
    const existing = await RiskRule.findOne(getRuleQueryByKey(normalizedKey)).lean();
    if (existing) {
      return res.status(409).json({ message: "Risk rule key already exists" });
    }

    const created = await RiskRule.create({
      key: normalizedKey,
      points: Number(points),
      description: String(description).trim(),
    });

    return res.status(201).json(normalizeRule(created));
  } catch (error) {
    return res.status(400).json({ message: "Failed to create risk rule", error: error.message });
  }
});

router.delete("/risk-rules/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const deleted = await RiskRule.findOneAndDelete(getRuleQueryByKey(key));

    if (!deleted) {
      return res.status(404).json({ message: "Risk rule not found" });
    }

    return res.json({ message: "Risk rule deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete risk rule", error: error.message });
  }
});

module.exports = router;

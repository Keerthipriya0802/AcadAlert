const express = require("express");
const Student = require("../models/Student");
const User = require("../models/User");
const Warning = require("../models/Warning");
const Goal = require("../models/Goal");
const RiskRule = require("../models/RiskRule");
const { calculateRisk } = require("../utils/riskCalculator");

const router = express.Router();

const DEPARTMENT_ALIAS_MAP = {
  IT: "IT",
  "INFORMATION TECHNOLOGY": "IT",
  CSE: "CSE",
  "COMPUTER SCIENCE": "CSE",
  ECE: "ECE",
  "ELECTRONICS AND COMMUNICATION": "ECE",
  MECH: "MECH",
  MECHANICAL: "MECH",
  AIDS: "AIDS",
  "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE": "AIDS",
};

function normalizeDepartment(value) {
  if (!value) return "";
  const normalized = String(value).trim().toUpperCase();
  return DEPARTMENT_ALIAS_MAP[normalized] || normalized;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildStudentEmailQuery(email) {
  return {
    $expr: {
      $eq: [
        {
          $toLower: {
            $trim: {
              input: { $ifNull: ["$emailId", ""] },
            },
          },
        },
        email,
      ],
    },
  };
}

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

async function getRulePointsMap() {
  const rules = await RiskRule.find().lean();
  const map = {};
  rules.forEach((rule) => {
    const key = rule.key || LEGACY_PARAMETER_TO_KEY[rule.parameter];
    const points = Number(rule.points ?? rule.riskPoints);
    if (key && Number.isFinite(points)) {
      map[key] = points;
    }
  });
  return map;
}

function computeClassAverageReward(students) {
  const grouped = {};

  students.forEach((student) => {
    const key = `${student.department}-${student.semester}`;
    if (!grouped[key]) {
      grouped[key] = { total: 0, count: 0 };
    }
    grouped[key].total += Number(student.rewardPoints) || 0;
    grouped[key].count += 1;
  });

  const averages = {};
  Object.keys(grouped).forEach((key) => {
    averages[key] = grouped[key].count > 0 ? grouped[key].total / grouped[key].count : 0;
  });

  return averages;
}

async function enrichStudentsWithRisk(students) {
  const allStudents = await Student.find().lean();
  const classAverages = computeClassAverageReward(allStudents);
  const rulePointsMap = await getRulePointsMap();

  return students.map((student) => {
    const classKey = `${student.department}-${student.semester}`;
    const risk = calculateRisk(student, classAverages[classKey], rulePointsMap);
    return {
      ...student,
      studentEmail: student?.linkedUser?.email || student?.emailId || null,
      risk,
    };
  });
}

async function upsertWarning(student) {
  const allStudents = await Student.find().lean();
  const classAverages = computeClassAverageReward(allStudents);
  const classKey = `${student.department}-${student.semester}`;
  const rulePointsMap = await getRulePointsMap();
  const risk = calculateRisk(student, classAverages[classKey], rulePointsMap);

  await Warning.findOneAndUpdate(
    { student: student._id },
    {
      student: student._id,
      totalRiskScore: risk.totalRiskScore,
      riskStatus: risk.riskStatus,
      breakdown: risk.breakdown,
      generatedAt: new Date(),
    },
    { upsert: true, returnDocument: "after" }
  );

  return risk;
}

async function resolveAssignedStaff(staffId) {
  if (staffId === undefined) return undefined;
  if (staffId === null || staffId === "") return null;

  const staff = await User.findOne({ _id: staffId, role: "staff" }).select("_id").lean();
  if (!staff) {
    const error = new Error("Assigned staff user not found");
    error.statusCode = 400;
    throw error;
  }

  return staff._id;
}

router.get("/", async (req, res) => {
  try {
    const { role, userId, department, semester, riskLevel, search } = req.query;
    const query = {};

    if (role === "staff" && userId) {
      query.assignedStaff = userId;
    }

    if (semester !== undefined && String(semester).trim() !== "") {
      const semesterValue = Number(semester);
      if (Number.isFinite(semesterValue)) {
        query.semester = semesterValue;
      }
    }

    const students = await Student.find(query)
      .populate("linkedUser", "email")
      .populate("assignedStaff", "name email department")
      .lean();
    let enriched = await enrichStudentsWithRisk(students);

    if (department) {
      const requestedDepartment = normalizeDepartment(department);
      enriched = enriched.filter(
        (student) => normalizeDepartment(student.department) === requestedDepartment
      );
    }

    if (search) {
      const normalized = search.toLowerCase();
      enriched = enriched.filter(
        (student) =>
          student.studentName.toLowerCase().includes(normalized) ||
          student.registerNumber.toLowerCase().includes(normalized)
      );
    }

    if (riskLevel) {
      enriched = enriched.filter((student) => student.risk.riskStatus === riskLevel);
    }

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
});

router.get("/risk", async (req, res) => {
  try {
    const students = await Student.find()
      .populate("assignedStaff", "name email department")
      .lean();
    const enriched = await enrichStudentsWithRisk(students);

    const stats = {
      totalStudents: enriched.length,
      safe: enriched.filter((student) => student.risk.riskStatus === "Safe").length,
      mild: enriched.filter((student) => student.risk.riskStatus === "Mild Warning").length,
      moderate: enriched.filter((student) => student.risk.riskStatus === "Moderate Warning").length,
      severe: enriched.filter((student) => student.risk.riskStatus === "Severe Academic Warning").length,
    };

    return res.json({ stats, students: enriched });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch risk report", error: error.message });
  }
});

router.get("/student-user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("_id email role").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let student = await Student.findOne({ linkedUser: req.params.userId })
      .populate("linkedUser", "email")
      .populate("assignedStaff", "name email department")
      .lean();

    if (!student && user.email) {
        const normalizedUserEmail = normalizeEmail(user.email);
        const matchedByEmail = await Student.findOne(buildStudentEmailQuery(normalizedUserEmail))
          .select("_id linkedUser")
          .lean();

      if (matchedByEmail) {
        await Student.findByIdAndUpdate(matchedByEmail._id, { linkedUser: user._id }, { runValidators: true });
        student = await Student.findById(matchedByEmail._id)
          .populate("linkedUser", "email")
          .populate("assignedStaff", "name email department")
          .lean();
      }
    }

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const risk = await upsertWarning(student);
    return res.json({ ...student, studentEmail: student?.linkedUser?.email || student?.emailId || null, risk });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch student profile", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("linkedUser", "email")
      .populate("assignedStaff", "name email department")
      .lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const risk = await upsertWarning(student);
    return res.json({ ...student, studentEmail: student?.linkedUser?.email || student?.emailId || null, risk });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch student", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(payload, "emailId")) {
        payload.emailId = normalizeEmail(payload.emailId);
      }

    const assignedStaff = await resolveAssignedStaff(payload.assignedStaff);
    if (assignedStaff !== undefined) {
      payload.assignedStaff = assignedStaff;
    }

    const student = await Student.create(payload);
    const risk = await upsertWarning(student.toObject());
    return res.status(201).json({ ...student.toObject(), risk });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: "Failed to create student", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updatePayload, "emailId")) {
      updatePayload.emailId = normalizeEmail(updatePayload.emailId);
    }

    const assignedStaff = await resolveAssignedStaff(updatePayload.assignedStaff);
    if (assignedStaff !== undefined) {
      updatePayload.assignedStaff = assignedStaff;
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updatePayload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const risk = await upsertWarning(student);
    return res.json({ ...student, risk });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: "Failed to update student", error: error.message });
  }
});

router.put("/:id/assign-staff", async (req, res) => {
  try {
    const assignedStaff = await resolveAssignedStaff(req.body.staffId);
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { assignedStaff: assignedStaff === undefined ? null : assignedStaff },
      { returnDocument: "after", runValidators: true }
    )
      .populate("assignedStaff", "name email department")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const risk = await upsertWarning(student);
    return res.json({ ...student, risk });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: "Failed to assign staff", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Warning.deleteOne({ student: req.params.id });
    await Goal.deleteMany({ student: req.params.id });
    return res.json({ message: "Student deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete student", error: error.message });
  }
});

module.exports = router;

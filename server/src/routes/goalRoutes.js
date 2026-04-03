const express = require("express");
const Goal = require("../models/Goal");
const Student = require("../models/Student");

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

router.post("/goals", async (req, res) => {
  try {
    const { studentId, title, description, createdBy, createdByRole } = req.body;

    if (!studentId || !title || !createdBy) {
      return res.status(400).json({ message: "studentId, title, and createdBy are required" });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const goal = await Goal.create({
      student: studentId,
      title: title.trim(),
      description: (description || "").trim(),
      createdBy,
      createdByRole: createdByRole || "staff",
    });

    return res.status(201).json(goal);
  } catch (error) {
    return res.status(400).json({ message: "Failed to create goal", error: error.message });
  }
});

router.get("/goals", async (req, res) => {
  try {
    const { studentId, department, role, userId } = req.query;

    const query = {};
    if (studentId) query.student = studentId;

    const goals = await Goal.find(query)
      .populate("student", "studentName registerNumber department assignedStaff")
      .sort({ createdAt: -1 })
      .lean();
    // Staff view: goals for their assigned students or goals they created,
    // without depending on how departments are typed.
    if (role === "staff" && userId && !studentId) {
      const viewerId = String(userId);
      const staffGoals = goals.filter((goal) => {
        const assignedStaffId = goal.student?.assignedStaff;
        const assignedIdString = assignedStaffId ? String(assignedStaffId) : "";
        const createdByString = goal.createdBy ? String(goal.createdBy) : "";

        // Goals for students assigned to this staff
        if (assignedIdString === viewerId) return true;

        // Goals explicitly created by this staff
        if (createdByString === viewerId) return true;

        return false;
      });

      return res.json(staffGoals);
    }

    // Student / coordinator views: keep optional department-based filtering.
    let filtered = goals;

    if (department) {
      const effectiveDepartment = normalizeDepartment(department);
      if (effectiveDepartment) {
        filtered = filtered.filter(
          (goal) => normalizeDepartment(goal.student?.department) === effectiveDepartment
        );
      }
    }

    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch goals", error: error.message });
  }
});

router.patch("/goals/:id", async (req, res) => {
  try {
    const { isCompleted, completedBy } = req.body;
    const updatePayload = {};

    if (typeof isCompleted !== "undefined") {
      updatePayload.isCompleted = Boolean(isCompleted);
      updatePayload.completedAt = Boolean(isCompleted) ? new Date() : null;
      updatePayload.completedBy = Boolean(isCompleted) ? completedBy || null : null;
    }

    const goal = await Goal.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { returnDocument: "after", runValidators: true }
    )
      .populate("student", "studentName registerNumber department")
      .lean();

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    return res.json(goal);
  } catch (error) {
    return res.status(400).json({ message: "Failed to update goal", error: error.message });
  }
});

module.exports = router;

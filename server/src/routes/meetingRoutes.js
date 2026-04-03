const express = require("express");
const MeetingRequest = require("../models/MeetingRequest");
const Student = require("../models/Student");
const User = require("../models/User");

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

router.post("/meeting-request", async (req, res) => {
  try {
    const { studentId, requestedBy, requestType, description, createdByRole } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const meeting = await MeetingRequest.create({
      student: studentId,
      requestedBy,
      requestType,
      description,
      createdByRole,
    });

    return res.status(201).json(meeting);
  } catch (error) {
    return res.status(400).json({ message: "Failed to create meeting request", error: error.message });
  }
});

router.get("/meeting-requests", async (req, res) => {
  try {
    const { department, studentId, role, userId } = req.query;
    const findQuery = {};
    if (studentId) {
      findQuery.student = studentId;
    }

    const meetings = await MeetingRequest.find(findQuery)
      .populate("student")
      .sort({ createdAt: -1 })
      .lean();

    // Staff view: focus on meetings linked to their students or created by them,
    // independent of free-text department naming.
    if (role === "staff" && userId) {
      const viewerId = String(userId);
      const staffMeetings = meetings.filter((meeting) => {
        const assignedStaffId = meeting.student?.assignedStaff;
        const assignedIdString = assignedStaffId ? String(assignedStaffId) : "";
        const requestedByString = meeting.requestedBy ? String(meeting.requestedBy) : "";

        // Meetings for students assigned to this staff
        if (assignedIdString === viewerId) return true;

        // Meetings created by this staff (even if student later reassigned)
        if (requestedByString === viewerId) return true;

        // Optionally include unassigned students so staff can still respond
        if (!assignedStaffId) return true;

        return false;
      });

      return res.json(staffMeetings);
    }

    // Default / coordinator / student views: optional department-based filtering.
    let filtered = meetings;

    if (department) {
      const effectiveDepartment = normalizeDepartment(department);
      if (effectiveDepartment) {
        filtered = filtered.filter(
          (meeting) => normalizeDepartment(meeting.student?.department) === effectiveDepartment
        );
      }
    }

    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch meeting requests", error: error.message });
  }
});

router.put("/meeting-requests/:id", async (req, res) => {
  try {
    const { status, scheduledAt, requestType, description } = req.body;
    const updatePayload = {};
    if (typeof status !== "undefined") updatePayload.status = status;
    if (typeof scheduledAt !== "undefined") updatePayload.scheduledAt = scheduledAt;
    if (typeof requestType !== "undefined") updatePayload.requestType = requestType;
    if (typeof description !== "undefined") updatePayload.description = description;

    const meeting = await MeetingRequest.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { returnDocument: "after", runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({ message: "Meeting request not found" });
    }

    return res.json(meeting);
  } catch (error) {
    return res.status(400).json({ message: "Failed to update meeting request", error: error.message });
  }
});

module.exports = router;

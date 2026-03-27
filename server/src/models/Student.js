const mongoose = require("mongoose");

const semesterPerformanceSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true },
    cgpa: { type: Number, required: true },
    riskScore: { type: Number, default: 0 },
    warningLevel: { type: String, default: "Safe" },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    registerNumber: { type: String, required: true, unique: true },
    emailId: { type: String, default: "" },
    profileDescription: { type: String, default: "" },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    attendancePercentage: { type: Number, required: true },
    periodicalTestMarks: { type: Number, required: true },
    standingArrears: { type: Boolean, default: false },
    numberOfArrears: { type: Number, default: 0 },
    skillLevel: { type: Number, required: true },
    cgpa: { type: Number, required: true },
    disciplineComplaintsCount: { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 },
    activityPoints: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    certificationsCount: { type: Number, default: 0 },
    achievementsCount: { type: Number, default: 0 },
    pastSemesterPerformance: { type: [semesterPerformanceSchema], default: [] },
    linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);

const mongoose = require("mongoose");

const meetingRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestType: {
      type: String,
      enum: ["Advisor Meeting", "Remedial Class", "Counseling Session", "Parent Meeting"],
      required: true,
    },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Scheduled", "Completed"],
      default: "Pending",
    },
    createdByRole: {
      type: String,
      enum: ["student", "staff", "coordinator"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MeetingRequest", meetingRequestSchema);

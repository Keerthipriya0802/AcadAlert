/*
 * One-time script to delete all meeting requests created by the
 * staff user "keerthipriya0802@gmail.com".
 *
 * Usage (from project root):
 *   cd server
 *   node src/scripts/cleanupStaffMeetings.js
 */

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Student = require("../models/Student");
const MeetingRequest = require("../models/MeetingRequest");

async function run() {
  try {
    await connectDB();

    const staffEmail = "keerthipriya0802@gmail.com";
    const staffUser = await User.findOne({ email: staffEmail.toLowerCase(), role: "staff" }).select("_id");

    if (!staffUser) {
      console.log(`No staff user found for email ${staffEmail}`);
      await mongoose.disconnect();
      return;
    }

    const deletedByStaff = await MeetingRequest.deleteMany({ requestedBy: staffUser._id });

    const assignedStudents = await Student.find({ assignedStaff: staffUser._id }).select("_id");
    const assignedIds = assignedStudents.map((student) => student._id);

    let deletedForStudents = { deletedCount: 0 };
    if (assignedIds.length > 0) {
      deletedForStudents = await MeetingRequest.deleteMany({ student: { $in: assignedIds } });
    }

    console.log(
      `Deleted ${deletedByStaff.deletedCount} meeting(s) created by ${staffEmail} and ${deletedForStudents.deletedCount} meeting(s) for their assigned students.`
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exitCode = 1;
  }
}

run();

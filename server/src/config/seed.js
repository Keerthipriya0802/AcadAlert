const User = require("../models/User");
const Student = require("../models/Student");
const PerformanceHistory = require("../models/PerformanceHistory");
const RiskRule = require("../models/RiskRule");

const users = [
  {
    name: "Keerthipriya Student",
    email: "keerthipriya.it23@bitsathy.ac.in",
    password: "student",
    role: "student",
    department: "Information Technology",
  },
  {
    name: "Keerthipriya Staff",
    email: "keerthipriya0802@gmail.com",
    password: "staff",
    role: "staff",
    department: "Information Technology",
  },
  {
    name: "Keerthipriya Coordinator",
    email: "keerthipriyanagarajan552@gmail.com",
    password: "coordinator",
    role: "coordinator",
    department: null,
  },
];

const riskRules = [
  { key: "attendanceBelow80", points: 2, description: "Attendance below 80%" },
  { key: "periodicalBelow25", points: 2, description: "Periodical test below 25" },
  { key: "standingArrear", points: 3, description: "Standing arrear present" },
  { key: "skillLevelAtMost4", points: 1, description: "Skill level at or below 4" },
  { key: "cgpaAtMost7", points: 3, description: "CGPA at or below 7" },
  { key: "disciplineComplaint", points: 2, description: "Discipline complaints present" },
  { key: "projectsBelow1", points: 1, description: "Projects completed below 1" },
  { key: "activityAtMost5000", points: 1, description: "Activity points at or below 5000" },
  { key: "rewardBelowClassAverage", points: 1, description: "Reward points below class average" },
  { key: "certificationsBelow1", points: 1, description: "Certifications below 1" },
  { key: "achievementsBelow1", points: 1, description: "Achievements below 1" },
  { key: "continuousPoorPerformance", points: 1, description: "Continuous poor performance" },
];

async function seedUsers() {
  for (const seedUser of users) {
    await User.findOneAndUpdate(
      { email: seedUser.email.toLowerCase() },
      {
        ...seedUser,
        email: seedUser.email.toLowerCase(),
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
  }
}

async function seedRules() {
  const existingRules = await RiskRule.countDocuments();
  if (existingRules > 0) return;
  await RiskRule.insertMany(riskRules);
}

async function seedStudents() {
  try {
    const indexes = await Student.collection.indexes();
    const legacyUniqueIndexes = indexes.filter(
      (index) => index.unique && (index.name === "userId_1" || index.name === "linkedUser_1")
    );

    for (const index of legacyUniqueIndexes) {
      // Legacy unique user indexes can fail on null values for seeded students.
      await Student.collection.dropIndex(index.name);
    }
  } catch (error) {
    // Ignore index cleanup errors and continue seeding.
  }

  const removedStudentNames = ["Keerthipriya N", "Arun Kumar", "Nivetha S", "Rahul V", "Meena R", "Priya T"];
  const removedRegisterNumbers = ["23IT001", "23IT002", "23IT003", "23CSE001", "23ECE001", "23MECH001"];

  const studentsToRemove = await Student.find({
    $or: [{ studentName: { $in: removedStudentNames } }, { registerNumber: { $in: removedRegisterNumbers } }],
  }).select("_id");

  if (studentsToRemove.length > 0) {
    const removedIds = studentsToRemove.map((student) => student._id);
    await PerformanceHistory.deleteMany({ student: { $in: removedIds } });
    await Student.deleteMany({ _id: { $in: removedIds } });
  }

  const students = [];

  const upsertedStudents = [];
  for (const seedStudent of students) {
    const doc = await Student.findOneAndUpdate(
      { registerNumber: seedStudent.registerNumber },
      seedStudent,
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    upsertedStudents.push(doc);
  }

  for (const student of upsertedStudents) {
    for (const record of student.pastSemesterPerformance || []) {
      await PerformanceHistory.findOneAndUpdate(
        { student: student._id, semester: record.semester },
        {
          student: student._id,
          semester: record.semester,
          cgpa: record.cgpa,
          riskScore: record.riskScore,
          warningLevel: record.warningLevel,
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }
}

async function seedData() {
  await seedUsers();
  await seedRules();
  await seedStudents();
}

module.exports = seedData;

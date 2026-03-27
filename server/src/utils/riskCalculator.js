const DEFAULT_RULE_POINTS = {
  attendanceBelow80: 2,
  periodicalBelow25: 2,
  standingArrear: 3,
  skillLevelAtMost4: 1,
  cgpaAtMost7: 3,
  disciplineComplaint: 2,
  projectsBelow1: 1,
  activityAtMost5000: 1,
  rewardBelowClassAverage: 1,
  certificationsBelow1: 1,
  achievementsBelow1: 1,
  continuousPoorPerformance: 1,
};

function getWarningLevel(score) {
  if (score <= 3) return "Safe";
  if (score <= 7) return "Mild Warning";
  if (score <= 12) return "Moderate Warning";
  return "Severe Academic Warning";
}

function hasContinuousPoorPerformance(student, poorCgpaThreshold = 7) {
  const history = [...(student.pastSemesterPerformance || [])]
    .map((record) => ({
      semester: Number(record.semester) || 0,
      cgpa: Number(record.cgpa) || 0,
    }))
    .sort((a, b) => a.semester - b.semester);

  history.push({
    semester: Number(student.semester) || history.length + 1,
    cgpa: Number(student.cgpa) || 0,
  });

  if (history.length < 2) return false;

  for (let i = 1; i < history.length; i += 1) {
    if (history[i - 1].cgpa <= poorCgpaThreshold && history[i].cgpa <= poorCgpaThreshold) {
      return true;
    }
  }

  return false;
}

function calculateRisk(student, classAverageRewardPoints = 0, customRulePoints = {}) {
  const rulePoints = {
    ...DEFAULT_RULE_POINTS,
    ...customRulePoints,
  };

  const breakdown = [];
  let totalRiskScore = 0;

  const pushViolation = (condition, rule, description) => {
    if (!condition) return;
    const points = rulePoints[rule] || 0;
    breakdown.push({
      rule,
      description,
      points,
    });
    totalRiskScore += points;
  };

  pushViolation(Number(student.attendancePercentage) < 80, "attendanceBelow80", "Attendance below 80%");
  pushViolation(Number(student.periodicalTestMarks) < 25, "periodicalBelow25", "Periodical test below 25");
  pushViolation(
    Boolean(student.standingArrears) || Number(student.numberOfArrears || 0) > 0,
    "standingArrear",
    "Standing arrear present"
  );
  pushViolation(Number(student.skillLevel) <= 4, "skillLevelAtMost4", "Skill level at or below 4");
  pushViolation(Number(student.cgpa) <= 7, "cgpaAtMost7", "CGPA at or below 7");
  pushViolation(Number(student.disciplineComplaintsCount) > 0, "disciplineComplaint", "Discipline complaints present");
  pushViolation(Number(student.projectsCompleted) < 1, "projectsBelow1", "Projects completed below 1");
  pushViolation(Number(student.activityPoints) <= 5000, "activityAtMost5000", "Activity points at or below 5000");
  pushViolation(Number(student.rewardPoints) < Number(classAverageRewardPoints || 0), "rewardBelowClassAverage", "Reward points below class average");
  pushViolation(Number(student.certificationsCount) < 1, "certificationsBelow1", "Certifications below 1");
  pushViolation(Number(student.achievementsCount) < 1, "achievementsBelow1", "Achievements below 1");
  pushViolation(hasContinuousPoorPerformance(student), "continuousPoorPerformance", "Continuous poor performance in two consecutive semesters");

  return {
    totalRiskScore,
    riskStatus: getWarningLevel(totalRiskScore),
    breakdown,
  };
}

module.exports = {
  DEFAULT_RULE_POINTS,
  getWarningLevel,
  calculateRisk,
};

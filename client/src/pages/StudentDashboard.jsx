import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  FaAward,
  FaBalanceScale,
  FaBookOpen,
  FaBullseye,
  FaCertificate,
  FaChartLine,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFolderOpen,
  FaGavel,
  FaLightbulb,
  FaRegStar,
  FaRocket,
  FaSignal,
  FaUserGraduate,
} from "react-icons/fa";
import api from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import RiskBadge from "../components/RiskBadge";
import { useAuth } from "../context/AuthContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const criteriaConfig = [
  {
    key: "attendancePercentage",
    title: "Attendance",
    minimum: 80,
    minimumDisplay: "80%",
    icon: FaClipboardCheck,
    iconClass: "icon-ocean",
    format: (value) => `${value}%`,
  },
  {
    key: "periodicalTestMarks",
    title: "Periodical Test",
    minimum: 25,
    minimumDisplay: "25/50",
    icon: FaBookOpen,
    iconClass: "icon-sunset",
    format: (value) => `${value}/50`,
  },
  {
    key: "cgpa",
    title: "CGPA",
    minimum: 7,
    minimumDisplay: "7",
    icon: FaChartLine,
    iconClass: "icon-teal",
    format: (value) => value,
  },
  {
    key: "skillLevel",
    title: "Skill Level",
    minimum: 5,
    minimumDisplay: "5",
    icon: FaLightbulb,
    iconClass: "icon-gold",
    format: (value) => value,
  },
  {
    key: "projectsCompleted",
    title: "Projects",
    minimum: 1,
    minimumDisplay: "1",
    icon: FaFolderOpen,
    iconClass: "icon-ocean",
    format: (value) => value,
  },
  {
    key: "activityPoints",
    title: "Activity Points",
    minimum: 5000,
    minimumDisplay: "5000",
    icon: FaRegStar,
    iconClass: "icon-sunset",
    format: (value) => value,
  },
  {
    key: "certificationsCount",
    title: "Certifications",
    minimum: 1,
    minimumDisplay: "1",
    icon: FaCertificate,
    iconClass: "icon-teal",
    format: (value) => value,
  },
  {
    key: "achievementsCount",
    title: "Achievements",
    minimum: 1,
    minimumDisplay: "1",
    icon: FaAward,
    iconClass: "icon-gold",
    format: (value) => value,
  },
  {
    key: "standingArrears",
    title: "Standing Arrear",
    minimum: "0",
    minimumDisplay: "0",
    icon: FaExclamationTriangle,
    iconClass: "icon-sunset",
    format: (value) => (value ? "Yes" : "No"),
    evaluateSafe: (student) => !Boolean(student.standingArrears),
  },
  {
    key: "disciplineComplaintsCount",
    title: "Discipline Complaints",
    minimum: 0,
    minimumDisplay: "0",
    icon: FaGavel,
    iconClass: "icon-ocean",
    format: (value) => value,
    evaluateSafe: (student) => Number(student.disciplineComplaintsCount) <= 0,
  },
  {
    key: "rewardPoints",
    title: "Reward Points",
    minimum: "Class Average",
    minimumDisplay: "Class Average",
    icon: FaBalanceScale,
    iconClass: "icon-teal",
    format: (value) => value,
    evaluateSafe: (_student, hasViolation) => !hasViolation("rewardBelowClassAverage"),
  },
  {
    key: "continuousPoorPerformance",
    title: "2-Sem Poor Performance",
    minimum: "No",
    minimumDisplay: "No",
    icon: FaSignal,
    iconClass: "icon-gold",
    format: (_value, _student, hasViolation) => (hasViolation("continuousPoorPerformance") ? "Yes" : "No"),
    evaluateSafe: (_student, hasViolation) => !hasViolation("continuousPoorPerformance"),
  },
];

function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudent() {
      setLoading(true);
      try {
        const response = await api.get(`/students/student-user/${user.id}`);
        setStudent(response.data);

        const [meetingsRes, goalsRes] = await Promise.all([
          api.get("/meeting-requests", {
            params: { studentId: response.data._id },
          }),
          api.get("/goals", {
            params: { studentId: response.data._id },
          }),
        ]);

        setMeetingRequests(meetingsRes.data);
        setGoals(goalsRes.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load student dashboard");
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) loadStudent();
  }, [user?.id]);

  const criteriaCards = useMemo(() => {
    if (!student) return [];

    const violatedRules = new Set((student.risk?.breakdown || []).map((item) => item.rule));
    const hasViolation = (rule) => violatedRules.has(rule);

    return criteriaConfig.map((item) => {
      const rawValue = student[item.key];
      const currentValue = typeof rawValue === "number" ? rawValue : rawValue ?? 0;
      const safe = item.evaluateSafe
        ? item.evaluateSafe(student, hasViolation)
        : Number(currentValue) >= Number(item.minimum);

      return {
        ...item,
        currentValue,
        safe,
        status: safe ? "Safe" : "Unsafe",
      };
    });
  }, [student]);

  const performanceGraphData = useMemo(() => {
    if (!student) return null;

    const completedHistory = [...(student.pastSemesterPerformance || [])]
      .map((record) => ({
        semester: Number(record.semester),
        sgpa: Number(record.cgpa) || 0,
      }))
      .filter((record) => Number.isFinite(record.semester) && record.semester > 0)
      .sort((a, b) => a.semester - b.semester);

    if (!completedHistory.length) return null;

    const lastSix = completedHistory.slice(-6);

    return {
      labels: lastSix.map((record) => `Sem ${record.semester}`),
      datasets: [
        {
          label: "SGPA",
          data: lastSix.map((record) => record.sgpa),
          backgroundColor: "rgba(73, 122, 255, 0.78)",
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 34,
          maxBarThickness: 36,
        },
      ],
    };
  }, [student]);

  const toggleGoalStatus = async (goalId, checked) => {
    try {
      const response = await api.patch(`/goals/${goalId}`, {
        isCompleted: checked,
        completedBy: user.id,
      });

      setGoals((prev) => prev.map((goal) => (goal._id === goalId ? response.data : goal)));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update goal status");
    }
  };

  const suggestions = useMemo(() => {
    if (!student) return [];

    const tips = [];
    if (Number(student.attendancePercentage) < 80) tips.push("Attend all sessions this week to recover attendance safely above threshold.");
    if (Number(student.periodicalTestMarks) < 25) tips.push("Schedule a subject-wise revision sprint and solve at least two model papers.");
    if (Number(student.cgpa) < 7) tips.push("Prioritize weak courses with a mentor review twice per week.");
    if (Boolean(student.standingArrears)) tips.push("Clear standing arrears with focused remediation to reduce warning points quickly.");

    return tips.length ? tips : ["You are on track. Maintain consistency and continue improving skill-level and activity points."];
  }, [student]);

  const riskBreakdown = useMemo(() => {
    if (!student?.risk?.breakdown) return [];
    return [...student.risk.breakdown].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
  }, [student]);

  const getMeetingStatusLabel = (meeting) => {
    if (meeting.createdByRole === "student") {
      if (meeting.status === "Approved") return "Accepted";
      return meeting.status;
    }

    if (meeting.status === "Rejected") return "Not Completed";
    return meeting.status;
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="alert alert-danger reveal">{error}</div>
      </DashboardLayout>
    );
  }

  if (loading || !student) {
    return (
      <DashboardLayout>
        <div className="card glass-card reveal">
          <div className="card-body d-flex align-items-center gap-3">
            <div className="spinner-border text-primary" role="status" aria-hidden="true" />
            <span>Loading your dashboard...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-shell student-shell">
        <div className="row g-4">
          <div className="col-12 reveal">
            <div className="panel-hero p-4 dashboard-hero">
              <p className="hero-kicker mb-2">Student Analytics</p>
              <h4 className="fw-bold mb-1">Welcome back, {student.studentName}</h4>
              <p className="text-muted mb-0">Monitor your academic metrics, track warning signals, and unlock clear next actions.</p>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <span className="hero-stat">Semester {student.semester}</span>
                <span className="hero-stat">{student.department}</span>
                <span className="hero-stat">Reg #{student.registerNumber}</span>
              </div>
            </div>
          </div>

          <div className="col-xl-4 reveal reveal-delay-1">
            <div className="card glass-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-badge">
                    <FaUserGraduate />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">{student.studentName}</h5>
                    <p className="text-muted mb-0">{student.department}</p>
                  </div>
                </div>
                <hr />
                <div className="profile-pill"><span>Register Number</span><strong>{student.registerNumber}</strong></div>
                <div className="profile-pill mt-2"><span>Current Semester</span><strong>{student.semester}</strong></div>
                <div className="profile-pill mt-2">
                  <span>Assigned Staff</span>
                  <strong>{student.assignedStaff?.name || "Not assigned"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4 reveal reveal-delay-2">
            <div className="card glass-card h-100 risk-score-card">
              <div className="card-body">
                <h6 className="text-uppercase text-muted mb-2">Risk Score</h6>
                <h1 className="display-4 fw-bold mb-2 text-gradient">{student.risk?.totalRiskScore || 0}</h1>
                <RiskBadge status={student.risk?.riskStatus} />
                <p className="text-muted mt-3 mb-0">This score is computed from academic and behavioral risk rules.</p>
              </div>
            </div>
          </div>

          <div className="col-xl-4 reveal reveal-delay-2">
            <div className="card glass-card h-100 recommendation-card">
              <div className="card-body">
                <h6 className="text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
                  <FaRocket className="hover-bounce" />
                  Study Recommendations
                </h6>
                <div className="recommendation-list">
                  {suggestions.map((tip) => (
                    <div className="recommendation-item" key={tip}>{tip}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 reveal reveal-delay-3">
            <div className="card glass-card">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Risk Points Detail</h5>
                {riskBreakdown.length ? (
                  <div className="table-responsive">
                    <table className="table table-modern table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "70%" }}>Triggered Rule</th>
                          <th>Risk Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskBreakdown.map((item, index) => (
                          <tr key={`${item.rule}-${index}`}>
                            <td>{item.description || item.rule}</td>
                            <td><strong>{Number(item.points) || 0}</strong></td>
                          </tr>
                        ))}
                        <tr>
                          <td className="fw-bold">Total</td>
                          <td className="fw-bold">{student.risk?.totalRiskScore || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-success mb-0">
                    No active risk-point violations. Your current risk score is safe.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 reveal reveal-delay-3">
            <h5 className="fw-bold section-title mb-3">Academic Criteria</h5>
            <div className="row g-3">
              {criteriaCards.map((item) => {
                const Icon = item.icon;
                const hasRule = (rule) => (student.risk?.breakdown || []).some((b) => b.rule === rule);
                return (
                  <div className="col-sm-6 col-xl-3" key={item.key}>
                    <div className={`card criteria-card h-100 ${item.safe ? "criteria-safe" : "criteria-unsafe"}`}>
                      <div className="card-body">
                        <div className="criteria-icon-wrap mb-3">
                          <div className={`criteria-icon ${item.iconClass}`}>
                            <Icon className="icon-tilt" />
                          </div>
                        </div>
                        <h6 className="fw-bold mb-2">{item.title}</h6>
                        <p className="mb-1 text-muted small">Minimum: {item.minimumDisplay || item.minimum}</p>
                        <p className="mb-2">Student: <strong>{item.format(item.currentValue, student, hasRule)}</strong></p>
                        <span className={`status-pill ${item.safe ? "status-safe" : "status-unsafe"}`}>{item.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-lg-8 reveal reveal-delay-4">
            <div className="card glass-card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Performance Graph (Last 6 Completed Semesters)</h5>
                {performanceGraphData ? (
                  <div style={{ height: 280 }}>
                    <Bar
                      data={performanceGraphData}
                      options={{
                        animation: { duration: 1000, easing: "easeOutQuart" },
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, labels: { boxWidth: 14 } },
                          tooltip: {
                            backgroundColor: "rgba(19, 24, 46, 0.92)",
                            padding: 12,
                            callbacks: {
                              label: (context) => {
                                const value = context.raw;
                                return `SGPA: ${value}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            type: "linear",
                            suggestedMin: 0,
                            suggestedMax: 10,
                            ticks: { stepSize: 1 },
                            grid: { color: "rgba(100, 116, 139, 0.15)" },
                          },
                          x: { grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-muted">No completed semester SGPA available yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4 reveal reveal-delay-4">
            <div className="card glass-card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title d-flex align-items-center gap-2">
                  <FaBullseye className="hover-bounce" />
                  Upcoming Goals
                </h5>
                <div className="goal-list">
                  {goals.length ? (
                    goals.map((goal) => (
                      <label className={`goal-item ${goal.isCompleted ? "done" : ""}`} key={goal._id}>
                        <input
                          type="checkbox"
                          checked={Boolean(goal.isCompleted)}
                          onChange={(event) => toggleGoalStatus(goal._id, event.target.checked)}
                        />
                        <span>
                          {goal.title}
                          {goal.description ? ` - ${goal.description}` : ""}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-muted">No upcoming goals assigned by staff yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 reveal reveal-delay-4">
            <div className="card glass-card">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">My Meeting Requests</h5>
                <div className="table-responsive">
                  <table className="table table-modern table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Requested By</th>
                        <th>Request Type</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Meeting Time</th>
                        <th>Requested On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetingRequests.length ? (
                        meetingRequests.map((meeting) => (
                          <tr key={meeting._id}>
                            <td>{meeting.createdByRole === "student" ? "You" : "Staff"}</td>
                            <td>{meeting.requestType}</td>
                            <td>{meeting.description || "-"}</td>
                            <td>{getMeetingStatusLabel(meeting)}</td>
                            <td>{meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : "Not assigned"}</td>
                            <td>{new Date(meeting.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-muted">No meeting requests submitted yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <Link className="btn btn-accent btn-glow floating-cta d-flex align-items-center gap-2" to="/meeting-request">
            <FaRocket /> Request a Meeting
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StudentDashboard;

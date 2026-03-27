import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilter,
  FaEnvelope,
  FaPlus,
  FaSearch,
  FaUserGraduate,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import api from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import RiskBadge from "../components/RiskBadge";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";

const DEPARTMENT_FILTER_OPTIONS = [
  { label: "IT", value: "Information Technology" },
  { label: "CSE", value: "Computer Science" },
  { label: "ECE", value: "Electronics and Communication" },
  { label: "MECH", value: "Mechanical" },
  { label: "AIDS", value: "Artificial Intelligence and Data Science" },
];

function StaffDashboard() {
  const { user } = useAuth();
  const staffName = user?.name || "Staff";
  const [students, setStudents] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [filters, setFilters] = useState({ department: "", semester: "", riskLevel: "", search: "" });
  const [meetingForm, setMeetingForm] = useState({
    studentId: "",
    requestType: "Advisor Meeting",
    description: "",
  });
  const [goalForm, setGoalForm] = useState({
    studentId: "",
    title: "",
    description: "",
  });
  const [goals, setGoals] = useState([]);
  const [expandedMeetingId, setExpandedMeetingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const loadData = async () => {
    const selectedDepartment = DEPARTMENT_FILTER_OPTIONS.find((option) => option.label === filters.department)?.value;

    const [studentsRes, meetingsRes, goalsRes] = await Promise.all([
      api.get("/students", {
        params: {
          role: "staff",
          userId: user.id,
          department: selectedDepartment || undefined,
          semester: filters.semester || undefined,
          riskLevel: filters.riskLevel || undefined,
          search: filters.search || undefined,
        },
      }),
      api.get("/meeting-requests", { params: { department: user.department || undefined } }),
      api.get("/goals", { params: { department: user.department || undefined } }),
    ]);

    const assignedStudents = studentsRes.data;
    const assignedStudentIds = new Set(assignedStudents.map((student) => String(student._id)));

    setStudents(assignedStudents);
    setMeetingRequests(
      meetingsRes.data.filter((meeting) => assignedStudentIds.has(String(meeting.student?._id)))
    );
    setGoals(goalsRes.data.filter((goal) => assignedStudentIds.has(String(goal.student?._id))));
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadData()
        .catch(() => {
          setStudents([]);
          setMeetingRequests([]);
          setGoals([]);
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filters.department, filters.semester, filters.riskLevel, filters.search]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const interval = setInterval(() => {
      loadData().catch(() => {
        // Silent refresh errors should not interrupt user actions.
      });
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filters.department, filters.semester, filters.riskLevel, filters.search]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const total = students.length;
    const safe = students.filter((student) => student.risk.riskStatus === "Safe").length;
    const severe = students.filter((student) => student.risk.riskStatus === "Severe Academic Warning").length;
    const atRisk = total - safe;
    return { total, safe, atRisk, severe };
  }, [students]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.studentName.localeCompare(b.studentName)),
    [students]
  );

  const submitMeeting = async (event) => {
    event.preventDefault();
    await api.post("/meeting-request", {
      studentId: meetingForm.studentId,
      requestedBy: user.id,
      requestType: meetingForm.requestType,
      description: meetingForm.description,
      createdByRole: "staff",
    });
    setMeetingForm({ studentId: "", requestType: "Advisor Meeting", description: "" });
    setToast("Meeting request created successfully");
    await loadData();
  };

  const updateMeetingStatus = async (meetingId, status) => {
    await api.put(`/meeting-requests/${meetingId}`, { status });
    setToast(`Request ${status.toLowerCase()}`);
    await loadData();
  };

  const submitGoal = async (event) => {
    event.preventDefault();
    await api.post("/goals", {
      studentId: goalForm.studentId,
      title: goalForm.title,
      description: goalForm.description,
      createdBy: user.id,
      createdByRole: "staff",
    });
    setGoalForm({ studentId: "", title: "", description: "" });
    setToast("Upcoming goal created successfully");
    await loadData();
  };

  const warnStudentByMail = (student) => {
    if (!student.studentEmail) {
      setToast("No student email available for this record");
      return;
    }

    const subject = encodeURIComponent("Academic Warning Notice");
    const body = encodeURIComponent(
      `Dear ${student.studentName},\n\n` +
      `This is an academic warning from your department staff.\n` +
      `Current risk status: ${student.risk.riskStatus}\n` +
      `Risk score: ${student.risk.totalRiskScore}\n\n` +
      "Please meet your advisor/staff for corrective action and support.\n\n" +
      "Regards,\nDepartment Staff"
    );

    const to = encodeURIComponent(student.studentEmail);
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    const openedWindow = window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      window.location.href = `mailto:${student.studentEmail}?subject=${subject}&body=${body}`;
    }
  };

  const canWarnStudent = (student) => {
    const warningStatuses = ["Mild Warning", "Moderate Warning", "Severe Academic Warning"];
    return Boolean(student.studentEmail) && warningStatuses.includes(student?.risk?.riskStatus);
  };

  return (
    <DashboardLayout>
      <div className="dashboard-shell staff-shell">
        <div className="mb-3 reveal">
          <h4 className="fw-bold mb-1">Welcome back, {staffName}</h4>
          <p className="text-muted mb-0">Stay on top of student risk, meetings, and action plans.</p>
        </div>

        <div className="row g-3 mb-4 reveal">
          <div className="col-md-3"><StatCard title="Total Students" value={stats.total} variant="primary" icon={FaUsers} /></div>
          <div className="col-md-3"><StatCard title="Safe Students" value={stats.safe} variant="success" icon={FaCheckCircle} /></div>
          <div className="col-md-3"><StatCard title="At Risk" value={stats.atRisk} variant="warning" icon={FaExclamationTriangle} /></div>
          <div className="col-md-3"><StatCard title="Severe Risk" value={stats.severe} variant="danger" icon={FaUserShield} /></div>
        </div>

        <div className="card glass-card mb-4 reveal reveal-delay-1">
          <div className="card-body">
            <h5 className="fw-bold mb-3 section-title d-flex align-items-center gap-2">
              <FaFilter className="hover-bounce" /> Filters
            </h5>
            <div className="row g-3">
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.department}
                  onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
                >
                  <option value="">All Departments</option>
                  {DEPARTMENT_FILTER_OPTIONS.map((department) => (
                    <option key={department.label} value={department.label}>
                      {department.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Semester"
                  value={filters.semester}
                  onChange={(event) => setFilters((prev) => ({ ...prev, semester: event.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.riskLevel}
                  onChange={(event) => setFilters((prev) => ({ ...prev, riskLevel: event.target.value }))}
                >
                  <option value="">All Risk Levels</option>
                  <option>Safe</option>
                  <option>Mild Warning</option>
                  <option>Moderate Warning</option>
                  <option>Severe Academic Warning</option>
                </select>
              </div>
              <div className="col-md-4 position-relative">
                <FaSearch className="table-search-icon" />
                <input
                  className="form-control ps-5"
                  placeholder="Search by name or register number"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card glass-card mb-4 reveal reveal-delay-2">
          <div className="card-body">
            <h5 className="fw-bold mb-3 section-title">Student Table</h5>
            <div className="table-responsive">
              <table className="table table-modern align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register No</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th>Attendance</th>
                    <th>CGPA</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                    <th>Warn</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.length ? (
                    sortedStudents.map((student) => (
                      <tr key={student._id}>
                        <td>
                          <Link to={`/students/${student._id}`} className="text-decoration-none fw-semibold d-flex align-items-center gap-2 table-link">
                            <FaUserGraduate />
                            {student.studentName}
                          </Link>
                        </td>
                        <td>{student.registerNumber}</td>
                        <td>{student.department}</td>
                        <td>{student.studentEmail || "-"}</td>
                        <td>{student.attendancePercentage}%</td>
                        <td>{student.cgpa}</td>
                        <td>{student.risk.totalRiskScore}</td>
                        <td><RiskBadge status={student.risk.riskStatus} /></td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            onClick={() => warnStudentByMail(student)}
                            disabled={!canWarnStudent(student)}
                            title={
                              !student.studentEmail
                                ? "No email available"
                                : student?.risk?.riskStatus === "Safe"
                                  ? "Warning can be sent only for Mild/Moderate/Severe students"
                                  : "Send warning email"
                            }
                          >
                            <FaEnvelope /> Warn
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-muted py-4 text-center">No student records found for selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-7 reveal reveal-delay-3">
            <div className="card glass-card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Meeting Requests</h5>
                <div className="table-responsive">
                  <table className="table table-modern table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetingRequests.length ? (
                        meetingRequests.map((meeting) => {
                          const isExpanded = expandedMeetingId === meeting._id;

                          return (
                            <Fragment key={meeting._id}>
                              <tr>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none fw-semibold"
                                    onClick={() => setExpandedMeetingId(isExpanded ? "" : meeting._id)}
                                  >
                                    {meeting.student?.studentName || "Unknown Student"}
                                  </button>
                                </td>
                                <td>{meeting.requestType}</td>
                                <td>{meeting.status}</td>
                                <td>{new Date(meeting.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success"
                                      disabled={meeting.status !== "Pending"}
                                      onClick={() => updateMeetingStatus(meeting._id, "Approved")}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      disabled={meeting.status !== "Pending"}
                                      onClick={() => updateMeetingStatus(meeting._id, "Rejected")}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded ? (
                                <tr>
                                  <td colSpan={5} className="text-muted bg-light">
                                    <strong>Description:</strong> {meeting.description || "No description provided."}
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-muted py-4 text-center">No meeting requests available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-5 reveal reveal-delay-4" id="create-meeting-panel">
            <div className="card glass-card mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Create Meeting</h5>
                <form onSubmit={submitMeeting}>
                  <div className="mb-3">
                    <label className="form-label">Student</label>
                    <select
                      className="form-select"
                      value={meetingForm.studentId}
                      onChange={(event) => setMeetingForm((prev) => ({ ...prev, studentId: event.target.value }))}
                      required
                    >
                      <option value="">Select student</option>
                      {sortedStudents.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.studentName} ({student.registerNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={meetingForm.requestType}
                      onChange={(event) => setMeetingForm((prev) => ({ ...prev, requestType: event.target.value }))}
                    >
                      <option>Advisor Meeting</option>
                      <option>Remedial Class</option>
                      <option>Parent Meeting</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Details</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={meetingForm.description}
                      onChange={(event) => setMeetingForm((prev) => ({ ...prev, description: event.target.value }))}
                      required
                    />
                  </div>

                  <button className="btn btn-accent btn-glow" type="submit">Create Meeting</button>
                </form>
              </div>
            </div>

            <div className="card glass-card">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Upcoming Goals</h5>

                <form onSubmit={submitGoal} className="mb-3">
                  <div className="mb-2">
                    <label className="form-label">Student</label>
                    <select
                      className="form-select"
                      value={goalForm.studentId}
                      onChange={(event) => setGoalForm((prev) => ({ ...prev, studentId: event.target.value }))}
                      required
                    >
                      <option value="">Select student</option>
                      {sortedStudents.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.studentName} ({student.registerNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Goal</label>
                    <input
                      className="form-control"
                      value={goalForm.title}
                      onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Enter goal title"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={goalForm.description}
                      onChange={(event) => setGoalForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Optional details"
                    />
                  </div>

                  <button className="btn btn-accent btn-glow" type="submit">Upload Goal</button>
                </form>

                <div className="table-responsive">
                  <table className="table table-modern table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Goal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.length ? (
                        goals.map((goal) => (
                          <tr key={goal._id}>
                            <td>{goal.student?.studentName || "-"}</td>
                            <td>
                              <div className="fw-semibold">{goal.title}</div>
                              <small className="text-muted">{goal.description || "No description"}</small>
                            </td>
                            <td>{goal.isCompleted ? "Completed" : "Pending"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-muted py-3 text-center">No goals uploaded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a className="fab-action" href="#create-meeting-panel" aria-label="Create meeting">
          <FaPlus />
        </a>

        {toast ? <div className="floating-toast">{toast}</div> : null}
        {loading ? <div className="floating-spinner spinner-border text-primary" role="status" aria-hidden="true" /> : null}
      </div>
    </DashboardLayout>
  );
}

export default StaffDashboard;

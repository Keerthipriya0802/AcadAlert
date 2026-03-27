import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  FaChartPie,
  FaEdit,
  FaPlus,
  FaShieldAlt,
  FaSlidersH,
  FaTable,
  FaTrash,
  FaUsers,
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";
import api from "../api";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const blankStudent = {
  studentName: "",
  registerNumber: "",
  emailId: "",
  department: "",
  semester: "",
  attendancePercentage: "",
  periodicalTestMarks: "",
  standingArrears: false,
  numberOfArrears: "",
  skillLevel: "",
  cgpa: "",
  disciplineComplaintsCount: "",
  projectsCompleted: "",
  activityPoints: "",
  rewardPoints: "",
  certificationsCount: "",
  achievementsCount: "",
  semesterSgpa: [],
  semesterRiskScores: [],
  pastSemesterPerformance: [],
};

const blankRule = {
  key: "",
  description: "",
  points: 1,
};

const blankStaff = {
  name: "",
  email: "",
};

const blankStaffEdit = {
  name: "",
  email: "",
};

const normalizeNumericInput = (value, allowDecimal = false) => {
  let next = String(value ?? "");
  const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;
  next = next.replace(pattern, "");

  if (allowDecimal) {
    const firstDot = next.indexOf(".");
    if (firstDot !== -1) {
      next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, "")}`;
    }
  }

  if (next === "") return "";

  if (allowDecimal) {
    const [whole, fraction] = next.split(".");
    const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
    return fraction !== undefined ? `${normalizedWhole || "0"}.${fraction}` : normalizedWhole;
  }

  return next.replace(/^0+(?=\d)/, "");
};

const toNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DEPARTMENT_ALIAS_MAP = {
  CSE: "CSE",
  "COMPUTER SCIENCE": "CSE",
  "COMPUTER SCIENCE AND ENGINEERING": "CSE",
  "COMPUTER SCIENCE ENGINEERING": "CSE",
  "CSE DEPARTMENT": "CSE",
};

const normalizeDepartment = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";
  const canonical = raw.toUpperCase().replace(/\s+/g, " ");
  return DEPARTMENT_ALIAS_MAP[canonical] || canonical;
};

function CoordinatorDashboard() {
  const [students, setStudents] = useState([]);
  const [rules, setRules] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [ruleEdits, setRuleEdits] = useState({});
  const [newRule, setNewRule] = useState(blankRule);
  const [ruleStatus, setRuleStatus] = useState({ type: "", message: "" });
  const [assignmentStatus, setAssignmentStatus] = useState({ type: "", message: "" });
  const [staffStatus, setStaffStatus] = useState({ type: "", message: "" });
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [assigningStudentId, setAssigningStudentId] = useState("");
  const [newStaff, setNewStaff] = useState(blankStaff);
  const [editingStaffId, setEditingStaffId] = useState("");
  const [staffEdit, setStaffEdit] = useState(blankStaffEdit);
  const [form, setForm] = useState(blankStudent);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const [studentsRes, rulesRes, staffRes] = await Promise.all([
      api.get("/students/risk"),
      api.get("/risk-rules"),
      api.get("/auth/staff"),
    ]);
    setStudents(studentsRes.data.students);
    setRules(rulesRes.data);
    setStaffUsers(staffRes.data);
    setAssignmentDrafts(
      Object.fromEntries(
        (studentsRes.data.students || []).map((student) => [student._id, student.assignedStaff?._id || ""])
      )
    );
    setRuleEdits(Object.fromEntries(rulesRes.data.map((rule) => [rule.key, Number(rule.points) || 0])));
  };

  useEffect(() => {
    load().catch(() => {
      setStudents([]);
      setRules([]);
      setStaffUsers([]);
    });
  }, []);

  useEffect(() => {
    const completedSemesterCount = Math.max(toNumber(form.semester, 0) - 1, 0);
    setForm((prev) => {
      const currentSgpa = Array.isArray(prev.semesterSgpa) ? prev.semesterSgpa : [];
      const currentRiskScores = Array.isArray(prev.semesterRiskScores) ? prev.semesterRiskScores : [];
      if (currentSgpa.length === completedSemesterCount && currentRiskScores.length === completedSemesterCount) return prev;

      const nextSgpa = Array.from({ length: completedSemesterCount }, (_, index) => currentSgpa[index] ?? "");
      const nextRiskScores = Array.from({ length: completedSemesterCount }, (_, index) => currentRiskScores[index] ?? "");
      return { ...prev, semesterSgpa: nextSgpa, semesterRiskScores: nextRiskScores };
    });
  }, [form.semester]);

  const stats = useMemo(() => {
    const total = students.length;
    const severe = students.filter((student) => student.risk.riskStatus === "Severe Academic Warning").length;
    const moderate = students.filter((student) => student.risk.riskStatus === "Moderate Warning").length;
    const safe = students.filter((student) => student.risk.riskStatus === "Safe").length;
    return { total, severe, moderate, safe };
  }, [students]);

  const pieData = useMemo(() => ({
    labels: ["Safe", "Moderate", "Severe"],
    datasets: [
      {
        label: "Risk Distribution",
        data: [stats.safe, stats.moderate, stats.severe],
        backgroundColor: ["rgba(34, 197, 94, 0.75)", "rgba(245, 158, 11, 0.75)", "rgba(239, 68, 68, 0.75)"],
        borderWidth: 0,
      },
    ],
  }), [stats.safe, stats.moderate, stats.severe]);

  const deptPerformanceData = useMemo(() => {
    const grouped = students.reduce((acc, student) => {
      const dept = normalizeDepartment(student.department);
      if (!acc[dept]) acc[dept] = { totalCgpa: 0, count: 0 };
      acc[dept].totalCgpa += Number(student.cgpa) || 0;
      acc[dept].count += 1;
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    const values = labels.map((dept) => {
      const data = grouped[dept];
      return data.count ? Number((data.totalCgpa / data.count).toFixed(2)) : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: "Average CGPA",
          data: values,
          backgroundColor: "rgba(79, 70, 229, 0.76)",
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    };
  }, [students]);

  const openAddModal = () => {
    setSelectedStudentId("");
    setForm(blankStudent);
    setShowModal(true);
  };

  const startEdit = (student) => {
    setSelectedStudentId(student._id);
    setForm({
      ...blankStudent,
      ...student,
      emailId: student.emailId || student.studentEmail || "",
      semester: String(student.semester ?? ""),
      attendancePercentage: String(student.attendancePercentage ?? ""),
      periodicalTestMarks: String(student.periodicalTestMarks ?? ""),
      numberOfArrears: String(student.numberOfArrears ?? ""),
      skillLevel: String(student.skillLevel ?? ""),
      cgpa: String(student.cgpa ?? ""),
      disciplineComplaintsCount: String(student.disciplineComplaintsCount ?? ""),
      projectsCompleted: String(student.projectsCompleted ?? ""),
      activityPoints: String(student.activityPoints ?? ""),
      rewardPoints: String(student.rewardPoints ?? ""),
      certificationsCount: String(student.certificationsCount ?? ""),
      achievementsCount: String(student.achievementsCount ?? ""),
      semesterSgpa: Array.from({ length: Math.max((Number(student.semester) || 0) - 1, 0) }, (_, index) => {
        const semester = index + 1;
        const record = (student.pastSemesterPerformance || []).find((item) => Number(item.semester) === semester);
        return record ? String(record.cgpa ?? "") : "";
      }),
      semesterRiskScores: Array.from({ length: Math.max((Number(student.semester) || 0) - 1, 0) }, (_, index) => {
        const semester = index + 1;
        const record = (student.pastSemesterPerformance || []).find((item) => Number(item.semester) === semester);
        return record ? String(record.riskScore ?? "") : "";
      }),
      standingArrears: Boolean(student.standingArrears || Number(student.numberOfArrears || 0) > 0),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedStudentId("");
    setForm(blankStudent);
    setShowModal(false);
  };

  const submitStudent = async (event) => {
    event.preventDefault();

    const semesterCount = Math.max(toNumber(form.semester, 0), 0);
    const existingHistory = Array.isArray(form.pastSemesterPerformance) ? form.pastSemesterPerformance : [];
    const semesterSgpa = Array.isArray(form.semesterSgpa) ? form.semesterSgpa : [];
    const semesterRiskScores = Array.isArray(form.semesterRiskScores) ? form.semesterRiskScores : [];

    const pastSemesterPerformance = Array.from({ length: Math.max(semesterCount - 1, 0) }, (_, index) => {
      const semester = index + 1;
      const prevRecord = existingHistory.find((record) => Number(record.semester) === semester) || {};
      const sgpa = toNumber(semesterSgpa[index], 0);

      return {
        semester,
        cgpa: sgpa,
        riskScore: toNumber(semesterRiskScores[index], toNumber(prevRecord.riskScore, 0)),
        warningLevel: prevRecord.warningLevel || "Safe",
      };
    });

    const payload = {
      studentName: form.studentName,
      registerNumber: form.registerNumber,
      emailId: form.emailId,
      department: form.department,
      semester: toNumber(form.semester),
      attendancePercentage: toNumber(form.attendancePercentage),
      periodicalTestMarks: toNumber(form.periodicalTestMarks),
      standingArrears: Boolean(toNumber(form.numberOfArrears) > 0 || form.standingArrears),
      numberOfArrears: toNumber(form.numberOfArrears),
      skillLevel: toNumber(form.skillLevel),
      cgpa: toNumber(form.cgpa),
      disciplineComplaintsCount: toNumber(form.disciplineComplaintsCount),
      projectsCompleted: toNumber(form.projectsCompleted),
      activityPoints: toNumber(form.activityPoints),
      rewardPoints: toNumber(form.rewardPoints),
      certificationsCount: toNumber(form.certificationsCount),
      achievementsCount: toNumber(form.achievementsCount),
      pastSemesterPerformance,
    };

    if (selectedStudentId) {
      await api.put(`/students/${selectedStudentId}`, payload);
    } else {
      await api.post("/students", { ...blankStudent, ...payload });
    }

    closeModal();
    await load();
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Delete student ${student.studentName} (${student.registerNumber})?`)) return;
    await api.delete(`/students/${student._id}`);
    await load();
  };

  const assignStaff = async (studentId) => {
    const staffId = assignmentDrafts[studentId] || null;
    setAssignmentStatus({ type: "", message: "" });
    setAssigningStudentId(studentId);
    try {
      await api.put(`/students/${studentId}/assign-staff`, { staffId });
      setAssignmentStatus({ type: "success", message: "Staff assignment updated" });
      await load();
    } catch (error) {
      setAssignmentStatus({ type: "danger", message: error?.response?.data?.message || "Failed to assign staff" });
    } finally {
      setAssigningStudentId("");
    }
  };

  const updateRule = async (key, points) => {
    const current = rules.find((rule) => rule.key === key);
    if (!current) return;
    await api.put(`/risk-rules/${key}`, { points: Number(points), description: current.description });
    setRuleStatus({ type: "success", message: `Updated ${key}` });
    await load();
  };

  const addRule = async (event) => {
    event.preventDefault();
    setRuleStatus({ type: "", message: "" });
    try {
      await api.post("/risk-rules", {
        key: newRule.key.trim(),
        description: newRule.description.trim(),
        points: Number(newRule.points),
      });
      setNewRule(blankRule);
      setRuleStatus({ type: "success", message: "Risk rule added successfully" });
      await load();
    } catch (error) {
      setRuleStatus({
        type: "danger",
        message: error?.response?.data?.message || "Failed to add rule",
      });
    }
  };

  const addStaff = async (event) => {
    event.preventDefault();
    setStaffStatus({ type: "", message: "" });

    try {
      const response = await api.post("/auth/staff", {
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
      });

      setStaffStatus({
        type: "success",
        message: response.data?.temporaryPassword
          ? `Staff is added successfully. Temporary password: ${response.data.temporaryPassword}`
          : "Staff is added successfully.",
      });
      setNewStaff(blankStaff);
      await load();
    } catch (error) {
      setStaffStatus({
        type: "danger",
        message: error?.response?.data?.message || "Failed to add staff",
      });
    }
  };

  const beginEditStaff = (staff) => {
    setStaffStatus({ type: "", message: "" });
    setEditingStaffId(staff._id);
    setStaffEdit({
      name: staff.name || "",
      email: staff.email || "",
    });
  };

  const cancelEditStaff = () => {
    setEditingStaffId("");
    setStaffEdit(blankStaffEdit);
  };

  const saveStaff = async (staffId) => {
    setStaffStatus({ type: "", message: "" });
    try {
      await api.put(`/auth/staff/${staffId}`, {
        name: staffEdit.name.trim(),
        email: staffEdit.email.trim(),
      });
      setStaffStatus({ type: "success", message: "Staff updated successfully." });
      cancelEditStaff();
      await load();
    } catch (error) {
      setStaffStatus({
        type: "danger",
        message: error?.response?.data?.message || "Failed to update staff",
      });
    }
  };

  const deleteStaffUser = async (staff) => {
    if (!window.confirm(`Delete staff ${staff.name} (${staff.email})?`)) return;
    setStaffStatus({ type: "", message: "" });
    try {
      await api.delete(`/auth/staff/${staff._id}`);
      setStaffStatus({ type: "success", message: "Staff deleted successfully." });
      if (editingStaffId === staff._id) {
        cancelEditStaff();
      }
      await load();
    } catch (error) {
      setStaffStatus({
        type: "danger",
        message: error?.response?.data?.message || "Failed to delete staff",
      });
    }
  };

  const deleteRule = async (key) => {
    if (!window.confirm(`Delete risk rule ${key}?`)) return;
    setRuleStatus({ type: "", message: "" });
    try {
      await api.delete(`/risk-rules/${key}`);
      setRuleStatus({ type: "success", message: `Deleted ${key}` });
      await load();
    } catch (error) {
      setRuleStatus({
        type: "danger",
        message: error?.response?.data?.message || "Failed to delete rule",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-shell coordinator-shell">
        <div className="panel-hero p-4 mb-4 reveal dashboard-hero">
          <p className="hero-kicker mb-2">Coordinator Admin Panel</p>
          <h4 className="fw-bold mb-1">Risk Analytics And System Controls</h4>
          <p className="text-muted mb-0">Manage students, tune warning logic, and supervise academic health across departments.</p>
        </div>

        <div className="row g-3 mb-4 reveal">
          <div className="col-md-3"><StatCard title="Total Students" value={stats.total} variant="primary" icon={FaUsers} /></div>
          <div className="col-md-3"><StatCard title="Safe" value={stats.safe} variant="success" icon={FaShieldAlt} /></div>
          <div className="col-md-3"><StatCard title="Moderate" value={stats.moderate} variant="warning" icon={FaChartPie} /></div>
          <div className="col-md-3"><StatCard title="Severe" value={stats.severe} variant="danger" icon={FaSlidersH} /></div>
        </div>

        <div className="dashboard-tabs mb-4 reveal reveal-delay-1">
          <button type="button" className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <FaChartPie /> Overview
          </button>
          <button type="button" className={`tab-btn ${activeTab === "students" ? "active" : ""}`} onClick={() => setActiveTab("students")}>
            <FaTable /> Students
          </button>
          <button type="button" className={`tab-btn ${activeTab === "rules" ? "active" : ""}`} onClick={() => setActiveTab("rules")}>
            <FaSlidersH /> Risk Rules
          </button>
          <button type="button" className={`tab-btn ${activeTab === "staff" ? "active" : ""}`} onClick={() => setActiveTab("staff")}>
            <FaUsers /> Staff
          </button>
        </div>

        {activeTab === "overview" ? (
          <div className="row g-4 reveal reveal-delay-2">
            <div className="col-lg-5">
              <div className="card glass-card h-100">
                <div className="card-body">
                  <h5 className="fw-bold mb-3 section-title">Risk Distribution</h5>
                  <div style={{ height: 300 }}>
                    <Pie
                      data={pieData}
                      options={{
                        maintainAspectRatio: false,
                        animation: { duration: 900 },
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="card glass-card h-100">
                <div className="card-body">
                  <h5 className="fw-bold mb-3 section-title">Department Performance</h5>
                  <div style={{ height: 300 }}>
                    <Bar
                      data={deptPerformanceData}
                      options={{
                        maintainAspectRatio: false,
                        animation: { duration: 900 },
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            suggestedMin: 0,
                            suggestedMax: 10,
                            grid: { color: "rgba(100, 116, 139, 0.15)" },
                          },
                          x: { grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "students" ? (
          <div className="card glass-card reveal reveal-delay-2">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="fw-bold mb-0 section-title">All Students</h5>
                <button type="button" className="btn btn-accent btn-glow d-flex align-items-center gap-2" onClick={openAddModal}>
                  <FaPlus /> Add Student
                </button>
              </div>

              {assignmentStatus.message ? <div className={`alert alert-${assignmentStatus.type} py-2`}>{assignmentStatus.message}</div> : null}

              <div className="table-responsive" style={{ maxHeight: 420 }}>
                <table className="table table-modern align-middle">
                  <thead>
                    <tr><th>Name</th><th>Reg No</th><th>Department</th><th>Assigned Staff</th><th>CGPA</th><th>Risk</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id}>
                        <td>{student.studentName}</td>
                        <td>{student.registerNumber}</td>
                        <td>{student.department}</td>
                        <td style={{ minWidth: 220 }}>
                          <select
                            className="form-select form-select-sm"
                            value={assignmentDrafts[student._id] ?? student.assignedStaff?._id ?? ""}
                            onChange={(event) =>
                              setAssignmentDrafts((prev) => ({
                                ...prev,
                                [student._id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {staffUsers.map((staff) => (
                              <option key={staff._id} value={staff._id}>
                                {staff.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{student.cgpa}</td>
                        <td><RiskBadge status={student.risk.riskStatus} /></td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => assignStaff(student._id)}
                              type="button"
                              disabled={assigningStudentId === student._id}
                            >
                              {assigningStudentId === student._id ? "Saving..." : "Assign"}
                            </button>
                            <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => startEdit(student)} type="button">
                              <FaEdit /> Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={() => deleteStudent(student)} type="button">
                              <FaTrash /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "rules" ? (
          <div className="card glass-card reveal reveal-delay-2">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="fw-bold mb-0 section-title">Risk Rule Management</h5>
                <span className="small text-muted">Manage points, create new rules, or delete obsolete ones</span>
              </div>

              <form className="row g-2 coordinator-rule-toolbar mb-3" onSubmit={addRule}>
                <div className="col-md-3">
                  <input
                    className="form-control"
                    placeholder="ruleKeyExample"
                    value={newRule.key}
                    onChange={(event) => setNewRule((prev) => ({ ...prev, key: event.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder="Rule description"
                    value={newRule.description}
                    onChange={(event) => setNewRule((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    placeholder="Points"
                    value={newRule.points}
                    onChange={(event) => setNewRule((prev) => ({ ...prev, points: Number(event.target.value) }))}
                    required
                  />
                </div>
                <div className="col-md-2 d-grid">
                  <button type="submit" className="btn btn-accent btn-glow">Add Rule</button>
                </div>
              </form>

              {ruleStatus.message ? <div className={`alert alert-${ruleStatus.type} py-2`}>{ruleStatus.message}</div> : null}

              <div className="table-responsive">
                <table className="table table-modern table-sm align-middle">
                  <thead>
                    <tr><th>Rule Key</th><th>Description</th><th>Points</th><th>Update</th><th>Delete</th></tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.key}>
                        <td className="rule-key-cell">{rule.key}</td>
                        <td>{rule.description}</td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            type="number"
                            value={ruleEdits[rule.key] ?? Number(rule.points) ?? 0}
                            onChange={(event) =>
                              setRuleEdits((prev) => ({
                                ...prev,
                                [rule.key]: Number(event.target.value),
                              }))
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => updateRule(rule.key, ruleEdits[rule.key] ?? rule.points)}
                          >
                            Update
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                            onClick={() => deleteRule(rule.key)}
                          >
                            <FaTrash /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "staff" ? (
          <div className="card glass-card reveal reveal-delay-2">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="fw-bold mb-0 section-title">Staff Management</h5>
                <span className="small text-muted">Add staff details for student assignment</span>
              </div>

              <form className="row g-2 mb-3" onSubmit={addStaff}>
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder="Staff Name"
                    value={newStaff.name}
                    onChange={(event) => setNewStaff((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-5">
                  <input
                    className="form-control"
                    type="email"
                    placeholder="Staff Email"
                    value={newStaff.email}
                    onChange={(event) => setNewStaff((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-2 d-grid">
                  <button type="submit" className="btn btn-accent btn-glow">Add Staff</button>
                </div>
              </form>

              {staffStatus.message ? <div className={`alert alert-${staffStatus.type} py-2`}>{staffStatus.message}</div> : null}

              <div className="table-responsive">
                <table className="table table-modern table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.length ? (
                      staffUsers.map((staff) => {
                        const isEditing = editingStaffId === staff._id;

                        return (
                          <tr key={staff._id}>
                            <td>
                              {isEditing ? (
                                <input
                                  className="form-control form-control-sm"
                                  value={staffEdit.name}
                                  onChange={(event) => setStaffEdit((prev) => ({ ...prev, name: event.target.value }))}
                                />
                              ) : (
                                staff.name
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  className="form-control form-control-sm"
                                  type="email"
                                  value={staffEdit.email}
                                  onChange={(event) => setStaffEdit((prev) => ({ ...prev, email: event.target.value }))}
                                />
                              ) : (
                                staff.email || "-"
                              )}
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-success"
                                      onClick={() => saveStaff(staff._id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={cancelEditStaff}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                      onClick={() => beginEditStaff(staff)}
                                    >
                                      <FaEdit /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                      onClick={() => deleteStaffUser(staff)}
                                    >
                                      <FaTrash /> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-muted py-3 text-center">No staff users available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {showModal ? (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card reveal">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">{selectedStudentId ? "Edit Student" : "Add Student"}</h5>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeModal}>Close</button>
              </div>
              <form className="row g-2" onSubmit={submitStudent}>
                <div className="col-md-6">
                  <label className="form-label mb-1">Student Name</label>
                  <small className="text-muted d-block mb-1">Full name as per academic records.</small>
                  <input className="form-control" placeholder="Student Name" value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label mb-1">Register Number</label>
                  <small className="text-muted d-block mb-1">Unique student register ID.</small>
                  <input className="form-control" placeholder="Register Number" value={form.registerNumber} onChange={(e) => setForm((p) => ({ ...p, registerNumber: e.target.value }))} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label mb-1">Email ID</label>
                  <small className="text-muted d-block mb-1">Primary student email for communication.</small>
                  <input className="form-control" type="email" placeholder="student@college.edu" value={form.emailId} onChange={(e) => setForm((p) => ({ ...p, emailId: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label mb-1">Department</label>
                  <small className="text-muted d-block mb-1">Department name like Information Technology.</small>
                  <input className="form-control" placeholder="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} required />
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Semester</label>
                  <small className="text-muted d-block mb-1">Current semester number.</small>
                  <input className="form-control" type="number" min="1" placeholder="Semester" value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Attendance</label>
                  <small className="text-muted d-block mb-1">Attendance percentage, usually 0-100.</small>
                  <input className="form-control" type="number" min="0" max="100" placeholder="Attendance" value={form.attendancePercentage} onChange={(e) => setForm((p) => ({ ...p, attendancePercentage: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">PT Marks</label>
                  <small className="text-muted d-block mb-1">Periodical test marks out of 50.</small>
                  <input className="form-control" type="number" min="0" placeholder="PT Marks" value={form.periodicalTestMarks} onChange={(e) => setForm((p) => ({ ...p, periodicalTestMarks: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Skill Level</label>
                  <small className="text-muted d-block mb-1">Current skill score for the student.</small>
                  <input className="form-control" type="number" min="0" placeholder="Skill Level" value={form.skillLevel} onChange={(e) => setForm((p) => ({ ...p, skillLevel: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">CGPA</label>
                  <small className="text-muted d-block mb-1">Academic CGPA (for example 7.99).</small>
                  <input className="form-control" type="number" step="0.01" min="0" max="10" placeholder="CGPA" value={form.cgpa} onChange={(e) => setForm((p) => ({ ...p, cgpa: normalizeNumericInput(e.target.value, true) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Projects</label>
                  <small className="text-muted d-block mb-1">Number of completed projects.</small>
                  <input className="form-control" type="number" min="0" placeholder="Projects" value={form.projectsCompleted} onChange={(e) => setForm((p) => ({ ...p, projectsCompleted: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Activity Points</label>
                  <small className="text-muted d-block mb-1">Extracurricular and activity score.</small>
                  <input className="form-control" type="number" min="0" placeholder="Activity Points" value={form.activityPoints} onChange={(e) => setForm((p) => ({ ...p, activityPoints: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Reward Points</label>
                  <small className="text-muted d-block mb-1">Points compared with class average.</small>
                  <input className="form-control" type="number" min="0" placeholder="Reward Points" value={form.rewardPoints} onChange={(e) => setForm((p) => ({ ...p, rewardPoints: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Certifications</label>
                  <small className="text-muted d-block mb-1">Count of valid certifications.</small>
                  <input className="form-control" type="number" min="0" placeholder="Certifications" value={form.certificationsCount} onChange={(e) => setForm((p) => ({ ...p, certificationsCount: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Achievements</label>
                  <small className="text-muted d-block mb-1">Count of awards and achievements.</small>
                  <input className="form-control" type="number" min="0" placeholder="Achievements" value={form.achievementsCount} onChange={(e) => setForm((p) => ({ ...p, achievementsCount: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">Discipline Complaints</label>
                  <small className="text-muted d-block mb-1">Number of registered complaints.</small>
                  <input className="form-control" type="number" min="0" placeholder="Discipline Complaints" value={form.disciplineComplaintsCount} onChange={(e) => setForm((p) => ({ ...p, disciplineComplaintsCount: normalizeNumericInput(e.target.value) }))} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label mb-1">No. of Arrears</label>
                  <small className="text-muted d-block mb-1">Total current arrears (0 if none).</small>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    placeholder="No. of Arrears"
                    value={form.numberOfArrears}
                    onChange={(e) => {
                      const value = normalizeNumericInput(e.target.value);
                      setForm((p) => ({
                        ...p,
                        numberOfArrears: value,
                        standingArrears: Number(value) > 0,
                      }));
                    }}
                    required
                  />
                </div>
                {Array.isArray(form.semesterSgpa) && form.semesterSgpa.length ? (
                  <div className="col-12 mt-3">
                    <h6 className="fw-semibold mb-2">Completed Semester Performance</h6>
                    <div className="row g-2">
                      {form.semesterSgpa.map((value, index) => (
                        <div className="col-md-3" key={`sgpa-${index + 1}`}>
                          <label className="form-label mb-1">Sem {index + 1} SGPA</label>
                          <input
                            className="form-control"
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder={`Sem ${index + 1} SGPA`}
                            value={value}
                            onChange={(e) => {
                              const normalized = normalizeNumericInput(e.target.value, true);
                              setForm((p) => {
                                const next = [...(Array.isArray(p.semesterSgpa) ? p.semesterSgpa : [])];
                                next[index] = normalized;
                                return { ...p, semesterSgpa: next };
                              });
                            }}
                          />

                          <label className="form-label mb-1 mt-2">Sem {index + 1} Risk Score</label>
                          <input
                            className="form-control"
                            type="number"
                            min="0"
                            placeholder={`Sem ${index + 1} Risk Score`}
                            value={Array.isArray(form.semesterRiskScores) ? (form.semesterRiskScores[index] ?? "") : ""}
                            onChange={(e) => {
                              const normalized = normalizeNumericInput(e.target.value, true);
                              setForm((p) => {
                                const next = [...(Array.isArray(p.semesterRiskScores) ? p.semesterRiskScores : [])];
                                next[index] = normalized;
                                return { ...p, semesterRiskScores: next };
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="col-12 d-flex gap-2 mt-3">
                  <button className="btn btn-accent btn-glow" type="submit">{selectedStudentId ? "Update Student" : "Add Student"}</button>
                  <button className="btn btn-outline-secondary" type="button" onClick={closeModal}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default CoordinatorDashboard;

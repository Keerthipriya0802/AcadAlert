import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api";
import RiskBadge from "../components/RiskBadge";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RISK_RULES = [
  { rule: "attendanceBelow80", description: "Attendance below 80%" },
  { rule: "periodicalBelow25", description: "Periodical test below 25" },
  { rule: "standingArrear", description: "Standing arrear present" },
  { rule: "skillLevelAtMost4", description: "Skill level at or below 4" },
  { rule: "cgpaAtMost7", description: "CGPA at or below 7" },
  { rule: "disciplineComplaint", description: "Discipline complaints present" },
  { rule: "projectsBelow1", description: "Projects completed below 1" },
  { rule: "activityAtMost5000", description: "Activity points at or below 5000" },
  { rule: "rewardBelowClassAverage", description: "Reward points below class average" },
  { rule: "certificationsBelow1", description: "Certifications below 1" },
  { rule: "achievementsBelow1", description: "Achievements below 1" },
  { rule: "continuousPoorPerformance", description: "Continuous poor performance in two consecutive semesters" },
];

function StudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    api
      .get(`/students/${id}`)
      .then((res) => setStudent(res.data))
      .catch(() => setStudent(null));
  }, [id]);

  const semesterHistory = useMemo(() => {
    if (!student) return [];

    return [...(student.pastSemesterPerformance || [])].sort((a, b) => a.semester - b.semester);
  }, [student]);

  const chartData = useMemo(() => {
    if (!semesterHistory.length) return null;

    return {
      labels: semesterHistory.map((record) => `Sem ${record.semester}`),
      datasets: [
        {
          label: "SGPA",
          data: semesterHistory.map((record) => Number(record.cgpa) || 0),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderRadius: 8,
          yAxisID: "yCgpa",
          maxBarThickness: 26,
        },
        {
          label: "Risk Points",
          data: semesterHistory.map((record) => Number(record.riskScore) || 0),
          backgroundColor: "rgba(245, 101, 101, 0.72)",
          borderRadius: 8,
          yAxisID: "yRisk",
          maxBarThickness: 26,
        },
      ],
    };
  }, [semesterHistory]);

  const academicMetrics = useMemo(() => {
    if (!student) return [];

    return [
      { label: "Attendance", value: `${student.attendancePercentage}%` },
      { label: "CGPA", value: student.cgpa },
      { label: "Periodical Test", value: `${student.periodicalTestMarks}/50` },
      { label: "Skill Level", value: student.skillLevel },
      { label: "Standing Arrears", value: student.standingArrears ? "Yes" : "No" },
      { label: "Discipline Complaints", value: student.disciplineComplaintsCount },
      { label: "Projects Completed", value: student.projectsCompleted },
      { label: "Activity Points", value: student.activityPoints },
      { label: "Reward Points", value: student.rewardPoints },
      { label: "Certifications", value: student.certificationsCount },
      { label: "Achievements", value: student.achievementsCount },
    ];
  }, [student]);

  const riskPointMatrix = useMemo(() => {
    if (!student?.risk?.breakdown) return [];

    const pointsMap = Object.fromEntries(student.risk.breakdown.map((item) => [item.rule, item.points]));

    return RISK_RULES.map((rule) => ({
      ...rule,
      points: pointsMap[rule.rule] || 0,
    }));
  }, [student]);

  if (!student) {
    return (
      <DashboardLayout>
        <div className="card glass-card">
          <div className="card-body">Loading student details...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-shell staff-shell student-detail-shell">
        <div className="panel-hero p-4 mb-4 reveal dashboard-hero">
          <p className="hero-kicker mb-2">Student Academic Profile</p>
          <h4 className="fw-bold mb-1">{student.studentName}</h4>
          <p className="text-muted mb-0">
            Register No: {student.registerNumber} | {student.department} | Semester {student.semester}
          </p>
        </div>

        <div className="row g-3 mb-4 reveal reveal-delay-1">
          <div className="col-md-3">
            <div className="card glass-card h-100 detail-metric-card">
              <div className="card-body">
                <small className="text-muted d-block mb-1">Risk Score</small>
                <h4 className="fw-bold mb-0">{student.risk.totalRiskScore}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card glass-card h-100 detail-metric-card">
              <div className="card-body">
                <small className="text-muted d-block mb-1">Warning Level</small>
                <RiskBadge status={student.risk.riskStatus} />
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card glass-card h-100 detail-metric-card">
              <div className="card-body">
                <small className="text-muted d-block mb-1">Current CGPA</small>
                <h4 className="fw-bold mb-0">{student.cgpa}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card glass-card h-100 detail-metric-card">
              <div className="card-body">
                <small className="text-muted d-block mb-1">Attendance</small>
                <h4 className="fw-bold mb-0">{student.attendancePercentage}%</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-5 reveal reveal-delay-2">
            <div className="card glass-card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Academic Details</h5>
                <div className="student-academic-grid">
                  {academicMetrics.map((metric) => (
                    <div key={metric.label} className="student-academic-card">
                      <small>{metric.label}</small>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7 reveal reveal-delay-3">
            <div className="card glass-card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Completed Semester SGPA Trend</h5>
                {chartData ? (
                  <div className="student-chart-wrap">
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, position: "bottom" },
                        },
                        scales: {
                          yCgpa: {
                            type: "linear",
                            position: "left",
                            suggestedMin: 0,
                            suggestedMax: 10,
                            title: { display: true, text: "SGPA" },
                            grid: { color: "rgba(100, 116, 139, 0.12)" },
                          },
                          yRisk: {
                            type: "linear",
                            position: "right",
                            beginAtZero: true,
                            suggestedMax: Math.max(...semesterHistory.map((record) => record.riskScore || 0), 4),
                            title: { display: true, text: "Risk Points" },
                            grid: { drawOnChartArea: false },
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

          <div className="col-12 reveal reveal-delay-4">
            <div className="card glass-card">
              <div className="card-body">
                <h5 className="fw-bold mb-3 section-title">Risk Points Matrix</h5>
                <div className="table-responsive">
                  <table className="table table-modern table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Risk Condition</th>
                        <th>Points Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskPointMatrix.map((item) => (
                        <tr key={item.rule}>
                          <td>{item.description}</td>
                          <td className={item.points > 0 ? "text-danger fw-semibold" : "text-muted"}>
                            {item.points > 0 ? `+${item.points}` : "0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {student.pastSemesterPerformance?.length ? (
            <div className="col-12 reveal reveal-delay-4">
              <div className="card glass-card">
                <div className="card-body">
                  <h5 className="fw-bold mb-3 section-title">Past Semester Records</h5>
                  <div className="table-responsive">
                    <table className="table table-modern table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Semester</th>
                          <th>SGPA</th>
                          <th>Risk Score</th>
                          <th>Warning Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...student.pastSemesterPerformance]
                          .sort((a, b) => a.semester - b.semester)
                          .map((record) => (
                            <tr key={record.semester}>
                              <td>Sem {record.semester}</td>
                              <td>{record.cgpa}</td>
                              <td>{record.riskScore || 0}</td>
                              <td>{record.warningLevel || "Safe"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StudentDetailPage;

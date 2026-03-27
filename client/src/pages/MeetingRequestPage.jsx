import { useEffect, useState } from "react";
import { FaCalendarCheck } from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function MeetingRequestPage() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [form, setForm] = useState({
    requestType: "Advisor Meeting",
    description: "",
  });

  useEffect(() => {
    async function loadStudent() {
      const response = await api.get(`/students/student-user/${user.id}`);
      setStudentId(response.data._id);
    }

    if (user?.id) {
      loadStudent().catch(() => {
        setStatus({ type: "danger", message: "Unable to load student profile" });
      });
    }
  }, [user?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    try {
      await api.post("/meeting-request", {
        studentId,
        requestedBy: user.id,
        requestType: form.requestType,
        description: form.description,
        createdByRole: "student",
      });
      setForm((prev) => ({ ...prev, description: "" }));
      setStatus({ type: "success", message: "Meeting request submitted successfully." });
    } catch (error) {
      setStatus({ type: "danger", message: error?.response?.data?.message || "Submission failed." });
    }
  };

  return (
    <DashboardLayout>
      <div className="row justify-content-center">
        <div className="col-lg-7 reveal">
          <div className="card glass-card">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3 section-title d-flex align-items-center gap-2">
                <FaCalendarCheck className="hover-bounce" /> Meeting Request
              </h4>
              <p className="text-muted">Submit requests for advisor, remedial, or counseling sessions.</p>

              {status.message ? <div className={`alert alert-${status.type}`}>{status.message}</div> : null}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Meeting Type</label>
                  <select
                    className="form-select"
                    value={form.requestType}
                    onChange={(event) => setForm((prev) => ({ ...prev, requestType: event.target.value }))}
                  >
                    <option>Advisor Meeting</option>
                    <option>Remedial Class</option>
                    <option>Counseling Session</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Request Description</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />
                </div>

                <button className="btn btn-accent btn-glow" type="submit" disabled={!studentId}>
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MeetingRequestPage;

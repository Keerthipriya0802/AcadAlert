import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaEye, FaEyeSlash, FaKey, FaUserGraduate } from "react-icons/fa";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { auth, isFirebaseConfigured } from "../firebase";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canUseFirebaseGoogleSignIn = isFirebaseConfigured && Boolean(auth);

  const navigateByRole = (loggedInUser) => {
    if (loggedInUser.role === "student") navigate("/student");
    if (loggedInUser.role === "staff") navigate("/staff");
    if (loggedInUser.role === "coordinator") navigate("/coordinator");
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      const loggedInUser = response.data.user;
      login(loggedInUser);
      navigateByRole(loggedInUser);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Firebase is not configured for Google sign-in.");
      return;
    }

    const provider = new GoogleAuthProvider();
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const response = await api.post("/auth/firebase-login", { idToken });
      const loggedInUser = response.data.user;
      login(loggedInUser);
      navigateByRole(loggedInUser);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center min-vh-100 p-3 p-md-4">
      <div className="login-shape login-shape-one" />
      <div className="login-shape login-shape-two" />

      <div className="login-card card border-0">
        <div className="card-body p-4 p-lg-5">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-6 reveal">
              <div className="login-side-panel h-100">
                <div className="login-side-content h-100 d-flex flex-column">
                  <span className="login-hero-tag">Early Alert Platform</span>
                  <h2 className="login-hero-title mt-3 mb-2">Predict. Prevent. Progress.</h2>
                  <p className="login-side-subtext mb-4">
                    A focused academic warning workspace that helps teams spot risk early and take meaningful action.
                  </p>

                  <div className="login-feature-grid mb-4">
                    <div className="login-feature-item">24/7 Monitoring</div>
                    <div className="login-feature-item">Automated Alerts</div>
                    <div className="login-feature-item">Guided Follow-up</div>
                  </div>

                  <div className="login-illustration mt-auto">
                    <FaUserGraduate />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6 reveal reveal-delay-1">
              <div className="login-form-shell">
                <div className="login-brand mb-3">
                  <span className="login-brand-mark" aria-hidden="true">
                    <FaUserGraduate />
                  </span>
                  <div>
                    <h5 className="mb-0 fw-bold">AcadAlert</h5>
                    <small className="text-muted">Smart Academic Warning System</small>
                  </div>
                </div>
                <h4 className="login-form-title mb-1">Sign In</h4>
                <p className="login-form-subtitle mb-4">Use your institutional account credentials.</p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3 input-wrap">
                    <FaEnvelope className="field-icon" />
                    <input
                      className="form-control form-control-lg with-icon"
                      type="email"
                      name="email"
                      placeholder=" "
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                    <label>Email Address</label>
                  </div>

                  <div className="mb-3 input-wrap">
                    <FaKey className="field-icon" />
                    <input
                      className="form-control form-control-lg with-icon with-trailing"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder=" "
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                    <label>Password</label>
                    <button
                      className="input-action"
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {error ? <div className="alert alert-danger py-2 login-error-shake">{error}</div> : null}

                  <button className="btn btn-accent btn-glow w-100 py-2" type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>

                <div className="my-3 text-center text-muted small">or</div>
                {canUseFirebaseGoogleSignIn ? (
                  <div className="d-flex justify-content-center">
                    <button
                      className="google-signin-btn"
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <span className="google-signin-icon" aria-hidden="true">G</span>
                      <span>{loading ? "Connecting..." : "Continue with Google"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="small text-muted text-center">Firebase Google sign-in is not configured.</div>
                )}

                <div className="mt-4 small text-muted reveal reveal-delay-2 login-credentials">
                  <div className="quick-chip">Student: keerthipriya.it23@bitsathy.ac.in / student</div>
                  <div className="quick-chip">Staff: keerthipriya0802@gmail.com / staff</div>
                  <div className="quick-chip">Coordinator: keerthipriyanagarajan552@gmail.com / coordinator</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

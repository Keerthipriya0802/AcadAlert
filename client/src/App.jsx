import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import MeetingRequestPage from "./pages/MeetingRequestPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

function App() {
  const { user, isAuthenticated } = useAuth();

  const homeElement = isAuthenticated
    ? <Navigate to={user?.role === "student" ? "/student" : user?.role === "staff" ? "/staff" : "/coordinator"} replace />
    : <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={homeElement} />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meeting-request"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <MeetingRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator"
        element={
          <ProtectedRoute allowedRoles={["coordinator"]}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute allowedRoles={["staff", "coordinator"]}>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

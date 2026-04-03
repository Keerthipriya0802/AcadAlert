import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Some environments expose performance but miss mark/measure clearing methods.
// Provide no-op fallbacks so third-party libs do not crash at runtime.
if (typeof window !== "undefined" && window.performance) {
  if (typeof window.performance.clearMarks !== "function") {
    window.performance.clearMarks = () => {};
  }
  if (typeof window.performance.clearMeasures !== "function") {
    window.performance.clearMeasures = () => {};
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

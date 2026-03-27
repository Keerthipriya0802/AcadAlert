import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function getStoredUser() {
  const localValue = localStorage.getItem("acadalert-user");
  const sessionValue = sessionStorage.getItem("acadalert-user");
  const saved = localValue || sessionValue;
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("acadalert-user");
    sessionStorage.removeItem("acadalert-user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const login = (loggedInUser) => {
    localStorage.setItem("acadalert-user", JSON.stringify(loggedInUser));
    sessionStorage.setItem("acadalert-user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem("acadalert-user");
    sessionStorage.removeItem("acadalert-user");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

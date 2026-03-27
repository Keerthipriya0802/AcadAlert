import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  FaBookOpen,
  FaChalkboardTeacher,
  FaChevronDown,
  FaGraduationCap,
  FaSignOutAlt,
  FaUserCircle,
  FaUsersCog,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openProfile, setOpenProfile] = useState(false);

  const navItems = useMemo(() => {
    if (user?.role === "student") {
      return [
        { to: "/student", label: "Dashboard", icon: FaGraduationCap },
        { to: "/meeting-request", label: "Meetings", icon: FaBookOpen },
      ];
    }

    if (user?.role === "staff") {
      return [{ to: "/staff", label: "Staff Dashboard", icon: FaChalkboardTeacher }];
    }

    if (user?.role === "coordinator") {
      return [{ to: "/coordinator", label: "Coordinator", icon: FaUsersCog }];
    }

    return [];
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg app-navbar sticky-top">
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/" onClick={() => setOpenProfile(false)}>
          <span className="brand-mark">A</span>
          <span>AcadAlert</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li className="nav-item" key={item.to}>
                  <NavLink className="nav-link d-flex align-items-center gap-2" to={item.to} onClick={() => setOpenProfile(false)}>
                    <span className="nav-icon-wrap">
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="ms-lg-3 profile-menu-wrap">
            <button
              type="button"
              className="btn profile-trigger d-flex align-items-center gap-2"
              onClick={() => setOpenProfile((prev) => !prev)}
            >
              <FaUserCircle />
              <span className="small fw-semibold">{user?.name}</span>
              <FaChevronDown className={`chevron ${openProfile ? "open" : ""}`} />
            </button>
            {openProfile ? (
              <div className="profile-menu-dropdown" role="menu">
                <p className="mb-2 small text-muted text-uppercase">{user?.role}</p>
                <button className="btn btn-sm w-100 d-flex align-items-center gap-2 justify-content-center profile-logout-btn" onClick={handleLogout} type="button">
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;

import AppNavbar from "../components/AppNavbar";

function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <AppNavbar />
      <main className="container-fluid px-4 py-4 app-content">{children}</main>
    </div>
  );
}

export default DashboardLayout;

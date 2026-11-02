import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { TopBar } from "./TopBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { LeafIcon } from "./BrandLogo.jsx";

export function Layout() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--ivory)",
          gap: "16px",
        }}
      >
        <LeafIcon size={40} />
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            color: "var(--text-muted)",
          }}
        >
          Connecting to FitWise...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/connect" replace />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--ivory)" }}>
      {/* Fixed Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div
        className="main-layout-content"
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.25s ease",
        }}
      >
        {/* TopBar */}
        <TopBar onOpenMobile={() => setMobileOpen(true)} />

        {/* Page Body */}
        <main
          style={{
            flex: 1,
            padding: "32px",
            maxWidth: "1400px",
            width: "100%",
            boxSizing: "border-box",
            margin: "0 auto",
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .main-layout-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Layout;

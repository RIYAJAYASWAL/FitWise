import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Shirt,
  TrendingUp,
  Lightbulb,
  Stethoscope,
  ShoppingBag,
  FlaskConical,
  Eye,
  Settings,
  Users,
  BookOpen,
  X,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/recommendations", label: "Recommendations", icon: Shirt },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/suggestions", label: "Suggestions", icon: Lightbulb },
  { path: "/communities", label: "Communities", icon: Users },
  { path: "/journals", label: "Journals", icon: BookOpen },
  { path: "/chart-doctor", label: "Chart Doctor", icon: Stethoscope },
  { path: "/products", label: "Products", icon: ShoppingBag },
  { path: "/experiments", label: "Experiments", icon: FlaskConical },
  { path: "/widget-preview", label: "Widget Preview", icon: Eye },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ mobileOpen = false, onCloseMobile = () => { } }) {
  const { store } = useAuth();
  const ownerName = store?.ownerName || "Riya Jayaswal";

  const getInitials = (name) => {
    if (!name) return "FW";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12, 24, 34, 0.6)",
            zIndex: 40,
            backdropFilter: "blur(2px)",
          }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar-root ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: "var(--sidebar-width)",
          minWidth: "var(--sidebar-width)",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "var(--navy)",
          backgroundImage:
            "linear-gradient(180deg, rgba(12, 24, 34, 0.4) 0%, rgba(12, 24, 34, 0.2) 50%, rgba(12, 24, 34, 0.55) 100%), url('/sidebar-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
          color: "var(--sidebar-text)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 50,
          borderRight: "1px solid rgba(233, 226, 214, 0.08)",
          boxSizing: "border-box",
          padding: "24px 16px 20px 16px",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-label="Main Navigation"
      >
        {/* Top: Logo & Close Button (mobile) */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 8px 28px 8px",
            }}
          >
            <BrandLogo size={28} lightText={true} />

            {/* Close button visible on small screens */}
            <button
              onClick={onCloseMobile}
              className="mobile-close-btn"
              aria-label="Close navigation sidebar"
              style={{
                color: "var(--sidebar-text)",
                padding: "4px",
                display: "none",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#F7F3EC" : "var(--sidebar-text)",
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.12)"
                      : "transparent",
                    backdropFilter: isActive ? "blur(6px)" : "none",
                    WebkitBackdropFilter: isActive ? "blur(6px)" : "none",
                    transition: "all 0.15s ease",
                    textDecoration: "none",
                  })}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Card matching mockup */}
        <div
          style={{
            paddingTop: "16px",
            borderTop: "1px solid rgba(233, 226, 214, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 10px",
              borderRadius: "10px",
              backgroundColor: "rgba(12, 24, 34, 0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-strong)",
                color: "#F7F3EC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 600,
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
              aria-hidden="true"
            >
              {getInitials(ownerName)}
            </div>

            {/* Owner Name & Role */}
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#F7F3EC",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ownerName}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--sidebar-text)",
                  opacity: 0.85,
                }}
              >
                Store Owner
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 900px) {
          .sidebar-root {
            transform: translateX(-100%);
          }
          .sidebar-root.mobile-open {
            transform: translateX(0);
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

export default Sidebar;

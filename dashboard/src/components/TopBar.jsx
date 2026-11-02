import React, { useState, useRef, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Bell, Menu, Sun, Moon, LogOut, ChevronDown, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export function TopBar({ onOpenMobile = () => {} }) {
  const { store, disconnect } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isExperiments = location.pathname.startsWith("/experiments");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("q", val);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const ownerName = store?.ownerName || "Riya Jayaswal";

  // Format today's date: e.g. "Sun, 11 Oct 2026"
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const getInitials = (name) => {
    if (!name) return "FW";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: "var(--topbar-height)",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--hairline)",
        backgroundColor: "var(--ivory)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: Mobile hamburger & Experiments search bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
        <button
          onClick={onOpenMobile}
          className="mobile-hamburger"
          aria-label="Open navigation sidebar"
          style={{
            display: "none",
            color: "var(--text)",
            padding: "6px",
            borderRadius: "6px",
          }}
        >
          <Menu size={22} />
        </button>

        {isExperiments ? (
          <div style={{ position: "relative", width: "100%", maxWidth: "440px" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="topbar-experiments-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search experiments, variants, or goals..."
              style={{
                width: "100%",
                padding: "8px 14px 8px 38px",
                borderRadius: "var(--radius-chip)",
                border: "1px solid rgba(233, 226, 214, 0.8)",
                backgroundColor: "rgba(255, 255, 255, 0.65)",
                color: "var(--text)",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Right Controls: Date, Bell, Avatar Menu */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Date (hidden on experiments page to match reference) */}
        {!isExperiments && (
          <span
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            {formattedDate}
          </span>
        )}

        {/* Static Bell Icon */}
        <div
          title="Notifications"
          style={{
            position: "relative",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--hairline)",
            cursor: "default",
          }}
        >
          <Bell size={18} strokeWidth={1.8} />
          {/* Subtle notification indicator dot */}
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "9px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "var(--accent-strong)",
            }}
          />
        </div>

        {/* User Avatar & Disconnect Menu */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="User account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px 4px 4px",
              borderRadius: "20px",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--hairline)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-strong)",
                color: "#F7F3EC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {getInitials(ownerName)}
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text)",
                maxWidth: "110px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ownerName}
            </span>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "220px",
                padding: "8px",
                zIndex: 100,
                boxShadow: "0 8px 24px rgba(12, 24, 34, 0.12)",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--hairline)",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                  {ownerName}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {store?.name || "FitWise Store"}
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--text)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </button>

              {/* Disconnect Button */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  disconnect();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--danger-text)",
                  backgroundColor: "transparent",
                  marginTop: "2px",
                }}
              >
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .mobile-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}

export default TopBar;

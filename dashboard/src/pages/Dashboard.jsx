import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Percent,
  RotateCcw,
  Tag,
  ArrowRight,
  Shirt,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Baseline Data directly matching Reference Image
const REFERENCE_DASHBOARD = {
  ownerName: "Riya",
  totalRecommendations: "12,480",
  recommendationsDelta: "12% vs last 7 days",
  avgConfidence: "92.4%",
  confidenceDelta: "2% vs last 7 days",
  returnRate: "8.7%",
  returnDelta: "2.1% vs last 7 days",
  activeBrands: "38",
  brandsDelta: "5 new this week",
  topCategories: [
    {
      name: "Jeans",
      percentage: "28%",
      color: "#4A6B82",
      bg: "rgba(74, 107, 130, 0.12)",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 2h16v3l-2 17h-4l-2-11-2 11H6L4 5V2z" />
        </svg>
      ),
    },
    {
      name: "Tops & T-Shirts",
      percentage: "22%",
      color: "#5C7C99",
      bg: "rgba(92, 124, 153, 0.12)",
      icon: <Shirt size={16} strokeWidth={2} />,
    },
    {
      name: "Dresses",
      percentage: "16%",
      color: "#D9777F",
      bg: "rgba(217, 119, 127, 0.12)",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3l3 4-2 14h10l-2-14 3-4-4-1-2 3-2-3-4 1z" />
        </svg>
      ),
    },
    {
      name: "Formal Wear",
      percentage: "14%",
      color: "#A64B56",
      bg: "rgba(166, 75, 86, 0.12)",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M12 3v18" />
          <path d="M8 3l4 6 4-6" />
        </svg>
      ),
    },
    {
      name: "Ethnic Wear",
      percentage: "10%",
      color: "#8C624F",
      bg: "rgba(140, 98, 79, 0.12)",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 3h10l2 7-3 11H8L5 10l2-7z" />
          <path d="M12 3v6" />
        </svg>
      ),
    },
    {
      name: "Others",
      percentage: "8%",
      color: "#C9865B",
      bg: "rgba(201, 134, 91, 0.12)",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
    },
  ],
};

export function Dashboard() {
  const { store } = useAuth();
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setError(null);
    try {
      await Promise.all([
        api.getAnalyticsSummary().catch(() => null),
        api.getStore().catch(() => null),
      ]);
    } catch (err) {
      console.warn("Dashboard sync notice:", err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Time-aware greeting
  const getGreeting = (name) => {
    const hour = new Date().getHours();
    let text = "Good morning";
    if (hour >= 12 && hour < 17) {
      text = "Good afternoon";
    } else if (hour >= 17 || hour < 5) {
      text = "Good evening";
    }
    return `${text}, ${name}! ☀️`;
  };

  const rawOwnerName = store?.ownerName || REFERENCE_DASHBOARD.ownerName;
  const ownerFirstName = rawOwnerName.trim().split(/\s+/)[0] || rawOwnerName;
  const greetingText = getGreeting(ownerFirstName);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Greeting Header matching reference image */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "36px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "6px",
              lineHeight: 1.2,
            }}
          >
            {greetingText}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Here's what's happening with your store today.
          </p>
        </div>

        {error && (
          <button
            onClick={fetchDashboardData}
            className="btn-secondary"
            style={{ fontSize: "13px" }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Error Alert State (if any) */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger-text)",
            fontSize: "13.5px",
            border: "1px solid rgba(142, 58, 63, 0.2)",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric Cards Grid directly matching Reference Image */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        {/* 1. Total Recommendations */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgba(100, 138, 142, 0.15)",
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={14} />
            </div>
            <span>Total Recommendations</span>
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            {REFERENCE_DASHBOARD.totalRecommendations}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#2F8E7D",
              fontWeight: 500,
            }}
          >
            <TrendingUp size={14} strokeWidth={2.4} />
            <span>{REFERENCE_DASHBOARD.recommendationsDelta}</span>
          </div>
        </div>

        {/* 2. Avg. Confidence Score */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgba(104, 168, 152, 0.15)",
                color: "var(--chart-teal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Percent size={14} />
            </div>
            <span>Avg. Confidence Score</span>
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            {REFERENCE_DASHBOARD.avgConfidence}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#2F8E7D",
              fontWeight: 500,
            }}
          >
            <TrendingUp size={14} strokeWidth={2.4} />
            <span>{REFERENCE_DASHBOARD.confidenceDelta}</span>
          </div>
        </div>

        {/* 3. Return Rate (size-related) */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgba(161, 93, 95, 0.15)",
                color: "var(--chart-brick)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={14} />
            </div>
            <span>Return Rate (Size-related)</span>
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            {REFERENCE_DASHBOARD.returnRate}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#9E5558",
              fontWeight: 500,
            }}
          >
            <TrendingDown size={14} strokeWidth={2.4} />
            <span>{REFERENCE_DASHBOARD.returnDelta}</span>
          </div>
        </div>

        {/* 4. Active Brands */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgba(100, 138, 142, 0.15)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tag size={14} />
            </div>
            <span>Active Brands</span>
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            {REFERENCE_DASHBOARD.activeBrands}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#2F8E7D",
              fontWeight: 500,
            }}
          >
            <TrendingUp size={14} strokeWidth={2.4} />
            <span>{REFERENCE_DASHBOARD.brandsDelta}</span>
          </div>
        </div>
      </div>

      {/* Main Section: Hero Card + Top Categories Card */}
      <div
        className="dashboard-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.65fr 1fr",
          gap: "22px",
        }}
      >
        {/* Left Hero Card matching Reference Mockup */}
        <div
          className="card"
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "360px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "36px 40px",
            backgroundImage: "url('/banner-hero.png')",
            backgroundSize: "cover",
            backgroundPosition: "left center",
            boxSizing: "border-box",
            border: "1px solid var(--hairline)",
          }}
        >
          {/* Hero Content (Right aligned) */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: "360px",
              marginLeft: "auto",
              textAlign: "left",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "36px",
                fontWeight: 600,
                color: "#101822",
                lineHeight: 1.15,
                marginBottom: "14px",
                whiteSpace: "pre-line",
              }}
            >
              {"Smarter Sizing.\nBetter Business."}
            </h2>

            <p
              style={{
                fontSize: "13.5px",
                color: "#5F6670",
                lineHeight: 1.5,
                marginBottom: "24px",
              }}
            >
              AI-powered recommendations that work across every brand, every fit.
            </p>

            <Link
              to="/analytics"
              className="btn-navy"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                fontSize: "13.5px",
                borderRadius: "var(--radius-btn)",
                boxShadow: "0 4px 12px rgba(12, 24, 34, 0.15)",
              }}
            >
              <span>View Analytics</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Right: Top Categories Card directly matching Reference Mockup */}
        <div
          className="card"
          style={{
            padding: "24px 26px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Top Categories
            </h3>
          </div>

          {/* Categories List matching clean rows in reference image */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
              justifyContent: "space-around",
            }}
          >
            {REFERENCE_DASHBOARD.topCategories.map((item, idx) => (
              <div
                key={item.name || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: item.bg,
                      color: item.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {item.name}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {item.percentage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;

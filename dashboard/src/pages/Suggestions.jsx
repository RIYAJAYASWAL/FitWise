import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Ruler,
  BookOpen,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../api.js";
import { ImpactChip } from "../components/Chips.jsx";

export function Suggestions() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSuggestions();
      setData(res || { topInsight: null, items: [] });
    } catch (err) {
      console.error("Failed to load suggestions:", err);
      setError(err.message || "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleNavigate = (target) => {
    if (!target || !target.route) return;
    if (target.sku) {
      navigate(`${target.route}?sku=${encodeURIComponent(target.sku)}`);
    } else {
      navigate(target.route);
    }
  };

  const getItemIcon = (item) => {
    const id = item?.id || "";
    const title = (item?.title || "").toLowerCase();

    if (id.startsWith("flag_") || title.includes("size chart")) {
      return <Ruler size={19} strokeWidth={2} />;
    }
    if (id.startsWith("guide_") || title.includes("guide")) {
      return <BookOpen size={19} strokeWidth={2} />;
    }
    if (id.startsWith("brand_") || title.includes("label") || title.includes("brand")) {
      return <SlidersHorizontal size={19} strokeWidth={2} />;
    }
    return <Sparkles size={19} strokeWidth={2} />;
  };

  const items = data?.items || [];
  const topInsight = data?.topInsight;
  const topItem = items.length > 0 ? items[0] : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1080px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Page Header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "32px",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.2,
          }}
        >
          Suggestions
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "14px",
            marginTop: "6px",
          }}
        >
          Personalized insights to help you improve recommendations and reduce returns.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className="card"
          style={{
            padding: "64px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            color: "var(--text-muted)",
          }}
        >
          <RefreshCw size={26} className="spinning" />
          <span style={{ fontSize: "14px" }}>Analyzing sizing trends & suggestions...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          className="card"
          style={{
            padding: "48px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--danger-bg)",
              color: "var(--danger-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "17px", color: "var(--text)", marginBottom: "4px" }}>
              Unable to load suggestions
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>{error}</p>
          </div>
          <button
            onClick={fetchSuggestions}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Content State */}
      {!loading && !error && (
        <>
          {/* Hero Card */}
          {topInsight && (
            <div
              className="card suggestions-hero-card"
              style={{
                position: "relative",
                borderRadius: "var(--radius-card)",
                overflow: "hidden",
                border: "1px solid var(--hairline)",
                minHeight: "260px",
                display: "flex",
                alignItems: "center",
                backgroundImage: `url("/suggestions-hero.png")`,
                backgroundSize: "cover",
                backgroundPosition: "center left",
                boxShadow: "var(--shadow-subtle)",
              }}
            >
              {/* Text Content in the Right/Center Area */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  marginLeft: "auto",
                  width: "100%",
                  maxWidth: "580px",
                  padding: "36px 40px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                {/* Small "Insight" Chip (not "Powered by AI") */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 14px",
                    borderRadius: "var(--radius-chip)",
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    border: "1px solid var(--hairline)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "12px",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  Insight
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Your top insight
                </div>

                {/* Top Insight Statement */}
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    lineHeight: 1.35,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "20px",
                    maxWidth: "500px",
                  }}
                >
                  {topInsight}
                </p>

                {/* Navy "View Details" Pill Button */}
                <button
                  type="button"
                  className="btn-navy"
                  onClick={() => handleNavigate(topItem?.target)}
                  aria-label="View Details on top insight"
                  style={{
                    borderRadius: "var(--radius-chip)",
                    padding: "10px 22px",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 6px rgba(12, 24, 34, 0.15)",
                  }}
                >
                  <span>View Details</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* More Suggestions Section */}
          <div style={{ marginTop: topInsight ? "12px" : "0" }}>
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "14px",
              }}
            >
              More Suggestions
            </h2>

            {/* Empty State */}
            {items.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: "56px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "var(--success-bg)",
                    color: "var(--success-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: "4px",
                    }}
                  >
                    Nothing needs attention
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "13.5px",
                      maxWidth: "420px",
                    }}
                  >
                    All size charts and categories are performing well with low return rates.
                  </p>
                </div>
              </div>
            ) : (
              /* Suggestions List */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNavigate(item.target)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNavigate(item.target);
                      }
                    }}
                    className="card suggestion-card-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 22px",
                      borderRadius: "var(--radius-card)",
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      cursor: "pointer",
                      transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                      gap: "16px",
                    }}
                  >
                    {/* Left: Icon and Text */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {/* Icon Container - Squircle with subtle border matching reference */}
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
                          borderRadius: "14px",
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--hairline)",
                          color: "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        {getItemIcon(item)}
                      </div>

                      {/* Title & Detail */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "var(--text)",
                            lineHeight: 1.3,
                            marginBottom: "3px",
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.detail}
                        </div>
                      </div>
                    </div>

                    {/* Right: Impact Chip and Chevron */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexShrink: 0,
                      }}
                    >
                      <ImpactChip impact={item.impact} />
                      <ChevronRight
                        size={19}
                        style={{
                          color: "var(--text-muted)",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Suggestions;

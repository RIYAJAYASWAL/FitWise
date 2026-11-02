import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Eye,
  MoreVertical,
  FlaskConical,
  Users,
  Sliders,
  Layout,
  Layers,
  ArrowRight,
  AlertTriangle,
  Pause,
  Play,
  Check,
  X,
} from "lucide-react";
import api from "../api.js";
import { ExperimentResultsPanel } from "../components/ExperimentResultsPanel.jsx";

const TYPE_CONFIG = {
  widget_toggle: {
    label: "Widget on/off",
    icon: Sliders,
    circleBg: "rgba(100, 138, 142, 0.15)",
    iconColor: "var(--accent-strong)",
  },
  widget_design: {
    label: "Widget design",
    icon: Layout,
    circleBg: "rgba(104, 168, 152, 0.18)",
    iconColor: "var(--chart-teal)",
  },
  widget_placement: {
    label: "Widget placement",
    icon: Layers,
    circleBg: "rgba(161, 93, 95, 0.15)",
    iconColor: "var(--chart-brick)",
  },
};

const GOAL_LABELS = {
  conversion_rate: "Conversion rate",
  return_rate: "Return rate",
  add_to_cart_rate: "Add-to-cart rate",
};

export function Experiments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedExperimentId = searchParams.get("experiment");
  const searchQuery = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState("all");
  const [experiments, setExperiments] = useState([]);
  const [counts, setCounts] = useState({ all: 0, running: 0, completed: 0, paused: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Menu dropdown state
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  // Complete confirmation dialog state
  const [confirmCompleteExp, setConfirmCompleteExp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    type: "widget_toggle",
    goal: "conversion_rate",
    variantALabel: "Widget Hidden",
    variantBLabel: "Widget Active",
    split: 50,
    designStyle: "drawer",
    placementPosition: "below_cta",
  });

  // Fetch experiments
  const loadExperiments = () => {
    setLoading(true);
    setError(null);
    api
      .getExperiments({ status: activeTab, q: searchQuery })
      .then((data) => {
        setExperiments(data.experiments || []);
        if (data.counts) {
          setCounts(data.counts);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load experiments.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadExperiments();
  }, [activeTab, searchQuery]);

  // Close row actions menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Drawer handlers
  const handleOpenResults = (expId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("experiment", expId);
    setSearchParams(nextParams);
  };

  const handleCloseResults = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("experiment");
    setSearchParams(nextParams);
  };

  // Status changes from row menu
  const handleStatusChange = async (expId, nextStatus) => {
    setActionLoading(true);
    try {
      await api.updateExperimentStatus(expId, nextStatus);
      setMenuOpenId(null);
      setConfirmCompleteExp(null);
      loadExperiments();
    } catch (err) {
      alert(err.message || "Failed to change status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create form submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    const payload = {
      name: formValues.name,
      description: formValues.description,
      type: formValues.type,
      goal: formValues.goal,
      variants: {
        a: { label: formValues.variantALabel || "Original" },
        b: { label: formValues.variantBLabel || "Variant B" },
      },
      split: Number(formValues.split) / 100,
      config:
        formValues.type === "widget_design"
          ? { style: formValues.designStyle }
          : formValues.type === "widget_placement"
          ? { position: formValues.placementPosition }
          : {},
    };

    try {
      const created = await api.createExperiment(payload);
      setCreateModalOpen(false);
      setFormValues({
        name: "",
        description: "",
        type: "widget_toggle",
        goal: "conversion_rate",
        variantALabel: "Widget Hidden",
        variantBLabel: "Widget Active",
        split: 50,
        designStyle: "drawer",
        placementPosition: "below_cta",
      });
      loadExperiments();
      if (created?.experimentId) {
        handleOpenResults(created.experimentId);
      }
    } catch (err) {
      setCreateError(err.message || "Failed to create experiment.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1380px",
        margin: "0 auto",
      }}
    >
      {/* Header Banner Area matching Reference Image */}
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          minHeight: "140px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "24px 32px",
          backgroundImage: "url('/leaf-banner.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right center",
          backgroundSize: "cover",
          border: "1px solid rgba(233, 226, 214, 0.4)",
          boxShadow: "0 2px 10px rgba(12, 24, 34, 0.03)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "36px",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            A/B Testing
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginTop: "6px",
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            Test different variants, find what works best, and improve performance.
          </p>
        </div>

        {/* Navy "Create A/B Test" button */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <button
            id="create-experiment-top-btn"
            onClick={() => setCreateModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              borderRadius: "var(--radius-chip)",
              backgroundColor: "var(--navy)",
              color: "#F7F3EC",
              fontSize: "14px",
              fontWeight: 500,
              boxShadow: "0 2px 8px rgba(12, 24, 34, 0.16)",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Create A/B Test</span>
          </button>
        </div>
      </div>

      {/* Pill Filter Tabs: All (n), Running (n), Completed (n), Paused (n) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "running", label: "Running", count: counts.running },
          { key: "completed", label: "Completed", count: counts.completed },
          { key: "paused", label: "Paused", count: counts.paused },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "var(--radius-chip)",
                fontSize: "13.5px",
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? "var(--navy)" : "rgba(255, 255, 255, 0.75)",
                color: isActive ? "#F7F3EC" : "var(--text)",
                border: isActive ? "1px solid var(--navy)" : "1px solid var(--hairline)",
                boxShadow: isActive ? "0 2px 6px rgba(12, 24, 34, 0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "12px",
                  opacity: isActive ? 0.9 : 0.65,
                }}
              >
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Experiments Main Table Card */}
      <div
        className="card"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          borderRadius: "16px",
          border: "1px solid var(--hairline)",
          boxShadow: "0 2px 12px rgba(12, 24, 34, 0.04)",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <FlaskConical size={32} className="spinning" />
            <span>Loading experiments...</span>
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--danger-text)",
            }}
          >
            <AlertTriangle size={32} style={{ marginBottom: "8px" }} />
            <p>{error}</p>
            <button
              onClick={loadExperiments}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                borderRadius: "var(--radius-btn)",
                backgroundColor: "var(--navy)",
                color: "#F7F3EC",
                fontSize: "13px",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && experiments.length === 0 && (
          <div
            style={{
              padding: "64px 32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(100, 138, 142, 0.12)",
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FlaskConical size={26} />
            </div>
            <h3 style={{ fontSize: "17px", color: "var(--text)", margin: 0 }}>
              No experiments found
            </h3>
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-muted)",
                maxWidth: "380px",
                margin: 0,
              }}
            >
              {searchQuery
                ? `No tests match "${searchQuery}". Try a different term or clear the filter.`
                : "No A/B tests found in this tab. Create your first experiment to optimize shopper conversions."}
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                marginTop: "6px",
                padding: "9px 18px",
                borderRadius: "var(--radius-chip)",
                backgroundColor: "var(--navy)",
                color: "#F7F3EC",
                fontSize: "13.5px",
                fontWeight: 500,
              }}
            >
              Create A/B Test
            </button>
          </div>
        )}

        {!loading && !error && experiments.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13.5px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--hairline)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  <th style={{ padding: "16px 24px" }}>Name</th>
                  <th style={{ padding: "16px 18px" }}>Variant</th>
                  <th style={{ padding: "16px 18px" }}>Split</th>
                  <th style={{ padding: "16px 18px" }}>Start Date</th>
                  <th style={{ padding: "16px 18px" }}>Status</th>
                  <th style={{ padding: "16px 18px" }}>Results</th>
                  <th style={{ padding: "16px 24px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => {
                  const typeCfg =
                    TYPE_CONFIG[exp.type] || TYPE_CONFIG.widget_toggle;
                  const TypeIcon = typeCfg.icon;

                  const splitVal = Math.round((exp.split || 0.5) * 100);
                  const splitText = `${splitVal}% / ${100 - splitVal}%`;

                  const lift = exp.results?.lift;
                  const significant = exp.results?.significant;
                  const isReturn = exp.goal === "return_rate";
                  const goalName =
                    GOAL_LABELS[exp.goal] || exp.goal || "Conversion rate";

                  // For return rate, negative lift is good (green); for others, positive is good (green)
                  const isPositiveLift = lift !== null && (isReturn ? lift < 0 : lift > 0);
                  const isNegativeLift = lift !== null && (isReturn ? lift > 0 : lift < 0);

                  return (
                    <tr
                      key={exp.experimentId}
                      onClick={() => handleOpenResults(exp.experimentId)}
                      style={{
                        borderBottom: "1px solid var(--hairline)",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.45)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Name Column with tinted circle icon */}
                      <td style={{ padding: "18px 24px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: typeCfg.circleBg,
                              color: typeCfg.iconColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <TypeIcon size={19} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text)",
                                fontSize: "14px",
                                marginBottom: "2px",
                              }}
                            >
                              {exp.name}
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "12.5px",
                                lineHeight: 1.3,
                                maxWidth: "260px",
                              }}
                            >
                              {exp.description || "A/B comparison test."}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Variant Column (A - label, B - label) */}
                      <td style={{ padding: "18px 18px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "13px", color: "var(--text)" }}>
                          <span style={{ color: "var(--text-muted)" }}>A - </span>
                          <span>{exp.variants?.a?.label || "Original"}</span>
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text)",
                            marginTop: "3px",
                          }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>B - </span>
                          <span>{exp.variants?.b?.label || "FitWise Active"}</span>
                        </div>
                      </td>

                      {/* Split Column */}
                      <td style={{ padding: "18px 18px", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            color: "var(--text)",
                            fontSize: "13px",
                          }}
                        >
                          <Users size={15} color="var(--text-muted)" />
                          <span>{splitText}</span>
                        </div>
                      </td>

                      {/* Start Date Column */}
                      <td
                        style={{
                          padding: "18px 18px",
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(exp.startedAt)}
                      </td>

                      {/* Status Chip Column */}
                      <td style={{ padding: "18px 18px", whiteSpace: "nowrap" }}>
                        {exp.status === "running" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-chip)",
                              backgroundColor: "var(--success-bg)",
                              color: "var(--success-text)",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "var(--success-text)",
                              }}
                            />
                            Running
                          </span>
                        )}
                        {exp.status === "paused" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-chip)",
                              backgroundColor: "var(--warning-bg)",
                              color: "var(--warning-text)",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "var(--warning-text)",
                              }}
                            />
                            Paused
                          </span>
                        )}
                        {exp.status === "completed" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-chip)",
                              backgroundColor: "rgba(161, 93, 95, 0.12)",
                              color: "var(--danger-text)",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "var(--danger-text)",
                              }}
                            />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Results Column */}
                      <td style={{ padding: "18px 18px", whiteSpace: "nowrap" }}>
                        {lift === null || lift === undefined ? (
                          <div>
                            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                              Not enough data
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "11.5px",
                                opacity: 0.8,
                              }}
                            >
                              {goalName}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: isPositiveLift
                                  ? "var(--success-text)"
                                  : isNegativeLift
                                  ? "var(--danger-text)"
                                  : "var(--text)",
                              }}
                            >
                              {lift > 0 ? `+${lift}%` : `${lift}%`}
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "11.5px",
                              }}
                            >
                              {goalName}
                            </div>
                            {!significant && (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "var(--text-muted)",
                                  opacity: 0.85,
                                  marginTop: "1px",
                                }}
                              >
                                Not significant yet
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions Column (Eye button + 3 dots menu) */}
                      <td
                        style={{
                          padding: "18px 24px",
                          textAlign: "right",
                          position: "relative",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            title="View Results Panel"
                            onClick={() => handleOpenResults(exp.experimentId)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                              border: "1px solid var(--hairline)",
                              backgroundColor: "var(--ivory)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--text)";
                              e.currentTarget.style.backgroundColor =
                                "rgba(0,0,0,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-muted)";
                              e.currentTarget.style.backgroundColor = "var(--ivory)";
                            }}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            title="More Actions"
                            onClick={() =>
                              setMenuOpenId(
                                menuOpenId === exp.experimentId
                                  ? null
                                  : exp.experimentId
                              )
                            }
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                              backgroundColor:
                                menuOpenId === exp.experimentId
                                  ? "rgba(0,0,0,0.06)"
                                  : "transparent",
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        {menuOpenId === exp.experimentId && (
                          <div
                            ref={menuRef}
                            style={{
                              position: "absolute",
                              right: "24px",
                              top: "54px",
                              width: "180px",
                              backgroundColor: "var(--surface)",
                              borderRadius: "10px",
                              boxShadow: "0 8px 24px rgba(12, 24, 34, 0.18)",
                              border: "1px solid var(--hairline)",
                              padding: "6px",
                              zIndex: 100,
                              textAlign: "left",
                            }}
                          >
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                handleOpenResults(exp.experimentId);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                color: "var(--text)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(0,0,0,0.04)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <Eye size={15} />
                              <span>View results</span>
                            </button>

                            {exp.status === "running" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(exp.experimentId, "paused")
                                }
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  color: "var(--warning-text)",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "var(--warning-bg)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "transparent")
                                }
                              >
                                <Pause size={15} />
                                <span>Pause experiment</span>
                              </button>
                            )}

                            {exp.status === "paused" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(exp.experimentId, "running")
                                }
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  color: "var(--accent-strong)",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "rgba(100, 138, 142, 0.12)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "transparent")
                                }
                              >
                                <Play size={15} />
                                <span>Resume experiment</span>
                              </button>
                            )}

                            {exp.status !== "completed" && (
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setConfirmCompleteExp(exp);
                                }}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  color: "var(--text)",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "rgba(0,0,0,0.04)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "transparent")
                                }
                              >
                                <Check size={15} />
                                <span>Complete experiment</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Promotional Card matching reference screen */}
      <div
        style={{
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.65)",
          border: "1px solid var(--hairline)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              backgroundColor: "rgba(100, 138, 142, 0.12)",
              color: "var(--accent-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FlaskConical size={22} />
          </div>

          <div>
            <h4
              style={{
                fontSize: "14.5px",
                fontWeight: 600,
                color: "var(--text)",
                margin: "0 0 3px 0",
              }}
            >
              Want to run a new A/B test?
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Create a new A/B test to compare different versions and find the best performing variant.
            </p>
          </div>
        </div>

        <button
          id="create-experiment-bottom-btn"
          onClick={() => setCreateModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "var(--radius-btn)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "1px solid var(--hairline)",
            color: "var(--text)",
            fontSize: "13.5px",
            fontWeight: 500,
            boxShadow: "0 1px 3px rgba(12, 24, 34, 0.04)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface)";
            e.currentTarget.style.borderColor = "var(--accent-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.borderColor = "var(--hairline)";
          }}
        >
          <span>Create A/B Test</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Create Experiment Modal Dialog */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-dialog-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(12, 24, 34, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--hairline)",
              padding: "28px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  id="create-dialog-title"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "26px",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0,
                  }}
                >
                  Create A/B Test
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    margin: "4px 0 0 0",
                  }}
                >
                  Configure variants and split traffic to measure conversion impact.
                </p>
              </div>

              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  color: "var(--text-muted)",
                  padding: "4px",
                  borderRadius: "6px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error banner (e.g. 409 conflict: "A <type> experiment is already running. Complete it first.") */}
            {createError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--danger-bg)",
                  color: "var(--danger-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  marginBottom: "20px",
                }}
              >
                <AlertTriangle size={18} flexShrink={0} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Name */}
              <div>
                <label
                  htmlFor="exp-name-input"
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}
                >
                  Experiment Name *
                </label>
                <input
                  id="exp-name-input"
                  type="text"
                  required
                  placeholder="e.g. Sizing Prompt on PDP"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid var(--hairline)",
                    backgroundColor: "var(--ivory)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="exp-desc-input"
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}
                >
                  Description
                </label>
                <textarea
                  id="exp-desc-input"
                  rows={2}
                  placeholder="Explain hypothesis or reason for running this test..."
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid var(--hairline)",
                    backgroundColor: "var(--ivory)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Type Selection */}
              <div>
                <label
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}
                >
                  Experiment Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {[
                    { id: "widget_toggle", label: "Widget on/off", icon: Sliders },
                    { id: "widget_design", label: "Widget design", icon: Layout },
                    { id: "widget_placement", label: "Widget placement", icon: Layers },
                  ].map((t) => {
                    const isSelected = formValues.type === t.id;
                    const Icon = t.icon;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setFormValues({ ...formValues, type: t.id })}
                        style={{
                          padding: "12px 10px",
                          borderRadius: "10px",
                          border: isSelected
                            ? "2px solid var(--accent-strong)"
                            : "1px solid var(--hairline)",
                          backgroundColor: isSelected
                            ? "rgba(100, 138, 142, 0.08)"
                            : "var(--ivory)",
                          cursor: "pointer",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={18} color={isSelected ? "var(--accent-strong)" : "var(--text-muted)"} />
                        <span style={{ fontSize: "12px", fontWeight: isSelected ? 600 : 500, color: "var(--text)" }}>
                          {t.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Goal Metric */}
              <div>
                <label
                  htmlFor="exp-goal-select"
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}
                >
                  Primary Optimization Goal
                </label>
                <select
                  id="exp-goal-select"
                  value={formValues.goal}
                  onChange={(e) => setFormValues({ ...formValues, goal: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid var(--hairline)",
                    backgroundColor: "var(--ivory)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                >
                  <option value="conversion_rate">Conversion Rate (Purchases / Shoppers)</option>
                  <option value="return_rate">Return Rate (Lower is better)</option>
                  <option value="add_to_cart_rate">Add-to-Cart Rate</option>
                </select>
              </div>

              {/* Variant Labels */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    htmlFor="exp-variant-a-input"
                    style={{ display: "block", fontSize: "12.5px", fontWeight: 500, color: "var(--text)", marginBottom: "4px" }}
                  >
                    Variant A Label (Control)
                  </label>
                  <input
                    id="exp-variant-a-input"
                    type="text"
                    value={formValues.variantALabel}
                    onChange={(e) => setFormValues({ ...formValues, variantALabel: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="exp-variant-b-input"
                    style={{ display: "block", fontSize: "12.5px", fontWeight: 500, color: "var(--text)", marginBottom: "4px" }}
                  >
                    Variant B Label (Treatment)
                  </label>
                  <input
                    id="exp-variant-b-input"
                    type="text"
                    value={formValues.variantBLabel}
                    onChange={(e) => setFormValues({ ...formValues, variantBLabel: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Traffic Split Slider (10% - 90%) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label
                    htmlFor="exp-split-slider"
                    style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}
                  >
                    Traffic Allocation Split
                  </label>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-strong)" }}>
                    {formValues.split}% A / {100 - formValues.split}% B
                  </span>
                </div>
                <input
                  id="exp-split-slider"
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={formValues.split}
                  onChange={(e) => setFormValues({ ...formValues, split: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    accentColor: "var(--navy)",
                    cursor: "pointer",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  <span>10% Control</span>
                  <span>50% Balanced</span>
                  <span>90% Control</span>
                </div>
              </div>

              {/* Type-Specific Configuration */}
              {formValues.type === "widget_design" && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(100, 138, 142, 0.08)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <label
                    htmlFor="exp-design-style"
                    style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}
                  >
                    Widget Design Variant (B)
                  </label>
                  <select
                    id="exp-design-style"
                    value={formValues.designStyle}
                    onChange={(e) => setFormValues({ ...formValues, designStyle: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="drawer">Slide-in Bottom Drawer</option>
                    <option value="modal">Centered Modal Dialog</option>
                    <option value="compact">Compact Inline Pill</option>
                  </select>
                </div>
              )}

              {formValues.type === "widget_placement" && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(161, 93, 95, 0.08)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <label
                    htmlFor="exp-placement-pos"
                    style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}
                  >
                    PDP Placement Variant (B)
                  </label>
                  <select
                    id="exp-placement-pos"
                    value={formValues.placementPosition}
                    onChange={(e) => setFormValues({ ...formValues, placementPosition: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="below_cta">Directly Below Add to Cart</option>
                    <option value="above_cta">Directly Above Add to Cart</option>
                    <option value="sticky_bottom">Sticky Bar on Mobile Viewport</option>
                  </select>
                </div>
              )}

              {/* Dialog Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--hairline)",
                }}
              >
                <button
                  type="button"
                  disabled={createLoading}
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid var(--hairline)",
                    backgroundColor: "var(--ivory)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "var(--radius-btn)",
                    backgroundColor: "var(--navy)",
                    color: "#F7F3EC",
                    fontSize: "13.5px",
                    fontWeight: 500,
                  }}
                >
                  {createLoading ? "Creating..." : "Launch Experiment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Row Complete Confirmation Dialog */}
      {confirmCompleteExp && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(12, 24, 34, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
              padding: "24px",
              border: "1px solid var(--hairline)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "20px",
                color: "var(--text)",
                margin: "0 0 8px 0",
              }}
            >
              Complete Experiment?
            </h3>
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-muted)",
                margin: "0 0 20px 0",
                lineHeight: 1.45,
              }}
            >
              Are you sure you want to mark <strong>{confirmCompleteExp.name}</strong> as completed?
              This will finalize recorded conversions and disable variant assignment.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                disabled={actionLoading}
                onClick={() => setConfirmCompleteExp(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-btn)",
                  border: "1px solid var(--hairline)",
                  backgroundColor: "var(--ivory)",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() =>
                  handleStatusChange(confirmCompleteExp.experimentId, "completed")
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-btn)",
                  backgroundColor: "var(--navy)",
                  color: "#F7F3EC",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                {actionLoading ? "Completing..." : "Complete Experiment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Experiment Results Drawer Panel */}
      <ExperimentResultsPanel
        experimentId={selectedExperimentId}
        isOpen={Boolean(selectedExperimentId)}
        onClose={handleCloseResults}
        onExperimentUpdated={loadExperiments}
      />
    </div>
  );
}

export default Experiments;

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Check,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import api from "../api.js";

const METRIC_LABELS = {
  conversion_rate: "Conversion Rate",
  return_rate: "Return Rate",
  add_to_cart_rate: "Add to Cart Rate",
};

const TYPE_LABELS = {
  widget_toggle: "Widget on/off",
  widget_design: "Widget design",
  widget_placement: "Widget placement",
};

export function ExperimentResultsPanel({
  experimentId,
  isOpen,
  onClose,
  onExperimentUpdated,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const drawerRef = useRef(null);

  // Fetch results when drawer opens with experimentId
  useEffect(() => {
    if (!isOpen || !experimentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setActionError(null);

    api
      .getExperimentResults(experimentId)
      .then((data) => {
        if (isMounted) {
          setResultsData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load experiment results.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, experimentId]);

  // Keyboard accessibility: Escape key listener and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (confirmCompleteOpen) {
          setConfirmCompleteOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    if (drawerRef.current) {
      drawerRef.current.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, confirmCompleteOpen, onClose]);

  if (!isOpen) return null;

  const exp = resultsData?.experiment || {};
  const metrics = resultsData?.metrics || [];
  const control = resultsData?.control || { visitors: 0, addToCart: 0, purchases: 0, returns: 0 };
  const treatment = resultsData?.treatment || { visitors: 0, addToCart: 0, purchases: 0, returns: 0 };
  const warning = resultsData?.warning;

  // Calculate days running
  const startedAtDate = exp.startedAt ? new Date(exp.startedAt) : new Date();
  const daysRunning = Math.max(
    1,
    Math.round((Date.now() - startedAtDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const formattedStartDate = startedAtDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const goalKey = exp.goal || "conversion_rate";
  const goalMetric = metrics.find((m) => m.name === goalKey) || metrics[0];

  // Helper to format percentages
  const formatPct = (val) => {
    if (val === null || val === undefined) return "--";
    return `${(val * 100).toFixed(1)}%`;
  };

  // Helper to format confidence interval
  const formatCi = (ci) => {
    if (!ci || !Array.isArray(ci)) return "--";
    const [lower, upper] = ci;
    const lStr = (lower * 100).toFixed(1);
    const uStr = (upper * 100).toFixed(1);
    return `${lower >= 0 ? "+" : ""}${lStr}% to ${upper >= 0 ? "+" : ""}${uStr}%`;
  };

  // Format difference
  const formatDiff = (diff) => {
    if (diff === null || diff === undefined) return "--";
    const sign = diff > 0 ? "+" : "";
    return `${sign}${(diff * 100).toFixed(1)}%`;
  };

  // Status handlers
  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.updateExperimentStatus(experimentId, newStatus);
      // Refresh results
      const refreshed = await api.getExperimentResults(experimentId);
      setResultsData(refreshed);
      setConfirmCompleteOpen(false);
      if (onExperimentUpdated) {
        onExperimentUpdated();
      }
    } catch (err) {
      setActionError(err.message || "Failed to update experiment status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Plain-language Verdict determination
  const renderVerdict = () => {
    if (!goalMetric) return null;

    const isSignificant = Boolean(goalMetric.significant);
    const diff = goalMetric.diff || 0;
    const isReturnRate = goalKey === "return_rate";
    // For return_rate, negative diff is improvement; for others, positive diff is improvement
    const isImprovement = isReturnRate ? diff < 0 : diff > 0;
    const absDiffPoints = (Math.abs(diff) * 100).toFixed(1);
    const ciText = formatCi(goalMetric.ci95);

    if (isSignificant) {
      if (isImprovement) {
        return {
          type: "success",
          badge: "Significant Improvement",
          title: "Clear Winner Detected",
          text: isReturnRate
            ? `The widget lowered the return rate by ${absDiffPoints} points (95% CI ${ciText}).`
            : `The widget increased ${METRIC_LABELS[goalKey].toLowerCase()} by ${absDiffPoints} points (95% CI ${ciText}).`,
        };
      } else {
        return {
          type: "danger",
          badge: "Significant Worsening",
          title: "Negative Impact Observed",
          text: isReturnRate
            ? `The variant increased the return rate by ${absDiffPoints} points (95% CI ${ciText}). Reverting recommended.`
            : `The variant decreased ${METRIC_LABELS[goalKey].toLowerCase()} by ${absDiffPoints} points (95% CI ${ciText}).`,
        };
      }
    }

    return {
      type: "neutral",
      badge: "Inconclusive",
      title: "Not significant yet. Keep it running.",
      text: "The observed difference does not have statistical significance (p ≥ 0.05). Continue collecting shopper sessions to detect meaningful impact.",
    };
  };

  const verdict = renderVerdict();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-panel-title"
      tabIndex={-1}
      ref={drawerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(12, 24, 34, 0.45)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="experiment-drawer-content"
        style={{
          width: "100%",
          maxWidth: "620px",
          height: "100vh",
          backgroundColor: "var(--surface)",
          boxShadow: "-4px 0 24px rgba(12, 24, 34, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "24px 28px 20px 28px",
            borderBottom: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            position: "sticky",
            top: 0,
            backgroundColor: "var(--surface)",
            zIndex: 10,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
                flexWrap: "wrap",
              }}
            >
              <h2
                id="results-panel-title"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "24px",
                  color: "var(--text)",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {exp.name || "Experiment Results"}
              </h2>

              {/* Status Chip */}
              {exp.status === "running" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
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
                    padding: "3px 10px",
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
                    padding: "3px 10px",
                    borderRadius: "var(--radius-chip)",
                    backgroundColor: "rgba(100, 138, 142, 0.15)",
                    color: "var(--text)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-strong)",
                    }}
                  />
                  Completed
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {exp.description ||
                "Statistical evaluation and live visitor metrics for this test."}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close experiment results drawer"
            style={{
              padding: "8px",
              borderRadius: "8px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 0",
                gap: "12px",
                color: "var(--text-muted)",
              }}
            >
              <FlaskConical size={32} className="spinning" />
              <span>Loading statistical test results...</span>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-card)",
                backgroundColor: "var(--danger-bg)",
                color: "var(--danger-text)",
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <AlertTriangle size={20} />
              <span style={{ fontSize: "13.5px" }}>{error}</span>
            </div>
          )}

          {!loading && !error && resultsData && (
            <>
              {/* Meta Stats Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Test Type
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                    {TYPE_LABELS[exp.type] || exp.type || "Widget on/off"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Goal Metric
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                    {METRIC_LABELS[exp.goal] || exp.goal || "Conversion Rate"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Traffic Split
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                    {Math.round((exp.split || 0.5) * 100)}% / {100 - Math.round((exp.split || 0.5) * 100)}%
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Timeline
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                    {formattedStartDate} ({daysRunning}d)
                  </div>
                </div>
              </div>

              {/* Visitors Breakdown Bar */}
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-card)",
                  backgroundColor: "var(--ivory)",
                  border: "1px solid var(--hairline)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                    Shopper Sessions Collected
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Total: {(control.visitors + treatment.visitors).toLocaleString()} visitors
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-muted)" }}>
                        Control ({exp.variants?.a?.label || "Variant A"}):
                      </span>
                      <strong style={{ color: "var(--text)" }}>{control.visitors} visitors</strong>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        backgroundColor: "rgba(0,0,0,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, (control.visitors / 100) * 100)}%`,
                          backgroundColor: "var(--navy)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-muted)" }}>
                        Treatment ({exp.variants?.b?.label || "Variant B"}):
                      </span>
                      <strong style={{ color: "var(--accent-strong)" }}>{treatment.visitors} visitors</strong>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        backgroundColor: "rgba(0,0,0,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, (treatment.visitors / 100) * 100)}%`,
                          backgroundColor: "var(--accent)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Size Warning with Progress Bar (if warning is not null) */}
              {warning && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: "var(--radius-card)",
                    backgroundColor: "var(--warning-bg)",
                    border: "1px solid rgba(118, 82, 60, 0.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <AlertTriangle size={18} color="var(--warning-text)" />
                    <strong style={{ fontSize: "13.5px", color: "var(--warning-text)" }}>
                      Sample too small to conclude (Minimum 100 visitors required per variant)
                    </strong>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--warning-text)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                    Statistical confidence requires at least 100 visitors in both Control and Treatment. Keep the test running until sufficient volume is recorded.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "var(--warning-text)", marginBottom: "3px" }}>
                        <span>Control Progress: {control.visitors} / 100</span>
                        <span>{Math.min(100, control.visitors)}%</span>
                      </div>
                      <div style={{ height: "5px", backgroundColor: "rgba(118, 82, 60, 0.2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, control.visitors)}%`, height: "100%", backgroundColor: "var(--warning-text)" }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "var(--warning-text)", marginBottom: "3px" }}>
                        <span>Treatment Progress: {treatment.visitors} / 100</span>
                        <span>{Math.min(100, treatment.visitors)}%</span>
                      </div>
                      <div style={{ height: "5px", backgroundColor: "rgba(118, 82, 60, 0.2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, treatment.visitors)}%`, height: "100%", backgroundColor: "var(--warning-text)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verdict Card */}
              {verdict && (
                <div
                  style={{
                    padding: "20px 22px",
                    borderRadius: "var(--radius-card)",
                    backgroundColor:
                      verdict.type === "success"
                        ? "var(--success-bg)"
                        : verdict.type === "danger"
                        ? "var(--danger-bg)"
                        : "var(--ivory)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color:
                          verdict.type === "success"
                            ? "var(--success-text)"
                            : verdict.type === "danger"
                            ? "var(--danger-text)"
                            : "var(--text-muted)",
                      }}
                    >
                      Verdict · {verdict.badge}
                    </span>
                    {verdict.type === "success" && (
                      <CheckCircle2 size={18} color="var(--success-text)" />
                    )}
                    {verdict.type === "neutral" && (
                      <Clock size={18} color="var(--text-muted)" />
                    )}
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "var(--text)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {verdict.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "13.5px",
                      color:
                        verdict.type === "success"
                          ? "var(--success-text)"
                          : verdict.type === "danger"
                          ? "var(--danger-text)"
                          : "var(--text-muted)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {verdict.text}
                  </p>
                </div>
              )}

              {/* Metrics Table */}
              <div>
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "12px",
                  }}
                >
                  Detailed Metrics Comparison
                </h4>

                <div
                  style={{
                    border: "1px solid var(--hairline)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "var(--ivory)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12.5px",
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "rgba(0,0,0,0.02)",
                          borderBottom: "1px solid var(--hairline)",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                          textTransform: "uppercase",
                        }}
                      >
                        <th style={{ padding: "10px 14px" }}>Metric</th>
                        <th style={{ padding: "10px 12px" }}>Control</th>
                        <th style={{ padding: "10px 12px" }}>Treatment</th>
                        <th style={{ padding: "10px 12px" }}>Difference</th>
                        <th style={{ padding: "10px 12px" }}>95% CI</th>
                        <th style={{ padding: "10px 12px" }}>p-value</th>
                        <th style={{ padding: "10px 14px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m) => {
                        const isGoal = m.name === goalKey;
                        const isRet = m.name === "return_rate";
                        const isDiffPositive = m.diff > 0;
                        const isDiffGood = isRet ? m.diff < 0 : m.diff > 0;

                        return (
                          <tr
                            key={m.name}
                            style={{
                              borderBottom: "1px solid var(--hairline)",
                              backgroundColor: isGoal
                                ? "rgba(100, 138, 142, 0.08)"
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px 14px", fontWeight: isGoal ? 600 : 500, color: "var(--text)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {METRIC_LABELS[m.name] || m.name}
                                {isGoal && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: "var(--navy)",
                                      color: "#F7F3EC",
                                    }}
                                  >
                                    Goal
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "12px 12px", color: "var(--text)" }}>
                              {formatPct(m.controlRate)}
                            </td>
                            <td style={{ padding: "12px 12px", color: "var(--text)", fontWeight: 500 }}>
                              {formatPct(m.treatmentRate)}
                            </td>
                            <td
                              style={{
                                padding: "12px 12px",
                                fontWeight: 600,
                                color: isDiffGood
                                  ? "var(--success-text)"
                                  : m.diff === 0
                                  ? "var(--text-muted)"
                                  : "var(--danger-text)",
                              }}
                            >
                              {formatDiff(m.diff)}
                            </td>
                            <td style={{ padding: "12px 12px", color: "var(--text-muted)", fontSize: "11.5px" }}>
                              {formatCi(m.ci95)}
                            </td>
                            <td style={{ padding: "12px 12px", color: "var(--text-muted)" }}>
                              {m.pValue !== undefined ? m.pValue.toFixed(3) : "--"}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              {m.significant ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "var(--radius-chip)",
                                    backgroundColor: "var(--success-bg)",
                                    color: "var(--success-text)",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                  }}
                                >
                                  Significant
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "var(--radius-chip)",
                                    backgroundColor: "rgba(0,0,0,0.05)",
                                    color: "var(--text-muted)",
                                    fontSize: "11px",
                                  }}
                                >
                                  Not sig.
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bar Chart comparing Control and Treatment rates */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                    Visual Comparison by Metric
                  </h4>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--navy)" }} />
                      <span style={{ color: "var(--text-muted)" }}>Control (A)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--accent)" }} />
                      <span style={{ color: "var(--text-muted)" }}>Treatment (B)</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "20px",
                    borderRadius: "var(--radius-card)",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px",
                  }}
                >
                  {metrics.map((m) => {
                    const cVal = (m.controlRate || 0) * 100;
                    const tVal = (m.treatmentRate || 0) * 100;
                    const maxVal = Math.max(cVal, tVal, 10);
                    const scale = 100 / (maxVal * 1.25);

                    return (
                      <div key={m.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                          <span style={{ fontWeight: 500, color: "var(--text)" }}>
                            {METRIC_LABELS[m.name] || m.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Control: {cVal.toFixed(1)}% vs Treatment: {tVal.toFixed(1)}%
                          </span>
                        </div>

                        {/* Double bar track */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "10.5px", width: "14px", color: "var(--text-muted)" }}>A</span>
                            <div style={{ flex: 1, height: "14px", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, cVal * scale)}%`,
                                  height: "100%",
                                  backgroundColor: "var(--navy)",
                                  borderRadius: "4px",
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "11px", width: "36px", textAlign: "right", color: "var(--text)" }}>
                              {cVal.toFixed(1)}%
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "10.5px", width: "14px", color: "var(--accent-strong)" }}>B</span>
                            <div style={{ flex: 1, height: "14px", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, tVal * scale)}%`,
                                  height: "100%",
                                  backgroundColor: "var(--accent)",
                                  borderRadius: "4px",
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "11px", width: "36px", textAlign: "right", color: "var(--accent-strong)", fontWeight: 500 }}>
                              {tVal.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {actionError && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "var(--danger-bg)",
                    color: "var(--danger-text)",
                    fontSize: "13px",
                  }}
                >
                  {actionError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Actions Footer */}
        {!loading && !error && resultsData && (
          <div
            style={{
              padding: "18px 28px",
              borderTop: "1px solid var(--hairline)",
              backgroundColor: "var(--surface)",
              position: "sticky",
              bottom: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              ID: <code style={{ fontFamily: "monospace" }}>{experimentId}</code>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {exp.status === "running" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("paused")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    <Pause size={15} />
                    Pause
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setConfirmCompleteOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "var(--radius-btn)",
                      backgroundColor: "var(--navy)",
                      color: "#F7F3EC",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    <Check size={15} />
                    Complete Experiment
                  </button>
                </>
              )}

              {exp.status === "paused" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("running")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--accent-strong)",
                      backgroundColor: "var(--accent-strong)",
                      color: "#F7F3EC",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    <Play size={15} />
                    Resume
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setConfirmCompleteOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      color: "var(--text)",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    <Check size={15} />
                    Complete
                  </button>
                </>
              )}

              {exp.status === "completed" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-btn)",
                    backgroundColor: "rgba(0,0,0,0.05)",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Test Finalized
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Experiment Confirmation Dialog */}
        {confirmCompleteOpen && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(12, 24, 34, 0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "400px",
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-card)",
                padding: "24px",
                boxShadow: "var(--shadow-card)",
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
                Are you sure you want to mark <strong>{exp.name}</strong> as completed?
                This will finalize current statistics and stop variant traffic allocation.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  disabled={actionLoading}
                  onClick={() => setConfirmCompleteOpen(false)}
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
                  onClick={() => handleUpdateStatus("completed")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-btn)",
                    backgroundColor: "var(--navy)",
                    color: "#F7F3EC",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {actionLoading ? "Completing..." : "Yes, Complete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1.5s linear infinite;
        }
        @media (max-width: 768px) {
          .experiment-drawer-content {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ExperimentResultsPanel;

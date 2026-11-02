import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Clock,
  RotateCcw,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Shirt,
} from "lucide-react";
import { api } from "../api.js";

const NEUTRAL_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%238A95A0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='100%25' height='100%25' fill='%23EDE8DF'/%3E%3Cpath d='M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z'/%3E%3C/svg%3E";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "kept", label: "Kept" },
  { key: "returned", label: "Returned" },
];

const DATE_RANGES = [
  { days: 0, label: "Date Range" },
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export function Recommendations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramStatus = searchParams.get("status") || "all";
  const [statusTab, setStatusTab] = useState(
    ["all", "pending", "kept", "returned"].includes(paramStatus) ? paramStatus : "all"
  );
  const [dateRange, setDateRange] = useState(DATE_RANGES[0]); // default "Date Range" (all time)
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, kept: 0, returned: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const dateMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
        setDateDropdownOpen(false);
      }
      if (!e.target.closest(".rec-actions-menu")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecommendations({
        status: statusTab,
        page,
        limit,
        days: dateRange.days,
      });

      setItems(data.items || []);
      setTotal(data.total || (data.items ? data.items.length : 0));
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [statusTab, page, dateRange]);

  // Handle Tab Change
  const handleTabChange = (key) => {
    setStatusTab(key);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === "all") {
        next.delete("status");
      } else {
        next.set("status", key);
      }
      return next;
    });
  };

  // Update item status via API and update state
  const handleUpdateStatus = async (item, newStatus) => {
    setActiveMenuId(null);
    setUpdatingId(item.id);
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: newStatus } : it))
      );
      if (statusTab !== "all" && statusTab !== newStatus) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        setTotal((prev) => Math.max(0, prev - 1));
      }

      await api.updateRecommendationStatus(item.id, newStatus);
      // Refetch to sync exact counts and server state
      await fetchRecommendations();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Failed to update status: " + (err.message || "Unknown error"));
      await fetchRecommendations();
    } finally {
      setUpdatingId(null);
    }
  };

  // Status Chip Rendering
  const renderStatusChip = (status) => {
    const norm = String(status || "").toLowerCase();

    if (norm === "kept") {
      return (
        <span
          className="chip"
          style={{
            backgroundColor: "var(--success-bg)",
            color: "var(--success-text)",
            padding: "5px 14px",
            fontSize: "12.5px",
            fontWeight: 500,
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Check size={13} strokeWidth={2.5} />
          <span>Kept</span>
        </span>
      );
    }

    if (norm === "returned") {
      return (
        <span
          className="chip"
          style={{
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger-text)",
            padding: "5px 14px",
            fontSize: "12.5px",
            fontWeight: 500,
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <RotateCcw size={12} strokeWidth={2.5} />
          <span>Returned</span>
        </span>
      );
    }

    return (
      <span
        className="chip"
        style={{
          backgroundColor: "var(--warning-bg)",
          color: "var(--warning-text)",
          padding: "5px 14px",
          fontSize: "12.5px",
          fontWeight: 500,
          borderRadius: "9999px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <Clock size={12} strokeWidth={2.5} />
        <span>Pending</span>
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Title */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "36px",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          My Recommendations
        </h1>
      </div>

      {/* Filter Row: Pill Tabs on left, Date Range Dropdown on right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Pill Tabs: All / Pending / Kept / Returned */}
        <div
          role="tablist"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                style={{
                  padding: "7px 18px",
                  borderRadius: "9999px",
                  fontSize: "13.5px",
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? "var(--navy)" : "var(--surface)",
                  color: isActive ? "#F7F3EC" : "var(--text-muted)",
                  border: `1px solid ${isActive ? "var(--navy)" : "var(--hairline)"}`,
                  boxShadow: isActive
                    ? "0 2px 6px rgba(12, 24, 34, 0.12)"
                    : "var(--shadow-subtle)",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 600,
                      padding: "1px 7px",
                      borderRadius: "9999px",
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(100, 138, 142, 0.12)",
                      color: isActive ? "#F7F3EC" : "var(--accent-strong)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Date Range Dropdown (7 / 30 / 90 days / All) */}
        <div style={{ position: "relative" }} ref={dateMenuRef}>
          <button
            type="button"
            onClick={() => setDateDropdownOpen((prev) => !prev)}
            aria-expanded={dateDropdownOpen}
            aria-label="Filter by date range"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              borderRadius: "9999px",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--hairline)",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "var(--shadow-subtle)",
              cursor: "pointer",
            }}
          >
            <span>{dateRange.days === 0 ? "Date Range" : dateRange.label}</span>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>

          {dateDropdownOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "160px",
                padding: "6px",
                zIndex: 40,
                boxShadow: "0 6px 20px rgba(12, 24, 34, 0.12)",
              }}
            >
              {DATE_RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => {
                    setDateRange(r);
                    setDateDropdownOpen(false);
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: dateRange.days === r.days ? "var(--accent-strong)" : "var(--text)",
                    fontWeight: dateRange.days === r.days ? 600 : 400,
                    backgroundColor:
                      dateRange.days === r.days ? "rgba(100, 138, 142, 0.1)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger-text)",
            fontSize: "13.5px",
            border: "1px solid rgba(142, 58, 63, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchRecommendations} className="btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 20px",
                gap: "18px",
                opacity: 0.6,
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "10px",
                  backgroundColor: "var(--hairline)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ width: "35%", height: "16px", backgroundColor: "var(--hairline)", borderRadius: "4px" }} />
                <div style={{ width: "20%", height: "12px", backgroundColor: "var(--hairline)", borderRadius: "4px" }} />
                <div style={{ width: "28%", height: "12px", backgroundColor: "var(--hairline)", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            padding: "64px 32px",
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
            <Shirt size={26} />
          </div>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            No recommendations yet
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "380px" }}>
            {statusTab !== "all"
              ? `No ${statusTab} recommendations found in this timeframe. Try selecting "All" or a different date range.`
              : "Shoppers haven't generated any recommendations yet. Embed the FitWise widget on your storefront to start receiving sizing data."}
          </p>
          {statusTab !== "all" && (
            <button
              onClick={() => handleTabChange("all")}
              className="btn-secondary"
              style={{ fontSize: "13px", marginTop: "6px" }}
            >
              View all recommendations
            </button>
          )}
        </div>
      ) : (
        /* Recommendation Cards List */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => {
            const confidencePct = Math.round((item.confidence || 0.9) * 100);
            const categoryDisplay =
              item.category === "tshirt"
                ? "T-Shirt"
                : item.category === "jeans"
                ? "Jeans"
                : item.category === "kurta"
                ? "Kurta"
                : item.category === "blouse"
                ? "Blouse"
                : item.category || "Apparel";

            const isMenuOpen = activeMenuId === item.id;

            return (
              <div
                key={item.id}
                className="card rec-card-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  gap: "16px",
                  borderRadius: "var(--radius-card)",
                }}
              >
                {/* Left: Thumbnail & Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                  {/* Product Thumbnail */}
                  <img
                    src={item.imageUrl || NEUTRAL_PLACEHOLDER}
                    alt={item.name || item.sku}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = NEUTRAL_PLACEHOLDER;
                    }}
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "10px",
                      objectFit: "cover",
                      backgroundColor: "var(--photo-placeholder)",
                      flexShrink: 0,
                      border: "1px solid var(--hairline)",
                    }}
                  />

                  {/* Metadata */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name || item.sku}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                      }}
                    >
                      {item.size} / {categoryDisplay}
                    </div>

                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                      }}
                    >
                      <span>Size: {item.size}</span>
                      <span style={{ margin: "0 6px", opacity: 0.6 }}>|</span>
                      <span>Confidence: {confidencePct}%</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Chip & "..." Menu */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    flexShrink: 0,
                  }}
                >
                  {/* Status Chip */}
                  {renderStatusChip(item.status)}

                  {/* "..." Action Menu */}
                  <div style={{ position: "relative" }} className="rec-actions-menu">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId(isMenuOpen ? null : item.id)
                      }
                      aria-label="Recommendation options"
                      disabled={updatingId === item.id}
                      style={{
                        color: "var(--text-muted)",
                        padding: "6px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: updatingId === item.id ? "wait" : "pointer",
                        opacity: updatingId === item.id ? 0.5 : 1,
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="card"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          right: 0,
                          width: "170px",
                          padding: "6px",
                          zIndex: 50,
                          boxShadow: "0 6px 20px rgba(12, 24, 34, 0.12)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        {item.status !== "kept" && (
                          <button
                            onClick={() => handleUpdateStatus(item, "kept")}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 10px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--success-text)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <Check size={14} />
                            <span>Mark as Kept</span>
                          </button>
                        )}

                        {item.status !== "returned" && (
                          <button
                            onClick={() => handleUpdateStatus(item, "returned")}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 10px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--danger-text)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <RotateCcw size={14} />
                            <span>Mark as Returned</span>
                          </button>
                        )}

                        {item.status !== "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(item, "pending")}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 10px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--warning-text)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <Clock size={14} />
                            <span>Mark as Pending</span>
                          </button>
                        )}

                        <div
                          style={{
                            height: "1px",
                            backgroundColor: "var(--hairline)",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            navigate(`/products?sku=${encodeURIComponent(item.sku)}`);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 10px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "var(--text)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>View product</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && total > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Showing{" "}
            <strong>
              {(page - 1) * limit + 1} - {Math.min(page * limit, total)}
            </strong>{" "}
            of <strong>{total}</strong> recommendations
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                opacity: page <= 1 ? 0.5 : 1,
                cursor: page <= 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: "13px", color: "var(--text)", padding: "0 8px" }}>
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .rec-card-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Recommendations;

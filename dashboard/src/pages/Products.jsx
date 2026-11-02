import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  Stethoscope,
  Maximize2,
} from "lucide-react";
import { api } from "../api.js";

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "tshirt", label: "T-Shirt" },
  { key: "jeans", label: "Jeans" },
  { key: "kurta", label: "Kurta" },
  { key: "blouse", label: "Blouse" },
];

const NEUTRAL_PLACEHOLDER =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400";

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Drawer state
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(err.message || "Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Open drawer and fetch size chart
  const handleOpenDrawer = async (prod) => {
    setDrawerProduct(prod);
    setChartLoading(true);
    setChartError(null);
    try {
      const chart = await api.getProductSizeChart(prod.sku);
      setChartData(chart);
    } catch (err) {
      console.error(`Failed to load size chart for ${prod.sku}:`, err);
      setChartError(err.message || "Failed to load size chart");
    } finally {
      setChartLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerProduct(null);
    setChartData(null);
    setChartError(null);
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseDrawer();
      }
    };
    if (drawerProduct) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerProduct]);

  // Compute category counts
  const categoryCounts = products.reduce((acc, p) => {
    acc.all = (acc.all || 0) + 1;
    const cat = p.category || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Filter products by category and search
  const filteredProducts = products.filter((prod) => {
    // Category filter
    if (selectedCategory !== "all" && prod.category !== selectedCategory) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (prod.name || "").toLowerCase().includes(q);
      const skuMatch = (prod.sku || "").toLowerCase().includes(q);
      const brandMatch = (prod.brand || "").toLowerCase().includes(q);
      const catMatch = (prod.category || "").toLowerCase().includes(q);
      const regionMatch = (prod.region || "").toLowerCase().includes(q);
      return nameMatch || skuMatch || brandMatch || catMatch || regionMatch;
    }
    return true;
  });

  // Extract measurement fields from size chart
  const getMeasurementFields = (sizeChart) => {
    if (!Array.isArray(sizeChart) || sizeChart.length === 0) return [];
    const standardFields = [
      "chest",
      "waist",
      "hip",
      "bust",
      "shoulder",
      "length",
      "inseam",
      "sleeve",
    ];
    const detected = new Set();
    sizeChart.forEach((row) => {
      standardFields.forEach((field) => {
        if (row[field] !== undefined && row[field] !== null) {
          detected.add(field);
        }
      });
    });
    return Array.from(detected);
  };

  const formatRange = (val) => {
    if (Array.isArray(val) && val.length === 2) {
      if (val[0] === val[1]) return `${val[0]}`;
      return `${val[0]} - ${val[1]}`;
    }
    if (typeof val === "number") return `${val}`;
    return "-";
  };

  const formatFieldHeader = (field) => {
    const map = {
      chest: "Chest (cm)",
      waist: "Waist (cm)",
      hip: "Hip (cm)",
      bust: "Bust (cm)",
      shoulder: "Shoulder (cm)",
      length: "Length (cm)",
      inseam: "Inseam (cm)",
      sleeve: "Sleeve (cm)",
    };
    return map[field] || `${field.charAt(0).toUpperCase() + field.slice(1)} (cm)`;
  };

  const measurementFields = getMeasurementFields(chartData?.sizeChart);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1180px",
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
          Products
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Inventory catalog, regional size charts, and flagged sizing discrepancies.
        </p>
      </div>

      {/* Controls: Search and Category Filter Pills */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Full-width Search Bar */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: "18px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, brand, SKU, or region..."
            style={{
              width: "100%",
              padding: "12px 18px 12px 46px",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: "9999px",
              color: "var(--text)",
              fontSize: "14px",
              boxShadow: "var(--shadow-subtle)",
              outline: "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Pills Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 18px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? "var(--navy)" : "var(--surface)",
                  color: isActive ? "#F7F3EC" : "var(--text-muted)",
                  border: `1px solid ${isActive ? "var(--navy)" : "var(--hairline)"}`,
                  boxShadow: isActive
                    ? "0 2px 6px rgba(12, 24, 34, 0.12)"
                    : "var(--shadow-subtle)",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: "11px",
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
              </button>
            );
          })}
        </div>
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
          <span style={{ fontSize: "14px" }}>Loading product catalog...</span>
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
              Unable to load products
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>{error}</p>
          </div>
          <button
            onClick={fetchProducts}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Product List */}
      {!loading && !error && (
        <>
          {filteredProducts.length === 0 ? (
            /* Empty State */
            <div
              className="card"
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
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 138, 142, 0.15)",
                  color: "var(--accent-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingBag size={26} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "17.5px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}
                >
                  No products found
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px", maxWidth: "420px" }}>
                  {searchQuery
                    ? `No products matching "${searchQuery}". Try a different search term or clear the filter.`
                    : "No products cataloged in this category."}
                </p>
              </div>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="btn-secondary"
                  style={{ borderRadius: "9999px", padding: "7px 20px", marginTop: "4px" }}
                >
                  View All Categories
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredProducts.map((prod) => {
                const isFlagged = Number(prod.flagCount || 0) > 0;

                return (
                  <div
                    key={prod.sku}
                    onClick={() => handleOpenDrawer(prod)}
                    className="card product-row-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 22px",
                      gap: "16px",
                      borderRadius: "var(--radius-card)",
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-subtle)",
                      cursor: "pointer",
                      transition:
                        "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Left: Thumbnail & Details */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        minWidth: 0,
                      }}
                    >
                      {/* Product Thumbnail */}
                      <div
                        style={{
                          width: "68px",
                          height: "68px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "var(--photo-placeholder)",
                          border: "1px solid var(--hairline)",
                        }}
                      >
                        <img
                          src={prod.imageUrl || NEUTRAL_PLACEHOLDER}
                          alt={prod.name}
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = NEUTRAL_PLACEHOLDER;
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      {/* Product Information */}
                      <div style={{ minWidth: 0 }}>
                        <h2
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "15.5px",
                            fontWeight: 600,
                            color: "var(--text)",
                            lineHeight: 1.3,
                            marginBottom: "4px",
                          }}
                        >
                          {prod.name}
                        </h2>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            fontSize: "12.5px",
                            color: "var(--text-muted)",
                          }}
                        >
                          <span style={{ fontWeight: 500, fontFamily: "monospace" }}>
                            {prod.sku}
                          </span>
                          <span>•</span>
                          <span>{prod.brand || "FitWise"}</span>
                          <span>•</span>
                          <span
                            style={{
                              textTransform: "capitalize",
                              backgroundColor: "rgba(0, 0, 0, 0.04)",
                              padding: "1px 8px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 500,
                              color: "var(--text)",
                            }}
                          >
                            {prod.category}
                          </span>
                          <span
                            style={{
                              backgroundColor: "var(--ivory)",
                              border: "1px solid var(--hairline)",
                              padding: "1px 8px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--text)",
                            }}
                          >
                            {prod.region || "Standard"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Flag Count Chip & View Button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {/* Flag Count Amber Chip (when > 0) */}
                      {isFlagged ? (
                        <span
                          className="chip"
                          style={{
                            backgroundColor: "var(--warning-bg)",
                            color: "var(--warning-text)",
                            border: "1px solid rgba(118, 82, 60, 0.2)",
                            fontWeight: 600,
                            padding: "4px 12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          title="Flagged by Chart Doctor for sizing return discrepancies"
                        >
                          <AlertTriangle size={13} />
                          <span>
                            {prod.flagCount} {prod.flagCount === 1 ? "flag" : "flags"}
                          </span>
                        </span>
                      ) : (
                        <span
                          className="chip"
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--hairline)",
                            padding: "4px 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <CheckCircle2 size={13} style={{ color: "var(--accent-strong)" }} />
                          <span>Healthy</span>
                        </span>
                      )}

                      {/* View Chart Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(prod);
                        }}
                        className="btn-secondary"
                        style={{
                          borderRadius: "9999px",
                          padding: "6px 16px",
                          fontSize: "12.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>Size Chart</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Slide-out Size Chart Drawer */}
      {drawerProduct && (
        <div
          onClick={handleCloseDrawer}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12, 24, 34, 0.55)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "540px",
              height: "100%",
              backgroundColor: "var(--surface)",
              borderLeft: "1px solid var(--hairline)",
              boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.25s ease-out",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "24px 28px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                <img
                  src={drawerProduct.imageUrl || NEUTRAL_PLACEHOLDER}
                  alt={drawerProduct.name}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid var(--hairline)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "16.5px",
                      fontWeight: 600,
                      color: "var(--text)",
                      lineHeight: 1.25,
                      marginBottom: "3px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {drawerProduct.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontFamily: "monospace" }}>{drawerProduct.sku}</span>
                    <span>•</span>
                    <span style={{ textTransform: "capitalize" }}>
                      {drawerProduct.category}
                    </span>
                    <span>•</span>
                    <span>{drawerProduct.region} Region</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDrawer}
                style={{
                  color: "var(--text-muted)",
                  padding: "6px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div
              style={{
                padding: "24px 28px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Flagged Alert Banner */}
              {Number(drawerProduct.flagCount || 0) > 0 && (
                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "var(--warning-bg)",
                    color: "var(--warning-text)",
                    borderRadius: "10px",
                    border: "1px solid rgba(118, 82, 60, 0.2)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <AlertTriangle size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>
                        Chart Discrepancies Detected
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "2px", lineHeight: 1.4 }}>
                        This product has {drawerProduct.flagCount} flagged size issue(s) based
                        on customer return reasons.
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/chart-doctor?sku=${encodeURIComponent(drawerProduct.sku)}`}
                    className="btn-navy"
                    style={{
                      fontSize: "11.5px",
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      flexShrink: 0,
                      textDecoration: "none",
                    }}
                  >
                    Review Fix
                  </Link>
                </div>
              )}

              {/* Chart Loading */}
              {chartLoading && (
                <div
                  style={{
                    padding: "48px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <RefreshCw size={24} className="spinning" />
                  <span style={{ fontSize: "13px" }}>Loading size chart...</span>
                </div>
              )}

              {/* Chart Error */}
              {!chartLoading && chartError && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "var(--danger-bg)",
                    color: "var(--danger-text)",
                    borderRadius: "10px",
                    fontSize: "13px",
                  }}
                >
                  {chartError}
                </div>
              )}

              {/* Size Chart Table of Ranges */}
              {!chartLoading && !chartError && chartData && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "14.5px",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      Regional Size Ranges ({chartData.region || "Standard"})
                    </h4>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Values in centimeters (cm)
                    </span>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--hairline)",
                      borderRadius: "var(--radius-card)",
                      overflow: "hidden",
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--hairline)",
                            backgroundColor: "rgba(0, 0, 0, 0.02)",
                          }}
                        >
                          <th
                            style={{
                              padding: "10px 14px",
                              fontWeight: 600,
                              color: "var(--text)",
                              textAlign: "left",
                            }}
                          >
                            Size
                          </th>
                          {measurementFields.map((field) => (
                            <th
                              key={field}
                              style={{
                                padding: "10px 14px",
                                fontWeight: 600,
                                color: "var(--text)",
                              }}
                            >
                              {formatFieldHeader(field)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.sizeChart?.map((row) => (
                          <tr
                            key={row.size}
                            style={{
                              borderBottom: "1px solid var(--hairline)",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px 14px",
                                fontWeight: 600,
                                color: "var(--text)",
                                textAlign: "left",
                              }}
                            >
                              {row.size}
                            </td>
                            {measurementFields.map((field) => (
                              <td
                                key={field}
                                style={{
                                  padding: "12px 14px",
                                  color: "var(--text)",
                                }}
                              >
                                {formatRange(row[field])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "18px 28px",
                borderTop: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--surface)",
              }}
            >
              <Link
                to={`/widget-preview?sku=${encodeURIComponent(drawerProduct.sku)}`}
                className="btn-secondary"
                style={{
                  fontSize: "13px",
                  borderRadius: "9999px",
                  padding: "7px 18px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ExternalLink size={14} />
                <span>Preview Widget</span>
              </Link>

              <button
                type="button"
                onClick={handleCloseDrawer}
                className="btn-navy"
                style={{
                  fontSize: "13px",
                  borderRadius: "9999px",
                  padding: "7px 22px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Hover Animation & Slide-in Animation */}
      <style>{`
        .product-row-card {
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .product-row-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-card);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Products;

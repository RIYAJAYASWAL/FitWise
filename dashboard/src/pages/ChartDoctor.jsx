import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Lightbulb,
} from "lucide-react";
import { api } from "../api.js";

export function ChartDoctor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSku = searchParams.get("sku") || "";

  // State
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState(initialSku);
  const [activeTab, setActiveTab] = useState("analysis"); // "analysis" | "recommendations"

  // Analysis State
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState(null);

  // Suggestions State (for Recommendations tab)
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Apply Changes Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Fetch product list
  useEffect(() => {
    async function loadProducts() {
      try {
        const prodList = await api.getProducts();
        if (Array.isArray(prodList) && prodList.length > 0) {
          // Sort: flagged products first
          const sorted = [...prodList].sort(
            (a, b) => (b.flagCount || 0) - (a.flagCount || 0)
          );
          setProducts(sorted);

          // If no SKU selected or current SKU invalid, pick first product
          if (!selectedSku || !sorted.some((p) => p.sku === selectedSku)) {
            const defaultSku = sorted[0].sku;
            setSelectedSku(defaultSku);
            setSearchParams({ sku: defaultSku }, { replace: true });
          }
        }
      } catch (err) {
        console.error("Failed to load products for Chart Doctor:", err);
      }
    }
    loadProducts();
  }, []);

  // Fetch analysis for selected SKU
  const fetchAnalysis = async (sku) => {
    if (!sku) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const data = await api.getChartAnalysis(sku);
      setAnalysisData(data);
    } catch (err) {
      console.error(`Failed to load analysis for ${sku}:`, err);
      setAnalysisError(err.message || "Failed to load size chart analysis");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Fetch suggestions for selected SKU
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const data = await api.getSuggestions();
      setSuggestions(data?.items || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSku) {
      fetchAnalysis(selectedSku);
    }
  }, [selectedSku]);

  useEffect(() => {
    if (activeTab === "recommendations") {
      fetchSuggestions();
    }
  }, [activeTab]);

  const handleProductChange = (e) => {
    const nextSku = e.target.value;
    setSelectedSku(nextSku);
    setSearchParams({ sku: nextSku });
    setSuccessBanner(null);
  };

  const handleApplyFix = async () => {
    if (!analysisData?.suggestedFix?.changes || !selectedSku) return;

    setApplyLoading(true);
    setApplyError(null);
    try {
      await api.applyChartFix({
        sku: selectedSku,
        changes: analysisData.suggestedFix.changes,
      });

      setConfirmOpen(false);
      setSuccessBanner(
        `Successfully updated size chart for ${selectedProduct?.name || selectedSku}!`
      );

      // Refresh product list flags and analysis
      const updatedProducts = await api.getProducts();
      if (Array.isArray(updatedProducts)) {
        const sorted = [...updatedProducts].sort(
          (a, b) => (b.flagCount || 0) - (a.flagCount || 0)
        );
        setProducts(sorted);
      }
      await fetchAnalysis(selectedSku);
    } catch (err) {
      console.error("Failed to apply size chart changes:", err);
      setApplyError(err.message || "Failed to apply size chart adjustments");
    } finally {
      setApplyLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.sku === selectedSku);

  // Identify fields present in the sizeChart
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

  const measurementFields = getMeasurementFields(analysisData?.sizeChart);

  // Check if a specific cell (size, field) is changed in suggestedFix
  const isCellChanged = (size, field) => {
    if (!analysisData?.suggestedFix?.changes) return false;
    return analysisData.suggestedFix.changes.some(
      (ch) => ch.size === size && ch.field === field
    );
  };

  const getCellChange = (size, field) => {
    if (!analysisData?.suggestedFix?.changes) return null;
    return analysisData.suggestedFix.changes.find(
      (ch) => ch.size === size && ch.field === field
    );
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

  // Filter recommendations for this SKU
  const skuSuggestions = suggestions.filter(
    (item) => item.target?.sku === selectedSku
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1180px",
        margin: "0 auto",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Decorative Sparkles */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          display: "flex",
          gap: "8px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <Sparkles size={28} color="var(--accent-strong)" />
      </div>

      {/* Top Header & Visual Overview Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
        className="chart-doctor-header-grid"
      >
        {/* Left Side: Title, Banner & Product Selector */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minWidth: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "30px",
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              Chart Doctor
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", marginTop: "3px" }}>
              Detect and fix size chart issues from your return data.
            </p>
          </div>

          {/* Success Notification Banner */}
          {successBanner && (
            <div
              style={{
                padding: "10px 16px",
                backgroundColor: "var(--success-bg)",
                color: "var(--success-text)",
                borderRadius: "var(--radius-card)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "var(--shadow-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={18} />
                <span>{successBanner}</span>
              </div>
              <button
                onClick={() => setSuccessBanner(null)}
                style={{ color: "currentColor", opacity: 0.8 }}
                aria-label="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Select Product Selector */}
          <div style={{ maxWidth: "380px" }}>
            <label
              htmlFor="chart-doctor-product-select"
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Select Product &gt;
            </label>
            <div style={{ position: "relative" }}>
              <select
                id="chart-doctor-product-select"
                value={selectedSku}
                onChange={handleProductChange}
                style={{
                  width: "100%",
                  padding: "10px 38px 10px 14px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--text)",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  boxShadow: "var(--shadow-subtle)",
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  cursor: "pointer",
                }}
              >
                {products.map((prod) => (
                  <option key={prod.sku} value={prod.sku}>
                    {prod.name} {prod.flagCount > 0 ? `(${prod.flagCount} flagged)` : ""}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Top Area: Diagnostic Sizing Guide Image */}
        <div
          className="card"
          style={{
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--hairline)",
            boxShadow: "var(--shadow-subtle)",
            overflow: "hidden",
            width: "250px",
            marginTop: "0px",
            justifySelf: "start",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <img
            src="/chart-doctor-model.png"
            alt="FitWise Sizing & Fit Intelligence Diagnostic"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
            }}
          />
        </div>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "28px",
          borderBottom: "1px solid var(--hairline)",
          paddingBottom: "2px",
          marginTop: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("analysis")}
          style={{
            padding: "8px 4px",
            fontSize: "14px",
            fontWeight: activeTab === "analysis" ? 600 : 500,
            color: activeTab === "analysis" ? "var(--text)" : "var(--text-muted)",
            borderBottom:
              activeTab === "analysis"
                ? "2.5px solid var(--text)"
                : "2.5px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Size Chart Analysis
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          style={{
            padding: "8px 4px",
            fontSize: "14px",
            fontWeight: activeTab === "recommendations" ? 600 : 500,
            color:
              activeTab === "recommendations" ? "var(--text)" : "var(--text-muted)",
            borderBottom:
              activeTab === "recommendations"
                ? "2.5px solid var(--text)"
                : "2.5px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Recommendations
        </button>
      </div>

      {/* Tab 1: Size Chart Analysis */}
      {activeTab === "analysis" && (
        <>
          {/* Loading State */}
          {analysisLoading && (
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
              <span style={{ fontSize: "14px" }}>
                Analyzing size chart data for {selectedSku}...
              </span>
            </div>
          )}

          {/* Error State */}
          {!analysisLoading && analysisError && (
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
                  Unable to load size chart analysis
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
                  {analysisError}
                </p>
              </div>
              <button
                onClick={() => fetchAnalysis(selectedSku)}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Analysis Content Grid */}
          {!analysisLoading && !analysisError && analysisData && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr",
                gap: "24px",
                alignItems: "start",
              }}
              className="chart-doctor-grid"
            >
              {/* Left Column: Size Chart Table */}
              <div
                className="card"
                style={{
                  padding: "24px",
                  borderRadius: "var(--radius-card)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  boxShadow: "var(--shadow-subtle)",
                  overflowX: "auto",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Current Size Chart ({selectedProduct?.name || selectedSku})
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Measurements in centimeters. Highlighted cells represent suggested fixes.
                  </p>
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                    fontSize: "13.5px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <th
                        style={{
                          padding: "12px 14px",
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
                            padding: "12px 14px",
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
                    {analysisData.sizeChart?.map((row) => (
                      <tr
                        key={row.size}
                        style={{
                          borderBottom: "1px solid var(--hairline)",
                          transition: "background-color 0.1s ease",
                        }}
                      >
                        {/* Size Column */}
                        <td
                          style={{
                            padding: "14px 14px",
                            fontWeight: 600,
                            color: "var(--text)",
                            textAlign: "left",
                          }}
                        >
                          {row.size}
                        </td>

                        {/* Measurement Fields */}
                        {measurementFields.map((field) => {
                          const changed = isCellChanged(row.size, field);
                          const changeInfo = getCellChange(row.size, field);

                          return (
                            <td
                              key={field}
                              style={{
                                padding: "14px 14px",
                                color: changed ? "var(--danger-text)" : "var(--text-muted)",
                                fontWeight: changed ? 600 : 400,
                                backgroundColor: changed
                                  ? "rgba(224, 93, 82, 0.09)"
                                  : "transparent",
                                borderRadius: changed ? "6px" : "0",
                                transition: "all 0.15s ease",
                              }}
                              title={
                                changed && changeInfo
                                  ? `Suggested Fix: ${formatRange(changeInfo.from)} → ${formatRange(
                                    changeInfo.to
                                  )} cm`
                                  : undefined
                              }
                            >
                              <div
                                style={{
                                  display: "inline-flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "2px",
                                }}
                              >
                                <span>{formatRange(row[field])}</span>
                                {changed && changeInfo && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      padding: "1px 6px",
                                      borderRadius: "9999px",
                                      backgroundColor: "var(--danger-bg)",
                                      color: "var(--danger-text)",
                                    }}
                                  >
                                    → {formatRange(changeInfo.to)}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Column: Analysis & Suggested Fix Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Has issues: Render Analysis & Suggested Fix */}
                {analysisData.suggestedFix ? (
                  <>
                    {/* Analysis Card */}
                    <div
                      className="card"
                      style={{
                        padding: "24px",
                        borderRadius: "var(--radius-card)",
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        boxShadow: "var(--shadow-subtle)",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "15.5px",
                          fontWeight: 600,
                          color: "var(--text)",
                          marginBottom: "16px",
                        }}
                      >
                        Analysis
                      </h3>

                      <ul
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        {analysisData.issues.map((issue, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              fontSize: "13px",
                              lineHeight: 1.45,
                              color: "var(--text)",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                backgroundColor: "#E05D52",
                                marginTop: "6px",
                                flexShrink: 0,
                              }}
                              aria-hidden="true"
                            />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggested Fix Card */}
                    <div
                      className="card"
                      style={{
                        padding: "24px",
                        borderRadius: "var(--radius-card)",
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        boxShadow: "var(--shadow-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "15.5px",
                            fontWeight: 600,
                            color: "var(--text)",
                            marginBottom: "8px",
                          }}
                        >
                          Suggested Fix
                        </h3>
                        <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          Calibration recommendation based on returns analysis
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          fontSize: "13px",
                          lineHeight: 1.45,
                          color: "var(--text)",
                          backgroundColor: "rgba(100, 138, 142, 0.08)",
                          padding: "12px 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(100, 138, 142, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: "var(--accent-strong)",
                            marginTop: "6px",
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                        <span>{analysisData.suggestedFix.summary}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        className="btn-navy"
                        style={{
                          borderRadius: "9999px",
                          padding: "11px 24px",
                          fontSize: "14px",
                          fontWeight: 500,
                          marginTop: "6px",
                          width: "100%",
                        }}
                      >
                        Apply Changes
                      </button>
                    </div>
                  </>
                ) : (
                  /* Empty State: No Issues Found */
                  <div
                    className="card"
                    style={{
                      padding: "48px 24px",
                      borderRadius: "var(--radius-card)",
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-subtle)",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
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
                      <ShieldCheck size={26} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "16.5px",
                          fontWeight: 600,
                          color: "var(--text)",
                          marginBottom: "4px",
                        }}
                      >
                        No Issues Detected
                      </h3>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          lineHeight: 1.45,
                        }}
                      >
                        Size return rates for {selectedProduct?.name || selectedSku} are
                        within expected healthy boundaries. No chart calibrations are needed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {suggestionsLoading && (
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
              <span style={{ fontSize: "14px" }}>Loading recommendations...</span>
            </div>
          )}

          {!suggestionsLoading && skuSuggestions.length === 0 && (
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
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 138, 142, 0.15)",
                  color: "var(--accent-strong)",
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
                    fontSize: "17.5px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}
                >
                  No Pending Recommendations
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px", maxWidth: "420px" }}>
                  There are no sizing suggestions or flagged alerts for{" "}
                  {selectedProduct?.name || selectedSku}.
                </p>
              </div>
            </div>
          )}

          {!suggestionsLoading &&
            skuSuggestions.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: "20px 24px",
                  borderRadius: "var(--radius-card)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  boxShadow: "var(--shadow-subtle)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(100, 138, 142, 0.15)",
                      color: "var(--accent-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "4px",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        lineHeight: 1.45,
                        maxWidth: "600px",
                      }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    backgroundColor:
                      item.impact === "High" ? "var(--danger-bg)" : "var(--warning-bg)",
                    color:
                      item.impact === "High"
                        ? "var(--danger-text)"
                        : "var(--warning-text)",
                  }}
                >
                  {item.impact}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Confirm Apply Changes Dialog Modal */}
      {confirmOpen && (
        <div
          onClick={() => setConfirmOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12, 24, 34, 0.55)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--hairline)",
              padding: "28px",
              boxShadow: "var(--shadow-card)",
              position: "relative",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Confirm Size Chart Changes
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Product: {selectedProduct?.name || selectedSku}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  color: "var(--text-muted)",
                  padding: "4px",
                  borderRadius: "6px",
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {applyError && (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "var(--danger-bg)",
                  color: "var(--danger-text)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {applyError}
              </div>
            )}

            {/* Summary Text */}
            <p style={{ fontSize: "13.5px", color: "var(--text)", marginBottom: "16px" }}>
              The following modifications will be applied to the product's size chart:
            </p>

            {/* Changes List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "240px",
                overflowY: "auto",
                marginBottom: "24px",
                padding: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                borderRadius: "8px",
                border: "1px solid var(--hairline)",
              }}
            >
              {analysisData?.suggestedFix?.changes?.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "var(--surface)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text)",
                        backgroundColor: "var(--ivory)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      Size {ch.size}
                    </span>
                    <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {ch.field}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      {formatRange(ch.from)} cm
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--accent-strong)", fontWeight: 600 }}>
                      {formatRange(ch.to)} cm
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary"
                style={{ borderRadius: "9999px", padding: "8px 18px", fontSize: "13.5px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyLoading}
                onClick={handleApplyFix}
                className="btn-navy"
                style={{ borderRadius: "9999px", padding: "8px 22px", fontSize: "13.5px" }}
              >
                {applyLoading ? "Applying..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid Styling */}
      <style>{`
        @media (max-width: 900px) {
          .chart-doctor-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ChartDoctor;

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Sliders,
  ShieldCheck,
  Store,
  Copy,
  Check,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Eye,
  Layers,
} from "lucide-react";
import { api } from "../api.js";

const WIDGET_FEATURES = [
  {
    icon: Sparkles,
    label: "Smart sizing",
    description: "ML recommendations based on shopper body measurements and purchase behavior.",
  },
  {
    icon: Sliders,
    label: "Size chart integration",
    description: "Automatic regional conversion (US, UK, EU, IN) mapped directly to your catalog.",
  },
  {
    icon: ShieldCheck,
    label: "Shadow DOM",
    description: "Completely isolated styles so the widget never breaks your theme's design.",
  },
  {
    icon: Store,
    label: "Works on any store",
    description: "Zero dependencies. Compatible with Shopify, WooCommerce, BigCommerce, or custom stores.",
  },
];

export function WidgetPreview() {
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const widgetMountRef = useRef(null);
  const dropdownRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const widgetUrl = import.meta.env.VITE_WIDGET_URL || "http://localhost:5173";
  const publishableKey = import.meta.env.VITE_PUBLISHABLE_KEY || "fw_pub_demo_984f1a23c7e0";

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 1. Fetch products from GET /api/products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      if (list.length > 0 && !selectedSku) {
        // Default to a blouse or first product for preview
        const defaultProd =
          list.find((p) => p.sku === "SKU-BLOUSE-COTTON" || p.category === "blouse") ||
          list[0];
        setSelectedSku(defaultProd.sku);
      }
    } catch (err) {
      setError(err.message || "Failed to load products for preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const selectedProduct = products.find((p) => p.sku === selectedSku) || products[0];

  // Gallery images array
  const galleryPhotos = [
    "/preview-model.jpg",
    selectedProduct?.imageUrl || "/preview-model.jpg",
    "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800",
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800",
  ];

  // 2. Mount and remount LIVE widget when selectedSku changes
  useEffect(() => {
    if (!selectedSku || !widgetMountRef.current) return;

    let isMounted = true;
    setWidgetLoading(true);

    const mount = () => {
      if (!isMounted || !widgetMountRef.current) return;

      // Clear container and create fresh mount point element
      widgetMountRef.current.innerHTML = "";
      const mountNode = document.createElement("div");
      mountNode.id = "fitwise-widget-live-node";
      mountNode.setAttribute("data-product-id", selectedSku);
      mountNode.setAttribute("data-api-url", apiUrl);
      mountNode.setAttribute("data-api-key", publishableKey);
      mountNode.setAttribute("data-inline", "true");
      mountNode.setAttribute("data-open", "true");
      mountNode.setAttribute("data-variant", "treatment");
      widgetMountRef.current.appendChild(mountNode);

      if (window.FitWise && typeof window.FitWise.mountWidget === "function") {
        window.FitWise.mountWidget(mountNode, {
          productId: selectedSku,
          apiUrl,
          apiKey: publishableKey,
          inline: true,
          defaultOpen: true,
          forcedVariant: "treatment",
        });
        setWidgetLoading(false);
      } else {
        // Load fitwise.js if not yet loaded on window
        const scriptId = "fitwise-preview-script";
        let script = document.getElementById(scriptId);

        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = `${widgetUrl}/fitwise.js`;
          script.async = true;
          script.onload = () => {
            if (isMounted && window.FitWise && typeof window.FitWise.mountWidget === "function") {
              window.FitWise.mountWidget(mountNode, {
                productId: selectedSku,
                apiUrl,
                apiKey: publishableKey,
                inline: true,
                defaultOpen: true,
                forcedVariant: "treatment",
              });
            }
            if (isMounted) setWidgetLoading(false);
          };
          script.onerror = () => {
            if (isMounted) {
              setWidgetLoading(false);
              console.warn("Unable to load fitwise.js from", widgetUrl);
            }
          };
          document.body.appendChild(script);
        } else {
          // If script already exists but window.FitWise wasn't ready immediately
          setTimeout(() => {
            if (isMounted && window.FitWise && typeof window.FitWise.mountWidget === "function") {
              window.FitWise.mountWidget(mountNode, {
                productId: selectedSku,
                apiUrl,
                apiKey: publishableKey,
                inline: true,
                defaultOpen: true,
                forcedVariant: "treatment",
              });
            }
            if (isMounted) setWidgetLoading(false);
          }, 300);
        }
      }
    };

    mount();

    return () => {
      isMounted = false;
      if (widgetMountRef.current) {
        widgetMountRef.current.innerHTML = "";
      }
    };
  }, [selectedSku, apiUrl, widgetUrl, publishableKey]);

  // Copy embed snippet handler
  const embedSnippet = `<!-- FitWise Size Recommender Widget -->
<div id="fitwise-widget"
  data-product-id="${selectedSku || "SKU-PRODUCT-ID"}"
  data-api-url="${apiUrl}"
  data-api-key="${publishableKey}"></div>
<script src="${widgetUrl}/fitwise.js" defer></script>`;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Title & Subtitle */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "36px",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.2,
          }}
        >
          Widget Preview
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "14.5px",
            marginTop: "6px",
          }}
        >
          See how the FitWise widget looks on your product page.
        </p>
      </div>

      {/* Error Banner */}
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
          <button
            onClick={fetchProducts}
            className="btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Preview Row */}
      <div
        className="preview-layout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left / Center Card: Product Gallery + Live Widget */}
        <div
          className="card"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--hairline)",
            boxShadow: "var(--shadow-card)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Top Bar inside Preview: Product Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--hairline)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Preview product:
              </span>
              {/* Product Selector Dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-label="Select preview product"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "7px 14px",
                    borderRadius: "9999px",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow: "var(--shadow-subtle)",
                  }}
                >
                  <span>
                    {selectedProduct
                      ? `${selectedProduct.name} (${selectedProduct.category})`
                      : "Loading products..."}
                  </span>
                  <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                </button>

                {dropdownOpen && (
                  <div
                    className="card"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      width: "280px",
                      maxHeight: "300px",
                      overflowY: "auto",
                      padding: "6px",
                      zIndex: 50,
                      boxShadow: "0 8px 24px rgba(12, 24, 34, 0.14)",
                    }}
                  >
                    {products.map((p) => (
                      <button
                        key={p.sku}
                        onClick={() => {
                          setSelectedSku(p.sku);
                          setDropdownOpen(false);
                          setActiveThumbIndex(0);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          backgroundColor:
                            selectedSku === p.sku
                              ? "rgba(100, 138, 142, 0.12)"
                              : "transparent",
                          color:
                            selectedSku === p.sku
                              ? "var(--accent-strong)"
                              : "var(--text)",
                          fontWeight: selectedSku === p.sku ? 600 : 400,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "13px" }}>{p.name}</span>
                        <span
                          style={{
                            fontSize: "11.5px",
                            color: "var(--text-muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {p.sku} • {p.category} • {p.region}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--accent-strong)",
                backgroundColor: "rgba(100, 138, 142, 0.12)",
                padding: "4px 10px",
                borderRadius: "9999px",
                fontWeight: 500,
              }}
            >
              <Eye size={13} />
              <span>Live Storefront Mode</span>
            </div>
          </div>

          {/* Product Gallery & Live Widget Split */}
          <div
            className="gallery-widget-container"
            style={{
              display: "grid",
              gridTemplateColumns: "360px minmax(0, 1fr)",
              gap: "28px",
              alignItems: "start",
            }}
          >
            {/* Left: Mock Product Gallery */}
            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
              }}
            >
              {/* Vertical Thumbnail Strip */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                {galleryPhotos.map((url, idx) => {
                  const isActive = activeThumbIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveThumbIndex(idx)}
                      aria-label={`View photo ${idx + 1}`}
                      style={{
                        width: "48px",
                        height: "56px",
                        borderRadius: "6px",
                        overflow: "hidden",
                        border: `2px solid ${isActive ? "var(--accent-strong)" : "var(--hairline)"}`,
                        padding: 0,
                        backgroundColor: "var(--ivory)",
                        cursor: "pointer",
                        opacity: isActive ? 1 : 0.7,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/preview-model.jpg";
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Main Model Preview Image */}
              <div
                style={{
                  flex: 1,
                  borderRadius: "10px",
                  overflow: "hidden",
                  backgroundColor: "var(--ivory)",
                  border: "1px solid var(--hairline)",
                  boxShadow: "var(--shadow-subtle)",
                  position: "relative",
                  aspectRatio: "3 / 4",
                  maxHeight: "520px",
                }}
              >
                <img
                  src={galleryPhotos[activeThumbIndex] || "/preview-model.jpg"}
                  alt={selectedProduct?.name || "Product Showcase"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/preview-model.jpg";
                  }}
                />
              </div>
            </div>

            {/* Right/Center: LIVE Widget Mount Container */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              {widgetLoading && (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "13.5px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <RefreshCw size={20} className="spinning" />
                  <span>Mounting live FitWise widget in Shadow DOM...</span>
                </div>
              )}

              {/* Live Host DOM Node */}
              <div
                ref={widgetMountRef}
                style={{
                  minHeight: "420px",
                  display: widgetLoading ? "none" : "block",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: "Widget Features" Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <h2
            style={{
              fontSize: "16.5px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "2px",
            }}
          >
            Widget Features
          </h2>

          {/* 4 Feature Items */}
          {WIDGET_FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="card"
                style={{
                  backgroundColor: "var(--surface)",
                  borderRadius: "9999px",
                  border: "1px solid var(--hairline)",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "var(--shadow-subtle)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "var(--ivory)",
                    border: "1px solid var(--hairline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--navy)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {feat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Below: Embed Snippet with Copy Button */}
      <div
        className="card"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--hairline)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Storefront Embed Snippet
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              Paste this HTML snippet on your product detail page template.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySnippet}
            className="btn-navy"
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Snippet"}</span>
          </button>
        </div>

        {/* Code Block */}
        <pre
          style={{
            margin: 0,
            padding: "16px",
            backgroundColor: "var(--navy)",
            color: "#E2E8F0",
            borderRadius: "8px",
            fontSize: "13px",
            lineHeight: 1.6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            overflowX: "auto",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <code>{embedSnippet}</code>
        </pre>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 1040px) {
          .preview-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .gallery-widget-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default WidgetPreview;

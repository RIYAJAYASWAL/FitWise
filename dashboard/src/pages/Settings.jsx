import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Palette,
  Edit2,
  Check,
  X,
  Sun,
  Moon,
  Copy,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Store,
  Package,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { api } from "../api.js";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500";

export function Settings() {
  const navigate = useNavigate();
  const { store, key, disconnect, refreshStore } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Active Tab: "profile" | "appearance" | "security"
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: store?.name || "StyleHub",
    ownerName: store?.ownerName || "Riya Jayaswal",
    website: store?.website || "www.stylehub.com",
  });

  // Security Tab State
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Synchronize formData when store changes
  React.useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || "StyleHub",
        ownerName: store.ownerName || "Riya Jayaswal",
        website: store.website || "www.stylehub.com",
      });
    }
  }, [store]);

  const handleStartEdit = () => {
    setFormData({
      name: store?.name || "StyleHub",
      ownerName: store?.ownerName || "Riya Jayaswal",
      website: store?.website || "www.stylehub.com",
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSaveError("Store name cannot be empty");
      return;
    }
    if (!formData.ownerName.trim()) {
      setSaveError("Owner name cannot be empty");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await api.updateStore({
        name: formData.name.trim(),
        ownerName: formData.ownerName.trim(),
        website: formData.website.trim(),
      });

      await refreshStore();
      setIsEditing(false);
      setSuccessBanner("Store information updated successfully!");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      console.error("Failed to update store:", err);
      setSaveError(err.message || "Failed to update store details");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = () => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    navigate("/login");
  };

  const ownerName = store?.ownerName || "Riya Jayaswal";
  const ownerEmail =
    store?.ownerEmail ||
    `${ownerName.toLowerCase().replace(/[^a-z0-9]/g, "")}@fitwise.com`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Title */}
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
          Profile & Settings
        </h1>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "8px 24px",
            borderRadius: "9999px",
            fontSize: "13.5px",
            fontWeight: 500,
            backgroundColor: activeTab === "profile" ? "var(--navy)" : "transparent",
            color: activeTab === "profile" ? "#FFFFFF" : "var(--text-muted)",
            border:
              activeTab === "profile"
                ? "1px solid transparent"
                : "1px solid var(--hairline)",
            boxShadow: activeTab === "profile" ? "var(--shadow-subtle)" : "none",
            transition: "all 0.15s ease",
            cursor: "pointer",
          }}
        >
          Profile
        </button>

        {/* Appearance Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          style={{
            padding: "8px 24px",
            borderRadius: "9999px",
            fontSize: "13.5px",
            fontWeight: 500,
            backgroundColor:
              activeTab === "appearance" ? "var(--navy)" : "transparent",
            color: activeTab === "appearance" ? "#FFFFFF" : "var(--text-muted)",
            border:
              activeTab === "appearance"
                ? "1px solid transparent"
                : "1px solid var(--hairline)",
            boxShadow: activeTab === "appearance" ? "var(--shadow-subtle)" : "none",
            transition: "all 0.15s ease",
            cursor: "pointer",
          }}
        >
          Appearance
        </button>

        {/* Security Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          style={{
            padding: "8px 24px",
            borderRadius: "9999px",
            fontSize: "13.5px",
            fontWeight: 500,
            backgroundColor:
              activeTab === "security" ? "var(--navy)" : "transparent",
            color: activeTab === "security" ? "#FFFFFF" : "var(--text-muted)",
            border:
              activeTab === "security"
                ? "1px solid transparent"
                : "1px solid var(--hairline)",
            boxShadow: activeTab === "security" ? "var(--shadow-subtle)" : "none",
            transition: "all 0.15s ease",
            cursor: "pointer",
          }}
        >
          Security
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "var(--success-bg)",
            color: "var(--success-text)",
            borderRadius: "var(--radius-card)",
            fontSize: "13.5px",
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

      {/* TAB 1: PROFILE */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Avatar and Owner Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "4px",
            }}
          >
            {/* Avatar Placeholder */}
            <div
              style={{
                width: "78px",
                height: "78px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid var(--hairline)",
                backgroundColor: "var(--photo-placeholder)",
                boxShadow: "var(--shadow-subtle)",
                flexShrink: 0,
              }}
            >
              <img
                src={DEFAULT_AVATAR}
                alt={ownerName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Owner Details */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.25,
                  marginBottom: "4px",
                }}
              >
                {ownerName}
              </h2>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginBottom: "2px",
                }}
              >
                {ownerEmail}
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                Store Owner
              </div>
            </div>
          </div>

          {/* Store Information Card */}
          <div
            className="card"
            style={{
              padding: "28px 32px",
              borderRadius: "var(--radius-card)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--hairline)",
              boxShadow: "var(--shadow-subtle)",
              maxWidth: "680px",
            }}
          >
            {/* Card Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Store Information
              </h3>

              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: "var(--text)",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    transition: "color 0.15s ease",
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {/* Error Message */}
            {saveError && (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "var(--danger-bg)",
                  color: "var(--danger-text)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "18px",
                }}
              >
                {saveError}
              </div>
            )}

            {/* View Mode */}
            {!isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                <div>
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                      fontWeight: 500,
                    }}
                  >
                    Store Name
                  </div>
                  <div
                    style={{
                      fontSize: "14.5px",
                      color: "var(--text)",
                      fontWeight: 500,
                    }}
                  >
                    {store?.name || "StyleHub"}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                      fontWeight: 500,
                    }}
                  >
                    Website
                  </div>
                  <div
                    style={{
                      fontSize: "14.5px",
                      color: "var(--text)",
                      fontWeight: 500,
                    }}
                  >
                    {store?.website || "www.stylehub.com"}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                      fontWeight: 500,
                    }}
                  >
                    Number of Products
                  </div>
                  <div
                    style={{
                      fontSize: "14.5px",
                      color: "var(--text)",
                      fontWeight: 500,
                    }}
                  >
                    {store?.productCount ?? 8}
                  </div>
                </div>

                {/* Bottom Edit Link matching mockup */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    paddingTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text)",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Form Mode */
              <form onSubmit={handleSaveStore}>
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text)",
                        marginBottom: "6px",
                      }}
                    >
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input-field"
                      style={{ borderRadius: "8px" }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text)",
                        marginBottom: "6px",
                      }}
                    >
                      Website
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="e.g. www.stylehub.com"
                      className="input-field"
                      style={{ borderRadius: "8px" }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text)",
                        marginBottom: "6px",
                      }}
                    >
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerName: e.target.value })
                      }
                      className="input-field"
                      style={{ borderRadius: "8px" }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        fontWeight: 500,
                      }}
                    >
                      Number of Products (Read-only)
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "var(--text-muted)",
                        padding: "8px 0",
                      }}
                    >
                      {store?.productCount ?? 8} products
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-secondary"
                      style={{
                        borderRadius: "9999px",
                        padding: "8px 18px",
                        fontSize: "13.5px",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-navy"
                      style={{
                        borderRadius: "9999px",
                        padding: "8px 22px",
                        fontSize: "13.5px",
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: APPEARANCE */}
      {activeTab === "appearance" && (
        <div
          className="card"
          style={{
            padding: "32px",
            borderRadius: "var(--radius-card)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--hairline)",
            boxShadow: "var(--shadow-subtle)",
            maxWidth: "680px",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              Theme Preferences
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Choose how FitWise looks to you. Your preference is saved in local storage.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Light Mode Card */}
            <div
              onClick={() => {
                if (theme !== "light") toggleTheme();
              }}
              style={{
                padding: "20px",
                borderRadius: "12px",
                border:
                  theme === "light"
                    ? "2px solid var(--accent-strong)"
                    : "1px solid var(--hairline)",
                backgroundColor: "#FBF7F1",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow:
                  theme === "light"
                    ? "0 4px 14px rgba(100, 138, 142, 0.2)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              <div
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
                    gap: "10px",
                    color: "#101822",
                  }}
                >
                  <Sun size={20} color="#D97706" />
                  <span style={{ fontWeight: 600, fontSize: "14.5px" }}>Light Mode</span>
                </div>
                {theme === "light" && (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-strong)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p style={{ fontSize: "12.5px", color: "#5F6670", lineHeight: 1.4 }}>
                Warm ivory palette sampled directly from natural paper tones.
              </p>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => {
                if (theme !== "dark") toggleTheme();
              }}
              style={{
                padding: "20px",
                borderRadius: "12px",
                border:
                  theme === "dark"
                    ? "2px solid var(--accent-strong)"
                    : "1px solid var(--hairline)",
                backgroundColor: "#0C1822",
                color: "#F7F3EC",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow:
                  theme === "dark"
                    ? "0 4px 14px rgba(100, 138, 142, 0.3)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              <div
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
                    gap: "10px",
                    color: "#F7F3EC",
                  }}
                >
                  <Moon size={20} color="#60A5FA" />
                  <span style={{ fontWeight: 600, fontSize: "14.5px" }}>Dark Mode</span>
                </div>
                {theme === "dark" && (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-strong)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p style={{ fontSize: "12.5px", color: "#95A5B2", lineHeight: 1.4 }}>
                Deep midnight navy palette designed for reduced glare and night viewing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "680px" }}>
          {/* Key Session Explanation */}
          <div
            className="card"
            style={{
              padding: "28px 32px",
              borderRadius: "var(--radius-card)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--hairline)",
              boxShadow: "var(--shadow-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(100, 138, 142, 0.15)",
                  color: "var(--accent-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Shield size={24} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}
                >
                  Session-Only Secret Key
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Your merchant secret key (<code>x-api-key</code>) is kept strictly in{" "}
                  <strong>this browser session</strong> (<code>sessionStorage</code>). It is
                  never saved to persistent cookies, never shared with third parties, and is
                  automatically erased when you close this browser tab or disconnect.
                </p>
              </div>
            </div>

            {/* Secret Key Display Box */}
            <div
              style={{
                padding: "16px 20px",
                backgroundColor: "rgba(0, 0, 0, 0.03)",
                borderRadius: "10px",
                border: "1px solid var(--hairline)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Active Secret Key
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showKey ? "Hide" : "Show"}</span>
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <code
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13.5px",
                    color: "var(--text)",
                    letterSpacing: "0.5px",
                    wordBreak: "break-all",
                  }}
                >
                  {showKey
                    ? key || "fw_sec_demo_a41b89c372ef"
                    : key
                    ? `${key.slice(0, 7)}${"•".repeat(Math.max(12, key.length - 7))}`
                    : "fw_sec_••••••••••••••••"}
                </code>

                <button
                  type="button"
                  onClick={handleCopyKey}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--hairline)",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: "var(--text)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {copiedKey ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Disconnect Section */}
          <div
            className="card"
            style={{
              padding: "24px 32px",
              borderRadius: "var(--radius-card)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--hairline)",
              boxShadow: "var(--shadow-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                Disconnect Session
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px" }}>
                Clearing your session removes your credentials from this device. You will need
                your secret key to connect again.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 22px",
                borderRadius: "9999px",
                fontSize: "13.5px",
                fontWeight: 500,
                backgroundColor: "var(--surface)",
                color: "var(--danger-text)",
                border: "1px solid var(--danger-text)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <LogOut size={16} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

import React, { useState, useEffect } from "react";
import {
  Search,
  Compass,
  Users,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { api } from "../api.js";

export function Communities() {
  const [tab, setTab] = useState("discover"); // "discover" | "mine"
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Group Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    category: "general",
  });

  const fetchGroups = async (currentTab = tab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCommunityGroups(currentTab);
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load community groups:", err);
      setError(err.message || "Failed to load community groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(tab);
  }, [tab]);

  const handleJoinLeave = async (group) => {
    const isCurrentlyJoined = Boolean(group.joined);
    const originalGroups = [...groups];

    // Optimistic update
    setGroups((prev) =>
      prev.map((g) => {
        if (g._id === group._id) {
          const nextJoined = !isCurrentlyJoined;
          const nextCount = nextJoined
            ? (g.memberCount || 0) + 1
            : Math.max(0, (g.memberCount || 1) - 1);
          return { ...g, joined: nextJoined, memberCount: nextCount };
        }
        return g;
      })
    );

    try {
      if (isCurrentlyJoined) {
        await api.leaveCommunityGroup(group._id);
      } else {
        await api.joinCommunityGroup(group._id);
      }
      // If we are on "mine" tab and user leaves, optionally refetch or keep updated
      if (tab === "mine" && isCurrentlyJoined) {
        setGroups((prev) => prev.filter((g) => g._id !== group._id));
      }
    } catch (err) {
      console.error("Failed to update membership:", err);
      // Revert on error
      setGroups(originalGroups);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      setCreateError("Group name is required");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await api.createCommunityGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        category: newGroup.category,
        joined: true,
      });

      setModalOpen(false);
      setNewGroup({ name: "", description: "", category: "general" });

      // Add to local state immediately
      setGroups((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Failed to create group:", err);
      setCreateError(err.message || "Failed to create group");
    } finally {
      setCreateLoading(false);
    }
  };

  const formatMembers = (count) => {
    const num = Number(count || 0);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K members`;
    }
    return `${num} members`;
  };

  // Filter groups by search query
  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (g.name || "").toLowerCase().includes(q);
    const descMatch = (g.description || "").toLowerCase().includes(q);
    const catMatch = (g.category || "").toLowerCase().includes(q);
    return nameMatch || descMatch || catMatch;
  });

  // For Discover tab: divide into Popular (first 3) and Recommended (remaining)
  const isDiscover = tab === "discover";
  const popularGroups = isDiscover ? filteredGroups.slice(0, 3) : filteredGroups;
  const recommendedGroups = isDiscover ? filteredGroups.slice(3) : [];

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
      {/* Page Title */}
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
          Communities
        </h1>
      </div>

      {/* Tabs Row & Create Group Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Pill Tabs */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            padding: "4px",
            borderRadius: "9999px",
            border: "1px solid var(--hairline)",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("discover")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 20px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 500,
              backgroundColor: tab === "discover" ? "var(--surface)" : "transparent",
              color: tab === "discover" ? "var(--text)" : "var(--text-muted)",
              boxShadow: tab === "discover" ? "var(--shadow-subtle)" : "none",
              border: tab === "discover" ? "1px solid var(--hairline)" : "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Compass size={15} />
            <span>Discover</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("mine")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 20px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 500,
              backgroundColor: tab === "mine" ? "var(--surface)" : "transparent",
              color: tab === "mine" ? "var(--text)" : "var(--text-muted)",
              boxShadow: tab === "mine" ? "var(--shadow-subtle)" : "none",
              border: tab === "mine" ? "1px solid var(--hairline)" : "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Users size={15} />
            <span>My Groups</span>
          </button>
        </div>

        {/* Navy "Create Group" Button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-navy"
          style={{
            borderRadius: "9999px",
            padding: "9px 22px",
            fontSize: "13.5px",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <Plus size={16} />
          <span>Create Group</span>
        </button>
      </div>

      {/* Full-Width Pill Search Field */}
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
          placeholder="Search communities..."
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
          <span style={{ fontSize: "14px" }}>Loading communities...</span>
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
              Unable to load communities
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>{error}</p>
          </div>
          <button
            onClick={() => fetchGroups(tab)}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Content Render */}
      {!loading && !error && (
        <>
          {/* Empty Search Result */}
          {filteredGroups.length === 0 && searchQuery && (
            <div
              className="card"
              style={{
                padding: "56px 32px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Search size={24} style={{ color: "var(--text-muted)", opacity: 0.7 }} />
              <h3 style={{ fontSize: "16.5px", color: "var(--text)" }}>
                No communities found matching "{searchQuery}"
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
                Try searching for a different keyword or category.
              </p>
            </div>
          )}

          {/* Empty Tab State (e.g. My Groups empty) */}
          {filteredGroups.length === 0 && !searchQuery && (
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
                <Users size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "17.5px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                  {tab === "mine" ? "No joined groups yet" : "No communities available"}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px", maxWidth: "420px" }}>
                  {tab === "mine"
                    ? "Browse the Discover tab to find communities matching your store's style and audience."
                    : "Create a new community group using the button above to get started."}
                </p>
              </div>
              {tab === "mine" && (
                <button
                  type="button"
                  onClick={() => setTab("discover")}
                  className="btn-navy"
                  style={{ borderRadius: "9999px", padding: "8px 20px", marginTop: "4px" }}
                >
                  Explore Discover Tab
                </button>
              )}
            </div>
          )}

          {/* Section 1: Popular Groups (or All My Groups if on mine tab) */}
          {popularGroups.length > 0 && (
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "16px",
                }}
              >
                {tab === "mine" ? "My Communities" : "Popular Groups"}
              </h2>

              <div className="community-cards-grid">
                {popularGroups.map((group) => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    formatMembers={formatMembers}
                    onJoinLeave={handleJoinLeave}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Recommended for you (on Discover tab) */}
          {isDiscover && recommendedGroups.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "16px",
                }}
              >
                Recommended for you
              </h2>

              <div className="community-cards-grid">
                {recommendedGroups.map((group) => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    formatMembers={formatMembers}
                    onJoinLeave={handleJoinLeave}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Group Modal Dialog */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
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
              maxWidth: "460px",
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
                marginBottom: "20px",
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
                  Create Group
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Start a new sizing & styling community for shoppers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
            {createError && (
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
                {createError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateGroup}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="e.g. Denim Enthusiasts, Tailored Tops..."
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
                    Category
                  </label>
                  <select
                    value={newGroup.category}
                    onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
                    className="input-field"
                    style={{ borderRadius: "8px" }}
                  >
                    <option value="general">General</option>
                    <option value="tshirt">T-Shirt</option>
                    <option value="jeans">Jeans</option>
                    <option value="kurta">Kurta / Ethnic</option>
                    <option value="blouse">Blouse / Formal</option>
                  </select>
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
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="What is this community about? Share fit tips, styles & reviews..."
                    className="input-field"
                    style={{ borderRadius: "8px", resize: "vertical" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary"
                    style={{ borderRadius: "9999px", padding: "8px 18px", fontSize: "13.5px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="btn-navy"
                    style={{ borderRadius: "9999px", padding: "8px 22px", fontSize: "13.5px" }}
                  >
                    {createLoading ? "Creating..." : "Create Group"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Group Card Component
function GroupCard({ group, formatMembers, onJoinLeave }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="card group-card"
      style={{
        padding: "20px 22px",
        borderRadius: "var(--radius-card)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "180px",
        boxShadow: "var(--shadow-subtle)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Top Part: Avatar & Info */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        {/* Avatar Placeholder / Image */}
        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "var(--photo-placeholder)",
            border: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {group.imageUrl && !imgError ? (
            <img
              src={group.imageUrl}
              alt={group.name}
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "18px",
                fontWeight: 600,
                fontFamily: "var(--font-serif)",
              }}
            >
              {(group.name || "C").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.25,
              marginBottom: "3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {group.name}
          </h3>

          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              marginBottom: "4px",
              fontWeight: 500,
            }}
          >
            {formatMembers(group.memberCount)}
          </div>

          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {group.description || "Share fits, styles & sizing reviews"}
          </p>

          {/* Small "Sample content" chip for seeded groups */}
          {group.isDemo && (
            <div style={{ marginTop: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--ivory)",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-muted)",
                  display: "inline-block",
                }}
              >
                Sample content
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Center: Join / Leave Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "16px",
          paddingTop: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => onJoinLeave(group)}
          className={group.joined ? "btn-secondary" : "btn-navy"}
          style={{
            borderRadius: "9999px",
            padding: "6px 26px",
            fontSize: "13px",
            fontWeight: 500,
            minWidth: "96px",
          }}
        >
          {group.joined ? "Leave" : "Join"}
        </button>
      </div>
    </div>
  );
}

export default Communities;

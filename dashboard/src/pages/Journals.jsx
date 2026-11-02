import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Heart,
  Bookmark,
  X,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { api } from "../api.js";

// Curated neutral portrait placeholders matching reference image
const AUTHOR_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
];

export function Journals() {
  const [tab, setTab] = useState("all"); // "all" | "mine"
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Write Dialog State
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState(null);
  const [newJournal, setNewJournal] = useState({
    title: "",
    body: "",
    tags: "",
  });

  // Reader View State
  const [readingJournal, setReadingJournal] = useState(null);

  // Bookmarked entries local state (persisted in session)
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const fetchJournals = async (currentTab = tab, search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getJournals({
        filter: currentTab,
        q: search.trim(),
      });
      setJournals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load journals:", err);
      setError(err.message || "Failed to load journals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals(tab, searchQuery);
  }, [tab]);

  // Debounced live search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchJournals(tab, searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleLike = async (journal, e) => {
    e.stopPropagation();
    const originalLiked = Boolean(journal.liked);
    const originalCount = journal.likes || 0;
    const nextLiked = !originalLiked;
    const nextCount = nextLiked
      ? originalCount + 1
      : Math.max(0, originalCount - 1);

    // Optimistic update
    setJournals((prev) =>
      prev.map((j) =>
        j._id === journal._id ? { ...j, liked: nextLiked, likes: nextCount } : j
      )
    );
    if (readingJournal && readingJournal._id === journal._id) {
      setReadingJournal((prev) => ({
        ...prev,
        liked: nextLiked,
        likes: nextCount,
      }));
    }

    try {
      await api.likeJournal(journal._id);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Revert on error
      setJournals((prev) =>
        prev.map((j) =>
          j._id === journal._id
            ? { ...j, liked: originalLiked, likes: originalCount }
            : j
        )
      );
      if (readingJournal && readingJournal._id === journal._id) {
        setReadingJournal((prev) => ({
          ...prev,
          liked: originalLiked,
          likes: originalCount,
        }));
      }
    }
  };

  const handleToggleBookmark = (id, e) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateJournal = async (e) => {
    e.preventDefault();
    if (!newJournal.title.trim()) {
      setWriteError("Title is required");
      return;
    }
    if (!newJournal.body.trim()) {
      setWriteError("Body content is required");
      return;
    }

    setWriteLoading(true);
    setWriteError(null);
    try {
      const parsedTags = newJournal.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await api.createJournal({
        title: newJournal.title.trim(),
        body: newJournal.body.trim(),
        tags: parsedTags,
      });

      setWriteOpen(false);
      setNewJournal({ title: "", body: "", tags: "" });

      // Add to local state immediately
      setJournals((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Failed to create journal:", err);
      setWriteError(err.message || "Failed to create journal");
    } finally {
      setWriteLoading(false);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays <= 0) {
      if (diffHrs <= 0) {
        return diffMin <= 1 ? "Just now" : `${diffMin} mins ago`;
      }
      return `${diffHrs} hours ago`;
    }
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    }
    return `${Math.floor(diffDays / 365)} years ago`;
  };

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
          Journals
        </h1>
      </div>

      {/* Tabs Row & Write Button */}
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
            onClick={() => setTab("all")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 22px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 500,
              backgroundColor: tab === "all" ? "var(--navy)" : "transparent",
              color: tab === "all" ? "#FFFFFF" : "var(--text-muted)",
              boxShadow: tab === "all" ? "var(--shadow-subtle)" : "none",
              border: "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            All Journals
          </button>

          <button
            type="button"
            onClick={() => setTab("mine")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 22px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 500,
              backgroundColor: tab === "mine" ? "var(--navy)" : "transparent",
              color: tab === "mine" ? "#FFFFFF" : "var(--text-muted)",
              boxShadow: tab === "mine" ? "var(--shadow-subtle)" : "none",
              border: "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            My Journals
          </button>
        </div>

        {/* Navy "Write a Journal" Button */}
        <button
          type="button"
          onClick={() => setWriteOpen(true)}
          className="btn-navy"
          style={{
            borderRadius: "9999px",
            padding: "9px 24px",
            fontSize: "13.5px",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <Plus size={16} />
          <span>Write a Journal</span>
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
          placeholder="Search journals..."
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
          <span style={{ fontSize: "14px" }}>Loading journals...</span>
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
              Unable to load journals
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>{error}</p>
          </div>
          <button
            onClick={() => fetchJournals(tab, searchQuery)}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Journal Cards List */}
      {!loading && !error && (
        <>
          {journals.length === 0 ? (
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
                <BookOpen size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "17.5px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                  {searchQuery
                    ? `No journals matching "${searchQuery}"`
                    : tab === "mine"
                    ? "You haven't written any journals yet"
                    : "No journals available"}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px", maxWidth: "420px" }}>
                  {searchQuery
                    ? "Try adjusting your search query or clear the filter."
                    : "Share sizing insights, return reduction strategies, and merchant learnings with the FitWise community."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWriteOpen(true)}
                className="btn-navy"
                style={{ borderRadius: "9999px", padding: "8px 22px", marginTop: "4px" }}
              >
                Write a Journal
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {journals.map((journal, index) => {
                const avatarUrl =
                  journal.imageUrl ||
                  AUTHOR_AVATARS[index % AUTHOR_AVATARS.length];
                const isBookmarked = bookmarkedIds.has(journal._id);

                return (
                  <JournalCard
                    key={journal._id}
                    journal={journal}
                    avatarUrl={avatarUrl}
                    isBookmarked={isBookmarked}
                    formatRelativeTime={formatRelativeTime}
                    onOpenReader={() => setReadingJournal(journal)}
                    onLike={(e) => handleLike(journal, e)}
                    onToggleBookmark={(e) => handleToggleBookmark(journal._id, e)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Reader View Modal */}
      {readingJournal && (
        <div
          onClick={() => setReadingJournal(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12, 24, 34, 0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
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
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--hairline)",
              padding: "36px",
              boxShadow: "var(--shadow-card)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    backgroundColor: "var(--photo-placeholder)",
                    flexShrink: 0,
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <img
                    src={
                      readingJournal.imageUrl ||
                      AUTHOR_AVATARS[0]
                    }
                    alt={readingJournal.authorName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {readingJournal.authorName || "Store Owner"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Published {formatRelativeTime(readingJournal.createdAt)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {readingJournal.isDemo && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 500,
                      padding: "3px 9px",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                      border: "1px solid var(--hairline)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Sample content
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setReadingJournal(null)}
                  style={{
                    color: "var(--text-muted)",
                    padding: "6px",
                    borderRadius: "8px",
                  }}
                  aria-label="Close reader"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.3,
                marginTop: "4px",
              }}
            >
              {readingJournal.title}
            </h2>

            {/* Tag Chips */}
            {Array.isArray(readingJournal.tags) && readingJournal.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {readingJournal.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "3px 12px",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(100, 138, 142, 0.12)",
                      color: "var(--accent-strong)",
                      border: "1px solid rgba(100, 138, 142, 0.25)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Article Body */}
            <div
              style={{
                fontSize: "14.5px",
                lineHeight: 1.7,
                color: "var(--text)",
                paddingTop: "12px",
                borderTop: "1px solid var(--hairline)",
                whiteSpace: "pre-line",
              }}
            >
              {readingJournal.body}
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "16px",
                borderTop: "1px solid var(--hairline)",
                marginTop: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <button
                  type="button"
                  onClick={(e) => handleLike(readingJournal, e)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: readingJournal.liked ? "#E05D52" : "var(--text-muted)",
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: "9999px",
                    backgroundColor: readingJournal.liked
                      ? "rgba(224, 93, 82, 0.1)"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Heart
                    size={16}
                    fill={readingJournal.liked ? "#E05D52" : "none"}
                    stroke={readingJournal.liked ? "#E05D52" : "currentColor"}
                  />
                  <span>{readingJournal.likes || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(readingJournal._id, e)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: bookmarkedIds.has(readingJournal._id)
                      ? "var(--accent-strong)"
                      : "var(--text-muted)",
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "9999px",
                  }}
                >
                  <Bookmark
                    size={16}
                    fill={
                      bookmarkedIds.has(readingJournal._id)
                        ? "var(--accent-strong)"
                        : "none"
                    }
                  />
                  <span>Bookmark</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setReadingJournal(null)}
                className="btn-secondary"
                style={{ borderRadius: "9999px", padding: "7px 20px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write a Journal Modal Dialog */}
      {writeOpen && (
        <div
          onClick={() => setWriteOpen(false)}
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
                  Write a Journal
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Author and publish size engineering notes & fit stories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWriteOpen(false)}
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

            {/* Error Banner */}
            {writeError && (
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
                {writeError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateJournal}>
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
                    Journal Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newJournal.title}
                    onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                    placeholder="e.g. Finding the right jeans, Denim Shrinkage Insights..."
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
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newJournal.tags}
                    onChange={(e) => setNewJournal({ ...newJournal, tags: e.target.value })}
                    placeholder="e.g. Jeans, Fit, Sizing, Success"
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
                    Journal Body *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={newJournal.body}
                    onChange={(e) => setNewJournal({ ...newJournal, body: e.target.value })}
                    placeholder="Write your journal entry here. Share sizing challenges, customer fit feedback, chart adjustments..."
                    className="input-field"
                    style={{ borderRadius: "8px", resize: "vertical", lineHeight: 1.5 }}
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
                    onClick={() => setWriteOpen(false)}
                    className="btn-secondary"
                    style={{ borderRadius: "9999px", padding: "8px 18px", fontSize: "13.5px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={writeLoading}
                    className="btn-navy"
                    style={{ borderRadius: "9999px", padding: "8px 22px", fontSize: "13.5px" }}
                  >
                    {writeLoading ? "Publishing..." : "Publish Journal"}
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

// Single Journal Card Component
function JournalCard({
  journal,
  avatarUrl,
  isBookmarked,
  formatRelativeTime,
  onOpenReader,
  onLike,
  onToggleBookmark,
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onOpenReader}
      className="card journal-card"
      style={{
        padding: "20px 24px",
        borderRadius: "var(--radius-card)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--hairline)",
        boxShadow: "var(--shadow-subtle)",
        display: "flex",
        alignItems: "flex-start",
        gap: "20px",
        cursor: "pointer",
        transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenReader();
        }
      }}
    >
      {/* Left: Author Avatar / Photo Placeholder */}
      <div
        style={{
          width: "82px",
          height: "94px",
          borderRadius: "12px",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "var(--photo-placeholder)",
          border: "1px solid var(--hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={journal.authorName || "Author"}
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
              fontSize: "20px",
              fontWeight: 600,
              fontFamily: "var(--font-serif)",
            }}
          >
            {(journal.authorName || "J").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* Right: Content Column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Top Header: Title & Actions (Like, Bookmark) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "15.5px",
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.3,
                marginBottom: "2px",
              }}
            >
              {journal.title}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
              By {journal.authorName || "Store Owner"} · {formatRelativeTime(journal.createdAt)}
            </div>
          </div>

          {/* Actions: Likes Count & Bookmark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexShrink: 0,
            }}
          >
            {/* Like Button & Count */}
            <button
              type="button"
              onClick={onLike}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: journal.liked ? "#E05D52" : "var(--text-muted)",
                fontSize: "12.5px",
                fontWeight: 500,
                padding: "4px 8px",
                borderRadius: "9999px",
                transition: "all 0.15s ease",
              }}
              title="Like this journal"
            >
              <Heart
                size={15}
                fill={journal.liked ? "#E05D52" : "none"}
                stroke={journal.liked ? "#E05D52" : "currentColor"}
              />
              <span>{journal.likes || 0}</span>
            </button>

            {/* Bookmark Icon */}
            <button
              type="button"
              onClick={onToggleBookmark}
              style={{
                color: isBookmarked ? "var(--accent-strong)" : "var(--text-muted)",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s ease",
              }}
              title={isBookmarked ? "Remove bookmark" : "Bookmark this journal"}
            >
              <Bookmark
                size={16}
                fill={isBookmarked ? "var(--accent-strong)" : "none"}
              />
            </button>
          </div>
        </div>

        {/* Excerpt */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            lineHeight: 1.45,
            margin: "2px 0 4px 0",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {journal.excerpt || journal.body}
        </p>

        {/* Bottom Row: Tags & Sample Content Label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "2px",
          }}
        >
          {Array.isArray(journal.tags) &&
            journal.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(100, 138, 142, 0.12)",
                  color: "var(--accent-strong)",
                  border: "1px solid rgba(100, 138, 142, 0.22)",
                }}
              >
                {tag}
              </span>
            ))}

          {journal.isDemo && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "9999px",
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                border: "1px solid var(--hairline)",
                color: "var(--text-muted)",
              }}
            >
              Sample content
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Journals;

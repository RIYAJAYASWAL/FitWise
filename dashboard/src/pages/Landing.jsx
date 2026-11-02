import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Leaf,
  Users,
  Ruler,
  BarChart3,
  User,
  Info,
  Check,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Menu,
  X,
} from "lucide-react";
import { BrandLogo, LeafIcon } from "../components/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Floating card interactive state
  const [selectedSize, setSelectedSize] = useState("M");
  const [fitModalOpen, setFitModalOpen] = useState(false);

  // Modal demo recommendation state
  const [modalHeight, setModalHeight] = useState("168");
  const [modalWeight, setModalWeight] = useState("58");
  const [modalPreference, setModalPreference] = useState("regular");
  const [predictedResult, setPredictedResult] = useState(null);

  const SIZES = ["XS", "S", "M", "L", "XL"];

  const handlePredictFit = (e) => {
    e.preventDefault();
    const h = Number(modalHeight) || 168;
    const w = Number(modalWeight) || 58;

    let rec = "M";
    let conf = 96;

    if (w < 50 || h < 160) {
      rec = "XS";
      conf = 94;
    } else if (w < 55) {
      rec = "S";
      conf = 95;
    } else if (w <= 64) {
      rec = "M";
      conf = 96;
    } else if (w <= 72) {
      rec = "L";
      conf = 93;
    } else {
      rec = "XL";
      conf = 91;
    }

    if (modalPreference === "slim" && rec !== "XS") {
      const idx = SIZES.indexOf(rec);
      if (idx > 0) rec = SIZES[idx - 1];
    } else if (modalPreference === "relaxed" && rec !== "XL") {
      const idx = SIZES.indexOf(rec);
      if (idx < SIZES.length - 1) rec = SIZES[idx + 1];
    }

    setPredictedResult({ size: rec, confidence: conf });
    setSelectedSize(rec);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--ivory)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      {/* =========================================================================
          SECTION A: NAVIGATION BAR
          ========================================================================= */}
      <header
        style={{
          width: "100%",
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          maxWidth: "1440px",
          margin: "0 auto",
          zIndex: 40,
        }}
      >
        {/* Brand Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <BrandLogo size={28} showText={true} />
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav
          className="landing-desktop-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "36px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          <button
            onClick={() => scrollToSection("product")}
            style={{ color: "var(--text)", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            style={{ color: "var(--text)", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection("for-brands")}
            style={{ color: "var(--text)", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
          >
            For Brands
          </button>
          <button
            onClick={() => scrollToSection("insights")}
            style={{ color: "var(--text)", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
          >
            Insights
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div
          className="landing-desktop-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text)",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text)",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-strong)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
            >
              Log In
            </Link>
          )}

          <Link
            to={isAuthenticated ? "/dashboard" : "/connect"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "var(--radius-chip)",
              backgroundColor: "var(--navy)",
              color: "#F7F3EC",
              fontSize: "13.5px",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(12, 24, 34, 0.12)",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <span>{isAuthenticated ? "Go to Dashboard" : "Get Started"}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="landing-mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: "none",
            color: "var(--text)",
            padding: "6px",
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            padding: "20px 32px",
            backgroundColor: "var(--surface)",
            borderBottom: "1px solid var(--hairline)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            zIndex: 35,
          }}
        >
          <button
            onClick={() => scrollToSection("product")}
            style={{ textAlign: "left", fontSize: "15px", color: "var(--text)" }}
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            style={{ textAlign: "left", fontSize: "15px", color: "var(--text)" }}
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection("for-brands")}
            style={{ textAlign: "left", fontSize: "15px", color: "var(--text)" }}
          >
            For Brands
          </button>
          <button
            onClick={() => scrollToSection("insights")}
            style={{ textAlign: "left", fontSize: "15px", color: "var(--text)" }}
          >
            Insights
          </button>
          <div style={{ height: "1px", backgroundColor: "var(--hairline)", margin: "4px 0" }} />
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link
              to="/login"
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}
            >
              Log In
            </Link>
            <Link
              to="/connect"
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-chip)",
                backgroundColor: "var(--navy)",
                color: "#F7F3EC",
                fontSize: "13.5px",
                textDecoration: "none",
              }}
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION B: HERO SECTION
          ========================================================================= */}
      <section
        id="product"
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "24px 48px 48px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.15fr",
            alignItems: "center",
            gap: "24px",
            minHeight: "560px",
          }}
        >
          {/* Left Column: Headline, Copy, Action Buttons, Trust Bar */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Kicker Tag */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--accent-strong)",
                marginBottom: "16px",
              }}
            >
              AI POWERED SIZE RECOMMENDATIONS
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(44px, 5.5vw, 76px)",
                fontWeight: 500,
                color: "var(--text)",
                lineHeight: 1.02,
                letterSpacing: "-0.015em",
                margin: "0 0 20px 0",
              }}
            >
              Better Fits.
              <br />
              Fewer Returns.
            </h1>

            {/* Supporting Subtitle */}
            <p
              style={{
                fontSize: "15.5px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                maxWidth: "460px",
                margin: 0,
              }}
            >
              FitWise uses AI-powered size recommendations to help shoppers find
              the right fit — and helps brands reduce returns, save costs and
              build happier customers.
            </p>
          </div>

          {/* Right Column: Hero Fashion Model Photo & Floating Size Recommendation Card */}
          <div
            className="hero-image-col"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              marginLeft: "-40px",
            }}
          >
            {/* Fashion Model Image */}
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 12px 36px rgba(12, 24, 34, 0.08)",
                position: "relative",
              }}
            >
              <img
                src="/landing-hero-model.jpg"
                alt="FitWise tailored fashion size recommendation"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* Floating Recommendation Card ("Your perfect fit") */}
            <div
              className="floating-fit-card"
              style={{
                position: "absolute",
                top: "24%",
                right: "-10px",
                width: "280px",
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(8px)",
                borderRadius: "18px",
                padding: "20px",
                boxShadow: "0 18px 42px rgba(12, 24, 34, 0.14)",
                border: "1px solid rgba(233, 226, 214, 0.9)",
                boxSizing: "border-box",
                zIndex: 10,
              }}
            >
              {/* Card Header with Sparkles */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "var(--accent-strong)",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "14px",
                }}
              >
                <Sparkles size={16} />
                <span style={{ color: "var(--text)" }}>Your perfect fit</span>
              </div>

              {/* Product Thumbnail & Recommendation Details */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                {/* Tailored Jacket Thumbnail */}
                <div
                  style={{
                    width: "54px",
                    height: "58px",
                    borderRadius: "10px",
                    backgroundColor: "#F3EFE9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid rgba(233, 226, 214, 0.6)",
                  }}
                >
                  <img
                    src="/jacket-thumb.png"
                    alt="Beige tailored jacket"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Size Recommendation Info */}
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                    Size Recommendation
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "24px",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {selectedSize}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: "var(--radius-chip)",
                        backgroundColor: "var(--success-bg)",
                        color: "var(--success-text)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      High Confidence 96%
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "9.5px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      marginTop: "3px",
                      lineHeight: 1.25,
                    }}
                  >
                    <Info size={10} flexShrink={0} />
                    <span>Based on your profile, past purchases and body measurements.</span>
                  </div>
                </div>
              </div>

              {/* Size Guide link row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--text)" }}>Size Guide</span>
                <button
                  onClick={() => setFitModalOpen(true)}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "10.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <span>View all sizes</span>
                  <ArrowRight size={10} />
                </button>
              </div>

              {/* Selectable Size Buttons: XS, S, M, L, XL */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "6px",
                }}
              >
                {SIZES.map((size) => {
                  const isCurrent = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: "6px 0",
                        borderRadius: "7px",
                        fontSize: "11px",
                        fontWeight: isCurrent ? 600 : 500,
                        backgroundColor: isCurrent ? "var(--navy)" : "rgba(255, 255, 255, 0.9)",
                        color: isCurrent ? "#FFFFFF" : "var(--text)",
                        border: isCurrent ? "1px solid var(--navy)" : "1px solid rgba(233, 226, 214, 0.9)",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION C: STATISTICS BAR
          ========================================================================= */}
      <section
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "0 48px 48px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="stats-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            alignItems: "center",
            padding: "28px 40px",
            borderRadius: "18px",
            backgroundColor: "rgba(255, 255, 255, 0.65)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 2px 10px rgba(12, 24, 34, 0.02)",
          }}
        >
          {/* Stat 1: 20% fewer returns */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(104, 168, 152, 0.18)",
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Leaf size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                20%
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                fewer returns
              </div>
            </div>
          </div>

          {/* Stat 2: 92% sizing confidence */}
          <div
            className="stat-divider-item"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              borderLeft: "1px solid var(--hairline)",
              borderRight: "1px solid var(--hairline)",
              padding: "0 20px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(104, 168, 152, 0.18)",
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                92%
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                sizing confidence
              </div>
            </div>
          </div>

          {/* Stat 3: 100+ brand partners */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(104, 168, 152, 0.18)",
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                100+
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                brand partners
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: WHY FITWISE SECTION ("A better fit for everyone")
          ========================================================================= */}
      <section
        id="how-it-works"
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "32px 48px 64px 48px",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* Kicker Tag */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--accent-strong)",
            marginBottom: "8px",
          }}
        >
          WHY FITWISE
        </div>

        {/* Section Heading */}
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(32px, 4vw, 44px)",
            fontWeight: 500,
            color: "var(--text)",
            margin: "0 0 40px 0",
          }}
        >
          A better fit for everyone
        </h2>

        {/* 3 Feature Cards */}
        <div
          className="feature-cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
            textAlign: "left",
          }}
        >
          {/* Card 1: Personalized Recommendations */}
          <div
            className="feature-card"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: "18px",
              border: "1px solid var(--hairline)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 2px 10px rgba(12, 24, 34, 0.02)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 138, 142, 0.12)",
                  color: "var(--accent-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <User size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16.5px",
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 10px 0",
                }}
              >
                Personalized Recommendations
              </h3>
              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                AI understands your body, style and preferences to suggest the perfect size.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <ArrowRight size={16} color="var(--text)" />
            </div>
          </div>

          {/* Card 2: Smart Size Charts */}
          <div
            className="feature-card"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: "18px",
              border: "1px solid var(--hairline)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 2px 10px rgba(12, 24, 34, 0.02)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 138, 142, 0.12)",
                  color: "var(--accent-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Ruler size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16.5px",
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 10px 0",
                }}
              >
                Smart Size Charts
              </h3>
              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Accurate, brand-specific size charts for every product, every time.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <ArrowRight size={16} color="var(--text)" />
            </div>
          </div>

          {/* Card 3: Insights for Brands */}
          <div
            id="insights"
            className="feature-card"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: "18px",
              border: "1px solid var(--hairline)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 2px 10px rgba(12, 24, 34, 0.02)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 138, 142, 0.12)",
                  color: "var(--accent-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <BarChart3 size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16.5px",
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 10px 0",
                }}
              >
                Insights for Brands
              </h3>
              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Reduce returns, understand your customers and make smarter decisions with real data.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <ArrowRight size={16} color="var(--text)" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E: SUSTAINABILITY BANNER ("Confidence in every size")
          ========================================================================= */}
      <section
        id="for-brands"
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "0 48px 64px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="sustainability-banner"
          style={{
            position: "relative",
            borderRadius: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.65)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 4px 18px rgba(12, 24, 34, 0.03)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1.05fr 1.25fr 0.6fr",
            alignItems: "center",
          }}
        >
          {/* Left Photo Container with Script Text Overlay */}
          <div
            style={{
              position: "relative",
              height: "100%",
              minHeight: "340px",
              overflow: "hidden",
            }}
          >
            <img
              src="/landing-sustainability-model.png"
              alt="Sustainable fashion lifestyle model"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "65% center",
                display: "block",
              }}
            />

            {/* Graceful script lettering: "Right fit. Better days." matching screenshot */}
            <div
              style={{
                position: "absolute",
                top: "24px",
                left: "28px",
                fontFamily: "'Caveat', cursive, serif",
                fontSize: "36px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.95)",
                lineHeight: 1.05,
                textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                pointerEvents: "none",
                transform: "rotate(-4deg)",
              }}
            >
              Right fit.
              <br />
              Better days.
            </div>
          </div>

          {/* Center Copy Column */}
          <div
            style={{
              padding: "40px 48px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--accent-strong)",
                marginBottom: "8px",
              }}
            >
              FOR A MORE SUSTAINABLE FASHION FUTURE
            </div>

            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(28px, 3.2vw, 38px)",
                fontWeight: 500,
                color: "var(--text)",
                margin: "0 0 14px 0",
                lineHeight: 1.15,
              }}
            >
              Confidence in every size
            </h3>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                margin: "0 0 24px 0",
                maxWidth: "480px",
              }}
            >
              FitWise empowers shoppers to feel great in what they wear, while
              helping brands create a more sustainable, less wasteful fashion
              industry.
            </p>

            <div>
              <button
                onClick={() => setFitModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 22px",
                  borderRadius: "var(--radius-chip)",
                  backgroundColor: "var(--navy)",
                  color: "#F7F3EC",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  boxShadow: "0 2px 8px rgba(12, 24, 34, 0.12)",
                }}
              >
                <span>Find Your Fit</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Botanical Decorative Graphic matching screenshot */}
          <div
            className="sustainability-leaves-col"
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            <img
              src="/sustainability-leaves.png"
              alt="Botanical decoration"
              style={{
                height: "100%",
                width: "auto",
                maxHeight: "340px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: FOOTER
          ========================================================================= */}
      <footer
        style={{
          width: "100%",
          backgroundColor: "var(--navy)",
          color: "var(--sidebar-text)",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "36px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            boxSizing: "border-box",
          }}
        >
          {/* Left: Brand Logo & Tagline */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <BrandLogo size={24} lightText={true} />
            </Link>

            <span
              style={{
                width: "1px",
                height: "18px",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
              }}
            />

            <span
              style={{
                fontSize: "13px",
                color: "#B8BBBE",
              }}
            >
              Smarter Sizing. A More Sustainable Future.
            </span>
          </div>

          {/* Right: Nav Links, Socials & Copyright */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              flexWrap: "wrap",
            }}
          >
            <nav style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
              <button
                onClick={() => scrollToSection("product")}
                style={{ color: "#B8BBBE", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                Product
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                style={{ color: "#B8BBBE", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("for-brands")}
                style={{ color: "#B8BBBE", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                For Brands
              </button>
              <button
                onClick={() => scrollToSection("insights")}
                style={{ color: "#B8BBBE", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                Insights
              </button>
            </nav>

            {/* Social Icons */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#B8BBBE" }}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                style={{ color: "inherit", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                style={{ color: "inherit", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                style={{ color: "inherit", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                style={{ color: "inherit", transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#B8BBBE")}
              >
                <Youtube size={16} />
              </a>
            </div>

            {/* Copyright */}
            <span style={{ fontSize: "12px", color: "rgba(184, 187, 190, 0.7)" }}>
              © 2026 FitWise. All rights reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          INTERACTIVE FIT FINDER MODAL
          ========================================================================= */}
      {fitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(12, 24, 34, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFitModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "var(--surface)",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 20px 48px rgba(12, 24, 34, 0.2)",
              border: "1px solid var(--hairline)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="var(--accent-strong)" />
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "22px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Find Your Perfect Fit
                </h3>
              </div>
              <button
                onClick={() => setFitModalOpen(false)}
                style={{ padding: "4px", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 20px 0" }}>
              Enter your measurements to test FitWise AI size recommendation algorithm live.
            </p>

            <form onSubmit={handlePredictFit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 500, marginBottom: "4px" }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={modalHeight}
                    onChange={(e) => setModalHeight(e.target.value)}
                    min="140"
                    max="210"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 500, marginBottom: "4px" }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={modalWeight}
                    onChange={(e) => setModalWeight(e.target.value)}
                    min="40"
                    max="150"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--ivory)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 500, marginBottom: "4px" }}>
                  Fit Preference
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {["slim", "regular", "relaxed"].map((pref) => {
                    const isSel = modalPreference === pref;
                    return (
                      <button
                        type="button"
                        key={pref}
                        onClick={() => setModalPreference(pref)}
                        style={{
                          padding: "8px 0",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: isSel ? 600 : 400,
                          backgroundColor: isSel ? "var(--navy)" : "var(--ivory)",
                          color: isSel ? "#FFFFFF" : "var(--text)",
                          border: isSel ? "1px solid var(--navy)" : "1px solid var(--hairline)",
                          textTransform: "capitalize",
                        }}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>

              {predictedResult && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    backgroundColor: "var(--success-bg)",
                    border: "1px solid rgba(47, 107, 96, 0.2)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--success-text)", fontWeight: 500 }}>
                    Recommended Size
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "36px",
                      fontWeight: 700,
                      color: "var(--success-text)",
                    }}
                  >
                    Size {predictedResult.size}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--success-text)" }}>
                    Confidence Score: {predictedResult.confidence}%
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setFitModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid var(--hairline)",
                    backgroundColor: "var(--ivory)",
                    fontSize: "13px",
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: "10px",
                    borderRadius: "var(--radius-btn)",
                    backgroundColor: "var(--navy)",
                    color: "#F7F3EC",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Calculate Fit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .hero-image-col {
            margin-left: 0 !important;
            justify-content: center !important;
          }
          .floating-fit-card {
            right: 10px !important;
            top: 20px !important;
          }
          .sustainability-banner {
            grid-template-columns: 1fr !important;
          }
          .sustainability-leaves-col {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .landing-desktop-nav,
          .landing-desktop-actions {
            display: none !important;
          }
          .landing-mobile-hamburger {
            display: block !important;
          }
          .stats-container {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .stat-divider-item {
            border-left: none !important;
            border-right: none !important;
            border-top: 1px solid var(--hairline) !important;
            border-bottom: 1px solid var(--hairline) !important;
            padding: 20px 0 !important;
          }
          .feature-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .floating-fit-card {
            position: static !important;
            width: 100% !important;
            margin-top: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Landing;

import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Info, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { BrandLogo } from "../components/BrandLogo.jsx";

// Google Multicolor G Icon
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function Connect() {
  const { isAuthenticated, connect } = useAuth();
  const navigate = useNavigate();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [infoNotice, setInfoNotice] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    const errs = {};
    const trimmedUser = emailOrUsername.trim();
    if (!trimmedUser) {
      errs.emailOrUsername = "Please enter your email or username.";
    } else if (trimmedUser.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUser)) {
      errs.emailOrUsername = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Please enter your password.";
    } else if (password.length < 4) {
      errs.password = "Password must be at least 4 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setInfoNotice("");

    try {
      // Connect to the store session using configured demo credentials
      const demoKey = "fw_sec_demo_a41b89c372ef";
      await connect(demoKey);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ form: err.message || "Unable to sign in. Please check your credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setInfoNotice("Google authentication is not yet configured for this demo environment.");
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setInfoNotice("Password reset service is currently disabled in demo mode.");
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setInfoNotice("New store registration is currently by invitation only.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "var(--ivory)",
        overflow: "hidden",
      }}
      className="login-container"
    >
      {/* =========================================================================
          Left Panel: ~58% Fashion Background Photograph & Brand Messaging
          ========================================================================= */}
      <div
        className="login-hero-panel"
        style={{
          flex: "0 0 58%",
          width: "58%",
          position: "relative",
          minHeight: "100vh",
          backgroundImage: "url('/connect-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 22%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px",
          color: "#F7F3EC",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle Gradient Overlay for Typography Contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(12, 24, 34, 0.35) 0%, rgba(12, 24, 34, 0.05) 30%, rgba(12, 24, 34, 0.45) 75%, rgba(12, 24, 34, 0.85) 100%)",
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Top: FitWise Text Logo */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "26px",
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: "#FFFFFF",
            }}
          >
            FitWise
          </span>
        </div>

        {/* Middle/Lower Section: Headline & Subtitle */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "520px", marginTop: "auto", marginBottom: "48px" }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(44px, 4.8vw, 64px)",
              fontWeight: 400,
              lineHeight: 1.08,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              marginBottom: "20px",
            }}
          >
            Better<br />
            Fits.<br />
            Fewer<br />
            Returns.
          </h1>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.88)",
              fontWeight: 400,
              maxWidth: "380px",
            }}
          >
            AI-powered size recommendations for a smarter shopping experience.
          </p>
        </div>

        {/* Bottom Statistics: 20% fewer returns / 100% happier shoppers */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "flex-start",
            gap: "56px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#FFFFFF",
                lineHeight: 1,
              }}
            >
              20%
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.8)",
                marginTop: "6px",
              }}
            >
              fewer returns
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#FFFFFF",
                lineHeight: 1,
              }}
            >
              100%
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.8)",
                marginTop: "6px",
              }}
            >
              happier shoppers
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          Right Panel: ~42% Customer Login Card
          ========================================================================= */}
      <div
        className="login-form-panel"
        style={{
          flex: "0 0 42%",
          width: "42%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
          backgroundColor: "var(--ivory)",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Brand Logo with Teal Leaf Icon */}
          <div style={{ marginBottom: "32px" }}>
            <BrandLogo size={28} />
          </div>

          {/* Heading & Subtitle */}
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "34px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "8px",
              lineHeight: 1.2,
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginBottom: "28px",
            }}
          >
            Sign in to continue your journey
          </p>

          {/* Global Error Banner */}
          {errors.form && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "11px 14px",
                borderRadius: "var(--radius-btn)",
                backgroundColor: "var(--danger-bg)",
                color: "var(--danger-text)",
                fontSize: "13px",
                lineHeight: 1.4,
                marginBottom: "20px",
                border: "1px solid rgba(142, 58, 63, 0.2)",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Unconfigured Feature Notice */}
          {infoNotice && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "var(--radius-btn)",
                backgroundColor: "rgba(100, 138, 142, 0.12)",
                color: "var(--accent-strong)",
                fontSize: "13px",
                lineHeight: 1.4,
                marginBottom: "20px",
                border: "1px solid rgba(100, 138, 142, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>{infoNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setInfoNotice("")}
                aria-label="Dismiss message"
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px",
                  color: "var(--accent-strong)",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} noValidate>
            {/* Email or Username */}
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="login-username"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text)",
                  marginBottom: "7px",
                }}
              >
                Email or username
              </label>

              <input
                id="login-username"
                type="text"
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  if (errors.emailOrUsername) {
                    setErrors((prev) => ({ ...prev, emailOrUsername: "" }));
                  }
                }}
                placeholder="you@example.com"
                autoComplete="username"
                className="input-field"
                style={{
                  padding: "10px 14px",
                  borderColor: errors.emailOrUsername ? "var(--danger-text)" : undefined,
                }}
              />

              {errors.emailOrUsername && (
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--danger-text)",
                    marginTop: "5px",
                  }}
                >
                  {errors.emailOrUsername}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "12px" }}>
              <label
                htmlFor="login-password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text)",
                  marginBottom: "7px",
                }}
              >
                Password
              </label>

              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-field"
                  style={{
                    padding: "10px 42px 10px 14px",
                    borderColor: errors.password ? "var(--danger-text)" : undefined,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {errors.password && (
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--danger-text)",
                    marginTop: "5px",
                  }}
                >
                  {errors.password}
                </span>
              )}
            </div>

            {/* Forgot Password Link */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "22px" }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  fontWeight: 400,
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in Button (Dark Navy) */}
            <button
              type="submit"
              disabled={loading}
              className="btn-navy"
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: "14.5px",
                fontWeight: 500,
                borderRadius: "var(--radius-btn)",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Centered "or" Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "20px 0",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--hairline)" }} />
            <span style={{ padding: "0 12px", fontSize: "12px", color: "var(--text-muted)" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--hairline)" }} />
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: "100%",
              padding: "10px 18px",
              borderRadius: "var(--radius-btn)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--hairline)",
              fontSize: "13.5px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "var(--shadow-subtle)",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hairline)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
          >
            <GoogleIcon size={18} />
            <span>Continue with Google</span>
          </button>

          {/* Footer: Don't have an account? Sign up */}
          <div
            style={{
              marginTop: "40px",
              textAlign: "center",
              fontSize: "13.5px",
              color: "var(--text-muted)",
            }}
          >
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={handleSignUp}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--text)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "13.5px",
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .login-container {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .login-hero-panel {
            width: 100% !important;
            flex: none !important;
            min-height: 380px !important;
            padding: 36px 28px !important;
          }
          .login-form-panel {
            width: 100% !important;
            flex: none !important;
            padding: 40px 24px 60px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Connect;

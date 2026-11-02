import React from "react";

export function LeafIcon({ className = "", size = 26, dark = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left Leaf (sage/teal) */}
      <path
        d="M13.5 6C13.5 6 9 13.5 9.5 20.5C9.8 24.5 12.8 26.5 15.5 26.5C18.2 26.5 17.5 22 17.5 17.5C17.5 12 13.5 6 13.5 6Z"
        fill="#68A898"
      />
      {/* Right Leaf (deep teal) */}
      <path
        d="M19 10.5C19 10.5 22.5 15 22.5 19.5C22.5 23 20.5 25 18 25C15.5 25 16.5 21.5 16.5 18C16.5 14 19 10.5 19 10.5Z"
        fill="#3F6F73"
      />
    </svg>
  );
}

export function BrandLogo({ size = 26, lightText = false, showText = true, className = "" }) {
  return (
    <div className={`brand-logo-container ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <LeafIcon size={size} />
      {showText && (
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: lightText ? "#F7F3EC" : "var(--text)",
          }}
        >
          FitWise
        </span>
      )}
    </div>
  );
}

export default BrandLogo;

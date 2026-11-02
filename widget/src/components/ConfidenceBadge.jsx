import React from 'react';

/**
 * Returns confidence classification details based on numerical confidence (0..1):
 * - High: >= 0.75
 * - Medium: 0.5 - 0.75
 * - Low: < 0.5
 */
export function getConfidenceTier(confidence = 0) {
  const score = typeof confidence === 'number' ? confidence : 0;
  if (score >= 0.75) {
    return {
      tier: 'High',
      text: 'High Confidence',
      level: 'high',
      color: '#10b981', // emerald green
      bg: '#ecfdf5',
      border: '#a7f3d0',
    };
  }
  if (score >= 0.5) {
    return {
      tier: 'Medium',
      text: 'Medium Confidence',
      level: 'medium',
      color: '#d97706', // amber/orange
      bg: '#fffbeb',
      border: '#fde68a',
    };
  }
  return {
    tier: 'Low',
    text: 'Low Confidence',
    level: 'low',
    color: '#ef4444', // crimson red
    bg: '#fef2f2',
    border: '#fecaca',
  };
}

/**
 * ConfidenceBadge component:
 * Displays fit confidence with both explicit text and semantic colour.
 * - High (>= 0.75)
 * - Medium (0.5 - 0.75)
 * - Low (< 0.5)
 */
export function ConfidenceBadge({ confidence = 0, showScore = true, className = '' }) {
  const info = getConfidenceTier(confidence);
  const percentage = Math.round((typeof confidence === 'number' ? confidence : 0) * 100);

  return (
    <div
      className={`fw-confidence-badge fw-confidence-${info.level} ${className}`}
      data-level={info.level}
      style={{
        color: info.color,
        backgroundColor: info.bg,
        borderColor: info.border,
      }}
      role="status"
      aria-label={`${info.text}: ${percentage}% match`}
    >
      <span
        className="fw-confidence-dot"
        style={{ backgroundColor: info.color }}
        aria-hidden="true"
      />
      <span className="fw-confidence-label">{info.text}</span>
      {showScore && (
        <span className="fw-confidence-score" style={{ opacity: 0.85 }}>
          ({percentage}%)
        </span>
      )}
    </div>
  );
}

export default ConfidenceBadge;

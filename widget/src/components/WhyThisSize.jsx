import React, { useState } from 'react';

/**
 * Formats raw feature keys like 'chest_cm' into human-readable labels like 'Chest'.
 */
function formatFeatureName(rawName = '') {
  return rawName
    .replace(/_cm$|_kg$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * WhyThisSize component:
 * Collapsible panel detailing:
 * - explanation.summary
 * - explanation.chartReason (or prop chartReason)
 * - topFactors rendered as small labeled horizontal impact bars
 */
export function WhyThisSize({
  explanation = {},
  chartReason: propChartReason,
  defaultExpanded = true,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const summary = explanation?.summary || '';
  const chartReason = propChartReason || explanation?.chartReason || '';
  const topFactors = explanation?.topFactors || [];

  if (!summary && !chartReason && topFactors.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={`fw-why-panel ${className}`}>
      {/* Collapsible trigger toggle */}
      <button
        type="button"
        className="fw-why-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls="fw-why-content"
      >
        <span className="fw-why-title">Why this size?</span>
        <span className={`fw-why-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div id="fw-why-content" className="fw-why-body" role="region" aria-label="Size explanation details">
          {summary && (
            <p className="fw-why-summary">
              {summary}
            </p>
          )}

          {chartReason && (
            <p className="fw-why-chart-reason">
              {chartReason}
            </p>
          )}

          {topFactors.length > 0 && (
            <div className="fw-factors-wrapper">
              <span className="fw-factors-heading">Key Influencing Factors:</span>
              <div className="fw-factors-bars" role="list" aria-label="Measurement impact factors">
                {topFactors.map((factor, index) => {
                  const impactPct = Math.round((factor.impact || 0) * 100);
                  const featureName = formatFeatureName(factor.feature);

                  return (
                    <div key={index} className="fw-factor-item" role="listitem">
                      <div className="fw-factor-meta">
                        <span className="fw-factor-label">{featureName}</span>
                        <span className="fw-factor-pct">{impactPct}%</span>
                      </div>
                      <div
                        className="fw-bar-track"
                        role="progressbar"
                        aria-valuenow={impactPct}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={`${featureName} impact ${impactPct}%`}
                      >
                        <div
                          className="fw-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(0, impactPct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WhyThisSize;

import React, { useState } from 'react';
import { CheckCircleIcon, AlertCircleIcon, RefreshIcon, SparklesIcon } from './Icons';

export function RecommendationCard({
  recommendation,
  onRecalculate,
  onOpenFeedback,
  region = 'US',
}) {
  const [applied, setApplied] = useState(false);

  if (!recommendation) return null;

  const size = recommendation.regionSize || recommendation.recommendedSize;
  const standardSize = recommendation.recommendedSize;
  const confidencePct = Math.round((recommendation.confidence || 0) * 100);
  const alternatives = recommendation.alternatives || [];
  const explanation = recommendation.explanation || {};
  const topFactors = explanation.topFactors || [];
  const isLowConfidence = !!recommendation.lowConfidence;

  const handleApplySize = () => {
    setApplied(true);
    // Dispatch custom DOM event to parent window so the store's size selector can sync
    const event = new CustomEvent('fitwise:size-selected', {
      detail: {
        size: standardSize,
        regionSize: size,
        region,
        confidence: recommendation.confidence,
      },
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);

    setTimeout(() => setApplied(false), 3000);
  };

  return (
    <div className="fw-rec-card">
      {/* Top Banner with Size & Confidence Badge */}
      <div className="fw-rec-hero">
        <div className="fw-rec-badge-group">
          <span className="fw-rec-label">Recommended Size</span>
          <div className="fw-rec-size-pill">
            <span className="fw-rec-size">{size}</span>
            {size !== standardSize && (
              <span className="fw-rec-std">({standardSize} Std)</span>
            )}
          </div>
        </div>

        <div className="fw-confidence-meter">
          <div className="fw-confidence-score">
            <SparklesIcon className="fw-sparkle-mini" />
            <span>{confidencePct}% Fit Confidence</span>
          </div>
          <div className="fw-confidence-bar-bg">
            <div
              className={`fw-confidence-bar-fill ${confidencePct >= 80 ? 'high' : 'medium'}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Low confidence cautionary note if flagged */}
      {isLowConfidence && (
        <div className="fw-alert fw-alert-warning">
          <AlertCircleIcon className="fw-alert-icon" />
          <div>
            <strong>Borderline Fit Notice:</strong>
            <p>
              Your measurements fall right on the boundary between sizes. If you prefer a relaxed or layering fit, consider sizing up.
            </p>
          </div>
        </div>
      )}

      {/* Alternative sizes if available */}
      {alternatives.length > 0 && (
        <div className="fw-rec-alternatives">
          <span className="fw-alt-label">Comfort Alternative:</span>
          {alternatives.map((alt) => (
            <span key={alt} className="fw-alt-pill">
              Size {alt}
            </span>
          ))}
        </div>
      )}

      {/* AI Explanation & Factors */}
      <div className="fw-explanation-block">
        <h4 className="fw-exp-title">Why this size fits you</h4>
        {explanation.summary && (
          <p className="fw-exp-summary">{explanation.summary}</p>
        )}
        {explanation.chartReason && (
          <p className="fw-exp-chart-reason">{explanation.chartReason}</p>
        )}

        {topFactors.length > 0 && (
          <div className="fw-factors-list">
            <span className="fw-factors-label">Key Influencing Factors:</span>
            <div className="fw-factor-pills">
              {topFactors.map((factor, idx) => {
                const impactPct = Math.round((factor.impact || 0) * 100);
                const featureClean = factor.feature.replace(/_/g, ' ').replace(/cm|kg/, '');
                return (
                  <div key={idx} className="fw-factor-badge">
                    <span className="fw-factor-name">{featureClean}</span>
                    <span className="fw-factor-impact">{impactPct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="fw-rec-actions">
        <button
          type="button"
          className={`fw-apply-btn ${applied ? 'applied' : ''}`}
          onClick={handleApplySize}
        >
          {applied ? (
            <>
              <CheckCircleIcon className="fw-btn-icon" />
              <span>Applied to Product Page!</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="fw-btn-icon" />
              <span>Select Size {size}</span>
            </>
          )}
        </button>

        <div className="fw-secondary-actions">
          <button
            type="button"
            className="fw-text-btn"
            onClick={onRecalculate}
          >
            <RefreshIcon className="fw-btn-mini-icon" />
            <span>Recalculate</span>
          </button>

          <button
            type="button"
            className="fw-text-btn"
            onClick={onOpenFeedback}
          >
            <span>Report Fit Outcome</span>
          </button>
        </div>
      </div>
    </div>
  );
}

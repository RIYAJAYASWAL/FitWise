import React, { useState } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { WhyThisSize } from './WhyThisSize';
import { CheckCircleIcon, RefreshIcon, AlertCircleIcon } from './Icons';

/**
 * Result component:
 * - Displays recommended size in the selected region (regionSize) in large typography
 * - Displays comfort alternatives
 * - When lowConfidence is true:
 *   - Shows the top two sizes (instead of sounding certain)
 *   - Displays a "check the size chart" hint
 * - When lowConfidence is false:
 *   - Confidently displays recommended size
 * - Integrates ConfidenceBadge and collapsible WhyThisSize panel
 */
export function Result({
  recommendation = {},
  region = 'US',
  onSelectSize,
  onRecalculate,
  onViewSizeChart,
  onOpenFeedback,
  className = '',
}) {
  const [applied, setApplied] = useState(false);

  if (!recommendation) {
    return null;
  }

  const standardSize = recommendation.recommendedSize || 'M';
  const regionSize = recommendation.regionSize || standardSize;
  const confidence = typeof recommendation.confidence === 'number' ? recommendation.confidence : 0;
  const alternatives = recommendation.alternatives || [];
  const explanation = recommendation.explanation || {};
  const isLowConfidence = Boolean(recommendation.lowConfidence || confidence < 0.5);

  // Top two sizes for low-confidence boundary situations
  const topAlternative = alternatives[0] || (standardSize === 'M' ? 'L' : 'M');
  const topTwoSizes = [regionSize, topAlternative];

  const handleApply = (sizeToApply = regionSize) => {
    setApplied(true);

    if (typeof onSelectSize === 'function') {
      onSelectSize(sizeToApply, standardSize);
    }

    // Dispatch global custom event for e-commerce host page
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('fitwise:size-selected', {
        detail: {
          size: standardSize,
          regionSize: sizeToApply,
          region,
          confidence,
          lowConfidence: isLowConfidence,
        },
        bubbles: true,
        composed: true,
      });
      window.dispatchEvent(event);
    }

    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className={`fw-result-card ${isLowConfidence ? 'fw-result-borderline' : ''} ${className}`}>
      {/* Result Hero Header */}
      <div className="fw-result-hero">
        <div className="fw-result-meta-top">
          <span className="fw-result-region-tag">Region: {region}</span>
          <ConfidenceBadge confidence={confidence} />
        </div>

        {isLowConfidence ? (
          /* Low confidence: Displays top two sizes and exploratory tone */
          <div className="fw-result-sizes-split">
            <span className="fw-result-headline fw-headline-cautious">
              Between Sizes
            </span>

            <div className="fw-top-two-pill-group">
              <span className="fw-size-large fw-size-primary">Size {regionSize}</span>
              <span className="fw-size-divider">or</span>
              <span className="fw-size-large fw-size-secondary">Size {topAlternative}</span>
            </div>

            <div className="fw-hint-box" role="note">
              <AlertCircleIcon className="fw-hint-icon" />
              <p className="fw-hint-text">
                Your body profile falls right on the boundary. We recommend you{' '}
                <button
                  type="button"
                  className="fw-hint-link"
                  onClick={onViewSizeChart}
                >
                  check the size chart
                </button>{' '}
                to choose between a fitted or relaxed silhouette.
              </p>
            </div>
          </div>
        ) : (
          /* Standard / High confidence: Decisive recommendation */
          <div className="fw-result-sizes-single">
            <span className="fw-result-headline fw-headline-confident">
              Recommended Size
            </span>

            <div className="fw-size-display-wrap">
              <span className="fw-size-large fw-size-hero">
                {regionSize}
              </span>
              {regionSize !== standardSize && (
                <span className="fw-size-std-sub">({standardSize} Standard)</span>
              )}
            </div>

            {alternatives.length > 0 && (
              <div className="fw-alternatives-row">
                <span className="fw-alt-label">Alternative:</span>
                {alternatives.map((alt) => (
                  <span key={alt} className="fw-alt-badge">
                    Size {alt}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanatory Collapsible Details Panel */}
      <WhyThisSize
        explanation={explanation}
        chartReason={explanation.chartReason}
        defaultExpanded={true}
      />

      {/* Action Buttons */}
      <div className="fw-result-actions">
        {isLowConfidence ? (
          /* Two selection buttons when between sizes */
          <div className="fw-dual-apply-buttons">
            <button
              type="button"
              className="fw-apply-btn fw-apply-left"
              onClick={() => handleApply(regionSize)}
            >
              <span>Choose Size {regionSize} (Fitted)</span>
            </button>
            <button
              type="button"
              className="fw-apply-btn fw-apply-right"
              onClick={() => handleApply(topAlternative)}
            >
              <span>Choose Size {topAlternative} (Relaxed)</span>
            </button>
          </div>
        ) : (
          /* Single primary action */
          <button
            type="button"
            className={`fw-apply-btn ${applied ? 'applied' : ''}`}
            onClick={() => handleApply(regionSize)}
          >
            {applied ? (
              <>
                <CheckCircleIcon className="fw-btn-icon" />
                <span>Applied Size {regionSize} to Store!</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="fw-btn-icon" />
                <span>Select Size {regionSize}</span>
              </>
            )}
          </button>
        )}

        <div className="fw-footer-quick-actions">
          {typeof onRecalculate === 'function' && (
            <button
              type="button"
              className="fw-text-btn"
              onClick={onRecalculate}
            >
              <RefreshIcon className="fw-btn-mini-icon" />
              <span>Adjust Measurements</span>
            </button>
          )}

          {typeof onViewSizeChart === 'function' && (
            <button
              type="button"
              className="fw-text-btn"
              onClick={onViewSizeChart}
            >
              <span>View Full Chart</span>
            </button>
          )}

          {typeof onOpenFeedback === 'function' && (
            <button
              type="button"
              className="fw-text-btn"
              onClick={onOpenFeedback}
            >
              <span>Report Fit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Result;

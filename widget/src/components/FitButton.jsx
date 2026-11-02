import React from 'react';
import { RulerIcon, SparklesIcon, CheckCircleIcon } from './Icons';

/**
 * Embedded CTA trigger button rendered on the store product page.
 */
export function FitButton({ onClick, recommendation, variant = 'treatment' }) {
  const isTreatment = variant === 'treatment';

  if (!isTreatment) {
    return null;
  }

  if (recommendation) {
    const size = recommendation.regionSize || recommendation.recommendedSize;
    const confidencePct = Math.round((recommendation.confidence || 0) * 100);

    return (
      <button
        type="button"
        className="fw-btn fw-btn-recommended"
        onClick={onClick}
        aria-label={`FitWise Recommended Size: ${size}`}
      >
        <CheckCircleIcon className="fw-btn-icon fw-icon-success" />
        <span className="fw-btn-text">
          Your Fit: <strong>Size {size}</strong>
        </span>
        <span className="fw-btn-badge">{confidencePct}% match</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="fw-btn fw-btn-treatment"
      onClick={onClick}
      aria-label="Find my size"
    >
      <div className="fw-btn-icon-wrapper">
        <SparklesIcon className="fw-btn-icon fw-icon-sparkle" />
      </div>
      <span className="fw-btn-text">Find my size</span>
      <span className="fw-btn-pill">AI Fit</span>
    </button>
  );
}

import React, { useState } from 'react';
import { submitFeedback } from '../api/client';
import { CheckCircleIcon, AlertCircleIcon } from './Icons';

const RETURN_REASONS = [
  { id: 'too_small', label: 'Too Small (Runs Tight)' },
  { id: 'too_large', label: 'Too Large (Runs Big)' },
  { id: 'style', label: 'Did Not Like Style' },
  { id: 'quality', label: 'Fabric / Quality Issue' },
  { id: 'other', label: 'Other Reason' },
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function FeedbackCard({
  apiUrl,
  apiKey,
  productId,
  initialSize = 'M',
  onBack,
}) {
  const [sizeBought, setSizeBought] = useState(initialSize);
  const [kept, setKept] = useState(true);
  const [returnReason, setReturnReason] = useState('too_small');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      productId,
      sizeBought,
      kept,
    };

    if (!kept) {
      payload.returnReason = returnReason;
    }

    try {
      await submitFeedback(payload, { apiUrl, apiKey });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fw-feedback-success">
        <CheckCircleIcon className="fw-icon-success fw-icon-large" />
        <h4 className="fw-feedback-title">Thank You For Your Feedback!</h4>
        <p className="fw-feedback-desc">
          Your input helps our machine learning model and Chart Doctor optimize size recommendations for everyone.
        </p>
        <button type="button" className="fw-apply-btn" onClick={onBack}>
          Back to Recommendation
        </button>
      </div>
    );
  }

  return (
    <form className="fw-feedback-form" onSubmit={handleSubmit}>
      <div className="fw-feedback-header">
        <h4 className="fw-feedback-title">Report Fit Outcome</h4>
        <p className="fw-feedback-desc">
          Tell us how this garment fit. Your feedback directly trains our size accuracy model.
        </p>
      </div>

      {error && (
        <div className="fw-alert fw-alert-error">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Size bought selector */}
      <div className="fw-field-group">
        <label className="fw-field-label">Size Purchased</label>
        <div className="fw-size-options" role="radiogroup">
          {STANDARD_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              className={`fw-size-pill ${sizeBought === sz ? 'active' : ''}`}
              onClick={() => setSizeBought(sz)}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Kept or returned toggle */}
      <div className="fw-field-group">
        <label className="fw-field-label">Did you keep or return this item?</label>
        <div className="fw-binary-toggle">
          <button
            type="button"
            className={`fw-toggle-btn ${kept ? 'active' : ''}`}
            onClick={() => setKept(true)}
          >
            ✓ Kept (Good Fit)
          </button>
          <button
            type="button"
            className={`fw-toggle-btn ${!kept ? 'active' : ''}`}
            onClick={() => setKept(false)}
          >
            ✕ Returned
          </button>
        </div>
      </div>

      {/* Return reason (only if returned) */}
      {!kept && (
        <div className="fw-field-group fw-fade-in">
          <label className="fw-field-label">Return Reason</label>
          <select
            className="fw-select"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            required
          >
            {RETURN_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="fw-form-footer">
        <button
          type="submit"
          className="fw-submit-btn"
          disabled={loading}
        >
          {loading ? 'Submitting Feedback...' : 'Submit Fit Feedback'}
        </button>

        <button
          type="button"
          className="fw-text-btn"
          onClick={onBack}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { SparklesIcon, AlertCircleIcon } from './Icons';

// Required measurement fields per category from API Contract §1.3
const CATEGORY_FIELDS = {
  tshirt: [
    { id: 'height_cm', label: 'Height', unitCm: 'cm', unitIn: 'in', min: 120, max: 220, default: 175 },
    { id: 'weight_kg', label: 'Weight', unitCm: 'kg', unitIn: 'lbs', min: 30, max: 200, default: 72, isWeight: true },
    { id: 'chest_cm', label: 'Chest Circumference', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 96 },
    { id: 'waist_cm', label: 'Waist Circumference', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 82 },
  ],
  jeans: [
    { id: 'height_cm', label: 'Height', unitCm: 'cm', unitIn: 'in', min: 120, max: 220, default: 175 },
    { id: 'weight_kg', label: 'Weight', unitCm: 'kg', unitIn: 'lbs', min: 30, max: 200, default: 72, isWeight: true },
    { id: 'waist_cm', label: 'Waist Circumference', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 82 },
    { id: 'hip_cm', label: 'Hip Circumference', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 98 },
  ],
  kurta: [
    { id: 'height_cm', label: 'Height', unitCm: 'cm', unitIn: 'in', min: 120, max: 220, default: 175 },
    { id: 'shoulder_cm', label: 'Shoulder Width', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 44 },
    { id: 'bust_cm', label: 'Chest / Bust', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 96 },
    { id: 'length_cm', label: 'Preferred Length', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 102 },
  ],
  blouse: [
    { id: 'bust_cm', label: 'Bust Circumference', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 92 },
    { id: 'waist_cm', label: 'Underbust / Waist', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 78 },
    { id: 'shoulder_cm', label: 'Shoulder Width', unitCm: 'cm', unitIn: 'in', min: 50, max: 200, default: 40 },
  ],
};

export function MeasurementForm({ category = 'tshirt', region = 'US', onSubmit, loading, error, isSlow = false }) {
  const fields = CATEGORY_FIELDS[category.toLowerCase()] || CATEGORY_FIELDS.tshirt;
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'

  // Initialize measurement state from defaults
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach((f) => {
      init[f.id] = f.default;
    });
    return init;
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleUnitToggle = (sys) => {
    setUnitSystem(sys);
    setValidationErrors({});
  };

  const handleChange = (fieldId, rawVal) => {
    const num = parseFloat(rawVal) || 0;
    setValues((prev) => ({ ...prev, [fieldId]: num }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => ({ ...prev, [fieldId]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    const payload = {};

    fields.forEach((f) => {
      let cmVal = values[f.id];
      if (unitSystem === 'imperial') {
        if (f.isWeight) {
          // lbs -> kg
          cmVal = Math.round(cmVal / 2.20462);
        } else {
          // in -> cm
          cmVal = Math.round(cmVal * 2.54);
        }
      }

      if (cmVal < f.min || cmVal > f.max) {
        errors[f.id] = `Must be between ${f.min} and ${f.max} ${f.unitCm}`;
      } else {
        payload[f.id] = cmVal;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(payload);
  };

  return (
    <form className="fw-form" onSubmit={handleSubmit}>
      <div className="fw-form-header">
        <p className="fw-form-desc">
          Enter your body measurements below for our machine learning model to compute your exact fit for this item.
        </p>

        {/* Unit toggle pills */}
        <div className="fw-unit-switch" role="group" aria-label="Measurement Units">
          <button
            type="button"
            className={`fw-unit-btn ${unitSystem === 'metric' ? 'active' : ''}`}
            onClick={() => handleUnitToggle('metric')}
          >
            Metric (cm / kg)
          </button>
          <button
            type="button"
            className={`fw-unit-btn ${unitSystem === 'imperial' ? 'active' : ''}`}
            onClick={() => handleUnitToggle('imperial')}
          >
            Imperial (in / lbs)
          </button>
        </div>
      </div>

      {error && (
        <div className="fw-alert fw-alert-error" role="alert">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {isSlow && (
        <div className="fw-alert fw-alert-warning" role="status">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>The recommendation service is waking up, please hold on...</span>
        </div>
      )}

      <div className="fw-fields-grid">
        {fields.map((f) => {
          const isImperial = unitSystem === 'imperial';
          let displayVal = values[f.id];
          let displayUnit = isImperial ? f.unitIn : f.unitCm;

          // Convert display value for imperial view if needed
          if (isImperial) {
            displayVal = f.isWeight
              ? Math.round((displayVal || f.default) * 2.20462)
              : Math.round(((displayVal || f.default) / 2.54) * 10) / 10;
          }

          const hasErr = !!validationErrors[f.id];

          return (
            <div key={f.id} className={`fw-field-group ${hasErr ? 'fw-field-error' : ''}`}>
              <label htmlFor={`fw-${f.id}`} className="fw-field-label">
                <span>{f.label}</span>
                <span className="fw-field-unit">({displayUnit})</span>
              </label>

              <div className="fw-input-wrapper">
                <input
                  id={`fw-${f.id}`}
                  type="number"
                  step={isImperial ? '0.5' : '1'}
                  className="fw-input"
                  value={values[f.id] ?? ''}
                  onChange={(e) => handleChange(f.id, e.target.value)}
                  placeholder={`${f.default}`}
                  required
                />
                <span className="fw-input-suffix">{displayUnit}</span>
              </div>

              {hasErr && <span className="fw-field-msg">{validationErrors[f.id]}</span>}
            </div>
          );
        })}
      </div>

      <div className="fw-form-footer">
        <button
          type="submit"
          className="fw-submit-btn"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="fw-spinner-label">
              <span className="fw-spinner" />
              <span>Analyzing Body Profile...</span>
            </span>
          ) : (
            <span className="fw-btn-content">
              <SparklesIcon className="fw-btn-sparkle" />
              <span>Get My Recommended Size</span>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

import React, { useState, useEffect } from 'react';
import { getSizeChart } from '../api/client';
import { SparklesIcon, AlertCircleIcon } from './Icons';

// Required measurement configurations per category (API Contract §1.3)
export const CATEGORY_FIELDS = {
  tshirt: [
    {
      id: 'height_cm',
      name: 'height',
      label: 'Height',
      unit: 'cm',
      min: 120,
      max: 220,
      default: 175,
      helperText: 'Standing straight without shoes',
    },
    {
      id: 'weight_kg',
      name: 'weight',
      label: 'Weight',
      unit: 'kg',
      min: 30,
      max: 200,
      default: 70,
      helperText: 'Current typical body weight',
    },
    {
      id: 'chest_cm',
      name: 'chest',
      label: 'Chest Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 96,
      helperText: 'Around fullest part under armpits',
    },
    {
      id: 'waist_cm',
      name: 'waist',
      label: 'Waist Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 82,
      helperText: 'Around natural waistline above navel',
    },
  ],
  jeans: [
    {
      id: 'height_cm',
      name: 'height',
      label: 'Height',
      unit: 'cm',
      min: 120,
      max: 220,
      default: 175,
      helperText: 'Standing straight without shoes',
    },
    {
      id: 'weight_kg',
      name: 'weight',
      label: 'Weight',
      unit: 'kg',
      min: 30,
      max: 200,
      default: 70,
      helperText: 'Current typical body weight',
    },
    {
      id: 'waist_cm',
      name: 'waist',
      label: 'Waist Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 80,
      helperText: 'Where waistband normally sits comfortably',
    },
    {
      id: 'hip_cm',
      name: 'hip',
      label: 'Hip Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 98,
      helperText: 'Around widest point of hips and seat',
    },
  ],
  kurta: [
    {
      id: 'height_cm',
      name: 'height',
      label: 'Height',
      unit: 'cm',
      min: 120,
      max: 220,
      default: 175,
      helperText: 'Standing straight without shoes',
    },
    {
      id: 'shoulder_cm',
      name: 'shoulder',
      label: 'Shoulder Width',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 44,
      helperText: 'From shoulder seam to seam across back',
    },
    {
      id: 'bust_cm',
      name: 'bust',
      label: 'Bust / Chest Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 96,
      helperText: 'Around fullest part of chest / bust',
    },
    {
      id: 'length_cm',
      name: 'length',
      label: 'Garment Length',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 102,
      helperText: 'From top shoulder point down to desired hem',
    },
  ],
  blouse: [
    {
      id: 'bust_cm',
      name: 'bust',
      label: 'Bust Circumference',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 92,
      helperText: 'Around fullest apex of the bustline',
    },
    {
      id: 'waist_cm',
      name: 'waist',
      label: 'Waist / Underbust',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 78,
      helperText: 'Snug fit around ribcage below bust',
    },
    {
      id: 'shoulder_cm',
      name: 'shoulder',
      label: 'Shoulder Width',
      unit: 'cm',
      min: 50,
      max: 200,
      default: 40,
      helperText: 'Across back from shoulder edge to edge',
    },
  ],
};

export const SUPPORTED_REGIONS = [
  { code: 'US', label: 'US (United States)' },
  { code: 'UK', label: 'UK (United Kingdom)' },
  { code: 'EU', label: 'EU (European Union)' },
  { code: 'IN', label: 'IN (India)' },
];

/**
 * SizeForm component:
 * - Fetches the product size chart to determine category and region
 * - Renders only the measurement fields required for that category
 * - Provides units, short helper text, and range validation
 * - Includes a region selector (US/UK/EU/IN) defaulting to the product's region
 * - Accessible and mobile-friendly
 */
export function SizeForm({
  productId,
  product: preloadedProduct,
  category: propCategory,
  initialCategory,
  region: propRegion,
  initialRegion,
  onSubmit,
  loading: submitting = false,
  error: submitError = null,
  isSlow = false,
  options = {},
}) {
  const initialCat = propCategory || initialCategory || preloadedProduct?.category || '';
  const initialReg = propRegion || initialRegion || preloadedProduct?.region || 'US';

  // Category & region state derived from product or props
  const [category, setCategory] = useState(initialCat);
  const [selectedRegion, setSelectedRegion] = useState(initialReg);
  const [fetchingChart, setFetchingChart] = useState(false);
  const [chartError, setChartError] = useState(null);

  // Field values and validation errors
  const [values, setValues] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Sync state if props change
  useEffect(() => {
    if (propCategory || initialCategory) {
      setCategory(propCategory || initialCategory);
    }
  }, [propCategory, initialCategory]);

  useEffect(() => {
    if (propRegion || initialRegion) {
      setSelectedRegion(propRegion || initialRegion);
    }
  }, [propRegion, initialRegion]);

  // Fetch product size chart if category / region are not passed
  useEffect(() => {
    let isMounted = true;

    async function loadSizeChart() {
      if (!productId) return;
      if (initialCat && (propRegion || initialRegion)) return;

      setFetchingChart(true);
      setChartError(null);

      try {
        const data = await getSizeChart(productId, options);
        if (isMounted && data) {
          if (data.category && !initialCat) setCategory(data.category);
          if (data.region && !propRegion && !initialRegion) setSelectedRegion(data.region);
        }
      } catch (err) {
        if (isMounted) {
          setChartError(err?.message || 'Failed to load product size chart');
          // Fallback to tshirt if unknown
          if (!category) setCategory('tshirt');
        }
      } finally {
        if (isMounted) setFetchingChart(false);
      }
    }

    loadSizeChart();

    return () => {
      isMounted = false;
    };
  }, [productId, initialCat, propRegion, initialRegion]);

  // Determine active category and fields
  const activeCategoryKey = (category || 'tshirt').toLowerCase();
  const fields = CATEGORY_FIELDS[activeCategoryKey] || CATEGORY_FIELDS.tshirt;

  // Initialize or update default values when category changes
  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        if (next[f.id] === undefined && next[f.name] === undefined) {
          next[f.id] = f.default;
        }
      });
      return next;
    });
  }, [activeCategoryKey]);

  const handleInputChange = (fieldId, val) => {
    setValues((prev) => ({
      ...prev,
      [fieldId]: val,
    }));

    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => ({
        ...prev,
        [fieldId]: null,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    const measurements = {};

    fields.forEach((f) => {
      const rawVal = values[f.id] !== undefined ? values[f.id] : values[f.name];
      const num = Number(rawVal);

      if (rawVal === '' || rawVal === undefined || isNaN(num)) {
        errors[f.id] = `${f.label} is required`;
      } else if (num < f.min || num > f.max) {
        errors[f.id] = `${f.label} must be between ${f.min} and ${f.max} ${f.unit}`;
      } else {
        measurements[f.id] = num;
        measurements[f.name] = num;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    if (typeof onSubmit === 'function') {
      onSubmit(measurements, selectedRegion);
    }
  };

  if (fetchingChart) {
    return (
      <div className="fw-form-loading" role="status" aria-live="polite">
        <span className="fw-spinner" />
        <span>Loading garment specifications...</span>
      </div>
    );
  }

  return (
    <form className="fw-size-form" onSubmit={handleSubmit} noValidate>
      {/* Category & Region Header */}
      <div className="fw-form-header">
        <div className="fw-category-info">
          <span className="fw-category-pill">
            {activeCategoryKey.toUpperCase()}
          </span>
          <p className="fw-form-desc">
            Enter your measurements in centimeters / kilograms. Our model matches your silhouette to this garment's exact tailoring.
          </p>
        </div>

        {/* Region Selector */}
        <div className="fw-region-wrapper">
          <label htmlFor="fw-region-select" className="fw-region-label">
            Sizing Region
          </label>
          <select
            id="fw-region-select"
            className="fw-region-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Select sizing standard region"
          >
            {SUPPORTED_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartError && (
        <div className="fw-alert fw-alert-warning" role="alert">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>Notice: Could not load brand size chart ({chartError}). Using standard {activeCategoryKey} sizing.</span>
        </div>
      )}

      {submitError && (
        <div className="fw-alert fw-alert-error" role="alert">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>{submitError}</span>
        </div>
      )}

      {isSlow && (
        <div className="fw-alert fw-alert-warning" role="status">
          <AlertCircleIcon className="fw-alert-icon" />
          <span>Waking up the server, this can take up to a minute...</span>
        </div>
      )}

      {/* Measurement Fields Grid */}
      <div className="fw-fields-grid" role="group" aria-label={`${activeCategoryKey} measurements`}>
        {fields.map((f) => {
          const fieldVal = values[f.id] !== undefined ? values[f.id] : (values[f.name] ?? '');
          const errorMsg = validationErrors[f.id];
          const hasError = !!errorMsg;

          return (
            <div
              key={f.id}
              className={`fw-field-group ${hasError ? 'fw-field-error' : ''}`}
            >
              <label htmlFor={`field-${f.id}`} className="fw-field-label">
                <span className="fw-label-text">{f.label}</span>
                <span className="fw-range-hint">
                  ({f.min}–{f.max} {f.unit})
                </span>
              </label>

              <div className="fw-input-wrapper">
                <input
                  id={`field-${f.id}`}
                  name={f.name}
                  type="number"
                  inputMode="numeric"
                  className="fw-input"
                  min={f.min}
                  max={f.max}
                  step="1"
                  value={fieldVal}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  placeholder={String(f.default)}
                  required
                  aria-required="true"
                  aria-invalid={hasError}
                  aria-describedby={`desc-${f.id}${hasError ? ` err-${f.id}` : ''}`}
                />
                <span className="fw-input-suffix" aria-hidden="true">
                  {f.unit}
                </span>
              </div>

              {f.helperText && (
                <p id={`desc-${f.id}`} className="fw-helper-text">
                  {f.helperText}
                </p>
              )}

              {hasError && (
                <p id={`err-${f.id}`} className="fw-field-msg" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Action */}
      <div className="fw-form-footer">
        <button
          type="submit"
          className="fw-submit-btn"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
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

export default SizeForm;

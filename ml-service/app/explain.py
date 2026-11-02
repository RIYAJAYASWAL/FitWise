"""Model explanation and plain-language reasoning generator for FitWise ML Service."""

from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier


def _format_num(val: Union[int, float]) -> str:
    """Format numeric value as integer if whole, or single-decimal float."""
    if isinstance(val, (int, float)):
        fval = float(val)
        if fval.is_integer():
            return str(int(fval))
        return f"{fval:.1f}"
    return str(val)


def chart_reason(
    category: str,
    measurements: Union[Dict[str, Any], Any],
    chart: List[Any],
    size: str,
) -> str:
    """Generate plain-language explanation comparing shopper measurements against the brand's size chart.

    Examples:
    - Within range: "Your chest is 94 cm; this brand's M covers 92-97 cm."
    - Above range: "Your waist is 84 cm, slightly above M's 78-83 cm."
    - Below range: "Your waist is 70 cm, slightly below M's 75-80 cm."
    """
    if not chart:
        return f"Size chart is unavailable for {size}."

    # Normalize measurements to dictionary
    if hasattr(measurements, "model_dump"):
        meas_dict = measurements.model_dump()
    elif isinstance(measurements, dict):
        meas_dict = dict(measurements)
    elif hasattr(measurements, "__dict__"):
        meas_dict = vars(measurements)
    else:
        meas_dict = dict(measurements)

    # Find chart row corresponding to recommended size
    target_row = None
    for row in chart:
        if hasattr(row, "model_dump"):
            row_dict = row.model_dump()
        elif isinstance(row, dict):
            row_dict = dict(row)
        else:
            row_dict = dict(row)

        if row_dict.get("size") == size:
            target_row = row_dict
            break

    if not target_row:
        return f"Size {size} is not specified in this brand's size chart."

    clauses = []
    for key, val_range in target_row.items():
        if key == "size" or not isinstance(val_range, (list, tuple)) or len(val_range) != 2:
            continue

        min_val, max_val = val_range[0], val_range[1]
        range_str = f"{_format_num(min_val)}-{_format_num(max_val)} cm"
        clean_name = key.replace("_cm", "").replace("_", " ")

        # Look for shopper's measurement value
        user_val = None
        for candidate_key in [key, f"{key}_cm", key.replace("_cm", "")]:
            if candidate_key in meas_dict and meas_dict[candidate_key] is not None:
                user_val = float(meas_dict[candidate_key])
                break

        if user_val is None:
            continue

        val_str = f"{_format_num(user_val)} cm"

        if user_val < min_val:
            clauses.append(f"Your {clean_name} is {val_str}, slightly below {size}'s {range_str}.")
        elif user_val > max_val:
            clauses.append(f"Your {clean_name} is {val_str}, slightly above {size}'s {range_str}.")
        else:
            clauses.append(f"Your {clean_name} is {val_str}; this brand's {size} covers {range_str}.")

    if not clauses:
        return f"Size {size} is recommended based on overall body profile."

    return " ".join(clauses)


def top_factors(
    model: Any,
    features_row: Union[pd.DataFrame, np.ndarray, pd.Series],
    class_index: Union[int, str],
    k: int = 3,
) -> List[Dict[str, Any]]:
    """Compute top-k feature contributions using LightGBM pred_contrib.

    Returns a list of dicts [{feature, impact}] with absolute impacts normalized to sum to 1.
    If model is not LightGBM, returns an empty list [].
    """
    if model is None:
        return []

    # Verify model is LightGBM
    is_lgb = (
        isinstance(model, LGBMClassifier)
        or type(model).__name__ in ("LGBMClassifier", "Booster")
        or "lightgbm" in type(model).__module__
    )
    if not is_lgb:
        return []

    # Normalize features_row to DataFrame or 2D array
    if isinstance(features_row, pd.Series):
        features_row = features_row.to_frame().T
    elif isinstance(features_row, np.ndarray) and features_row.ndim == 1:
        features_row = features_row.reshape(1, -1)

    if isinstance(features_row, pd.DataFrame):
        feature_names = list(features_row.columns)
    else:
        feature_names = getattr(model, "feature_name_", [f"feature_{i}" for i in range(features_row.shape[1])])

    n_features = len(feature_names)

    # Resolve class_index if passed as class name string
    idx = class_index
    if isinstance(class_index, str):
        if hasattr(model, "classes_"):
            classes_list = list(model.classes_)
            if class_index in classes_list:
                idx = classes_list.index(class_index)
            else:
                idx = 0
        else:
            idx = 0

    try:
        # LightGBM predict with pred_contrib=True
        contrib = model.predict(features_row, pred_contrib=True)
    except Exception:
        return []

    if contrib is None or len(contrib) == 0:
        return []

    # In multi-class classification, LightGBM flattens contributions to (n_samples, n_classes * (n_features + 1))
    contrib_sample = contrib[0]
    total_entries = len(contrib_sample)

    if hasattr(model, "classes_") and len(model.classes_) > 2:
        n_classes = len(model.classes_)
        cols_per_class = total_entries // n_classes
        # Reshape to (n_classes, cols_per_class)
        reshaped = contrib_sample.reshape((n_classes, cols_per_class))
        # Take feature contributions excluding intercept
        feat_contribs = reshaped[idx, :n_features]
    elif total_entries == n_features + 1:
        # Binary classification
        feat_contribs = contrib_sample[:n_features]
    else:
        feat_contribs = contrib_sample[:n_features]

    abs_impacts = np.abs(feat_contribs)
    top_k = min(k, len(feature_names))
    if top_k <= 0:
        return []

    top_indices = np.argsort(abs_impacts)[::-1][:top_k]
    top_abs = abs_impacts[top_indices]
    sum_abs = np.sum(top_abs)

    if sum_abs > 0:
        norm_impacts = top_abs / sum_abs
    else:
        norm_impacts = np.full(top_k, 1.0 / top_k)

    result = []
    for i, f_idx in enumerate(top_indices):
        result.append({
            "feature": str(feature_names[f_idx]),
            "impact": round(float(norm_impacts[i]), 2),
        })

    # Adjust rounding differences so total impact sums strictly to 1.0
    if result:
        total_rounded = sum(item["impact"] for item in result)
        diff = round(1.0 - total_rounded, 2)
        if abs(diff) > 0.0:
            result[0]["impact"] = round(result[0]["impact"] + diff, 2)

    return result


def build_explanation(
    category: str,
    measurements: Union[Dict[str, Any], Any],
    chart: List[Any],
    size: str,
    model: Optional[Any] = None,
    features_row: Optional[Union[pd.DataFrame, np.ndarray, pd.Series]] = None,
    class_index: Optional[Union[int, str]] = None,
    k: int = 3,
) -> Dict[str, Any]:
    """Build unified explanation object containing summary, chartReason, and topFactors.

    Returns:
        dict: {
            "summary": "Size M is recommended based on your chest and waist measurements.",
            "chartReason": "Your chest is 94 cm; this brand's M covers 92-97 cm.",
            "topFactors": [{"feature": "chest_cm", "impact": 0.65}, ...]
        }
    """
    chart_reason_text = chart_reason(category, measurements, chart, size)

    # Compute top factors if model and features are supplied
    top_factors_list = []
    if model is not None and features_row is not None:
        c_idx = class_index if class_index is not None else size
        top_factors_list = top_factors(model, features_row, c_idx, k=k)

    # Construct one-sentence summary
    if top_factors_list:
        clean_names = [
            f["feature"].replace("_cm", "").replace("_kg", "").replace("_", " ")
            for f in top_factors_list
        ]
        if len(clean_names) >= 2:
            factors_str = f"{', '.join(clean_names[:-1])} and {clean_names[-1]}"
        else:
            factors_str = clean_names[0]
        summary = f"Size {size} is recommended based on your {factors_str} measurements."
    else:
        summary = f"Size {size} is recommended based on your measurements and size chart."

    return {
        "summary": summary,
        "chartReason": chart_reason_text,
        "topFactors": top_factors_list,
    }

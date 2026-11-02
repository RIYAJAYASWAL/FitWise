"""Feature extraction and preprocessing for FitWise ML Service."""

from collections import Counter
from typing import Any, Dict, List, Optional, Union
import pandas as pd

# Size ordering: XS=0, S=1, M=2, L=3, XL=4, XXL=5
SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_TO_IDX = {size: idx for idx, size in enumerate(SIZES)}

# Feature sets per category strictly defined
FEATURE_SETS: Dict[str, List[str]] = {
    "tshirt": [
        "height_cm",
        "weight_kg",
        "chest_cm",
        "waist_cm",
        "bmi",
        "kept_ratio",
        "most_kept_size_idx",
    ],
    "jeans": [
        "height_cm",
        "weight_kg",
        "waist_cm",
        "hip_cm",
        "bmi",
        "kept_ratio",
        "most_kept_size_idx",
    ],
    "kurta": [
        "height_cm",
        "shoulder_cm",
        "bust_cm",
        "length_cm",
        "kept_ratio",
        "most_kept_size_idx",
    ],
    "blouse": [
        "bust_cm",
        "waist_cm",
        "shoulder_cm",
        "kept_ratio",
        "most_kept_size_idx",
    ],
}


def compute_bmi(height_cm: float, weight_kg: float) -> float:
    """Calculate Body Mass Index (BMI = weight_kg / (height_m)^2)."""
    if height_cm <= 0:
        raise ValueError("height_cm must be positive to compute BMI")
    height_m = height_cm / 100.0
    return weight_kg / (height_m**2)


def process_history(history: Optional[List[Any]]) -> tuple[float, int]:
    """Calculate kept_ratio and most_kept_size_idx from customer history.

    Rules:
    - kept_ratio = kept / total (0.5 if no history)
    - most_kept_size_idx = index of the most frequently kept size in [XS..XXL], -1 if none
    """
    if not history:
        return 0.5, -1

    total = len(history)
    kept_count = 0
    kept_sizes = []

    for item in history:
        if hasattr(item, "model_dump"):
            data = item.model_dump()
        elif isinstance(item, dict):
            data = item
        else:
            data = {
                "sizeBought": getattr(item, "sizeBought", None),
                "kept": getattr(item, "kept", False),
            }

        if bool(data.get("kept")):
            kept_count += 1
            size = data.get("sizeBought")
            if size in SIZE_TO_IDX:
                kept_sizes.append(size)

    kept_ratio = kept_count / total if total > 0 else 0.5

    if kept_sizes:
        # Most frequently kept size (tie-breaker prefers first highest or natural order)
        counts = Counter(kept_sizes)
        # Find maximum count, break ties by most frequent
        most_kept_size = max(counts, key=lambda s: counts[s])
        most_kept_size_idx = SIZE_TO_IDX[most_kept_size]
    else:
        most_kept_size_idx = -1

    return float(kept_ratio), int(most_kept_size_idx)


def build_features(
    category: str,
    measurements: Union[Dict[str, Any], Any],
    history: Optional[List[Any]] = None,
) -> pd.DataFrame:
    """Build a one-row pandas DataFrame matching FEATURE_SETS[category] order.

    Args:
        category: Product category ('tshirt', 'jeans', 'kurta', 'blouse')
        measurements: Dictionary or Pydantic model with measurement inputs
        history: Optional list of past purchases with 'sizeBought' and 'kept'

    Returns:
        One-row pandas DataFrame with columns in exact FEATURE_SETS order

    Raises:
        ValueError: If category is unknown or required measurements are missing
    """
    if category not in FEATURE_SETS:
        raise ValueError(f"Unknown category: '{category}'. Expected one of {list(FEATURE_SETS.keys())}")

    # Normalize measurements to dict
    if hasattr(measurements, "model_dump"):
        meas_dict = measurements.model_dump()
    elif isinstance(measurements, dict):
        meas_dict = dict(measurements)
    elif hasattr(measurements, "__dict__"):
        meas_dict = vars(measurements)
    else:
        meas_dict = dict(measurements)

    expected_features = FEATURE_SETS[category]
    kept_ratio, most_kept_size_idx = process_history(history)

    # Compute BMI if applicable for this category
    bmi_value = None
    if "bmi" in expected_features:
        if "height_cm" not in meas_dict or "weight_kg" not in meas_dict:
            raise ValueError(f"Category '{category}' requires both 'height_cm' and 'weight_kg' to compute BMI")
        bmi_value = compute_bmi(float(meas_dict["height_cm"]), float(meas_dict["weight_kg"]))

    row = {}
    for col in expected_features:
        if col == "bmi":
            row[col] = bmi_value
        elif col == "kept_ratio":
            row[col] = kept_ratio
        elif col == "most_kept_size_idx":
            row[col] = most_kept_size_idx
        else:
            if col not in meas_dict:
                raise ValueError(f"Missing required measurement '{col}' for category '{category}'")
            row[col] = float(meas_dict[col])

    return pd.DataFrame([row], columns=expected_features)

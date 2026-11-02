import pytest
import pandas as pd
from app.features import FEATURE_SETS, build_features, SIZES
from app.schemas import TshirtMeasurements, JeansMeasurements, KurtaMeasurements, BlouseMeasurements


def test_feature_sets_definitions():
    """Verify FEATURE_SETS contains the required columns in correct order."""
    assert FEATURE_SETS["tshirt"] == [
        "height_cm", "weight_kg", "chest_cm", "waist_cm", "bmi", "kept_ratio", "most_kept_size_idx"
    ]
    assert FEATURE_SETS["jeans"] == [
        "height_cm", "weight_kg", "waist_cm", "hip_cm", "bmi", "kept_ratio", "most_kept_size_idx"
    ]
    assert FEATURE_SETS["kurta"] == [
        "height_cm", "shoulder_cm", "bust_cm", "length_cm", "kept_ratio", "most_kept_size_idx"
    ]
    assert FEATURE_SETS["blouse"] == [
        "bust_cm", "waist_cm", "shoulder_cm", "kept_ratio", "most_kept_size_idx"
    ]


def test_tshirt_features_calculation():
    """Build features for tshirt with BMI and non-empty history."""
    measurements = {
        "height_cm": 180.0,
        "weight_kg": 81.0,
        "chest_cm": 100.0,
        "waist_cm": 85.0,
    }
    history = [
        {"sizeBought": "L", "kept": True},
        {"sizeBought": "L", "kept": True},
        {"sizeBought": "XL", "kept": False},
        {"sizeBought": "M", "kept": True},
    ]

    df = build_features("tshirt", measurements, history)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1
    assert list(df.columns) == FEATURE_SETS["tshirt"]

    # BMI = 81 / (1.8^2) = 81 / 3.24 = 25.0
    assert pytest.approx(df["bmi"].iloc[0], rel=1e-3) == 25.0
    # kept_ratio = 3 kept / 4 total = 0.75
    assert pytest.approx(df["kept_ratio"].iloc[0]) == 0.75
    # Most kept size is 'L' (2 times) -> index 3
    assert df["most_kept_size_idx"].iloc[0] == 3
    assert df["height_cm"].iloc[0] == 180.0
    assert df["weight_kg"].iloc[0] == 81.0


def test_jeans_features():
    """Build features for jeans with BMI."""
    measurements = {
        "height_cm": 170.0,
        "weight_kg": 68.0,
        "waist_cm": 80.0,
        "hip_cm": 95.0,
    }
    history = [{"sizeBought": "M", "kept": True}]

    df = build_features("jeans", measurements, history)

    assert len(df) == 1
    assert list(df.columns) == FEATURE_SETS["jeans"]
    expected_bmi = 68.0 / (1.70 ** 2)
    assert pytest.approx(df["bmi"].iloc[0], rel=1e-3) == expected_bmi
    assert df["kept_ratio"].iloc[0] == 1.0
    assert df["most_kept_size_idx"].iloc[0] == SIZES.index("M")


def test_kurta_features_no_bmi():
    """Kurta does not have weight_kg, so BMI must not be present."""
    measurements = {
        "height_cm": 165.0,
        "shoulder_cm": 40.0,
        "bust_cm": 92.0,
        "length_cm": 105.0,
    }
    df = build_features("kurta", measurements, [])

    assert len(df) == 1
    assert list(df.columns) == FEATURE_SETS["kurta"]
    assert "bmi" not in df.columns
    assert df["height_cm"].iloc[0] == 165.0
    assert df["shoulder_cm"].iloc[0] == 40.0


def test_blouse_features_no_bmi():
    """Blouse does not have height_cm or weight_kg, so BMI must not be present."""
    measurements = {
        "bust_cm": 88.0,
        "waist_cm": 72.0,
        "shoulder_cm": 38.0,
    }
    df = build_features("blouse", measurements, None)

    assert len(df) == 1
    assert list(df.columns) == FEATURE_SETS["blouse"]
    assert "bmi" not in df.columns
    assert df["bust_cm"].iloc[0] == 88.0


@pytest.mark.parametrize("category,meas_data", [
    ("tshirt", {"height_cm": 175.0, "weight_kg": 70.0, "chest_cm": 96.0, "waist_cm": 82.0}),
    ("jeans", {"height_cm": 175.0, "weight_kg": 70.0, "waist_cm": 82.0, "hip_cm": 96.0}),
    ("kurta", {"height_cm": 170.0, "shoulder_cm": 42.0, "bust_cm": 94.0, "length_cm": 102.0}),
    ("blouse", {"bust_cm": 90.0, "waist_cm": 74.0, "shoulder_cm": 38.0}),
])
def test_empty_history_defaults(category, meas_data):
    """Empty history must yield kept_ratio=0.5 and most_kept_size_idx=-1."""
    # Test with empty list
    df1 = build_features(category, meas_data, history=[])
    assert df1["kept_ratio"].iloc[0] == 0.5
    assert df1["most_kept_size_idx"].iloc[0] == -1

    # Test with None
    df2 = build_features(category, meas_data, history=None)
    assert df2["kept_ratio"].iloc[0] == 0.5
    assert df2["most_kept_size_idx"].iloc[0] == -1


def test_history_all_returned():
    """When customer returned all items (kept=False), most_kept_size_idx is -1 and kept_ratio is 0.0."""
    measurements = {"height_cm": 175.0, "weight_kg": 70.0, "chest_cm": 96.0, "waist_cm": 82.0}
    history = [
        {"sizeBought": "M", "kept": False},
        {"sizeBought": "L", "kept": False},
    ]
    df = build_features("tshirt", measurements, history)
    assert df["kept_ratio"].iloc[0] == 0.0
    assert df["most_kept_size_idx"].iloc[0] == -1


def test_unknown_category_raises_value_error():
    """Unknown category must raise ValueError."""
    with pytest.raises(ValueError, match="Unknown category"):
        build_features("shoes", {"height_cm": 170})

    with pytest.raises(ValueError, match="Unknown category"):
        build_features("hoodie", {})


def test_missing_measurement_raises_value_error():
    """Missing required measurement must raise ValueError."""
    # Missing waist_cm for tshirt
    bad_measurements = {"height_cm": 175.0, "weight_kg": 70.0, "chest_cm": 96.0}
    with pytest.raises(ValueError, match="Missing required measurement"):
        build_features("tshirt", bad_measurements)


def test_pydantic_model_input():
    """build_features works seamlessly with Pydantic measurement models."""
    tshirt_meas = TshirtMeasurements(
        height_cm=175.0,
        weight_kg=70.0,
        chest_cm=96.0,
        waist_cm=82.0,
    )
    df = build_features("tshirt", tshirt_meas)
    assert len(df) == 1
    assert df["height_cm"].iloc[0] == 175.0
    assert df["weight_kg"].iloc[0] == 70.0
    assert df["kept_ratio"].iloc[0] == 0.5
    assert df["most_kept_size_idx"].iloc[0] == -1

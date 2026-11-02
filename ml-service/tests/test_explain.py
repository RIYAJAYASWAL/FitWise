import pytest
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.linear_model import LogisticRegression

from app.explain import chart_reason, top_factors, build_explanation
from app.schemas import Explanation


@pytest.fixture
def fake_chart():
    return [
        {"size": "S", "chest": [86, 91], "waist": [72, 77]},
        {"size": "M", "chest": [92, 97], "waist": [78, 83]},
        {"size": "L", "chest": [98, 103], "waist": [84, 89]},
    ]


@pytest.fixture
def tiny_lgbm_model():
    # Train tiny LightGBM on 60 samples with 4 features and 3 classes
    np.random.seed(42)
    X = pd.DataFrame({
        "height_cm": np.random.uniform(160, 190, 60),
        "weight_kg": np.random.uniform(50, 95, 60),
        "chest_cm": np.random.uniform(85, 110, 60),
        "waist_cm": np.random.uniform(70, 95, 60),
    })
    y = np.array(["S", "M", "L"] * 20)
    clf = LGBMClassifier(n_estimators=10, random_state=42, verbose=-1, n_jobs=1)
    clf.fit(X, y)
    return clf


def test_chart_reason_within_range(fake_chart):
    """When measurements are within chart ranges, verify plain-language text."""
    measurements = {"chest_cm": 94, "waist_cm": 80}
    reason = chart_reason("tshirt", measurements, fake_chart, "M")

    assert "Your chest is 94 cm; this brand's M covers 92-97 cm." in reason
    assert "Your waist is 80 cm; this brand's M covers 78-83 cm." in reason


def test_chart_reason_outside_range(fake_chart):
    """When measurements are outside chart ranges, say slightly above or slightly below."""
    measurements = {"chest_cm": 90, "waist_cm": 85}
    reason = chart_reason("tshirt", measurements, fake_chart, "M")

    # 90 is below M chest (92-97)
    assert "Your chest is 90 cm, slightly below M's 92-97 cm." in reason
    # 85 is above M waist (78-83)
    assert "Your waist is 85 cm, slightly above M's 78-83 cm." in reason


def test_chart_reason_missing_size(fake_chart):
    """Handling when size is not in chart."""
    reason = chart_reason("tshirt", {"chest_cm": 115}, fake_chart, "XXL")
    assert "Size XXL is not specified" in reason


def test_top_factors_with_lgbm(tiny_lgbm_model):
    """LightGBM model returns top factors normalized to sum to 1.0."""
    row = pd.DataFrame([{
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "chest_cm": 95.0,
        "waist_cm": 80.0,
    }])
    factors = top_factors(tiny_lgbm_model, row, class_index="M", k=3)

    assert isinstance(factors, list)
    assert len(factors) == 3
    assert all("feature" in f and "impact" in f for f in factors)
    # Impacts must be positive
    assert all(f["impact"] >= 0.0 for f in factors)
    # Total impacts must sum strictly to 1.0
    total_impact = sum(f["impact"] for f in factors)
    assert pytest.approx(total_impact, abs=1e-2) == 1.0
    # Factors should be ordered descending
    assert factors[0]["impact"] >= factors[1]["impact"] >= factors[2]["impact"]


def test_top_factors_non_lgbm_returns_empty():
    """Non-LightGBM model (e.g. LogisticRegression) returns an empty list."""
    X = np.random.randn(20, 2)
    y = np.array([0, 1] * 10)
    lr = LogisticRegression().fit(X, y)
    factors = top_factors(lr, pd.DataFrame([[1.0, 2.0]]), class_index=0)
    assert factors == []

    # None model returns []
    assert top_factors(None, pd.DataFrame([[1.0, 2.0]]), class_index=0) == []


def test_build_explanation(fake_chart, tiny_lgbm_model):
    """build_explanation combines chartReason, topFactors and generates a 1-sentence summary."""
    measurements = {"chest_cm": 94, "waist_cm": 80, "height_cm": 175, "weight_kg": 72}
    row = pd.DataFrame([{
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "chest_cm": 94.0,
        "waist_cm": 80.0,
    }])

    exp = build_explanation(
        category="tshirt",
        measurements=measurements,
        chart=fake_chart,
        size="M",
        model=tiny_lgbm_model,
        features_row=row,
        class_index="M",
        k=2,
    )

    assert isinstance(exp, dict)
    assert "summary" in exp
    assert "chartReason" in exp
    assert "topFactors" in exp

    assert "Size M is recommended based on" in exp["summary"]
    assert "Your chest is 94 cm; this brand's M covers 92-97 cm." in exp["chartReason"]
    assert len(exp["topFactors"]) == 2

    # Validate compatibility with Pydantic Explanation schema
    pydantic_exp = Explanation(**exp)
    assert pydantic_exp.summary == exp["summary"]
    assert pydantic_exp.chartReason == exp["chartReason"]
    assert len(pydantic_exp.topFactors) == 2

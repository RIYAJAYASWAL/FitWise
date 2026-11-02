import os
import pytest
import numpy as np
from starlette.testclient import TestClient

# Ensure test internal key is set before loading app
os.environ["INTERNAL_KEY"] = "test-secret-internal-key"

from app.main import app
from app.model_loader import MODEL_REGISTRY
from app.features import SIZES

AUTH_HEADERS = {"x-internal-key": "test-secret-internal-key"}

FULL_SIZE_CHART = [
    {"size": "XS", "chest": [84, 89], "waist": [70, 75]},
    {"size": "S", "chest": [89, 94], "waist": [75, 80]},
    {"size": "M", "chest": [94, 99], "waist": [80, 85]},
    {"size": "L", "chest": [99, 104], "waist": [85, 90]},
    {"size": "XL", "chest": [104, 110], "waist": [90, 96]},
    {"size": "XXL", "chest": [110, 118], "waist": [96, 104]},
]


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# --------------------------------------------------------------------------
# 1. Valid request per category returns 200 matching the contract
# --------------------------------------------------------------------------
@pytest.mark.parametrize("category,measurements,chart", [
    (
        "tshirt",
        {"height_cm": 175, "weight_kg": 70, "chest_cm": 96, "waist_cm": 82},
        FULL_SIZE_CHART,
    ),
    (
        "jeans",
        {"height_cm": 178, "weight_kg": 72, "waist_cm": 82, "hip_cm": 98},
        [
            {"size": "S", "waist": [74, 78], "hip": [90, 94]},
            {"size": "M", "waist": [79, 84], "hip": [95, 100]},
            {"size": "L", "waist": [85, 90], "hip": [101, 106]},
        ],
    ),
    (
        "kurta",
        {"height_cm": 168, "shoulder_cm": 41, "bust_cm": 92, "length_cm": 104},
        [
            {"size": "S", "shoulder": [38, 40], "bust": [86, 90], "length": [98, 102]},
            {"size": "M", "shoulder": [40, 42], "bust": [91, 95], "length": [103, 107]},
            {"size": "L", "shoulder": [42, 44], "bust": [96, 100], "length": [108, 112]},
        ],
    ),
    (
        "blouse",
        {"bust_cm": 89, "waist_cm": 73, "shoulder_cm": 38},
        [
            {"size": "S", "bust": [82, 87], "waist": [66, 71], "shoulder": [36, 38]},
            {"size": "M", "bust": [88, 93], "waist": [72, 77], "shoulder": [38, 40]},
            {"size": "L", "bust": [94, 99], "waist": [78, 83], "shoulder": [40, 42]},
        ],
    ),
])
def test_valid_request_per_category_returns_200_matching_contract(client, category, measurements, chart):
    """Each category returns 200 with schema matching API contract."""
    payload = {
        "category": category,
        "measurements": measurements,
        "sizeChart": chart,
        "history": [{"sizeBought": "M", "kept": True}],
        "bias": 0,
    }
    response = client.post("/predict", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200

    data = response.json()
    assert data["recommendedSize"] in SIZES
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert isinstance(data["alternatives"], list)
    assert len(data["alternatives"]) >= 1
    assert all(alt in SIZES for alt in data["alternatives"])

    explanation = data["explanation"]
    assert isinstance(explanation["summary"], str)
    assert len(explanation["summary"]) > 0
    assert isinstance(explanation["chartReason"], str)
    assert len(explanation["chartReason"]) > 0
    assert isinstance(explanation["topFactors"], list)
    assert len(explanation["topFactors"]) >= 1
    for factor in explanation["topFactors"]:
        assert "feature" in factor
        assert "impact" in factor
        assert isinstance(factor["impact"], float)


# --------------------------------------------------------------------------
# 2. Wrong or missing measurement fields return 422
# --------------------------------------------------------------------------
def test_missing_measurement_field_returns_422(client):
    """Missing required measurement returns 422 in contract error format."""
    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            # missing waist_cm
        },
        "sizeChart": FULL_SIZE_CHART,
    }
    response = client.post("/predict", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "Missing required measurement(s)" in data["error"]["message"]


def test_unexpected_measurement_field_returns_422(client):
    """Unexpected extra measurement returns 422 in contract error format."""
    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
            "hip_cm": 95,  # hip_cm not in tshirt
        },
        "sizeChart": FULL_SIZE_CHART,
    }
    response = client.post("/predict", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "Unexpected measurement(s)" in data["error"]["message"]


def test_out_of_range_measurement_returns_422(client):
    """Measurement values outside validation ranges return 422."""
    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 250,  # max is 220
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": FULL_SIZE_CHART,
    }
    response = client.post("/predict", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "height_cm" in data["error"]["message"]


# --------------------------------------------------------------------------
# 3. Very small body gets XS/S, very large gets XL/XXL (tshirt)
# --------------------------------------------------------------------------
def test_extreme_body_sizes_tshirt(client):
    """Very small shopper predicts XS/S; very large shopper predicts XL/XXL."""
    small_payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 150,
            "weight_kg": 45,
            "chest_cm": 80,
            "waist_cm": 65,
        },
        "sizeChart": FULL_SIZE_CHART,
        "bias": 0,
    }
    small_res = client.post("/predict", json=small_payload, headers=AUTH_HEADERS).json()
    assert small_res["recommendedSize"] in ["XS", "S"]

    large_payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 195,
            "weight_kg": 115,
            "chest_cm": 118,
            "waist_cm": 105,
        },
        "sizeChart": FULL_SIZE_CHART,
        "bias": 0,
    }
    large_res = client.post("/predict", json=large_payload, headers=AUTH_HEADERS).json()
    assert large_res["recommendedSize"] in ["XL", "XXL"]


# --------------------------------------------------------------------------
# 4. Bias +1 moves the size up one step, clamped at XXL
# --------------------------------------------------------------------------
def test_bias_moves_size_up_one_step_and_clamps(client):
    """bias +1 moves the size up one step along [XS..XXL], clamped at XXL."""
    base_payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": FULL_SIZE_CHART,
        "bias": 0,
    }
    base_res = client.post("/predict", json=base_payload, headers=AUTH_HEADERS).json()
    base_size = base_res["recommendedSize"]

    # Apply bias: +1
    plus1_payload = {**base_payload, "bias": 1}
    plus1_res = client.post("/predict", json=plus1_payload, headers=AUTH_HEADERS).json()
    plus1_size = plus1_res["recommendedSize"]

    if base_size != "XXL":
        assert SIZES.index(plus1_size) == SIZES.index(base_size) + 1

    # For an XXL body, bias: 1 remains clamped at XXL
    xxl_payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 195,
            "weight_kg": 115,
            "chest_cm": 118,
            "waist_cm": 105,
        },
        "sizeChart": FULL_SIZE_CHART,
        "bias": 1,
    }
    xxl_res = client.post("/predict", json=xxl_payload, headers=AUTH_HEADERS).json()
    assert xxl_res["recommendedSize"] == "XXL"


# --------------------------------------------------------------------------
# 5. Predicted size not in chart is replaced by the nearest chart size
# --------------------------------------------------------------------------
def test_predicted_size_not_in_chart_replaced_by_nearest(client):
    """When the predicted size is omitted from the chart, choose the nearest available size."""
    # Chart with only XS and S. A medium body would normally be M, so it must fall back to S.
    chart_xs_s = [
        {"size": "XS", "chest": [84, 89], "waist": [70, 75]},
        {"size": "S", "chest": [89, 94], "waist": [75, 80]},
    ]
    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": chart_xs_s,
        "bias": 0,
    }
    res = client.post("/predict", json=payload, headers=AUTH_HEADERS).json()
    assert res["recommendedSize"] == "S"

    # Chart with only XL and XXL. A medium body must fall back to XL.
    chart_xl_xxl = [
        {"size": "XL", "chest": [104, 110], "waist": [90, 96]},
        {"size": "XXL", "chest": [110, 118], "waist": [96, 104]},
    ]
    payload_high = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": chart_xl_xxl,
        "bias": 0,
    }
    res_high = client.post("/predict", json=payload_high, headers=AUTH_HEADERS).json()
    assert res_high["recommendedSize"] == "XL"


# --------------------------------------------------------------------------
# 6. Confidence < 0.5 returns two alternatives
# --------------------------------------------------------------------------
def test_low_confidence_returns_two_alternatives(client, monkeypatch):
    """When top class probability < 0.5, alternatives list contains 2 sizes."""
    tshirt_model_info = MODEL_REGISTRY["tshirt"]
    real_model = tshirt_model_info["model"]

    # Mock predict_proba to return low confidence (top probability 0.40 < 0.5)
    # Order matches real_model.classes_ (6 classes)
    mock_probs = np.array([[0.10, 0.40, 0.25, 0.15, 0.05, 0.05]])
    monkeypatch.setattr(real_model, "predict_proba", lambda X: mock_probs)

    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": FULL_SIZE_CHART,
        "bias": 0,
    }
    res = client.post("/predict", json=payload, headers=AUTH_HEADERS).json()

    assert res["confidence"] == 0.40
    assert len(res["alternatives"]) == 2
    assert all(alt in SIZES for alt in res["alternatives"])


# --------------------------------------------------------------------------
# 7. Missing model returns 503
# --------------------------------------------------------------------------
def test_missing_model_returns_503(client):
    """If category model is missing in registry, return 503 SERVICE_UNAVAILABLE in contract format."""
    saved_model = MODEL_REGISTRY.pop("kurta", None)
    try:
        payload = {
            "category": "kurta",
            "measurements": {
                "height_cm": 168,
                "shoulder_cm": 41,
                "bust_cm": 92,
                "length_cm": 104,
            },
            "sizeChart": [
                {"size": "M", "shoulder": [40, 42], "bust": [91, 95], "length": [103, 107]}
            ],
        }
        response = client.post("/predict", json=payload, headers=AUTH_HEADERS)
        assert response.status_code == 503
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "SERVICE_UNAVAILABLE"
        assert "kurta" in data["error"]["message"]
    finally:
        if saved_model:
            MODEL_REGISTRY["kurta"] = saved_model


# --------------------------------------------------------------------------
# 8. Missing or wrong x-internal-key returns 401; /health stays open
# --------------------------------------------------------------------------
def test_auth_enforcement_and_health_stays_open(client):
    """Missing or wrong x-internal-key returns 401; /health requires no key."""
    payload = {
        "category": "tshirt",
        "measurements": {
            "height_cm": 175,
            "weight_kg": 70,
            "chest_cm": 96,
            "waist_cm": 82,
        },
        "sizeChart": FULL_SIZE_CHART,
    }

    # 1. Missing header -> 401
    res_no_header = client.post("/predict", json=payload)
    assert res_no_header.status_code == 401
    assert res_no_header.json()["error"]["code"] == "UNAUTHORIZED"

    # 2. Wrong header -> 401
    res_wrong_header = client.post("/predict", json=payload, headers={"x-internal-key": "invalid-secret-key"})
    assert res_wrong_header.status_code == 401
    assert res_wrong_header.json()["error"]["code"] == "UNAUTHORIZED"

    # 3. GET /health stays open (no header needed) -> 200
    res_health = client.get("/health")
    assert res_health.status_code == 200
    health_data = res_health.json()
    assert health_data["status"] == "ok"
    assert "modelsLoaded" in health_data
    assert len(health_data["modelsLoaded"]) >= 1

import os
import pytest
from starlette.testclient import TestClient

# Set test environment variable before importing app
os.environ["INTERNAL_KEY"] = "test-secret-internal-key"

from app.main import app
from app.model_loader import MODEL_REGISTRY

VALID_TSHIRT_PAYLOAD = {
    "category": "tshirt",
    "measurements": {
        "height_cm": 175,
        "weight_kg": 70,
        "chest_cm": 96,
        "waist_cm": 82,
    },
    "sizeChart": [
        {"size": "XS", "chest": [84, 89], "waist": [70, 75]},
        {"size": "S", "chest": [89, 94], "waist": [75, 80]},
        {"size": "M", "chest": [94, 99], "waist": [80, 85]},
        {"size": "L", "chest": [99, 104], "waist": [85, 90]},
        {"size": "XL", "chest": [104, 110], "waist": [90, 96]},
        {"size": "XXL", "chest": [110, 118], "waist": [96, 104]},
    ],
    "history": [{"sizeBought": "M", "kept": True}],
    "bias": 0,
}

VALID_JEANS_PAYLOAD = {
    "category": "jeans",
    "measurements": {
        "height_cm": 178,
        "weight_kg": 72,
        "waist_cm": 84,
        "hip_cm": 98,
    },
    "sizeChart": [
        {"size": "M", "waist": [82, 86], "hip": [96, 100]},
    ],
}

VALID_KURTA_PAYLOAD = {
    "category": "kurta",
    "measurements": {
        "height_cm": 170,
        "shoulder_cm": 44,
        "bust_cm": 94,
        "length_cm": 105,
    },
    "sizeChart": [
        {"size": "M", "shoulder": [42, 45], "bust": [92, 96], "length": [100, 110]},
    ],
}

VALID_BLOUSE_PAYLOAD = {
    "category": "blouse",
    "measurements": {
        "bust_cm": 90,
        "waist_cm": 74,
        "shoulder_cm": 38,
    },
    "sizeChart": [
        {"size": "M", "bust": [88, 92], "waist": [72, 76], "shoulder": [37, 39]},
    ],
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_health_endpoint_lists_loaded_models(client):
    """GET /health must be public and return list of all loaded model categories."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert set(data["modelsLoaded"]) == {"tshirt", "jeans", "kurta", "blouse"}


def test_predict_requires_auth_missing_header(client):
    """POST /predict without x-internal-key must return 401 in contract format."""
    response = client.post("/predict", json=VALID_TSHIRT_PAYLOAD)
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "Missing or invalid internal API key" in data["error"]["message"]


def test_predict_requires_auth_invalid_header(client):
    """POST /predict with incorrect x-internal-key must return 401 in contract format."""
    response = client.post(
        "/predict",
        json=VALID_TSHIRT_PAYLOAD,
        headers={"x-internal-key": "wrong-secret-key"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_predict_success(client):
    """POST /predict with valid header and payload returns dynamic prediction."""
    response = client.post(
        "/predict",
        json=VALID_TSHIRT_PAYLOAD,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommendedSize"] in ["XS", "S", "M", "L", "XL", "XXL"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert isinstance(data["alternatives"], list)
    assert len(data["alternatives"]) >= 1
    assert "summary" in data["explanation"]
    assert "chartReason" in data["explanation"]
    assert len(data["explanation"]["topFactors"]) >= 1


def test_predict_bias_shifting(client):
    """Bias shifts the predicted size by specified steps in [XS..XXL]."""
    # Base prediction (bias=0)
    base_res = client.post(
        "/predict",
        json={**VALID_TSHIRT_PAYLOAD, "bias": 0},
        headers={"x-internal-key": "test-secret-internal-key"},
    ).json()
    base_size = base_res["recommendedSize"]

    # Prediction with positive bias (+1)
    plus_res = client.post(
        "/predict",
        json={**VALID_TSHIRT_PAYLOAD, "bias": 1},
        headers={"x-internal-key": "test-secret-internal-key"},
    ).json()
    plus_size = plus_res["recommendedSize"]

    # When base is not XXL, bias=1 shifts up
    from app.features import SIZES
    if base_size != "XXL":
        assert SIZES.index(plus_size) == min(len(SIZES) - 1, SIZES.index(base_size) + 1)
    # Confidence remains that of originally predicted class
    assert plus_res["confidence"] == base_res["confidence"]


def test_predict_size_not_in_chart_nearest_fallback(client):
    """If predicted/biased size is not in sizeChart, replace with nearest available chart size."""
    # Chart with only XS and XXL
    sparse_chart_payload = {
        **VALID_TSHIRT_PAYLOAD,
        "sizeChart": [
            {"size": "XS", "chest": [80, 85], "waist": [65, 70]},
            {"size": "XXL", "chest": [115, 120], "waist": [100, 105]},
        ],
        "bias": 0,
    }
    res = client.post(
        "/predict",
        json=sparse_chart_payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert res.status_code == 200
    data = res.json()
    # Must be one of the available chart sizes
    assert data["recommendedSize"] in ["XS", "XXL"]


def test_missing_model_returns_503(client):
    """When a model is not loaded in registry, returns 503 SERVICE_UNAVAILABLE."""
    # Temporarily remove a category from registry
    saved_model = MODEL_REGISTRY.pop("kurta", None)
    try:
        response = client.post(
            "/predict",
            json=VALID_KURTA_PAYLOAD,
            headers={"x-internal-key": "test-secret-internal-key"},
        )
        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "SERVICE_UNAVAILABLE"
        assert "kurta" in data["error"]["message"]
    finally:
        if saved_model:
            MODEL_REGISTRY["kurta"] = saved_model


@pytest.mark.parametrize("payload", [
    VALID_JEANS_PAYLOAD,
    VALID_KURTA_PAYLOAD,
    VALID_BLOUSE_PAYLOAD,
])
def test_all_categories_supported(client, payload):
    """All categories validate and predict when models are connected."""
    response = client.post(
        "/predict",
        json=payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommendedSize" in data
    assert "confidence" in data
    assert "explanation" in data


def test_validation_error_missing_category_measurement(client):
    """Missing category measurement returns 422 in contract format."""
    bad_payload = dict(VALID_TSHIRT_PAYLOAD)
    bad_payload["measurements"] = {
        "height_cm": 175,
        "weight_kg": 70,
        "chest_cm": 96,
        # missing waist_cm
    }
    response = client.post(
        "/predict",
        json=bad_payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "Missing required measurement(s)" in data["error"]["message"]


def test_validation_error_unexpected_category_measurement(client):
    """Unexpected extra measurement returns 422 in contract format."""
    bad_payload = dict(VALID_TSHIRT_PAYLOAD)
    bad_payload["measurements"] = {
        "height_cm": 175,
        "weight_kg": 70,
        "chest_cm": 96,
        "waist_cm": 82,
        "hip_cm": 90,  # extra for tshirt
    }
    response = client.post(
        "/predict",
        json=bad_payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "Unexpected measurement(s)" in data["error"]["message"]


@pytest.mark.parametrize("bad_measurements,expected_snippet", [
    ({"height_cm": 110, "weight_kg": 70, "chest_cm": 96, "waist_cm": 82}, "height_cm"),  # < 120
    ({"height_cm": 230, "weight_kg": 70, "chest_cm": 96, "waist_cm": 82}, "height_cm"),  # > 220
    ({"height_cm": 175, "weight_kg": 25, "chest_cm": 96, "waist_cm": 82}, "weight_kg"),  # < 30
    ({"height_cm": 175, "weight_kg": 210, "chest_cm": 96, "waist_cm": 82}, "weight_kg"), # > 200
    ({"height_cm": 175, "weight_kg": 70, "chest_cm": 15, "waist_cm": 82}, "chest_cm"),   # < 20
    ({"height_cm": 175, "weight_kg": 70, "chest_cm": 210, "waist_cm": 82}, "chest_cm"),  # > 200
])
def test_validation_error_measurement_ranges(client, bad_measurements, expected_snippet):
    """Out-of-range measurements return 422 in contract format."""
    bad_payload = dict(VALID_TSHIRT_PAYLOAD)
    bad_payload["measurements"] = bad_measurements
    response = client.post(
        "/predict",
        json=bad_payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "BAD_REQUEST"
    assert expected_snippet in data["error"]["message"]


def test_validation_error_invalid_category(client):
    """Unsupported category returns 422 in contract format."""
    bad_payload = dict(VALID_TSHIRT_PAYLOAD)
    bad_payload["category"] = "shoes"
    response = client.post(
        "/predict",
        json=bad_payload,
        headers={"x-internal-key": "test-secret-internal-key"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "BAD_REQUEST"

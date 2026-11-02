from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.explain import build_explanation
from app.features import SIZES, build_features
from app.model_loader import get_model
from app.schemas import (
    Explanation,
    PredictRequest,
    PredictResponse,
)

router = APIRouter(tags=["Predict"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    responses={
        503: {
            "description": "Model unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "SERVICE_UNAVAILABLE",
                            "message": "Model for category 'tshirt' is not loaded or unavailable",
                        }
                    }
                }
            },
        }
    },
)
async def predict(request: PredictRequest):
    """Predict optimal clothing size based on shopper measurements and size chart."""
    # Check model availability
    model_info = get_model(request.category)
    if not model_info or "model" not in model_info:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": f"Model for category '{request.category}' is not loaded or unavailable",
                }
            },
        )

    model = model_info["model"]

    # Build features matching FEATURE_SETS order
    features_row = build_features(
        category=request.category,
        measurements=request.measurements,
        history=request.history,
    )

    # Predict probabilities across classes
    probs = model.predict_proba(features_row)[0]
    classes = list(model.classes_)
    class_prob_map = dict(zip(classes, probs))

    # Top class and probability
    sorted_classes = sorted(classes, key=lambda c: class_prob_map[c], reverse=True)
    top_class = sorted_classes[0]
    top_prob = class_prob_map[top_class]

    # 1) Apply bias: shift the predicted size by `bias` steps in [XS..XXL], clamped
    current_idx = SIZES.index(top_class)
    biased_idx = max(0, min(len(SIZES) - 1, current_idx + request.bias))
    biased_size = SIZES[biased_idx]

    # 2) If the size is not in sizeChart, replace it with the nearest chart size
    chart_sizes = [row.size for row in request.sizeChart]
    if biased_size in chart_sizes:
        recommended_size = biased_size
    else:
        # Distance measured in SIZES order
        recommended_size = min(
            chart_sizes,
            key=lambda s: abs(SIZES.index(s) - SIZES.index(biased_size)),
        )

    # 3) Confidence = probability of the originally predicted class, rounded to 2 decimals
    confidence = round(float(top_prob), 2)

    # 4) Alternatives = [second most likely size]; if confidence < 0.5 include the top 2
    candidate_alternatives = [c for c in sorted_classes if c != recommended_size]
    if confidence < 0.5:
        alternatives = candidate_alternatives[:2]
    else:
        alternatives = candidate_alternatives[:1]

    # 5) Explanation = build_explanation(...)
    explanation_data = build_explanation(
        category=request.category,
        measurements=request.measurements,
        chart=request.sizeChart,
        size=recommended_size,
        model=model,
        features_row=features_row,
        class_index=top_class,
        k=2,
    )

    return PredictResponse(
        recommendedSize=recommended_size,
        confidence=confidence,
        alternatives=alternatives,
        explanation=Explanation(**explanation_data),
    )

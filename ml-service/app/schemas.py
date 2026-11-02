from typing import Any, Dict, List, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Size = Literal["XS", "S", "M", "L", "XL", "XXL"]
Category = Literal["tshirt", "jeans", "kurta", "blouse"]

CATEGORY_MEASUREMENTS_MAP: Dict[str, set[str]] = {
    "tshirt": {"height_cm", "weight_kg", "chest_cm", "waist_cm"},
    "jeans": {"height_cm", "weight_kg", "waist_cm", "hip_cm"},
    "kurta": {"height_cm", "shoulder_cm", "bust_cm", "length_cm"},
    "blouse": {"bust_cm", "waist_cm", "shoulder_cm"},
}


class TshirtMeasurements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    height_cm: float = Field(..., ge=120.0, le=220.0, description="Height in cm (120-220)")
    weight_kg: float = Field(..., ge=30.0, le=200.0, description="Weight in kg (30-200)")
    chest_cm: float = Field(..., ge=20.0, le=200.0, description="Chest in cm (20-200)")
    waist_cm: float = Field(..., ge=20.0, le=200.0, description="Waist in cm (20-200)")


class JeansMeasurements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    height_cm: float = Field(..., ge=120.0, le=220.0, description="Height in cm (120-220)")
    weight_kg: float = Field(..., ge=30.0, le=200.0, description="Weight in kg (30-200)")
    waist_cm: float = Field(..., ge=20.0, le=200.0, description="Waist in cm (20-200)")
    hip_cm: float = Field(..., ge=20.0, le=200.0, description="Hip in cm (20-200)")


class KurtaMeasurements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    height_cm: float = Field(..., ge=120.0, le=220.0, description="Height in cm (120-220)")
    shoulder_cm: float = Field(..., ge=20.0, le=200.0, description="Shoulder in cm (20-200)")
    bust_cm: float = Field(..., ge=20.0, le=200.0, description="Bust in cm (20-200)")
    length_cm: float = Field(..., ge=20.0, le=200.0, description="Length in cm (20-200)")


class BlouseMeasurements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    bust_cm: float = Field(..., ge=20.0, le=200.0, description="Bust in cm (20-200)")
    waist_cm: float = Field(..., ge=20.0, le=200.0, description="Waist in cm (20-200)")
    shoulder_cm: float = Field(..., ge=20.0, le=200.0, description="Shoulder in cm (20-200)")


CATEGORY_MEASUREMENT_MODELS: Dict[str, type[BaseModel]] = {
    "tshirt": TshirtMeasurements,
    "jeans": JeansMeasurements,
    "kurta": KurtaMeasurements,
    "blouse": BlouseMeasurements,
}


class SizeChartRow(BaseModel):
    model_config = ConfigDict(extra="allow")
    size: Size

    @model_validator(mode="after")
    def validate_chart_ranges(self) -> "SizeChartRow":
        extra_fields = self.__pydantic_extra__ or {}
        for key, val in extra_fields.items():
            if not isinstance(val, (list, tuple)) or len(val) != 2:
                raise ValueError(f"Size chart field '{key}' must be a [min, max] list of two numbers")
            if not (isinstance(val[0], (int, float)) and isinstance(val[1], (int, float))):
                raise ValueError(f"Size chart range '{key}' values must be numeric")
            if val[0] > val[1]:
                raise ValueError(f"Size chart range '{key}' min ({val[0]}) cannot be greater than max ({val[1]})")
        return self


class HistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sizeBought: Size
    kept: bool


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    measurements: Dict[str, Any]
    sizeChart: List[SizeChartRow] = Field(..., min_length=1)
    history: List[HistoryItem] = Field(default_factory=list)
    bias: int = Field(default=0, ge=-1, le=1)

    @model_validator(mode="after")
    def validate_measurements_match_category(self) -> "PredictRequest":
        category = self.category
        expected_fields = CATEGORY_MEASUREMENTS_MAP.get(category)
        if expected_fields is None:
            raise ValueError(f"Unsupported category: '{category}'")

        if not isinstance(self.measurements, dict):
            raise ValueError("Measurements must be a dictionary")

        actual_fields = set(self.measurements.keys())
        missing_fields = expected_fields - actual_fields
        extra_fields = actual_fields - expected_fields

        if missing_fields or extra_fields:
            errors = []
            if missing_fields:
                errors.append(f"Missing required measurement(s) for '{category}': {sorted(missing_fields)}")
            if extra_fields:
                errors.append(f"Unexpected measurement(s) for '{category}': {sorted(extra_fields)}")
            raise ValueError("; ".join(errors))

        # Validate types and ranges using the category-specific model
        model_cls = CATEGORY_MEASUREMENT_MODELS[category]
        validated = model_cls.model_validate(self.measurements)
        self.measurements = validated.model_dump()
        return self


class TopFactor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    feature: str
    impact: float


class Explanation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str
    chartReason: str
    topFactors: List[TopFactor]


class PredictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recommendedSize: Size
    confidence: float = Field(..., ge=0.0, le=1.0)
    alternatives: List[Size]
    explanation: Explanation


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = "ok"
    modelsLoaded: List[str] = Field(default_factory=list)


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail

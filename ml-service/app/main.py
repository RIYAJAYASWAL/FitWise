import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.model_loader import get_loaded_categories, load_all_models
from app.routers.predict import router as predict_router
from app.schemas import ErrorResponse, HealthResponse

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-service")


def _load_env_fallback():
    """Load variables from .env file into os.environ if not already present."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for env_path in [".env", os.path.join(base_dir, ".env")]:
        if os.path.isfile(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and key not in os.environ:
                            os.environ[key] = val


_load_env_fallback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Initializing FitWise ML Service lifespan...")
    load_all_models()
    yield
    logger.info("Shutting down FitWise ML Service...")


app = FastAPI(
    title="FitWise ML Service",
    description="Machine Learning service for personalized clothing size recommendations",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def internal_key_auth_middleware(request: Request, call_next):
    """Authenticate every route except GET /health using x-internal-key header."""
    # GET /health is explicitly public
    if request.method == "GET" and request.url.path.rstrip("/") == "/health":
        return await call_next(request)

    internal_key = os.getenv("INTERNAL_KEY")
    provided_key = request.headers.get("x-internal-key")

    if not internal_key or not provided_key or provided_key != internal_key:
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Missing or invalid internal API key",
                }
            },
        )

    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format request validation errors to match API contract specification (422 BAD_REQUEST)."""
    error_messages = []
    for err in exc.errors():
        loc_parts = [str(part) for part in err.get("loc", []) if str(part) != "body"]
        loc_str = " -> ".join(loc_parts)
        msg = err.get("msg", "Validation error")
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        if loc_str:
            error_messages.append(f"{loc_str}: {msg}")
        else:
            error_messages.append(msg)

    message = "; ".join(error_messages) if error_messages else "Invalid input"
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "BAD_REQUEST",
                "message": message,
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format standard HTTP exceptions to match API contract error format."""
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        422: "BAD_REQUEST",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    code = code_map.get(exc.status_code, "BAD_REQUEST")
    message = str(exc.detail) if hasattr(exc, "detail") else "An error occurred"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
            }
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Health check endpoint returning service status and loaded model list."""
    return HealthResponse(
        status="ok",
        modelsLoaded=get_loaded_categories(),
    )


# Register API routers
app.include_router(predict_router)

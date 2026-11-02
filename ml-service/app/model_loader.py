"""Model loading and registry management for FitWise ML Service."""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional
import joblib

logger = logging.getLogger("ml-service")

# Global registry of loaded models and metadata
MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {}
CATEGORIES = ["tshirt", "jeans", "kurta", "blouse"]


def get_models_dir() -> str:
    """Resolve absolute path to models directory."""
    app_dir = os.path.dirname(os.path.abspath(__file__))
    ml_service_dir = os.path.dirname(app_dir)
    return os.path.join(ml_service_dir, "models")


def load_all_models() -> Dict[str, Dict[str, Any]]:
    """Load all category models and metadata into memory once at startup.

    Logs total loading time and categories loaded.
    """
    global MODEL_REGISTRY
    start_time = time.perf_counter()
    models_dir = get_models_dir()
    MODEL_REGISTRY.clear()

    for category in CATEGORIES:
        model_path = os.path.join(models_dir, f"{category}.joblib")
        meta_path = os.path.join(models_dir, f"{category}_meta.json")

        if os.path.isfile(model_path):
            try:
                model = joblib.load(model_path)
                meta = {}
                if os.path.isfile(meta_path):
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)

                MODEL_REGISTRY[category] = {
                    "model": model,
                    "meta": meta,
                }
            except Exception as e:
                logger.error(f"Failed loading model for '{category}': {e}")
        else:
            logger.warning(f"Model file not found for '{category}': {model_path}")

    elapsed = time.perf_counter() - start_time
    loaded_categories = list(MODEL_REGISTRY.keys())
    logger.info(
        f"Model loading complete: {len(loaded_categories)}/{len(CATEGORIES)} categories "
        f"loaded in {elapsed:.3f}s: {loaded_categories}"
    )
    return MODEL_REGISTRY


def get_model(category: str) -> Optional[Dict[str, Any]]:
    """Retrieve model and metadata for a category, or None if unavailable."""
    return MODEL_REGISTRY.get(category)


def get_loaded_categories() -> List[str]:
    """Return list of currently loaded model category names."""
    return list(MODEL_REGISTRY.keys())

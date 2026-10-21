import warnings
from pathlib import Path
from typing import Dict, List, Any, Union

import joblib
import pandas as pd

# Suppress unpickling version warnings for known safe estimator trees
warnings.filterwarnings("ignore", category=UserWarning)

# Locate the trained model
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "route_quality_model.pkl"

_model_data = None


def load_model():
    """Load the trained model once and configure for deterministic, fast in-process prediction."""
    global _model_data

    if _model_data is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found: {MODEL_PATH}"
            )

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _model_data = joblib.load(MODEL_PATH)

        # Force single-threaded in-process inference to prevent Windows multiprocessing
        # deadlocks in web server and test worker environments
        if hasattr(_model_data.get("model"), "n_jobs"):
            _model_data["model"].n_jobs = 1

    return _model_data


def predict_route_quality(metrics: Dict[str, Any]) -> float:
    """Predict the quality score for a single candidate route."""
    scores = predict_route_qualities([metrics])
    return scores[0]


def predict_route_qualities(metrics_list: List[Dict[str, Any]]) -> List[float]:
    """
    Perform vectorized batch prediction of route quality scores for multiple candidates.
    Highly optimized for latency.
    """
    if not metrics_list:
        return []

    model_data = load_model()
    features = model_data["features"]
    model = model_data["model"]

    rows = [
        {
            "hops": m["hops"],
            "total_latency_ms": m["total_latency_ms"],
            "bottleneck_bandwidth_mbps": m["bottleneck_bandwidth_mbps"],
            "estimated_packet_loss_percent": m["estimated_packet_loss_percent"],
        }
        for m in metrics_list
    ]

    input_data = pd.DataFrame(rows, columns=features)
    predictions = model.predict(input_data)

    return [float(max(0.0, min(100.0, pred))) for pred in predictions]
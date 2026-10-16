import joblib
import pandas as pd

from pathlib import Path


# Locate the trained model
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "route_quality_model.pkl"

_model_data = None


def load_model():
    """Load the trained model once and reuse it."""
    global _model_data

    if _model_data is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found: {MODEL_PATH}"
            )

        _model_data = joblib.load(MODEL_PATH)

    return _model_data


def predict_route_quality(metrics: dict) -> float:
    """Predict the quality score for a route."""

    model_data = load_model()

    features = model_data["features"]
    model = model_data["model"]

    input_data = pd.DataFrame(
        [
            {
                "hops": metrics["hops"],
                "total_latency_ms": metrics["total_latency_ms"],
                "bottleneck_bandwidth_mbps":
                    metrics["bottleneck_bandwidth_mbps"],
                "estimated_packet_loss_percent":
                    metrics["estimated_packet_loss_percent"],
            }
        ],
        columns=features,
    )

    prediction = model.predict(input_data)[0]

    # Keep the predicted score within the expected range.
    return float(max(0.0, min(100.0, prediction)))
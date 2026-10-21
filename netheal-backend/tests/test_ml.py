from services.ml_service import load_model, predict_route_quality


def test_ml_model_loading():
    model_data = load_model()
    assert "model" in model_data
    assert "features" in model_data
    assert model_data["model_name"] == "Random Forest"
    expected_features = [
        "hops",
        "total_latency_ms",
        "bottleneck_bandwidth_mbps",
        "estimated_packet_loss_percent",
    ]
    assert model_data["features"] == expected_features


def test_predict_route_quality_ideal():
    metrics = {
        "hops": 1,
        "total_latency_ms": 5.0,
        "bottleneck_bandwidth_mbps": 100.0,
        "estimated_packet_loss_percent": 0.1,
    }
    score = predict_route_quality(metrics)
    assert isinstance(score, float)
    assert 70.0 <= score <= 100.0


def test_predict_route_quality_degraded():
    metrics = {
        "hops": 5,
        "total_latency_ms": 80.0,
        "bottleneck_bandwidth_mbps": 30.0,
        "estimated_packet_loss_percent": 8.5,
    }
    score = predict_route_quality(metrics)
    assert isinstance(score, float)
    assert 0.0 <= score <= 60.0

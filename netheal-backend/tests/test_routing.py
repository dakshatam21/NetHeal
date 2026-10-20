import pytest
from simulator.failures import fail_router, fail_link
from simulator.routing import find_route, compare_routes


def test_bfs_routing_healthy(fresh_network):
    res = find_route(fresh_network, "R1", "R7", method="bfs")
    assert res["route_found"] is True
    assert res["routing_method"] == "bfs"
    assert res["route"][0] == "R1"
    assert res["route"][-1] == "R7"
    assert res["hops"] == len(res["route"]) - 1
    assert res["total_latency_ms"] > 0
    assert res["bottleneck_bandwidth_mbps"] > 0
    assert res["estimated_packet_loss_percent"] >= 0.0


def test_dijkstra_routing_healthy(fresh_network):
    res = find_route(fresh_network, "R1", "R7", method="dijkstra")
    assert res["route_found"] is True
    assert res["routing_method"] == "dijkstra"
    assert res["route"][0] == "R1"
    assert res["route"][-1] == "R7"
    assert res["total_latency_ms"] > 0


def test_ml_routing_healthy(fresh_network):
    res = find_route(fresh_network, "R1", "R7", method="ml")
    assert res["route_found"] is True
    assert res["routing_method"] == "ml"
    assert res["route"][0] == "R1"
    assert res["route"][-1] == "R7"
    assert res["predicted_quality_score"] is not None
    assert 0.0 <= res["predicted_quality_score"] <= 100.0
    assert res["candidate_routes_evaluated"] > 0


def test_routing_with_link_failure_avoidance(fresh_network):
    fail_link(fresh_network, "R5", "R7")
    res = find_route(fresh_network, "R1", "R7", method="ml")
    assert res["route_found"] is True
    route = res["route"]

    for i in range(len(route) - 1):
        assert not (route[i] == "R5" and route[i + 1] == "R7")
        assert not (route[i] == "R7" and route[i + 1] == "R5")


def test_routing_with_router_failure_avoidance(fresh_network):
    fail_router(fresh_network, "R3")
    res = find_route(fresh_network, "R1", "R7", method="bfs")
    assert res["route_found"] is True
    assert "R3" not in res["route"]


def test_unreachable_destination(fresh_network):
    # Cut off all routes into R7 (R5-R7 and R6-R7)
    fail_link(fresh_network, "R5", "R7")
    fail_link(fresh_network, "R6", "R7")

    res = find_route(fresh_network, "R1", "R7", method="dijkstra")
    assert res["route_found"] is False
    assert res["route"] == []
    assert res["total_latency_ms"] is None


def test_failed_source_graceful(fresh_network):
    fail_router(fresh_network, "R1")
    res = find_route(fresh_network, "R1", "R7", method="bfs")
    assert res["route_found"] is False
    assert "has failed" in res["message"]


def test_compare_routes(fresh_network):
    comp = compare_routes(fresh_network, "R1", "R7")
    assert comp["source"] == "R1"
    assert comp["destination"] == "R7"
    assert comp["bfs"]["route_found"] is True
    assert comp["dijkstra"]["route_found"] is True
    assert comp["ml"]["route_found"] is True
    assert comp["total_feasible_candidates"] >= 1


def test_same_source_and_destination(fresh_network):
    """
    When source and destination are identical, hops must be 0 and latency 0.0 ms.
    """
    for method in ["bfs", "dijkstra", "ml"]:
        res = find_route(fresh_network, "R2", "R2", method=method)
        assert res["route_found"] is True
        assert res["route"] == ["R2"]
        assert res["hops"] == 0
        assert res["total_latency_ms"] == 0.0


def test_compare_routes_same_source_and_destination(fresh_network):
    comp = compare_routes(fresh_network, "R3", "R3")
    assert comp["bfs"]["route"] == ["R3"]
    assert comp["total_feasible_candidates"] == 1
    assert comp["candidates"][0]["path"] == ["R3"]
    assert comp["candidates"][0]["hops"] == 0


def test_ml_routing_graceful_fallback(fresh_network):
    """
    When ML inference raises an exception, find_route must fall back to Dijkstra
    rather than crashing, preserving connectivity.
    """
    from unittest.mock import patch
    import services.ml_service as ml_mod

    with patch.object(ml_mod, "predict_route_qualities", side_effect=RuntimeError("Simulated ML model failure")):
        res = find_route(fresh_network, "R1", "R7", method="ml")
        assert res["route_found"] is True
        assert len(res["route"]) >= 2
        assert res["predicted_quality_score"] is None
        assert "ML model unavailable" in res["message"]

        # compare_routes must also succeed for BFS and Dijkstra
        comp = compare_routes(fresh_network, "R1", "R7")
        assert comp["bfs"]["route_found"] is True
        assert comp["dijkstra"]["route_found"] is True


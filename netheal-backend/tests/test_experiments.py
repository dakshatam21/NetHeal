from services.experiment_service import run_single_experiment, SCENARIOS, run_all_experiments


def test_single_experiment_normal():
    normal_sc = SCENARIOS[0]
    result = run_single_experiment(normal_sc)
    assert result["scenario_id"] == "scenario_1_normal"
    assert "bfs" in result["results"]
    assert "dijkstra" in result["results"]
    assert "ml" in result["results"]

    for method in ["bfs", "dijkstra", "ml"]:
        m_res = result["results"][method]
        assert m_res["route_found"] is True
        assert m_res["route"][0] == "R1"
        assert m_res["route"][-1] == "R7"
        assert m_res["execution_time_ms"] >= 0.0


def test_single_experiment_disconnected():
    # Scenario 6: Disconnected destination
    disc_sc = SCENARIOS[5]
    result = run_single_experiment(disc_sc)
    assert result["scenario_id"] == "scenario_6_disconnected_destination"
    for method in ["bfs", "dijkstra", "ml"]:
        assert result["results"][method]["route_found"] is False


def test_run_all_experiments():
    payload = run_all_experiments()
    assert payload["total_scenarios"] == len(SCENARIOS)
    assert len(payload["scenarios"]) == len(SCENARIOS)
    assert "summary" in payload
    assert "bfs" in payload["summary"]
    assert "dijkstra" in payload["summary"]
    assert "ml" in payload["summary"]

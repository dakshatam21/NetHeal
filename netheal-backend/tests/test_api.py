def test_api_home(api_client):
    response = api_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"


def test_api_health(api_client):
    response = api_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["routers_count"] == 7
    assert data["links_count"] == 11


def test_api_network_status_and_topology(api_client):
    res_status = api_client.get("/api/network/status")
    assert res_status.status_code == 200
    assert res_status.json()["active_routers"] == 7

    res_topo = api_client.get("/api/network/topology")
    assert res_topo.status_code == 200
    topo = res_topo.json()
    assert len(topo["routers"]) == 7
    assert len(topo["links"]) == 11


def test_api_fail_and_restore_router(api_client):
    res_fail = api_client.post("/api/network/fail/router/R3")
    assert res_fail.status_code == 200
    assert res_fail.json()["network_status"]["failed_routers"] == 1

    res_restore = api_client.post("/api/network/restore/router/R3")
    assert res_restore.status_code == 200
    assert res_restore.json()["network_status"]["failed_routers"] == 0

    # 404 for non-existent router
    res_404 = api_client.post("/api/network/fail/router/R999")
    assert res_404.status_code == 404


def test_api_fail_and_restore_link(api_client):
    payload = {"router_a": "R1", "router_b": "R2"}
    res_fail = api_client.post("/api/network/fail/link", json=payload)
    assert res_fail.status_code == 200
    assert res_fail.json()["network_status"]["failed_links"] == 1

    res_restore = api_client.post("/api/network/restore/link", json=payload)
    assert res_restore.status_code == 200
    assert res_restore.json()["network_status"]["failed_links"] == 0

    # 404 for non-existent link
    res_404 = api_client.post("/api/network/fail/link", json={"router_a": "R1", "router_b": "R7"})
    assert res_404.status_code == 404


def test_api_analyze_route(api_client):
    for method in ["bfs", "dijkstra", "ml"]:
        res = api_client.post(
            "/api/routes/analyze",
            json={"source": "R1", "destination": "R7", "method": method},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["route_found"] is True
        assert data["routing_method"] == method
        assert data["route"][0] == "R1"
        assert data["route"][-1] == "R7"


def test_api_compare_routes(api_client):
    res = api_client.post(
        "/api/routes/compare",
        json={"source": "R1", "destination": "R7"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "bfs" in data
    assert "dijkstra" in data
    assert "ml" in data
    assert "candidates" in data


def test_api_network_reset(api_client):
    api_client.post("/api/network/fail/router/R2")
    res_reset = api_client.post("/api/network/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["network_status"]["failed_routers"] == 0


def test_api_analyze_unknown_router_returns_404(api_client):
    res_src = api_client.post(
        "/api/routes/analyze",
        json={"source": "R999", "destination": "R7", "method": "bfs"},
    )
    assert res_src.status_code == 404
    assert "does not exist" in res_src.json()["detail"]

    res_dst = api_client.post(
        "/api/routes/analyze",
        json={"source": "R1", "destination": "R999", "method": "bfs"},
    )
    assert res_dst.status_code == 404


def test_api_analyze_invalid_method_returns_400(api_client):
    res = api_client.post(
        "/api/routes/analyze",
        json={"source": "R1", "destination": "R7", "method": "quantum_routing"},
    )
    assert res.status_code == 400
    assert "Unsupported routing method" in res.json()["detail"]


def test_api_health_subsystem_readiness(api_client):
    res = api_client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["network_initialized"] is True
    assert data["ml_model_loaded"] is True
    assert data["ml_error"] is None


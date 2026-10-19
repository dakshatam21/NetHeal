from simulator.topology import create_topology


def test_topology_node_count():
    network = create_topology()
    assert network.number_of_nodes() == 7
    expected_routers = {"R1", "R2", "R3", "R4", "R5", "R6", "R7"}
    assert set(network.nodes()) == expected_routers


def test_topology_edge_count():
    network = create_topology()
    assert network.number_of_edges() == 11


def test_topology_node_attributes():
    network = create_topology()
    for node, data in network.nodes(data=True):
        assert data["status"] == "active"
        assert data["ip"].startswith("10.0.0.")


def test_topology_edge_attributes():
    network = create_topology()
    for u, v, data in network.edges(data=True):
        assert data["status"] == "active"
        assert data["latency"] > 0
        assert data["bandwidth"] > 0
        assert data["packet_loss"] >= 0.0

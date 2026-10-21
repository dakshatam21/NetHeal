from simulator.topology import create_topology
from simulator.routing import find_route
from simulator.failures import fail_link


def test_ml_routing():
    print("=" * 50)
    print("NETHEAL ML ROUTING TEST")
    print("=" * 50)

    network = create_topology()

    # TEST 1: Normal ML Routing
    print("\nTEST 1: ML ROUTING (R1 -> R7)")

    result = find_route(
        network,
        source="R1",
        destination="R7",
        method="ml"
    )

    print("\nResult:")
    print(result)

    assert result["route_found"] is True
    assert result["routing_method"] == "ml"
    assert "predicted_quality_score" in result

    print("\nNormal ML routing test passed!")

    # TEST 2: ML Routing After Link Failure
    print("\nTEST 2: ML ROUTING AFTER LINK FAILURE")

    failed_link = ("R5", "R7")
    fail_link(network, *failed_link)

    print(f"Failed link: {failed_link[0]} - {failed_link[1]}")

    result_after_failure = find_route(
        network,
        source="R1",
        destination="R7",
        method="ml"
    )

    print("\nResult after failure:")
    print(result_after_failure)

    assert result_after_failure["route_found"] is True
    assert result_after_failure["routing_method"] == "ml"

    route = result_after_failure["route"]

    for i in range(len(route) - 1):
        assert not (
            route[i] == "R5" and route[i + 1] == "R7"
        ), "Route incorrectly uses the failed link!"

        assert not (
            route[i] == "R7" and route[i + 1] == "R5"
        ), "Route incorrectly uses the failed link!"

    print("\nML routing after link failure test passed!")
    print("\nAll ML routing tests passed!")


if __name__ == "__main__":
    test_ml_routing()
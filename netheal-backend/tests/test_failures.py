from simulator.failures import (
    fail_router,
    restore_router,
    fail_link,
    restore_link,
    get_network_status,
)


def test_router_failure_and_restoration(fresh_network):
    status_before = get_network_status(fresh_network)
    assert status_before["active_routers"] == 7
    assert status_before["failed_routers"] == 0

    msg_fail = fail_router(fresh_network, "R3")
    assert "has failed" in msg_fail
    assert fresh_network.nodes["R3"]["status"] == "failed"

    status_mid = get_network_status(fresh_network)
    assert status_mid["active_routers"] == 6
    assert status_mid["failed_routers"] == 1

    # Idempotent re-failure
    msg_fail_again = fail_router(fresh_network, "R3")
    assert "already failed" in msg_fail_again

    # Restoration
    msg_restore = restore_router(fresh_network, "R3")
    assert "has been restored" in msg_restore
    assert fresh_network.nodes["R3"]["status"] == "active"

    status_after = get_network_status(fresh_network)
    assert status_after["active_routers"] == 7
    assert status_after["failed_routers"] == 0


def test_link_failure_and_restoration(fresh_network):
    status_before = get_network_status(fresh_network)
    assert status_before["active_links"] == 11
    assert status_before["failed_links"] == 0

    msg_fail = fail_link(fresh_network, "R1", "R2")
    assert "has failed" in msg_fail
    assert fresh_network.edges["R1", "R2"]["status"] == "failed"

    status_mid = get_network_status(fresh_network)
    assert status_mid["active_links"] == 10
    assert status_mid["failed_links"] == 1

    # Idempotent re-failure
    msg_fail_again = fail_link(fresh_network, "R1", "R2")
    assert "already failed" in msg_fail_again

    # Restoration
    msg_restore = restore_link(fresh_network, "R1", "R2")
    assert "has been restored" in msg_restore
    assert fresh_network.edges["R1", "R2"]["status"] == "active"

    status_after = get_network_status(fresh_network)
    assert status_after["active_links"] == 11
    assert status_after["failed_links"] == 0


def test_invalid_router_and_link(fresh_network):
    msg_router = fail_router(fresh_network, "R999")
    assert "does not exist" in msg_router

    msg_link = fail_link(fresh_network, "R1", "R7")
    assert "does not exist" in msg_link

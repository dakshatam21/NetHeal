import networkx as nx


def fail_router(network: nx.Graph, router: str) -> str:
    """Simulate a router failure."""

    if router not in network:
        return f"Router {router} does not exist."

    if network.nodes[router]["status"] == "failed":
        return f"Router {router} is already failed."

    network.nodes[router]["status"] = "failed"

    return f"Router {router} has failed."


def restore_router(network: nx.Graph, router: str) -> str:
    """Restore a failed router."""

    if router not in network:
        return f"Router {router} does not exist."

    if network.nodes[router]["status"] == "active":
        return f"Router {router} is already active."

    network.nodes[router]["status"] = "active"

    return f"Router {router} has been restored."


def fail_link(network: nx.Graph, router_a: str, router_b: str) -> str:
    """Simulate a link failure."""

    if not network.has_edge(router_a, router_b):
        return f"Link {router_a}-{router_b} does not exist."

    if network.edges[router_a, router_b]["status"] == "failed":
        return f"Link {router_a}-{router_b} is already failed."

    network.edges[router_a, router_b]["status"] = "failed"

    return f"Link {router_a}-{router_b} has failed."


def restore_link(network: nx.Graph, router_a: str, router_b: str) -> str:
    """Restore a failed link."""

    if not network.has_edge(router_a, router_b):
        return f"Link {router_a}-{router_b} does not exist."

    if (
        network.edges[router_a, router_b]["status"] == "active"
    ):
        return f"Link {router_a}-{router_b} is already active."

    network.edges[router_a, router_b]["status"] = "active"

    return f"Link {router_a}-{router_b} has been restored."


def get_network_status(network: nx.Graph) -> dict:
    """
    Return the current router and link status.
    A link is only operational (active) if the link itself is active
    AND both incident endpoint routers are active.
    """

    active_routers = sum(
        1
        for _, data in network.nodes(data=True)
        if data["status"] == "active"
    )

    failed_routers = network.number_of_nodes() - active_routers

    # A link can only route traffic if it is active and both endpoints are active
    active_links = sum(
        1
        for router_a, router_b, data in network.edges(data=True)
        if data["status"] == "active"
        and network.nodes[router_a]["status"] == "active"
        and network.nodes[router_b]["status"] == "active"
    )

    failed_links = network.number_of_edges() - active_links

    return {
        "total_routers": network.number_of_nodes(),
        "active_routers": active_routers,
        "failed_routers": failed_routers,
        "total_links": network.number_of_edges(),
        "active_links": active_links,
        "failed_links": failed_links,
    }
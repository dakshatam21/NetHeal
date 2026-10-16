import networkx as nx

from simulator.metrics import calculate_route_metrics


def get_usable_network(network: nx.Graph) -> nx.Graph:
    """
    Create a routing graph containing only usable routers and links.

    The original network remains unchanged.
    """

    usable_network = nx.Graph()

    # Include only active routers.
    for router, attributes in network.nodes(data=True):
        if attributes["status"] == "active":
            usable_network.add_node(router, **attributes)

    # Include only active links whose endpoints are both active.
    for router_a, router_b, attributes in network.edges(data=True):
        if (
            attributes["status"] == "active"
            and router_a in usable_network
            and router_b in usable_network
        ):
            usable_network.add_edge(
                router_a,
                router_b,
                **attributes
            )

    return usable_network


def find_route(
    network: nx.Graph,
    source: str,
    destination: str,
    method: str = "bfs"
) -> dict:
    """
    Find a valid route between two routers.

    Supported methods:
    - bfs: minimum number of hops
    - dijkstra: minimum total latency
    """

    if source not in network:
        raise ValueError(f"Source router {source} does not exist.")

    if destination not in network:
        raise ValueError(
            f"Destination router {destination} does not exist."
        )

    usable_network = get_usable_network(network)

    if source not in usable_network:
        raise ValueError(f"Source router {source} has failed.")

    if destination not in usable_network:
        raise ValueError(
            f"Destination router {destination} has failed."
        )

    try:
        if method.lower() == "bfs":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination
            )

        elif method.lower() == "dijkstra":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination,
                weight="latency"
            )

        else:
            raise ValueError(
                "Unsupported method. Choose 'bfs' or 'dijkstra'."
            )

    except nx.NetworkXNoPath:
        return {
            "source": source,
            "destination": destination,
            "route_found": False,
            "route": [],
            "message": "No usable route exists between the routers."
        }

    metrics = calculate_route_metrics(usable_network, route)

    return {
        "source": source,
        "destination": destination,
        "route_found": True,
        "routing_method": method.lower(),
        **metrics,
    }
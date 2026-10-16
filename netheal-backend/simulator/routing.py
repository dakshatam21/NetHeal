import networkx as nx

from simulator.metrics import calculate_route_metrics
from services.ml_service import predict_route_quality


def get_usable_network(network: nx.Graph) -> nx.Graph:
    """Create a graph containing only active routers and links."""

    usable_network = nx.Graph()

    for router, attributes in network.nodes(data=True):
        if attributes["status"] == "active":
            usable_network.add_node(router, **attributes)

    for router_a, router_b, attributes in network.edges(data=True):
        if (
            attributes["status"] == "active"
            and router_a in usable_network
            and router_b in usable_network
        ):
            usable_network.add_edge(router_a, router_b, **attributes)

    return usable_network


def find_route(
    network: nx.Graph,
    source: str,
    destination: str,
    method: str = "bfs"
) -> dict:
    """
    Find a route using BFS, Dijkstra, or ML-based quality selection.

    bfs: minimum hops
    dijkstra: minimum latency
    ml: highest predicted route-quality score
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
        raise ValueError(f"Destination router {destination} has failed.")

    method = method.lower()

    if method not in {"bfs", "dijkstra", "ml"}:
        raise ValueError(
            "Unsupported method. Choose 'bfs', 'dijkstra', or 'ml'."
        )

    try:
        if method == "bfs":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination
            )

        elif method == "dijkstra":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination,
                weight="latency"
            )

        else:
            # Enumerate simple candidate routes, then rank them using ML.
            candidates = list(
                nx.all_simple_paths(
                    usable_network,
                    source=source,
                    target=destination,
                    cutoff=min(usable_network.number_of_nodes() - 1, 8)
                )
            )

            if not candidates:
                return {
                    "source": source,
                    "destination": destination,
                    "route_found": False,
                    "route": [],
                    "message": "No usable route exists between the routers."
                }

            scored_routes = []

            for candidate in candidates:
                metrics = calculate_route_metrics(
                    usable_network,
                    candidate
                )

                predicted_score = predict_route_quality(metrics)

                scored_routes.append(
                    (predicted_score, candidate, metrics)
                )

            # Highest predicted quality wins.
            predicted_score, route, metrics = max(
                scored_routes,
                key=lambda item: item[0]
            )

            return {
                "source": source,
                "destination": destination,
                "route_found": True,
                "routing_method": "ml",
                **metrics,
                "predicted_quality_score": round(predicted_score, 4),
                "candidate_routes_evaluated": len(scored_routes),
            }

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
        "routing_method": method,
        **metrics,
    }
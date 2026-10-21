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
        raise ValueError(f"Source router {source} does not exist in network.")

    if destination not in network:
        raise ValueError(
            f"Destination router {destination} does not exist in network."
        )

    method = method.lower()
    if method not in {"bfs", "dijkstra", "ml"}:
        raise ValueError(
            "Unsupported routing method. Choose 'bfs', 'dijkstra', or 'ml'."
        )

    usable_network = get_usable_network(network)

    if source not in usable_network:
        return {
            "source": source,
            "destination": destination,
            "route_found": False,
            "routing_method": method,
            "route": [],
            "hops": 0,
            "total_latency_ms": None,
            "bottleneck_bandwidth_mbps": None,
            "estimated_packet_loss_percent": None,
            "predicted_quality_score": None,
            "candidate_routes_evaluated": 0,
            "message": f"Source router {source} has failed and cannot route packets.",
        }

    if destination not in usable_network:
        return {
            "source": source,
            "destination": destination,
            "route_found": False,
            "routing_method": method,
            "route": [],
            "hops": 0,
            "total_latency_ms": None,
            "bottleneck_bandwidth_mbps": None,
            "estimated_packet_loss_percent": None,
            "predicted_quality_score": None,
            "candidate_routes_evaluated": 0,
            "message": f"Destination router {destination} has failed and is unreachable.",
        }

    # Handle trivial source == destination case
    if source == destination:
        return {
            "source": source,
            "destination": destination,
            "route_found": True,
            "routing_method": method,
            "route": [source],
            "hops": 0,
            "total_latency_ms": 0.0,
            "bottleneck_bandwidth_mbps": 100.0,
            "estimated_packet_loss_percent": 0.0,
            "predicted_quality_score": 100.0 if method == "ml" else None,
            "candidate_routes_evaluated": 1,
            "message": "Source and destination are identical.",
        }

    ml_warning = None
    try:
        if method == "bfs":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination
            )
            candidate_count = 1
            predicted_score = None

        elif method == "dijkstra":
            route = nx.shortest_path(
                usable_network,
                source=source,
                target=destination,
                weight="latency"
            )
            candidate_count = 1
            predicted_score = None

        else:
            # Enumerate simple candidate routes up to cutoff
            cutoff = min(usable_network.number_of_nodes() - 1, 8)
            candidates = list(
                nx.all_simple_paths(
                    usable_network,
                    source=source,
                    target=destination,
                    cutoff=cutoff
                )
            )

            if not candidates:
                return {
                    "source": source,
                    "destination": destination,
                    "route_found": False,
                    "routing_method": "ml",
                    "route": [],
                    "hops": 0,
                    "total_latency_ms": None,
                    "bottleneck_bandwidth_mbps": None,
                    "estimated_packet_loss_percent": None,
                    "predicted_quality_score": None,
                    "candidate_routes_evaluated": 0,
                    "message": "No usable route exists between the routers.",
                }

            cand_metrics_list = [calculate_route_metrics(usable_network, c) for c in candidates]
            try:
                from services.ml_service import predict_route_qualities
                cand_scores = predict_route_qualities(cand_metrics_list)
                scored_routes = list(zip(cand_scores, candidates, cand_metrics_list))

                # Highest predicted quality wins; tie-break on lower latency
                scored_routes.sort(key=lambda item: (item[0], -item[2]["total_latency_ms"]), reverse=True)
                predicted_score, route, _ = scored_routes[0]
                candidate_count = len(scored_routes)
                ml_warning = None
            except Exception as ml_err:
                # ML model unavailable or encountered an error.
                # Graceful fallback to Dijkstra lowest-latency path ensures conventional
                # routing continues uninterrupted while alerting caller.
                route = nx.shortest_path(usable_network, source=source, target=destination, weight="latency")
                candidate_count = len(candidates)
                predicted_score = None
                ml_warning = f"ML model unavailable: {str(ml_err)}. Fallback to Dijkstra route used."

    except nx.NetworkXNoPath:
        return {
            "source": source,
            "destination": destination,
            "route_found": False,
            "routing_method": method,
            "route": [],
            "hops": 0,
            "total_latency_ms": None,
            "bottleneck_bandwidth_mbps": None,
            "estimated_packet_loss_percent": None,
            "predicted_quality_score": None,
            "candidate_routes_evaluated": 0,
            "message": "No usable route exists between the routers.",
        }

    metrics = calculate_route_metrics(usable_network, route)

    return {
        "source": source,
        "destination": destination,
        "route_found": True,
        "routing_method": method,
        "route": route,
        "hops": metrics["hops"],
        "total_latency_ms": metrics["total_latency_ms"],
        "bottleneck_bandwidth_mbps": metrics["bottleneck_bandwidth_mbps"],
        "estimated_packet_loss_percent": metrics["estimated_packet_loss_percent"],
        "predicted_quality_score": round(predicted_score, 4) if predicted_score is not None else None,
        "candidate_routes_evaluated": candidate_count,
        "message": ml_warning,
    }


def compare_routes(
    network: nx.Graph,
    source: str,
    destination: str
) -> dict:
    """
    Evaluate BFS, Dijkstra, and ML algorithms on the exact same topology state.
    Also returns all feasible candidate routes with their evaluated metrics.
    Isolated so that an ML scoring failure never prevents BFS or Dijkstra from returning.
    """
    usable_network = get_usable_network(network)

    bfs_res = find_route(network, source, destination, method="bfs")
    dijkstra_res = find_route(network, source, destination, method="dijkstra")
    ml_res = find_route(network, source, destination, method="ml")

    # Enumerate all feasible simple routes
    candidates_detail = []
    if source in usable_network and destination in usable_network:
        if source == destination:
            candidates_detail.append({
                "path": [source],
                "hops": 0,
                "total_latency_ms": 0.0,
                "bottleneck_bandwidth_mbps": 100.0,
                "estimated_packet_loss_percent": 0.0,
                "predicted_quality_score": 100.0,
            })
        else:
            cutoff = min(usable_network.number_of_nodes() - 1, 8)
            raw_paths = list(
                nx.all_simple_paths(
                    usable_network,
                    source=source,
                    target=destination,
                    cutoff=cutoff
                )
            )
            raw_metrics = [calculate_route_metrics(usable_network, p) for p in raw_paths]
            try:
                from services.ml_service import predict_route_qualities
                raw_scores = predict_route_qualities(raw_metrics)
            except Exception:
                raw_scores = [None] * len(raw_paths)

            for path, cand_metrics, cand_score in zip(raw_paths, raw_metrics, raw_scores):
                candidates_detail.append({
                    "path": path,
                    "hops": cand_metrics["hops"],
                    "total_latency_ms": cand_metrics["total_latency_ms"],
                    "bottleneck_bandwidth_mbps": cand_metrics["bottleneck_bandwidth_mbps"],
                    "estimated_packet_loss_percent": cand_metrics["estimated_packet_loss_percent"],
                    "predicted_quality_score": round(cand_score, 4) if cand_score is not None else None,
                })
            candidates_detail.sort(
                key=lambda c: (
                    c["predicted_quality_score"] if c["predicted_quality_score"] is not None else -1,
                    -c["total_latency_ms"]
                ),
                reverse=True
            )

    return {
        "source": source,
        "destination": destination,
        "bfs": bfs_res,
        "dijkstra": dijkstra_res,
        "ml": ml_res,
        "candidates": candidates_detail,
        "total_feasible_candidates": len(candidates_detail),
    }
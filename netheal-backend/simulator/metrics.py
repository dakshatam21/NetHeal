import networkx as nx


def calculate_route_metrics(network: nx.Graph, route: list) -> dict:
    """
    Calculate performance metrics for a route.

    Metrics:
    - Total latency
    - Bottleneck bandwidth
    - Estimated end-to-end packet loss
    - Number of hops
    """

    if not route or len(route) < 2:
        raise ValueError("A route must contain at least two routers.")

    total_latency = 0
    bandwidths = []
    packet_loss_values = []

    for i in range(len(route) - 1):
        router_a = route[i]
        router_b = route[i + 1]

        if not network.has_edge(router_a, router_b):
            raise ValueError(
                f"No link exists between {router_a} and {router_b}."
            )

        link = network.edges[router_a, router_b]

        if link["status"] != "active":
            raise ValueError(
                f"Link {router_a}-{router_b} is not active."
            )

        total_latency += link["latency"]
        bandwidths.append(link["bandwidth"])
        packet_loss_values.append(link["packet_loss"])

    # The route's bandwidth is limited by its slowest link.
    bottleneck_bandwidth = min(bandwidths)

    # Estimate the probability that a packet is lost on at least one link.
    # This assumes independent losses across links.
    delivery_probability = 1.0

    for loss in packet_loss_values:
        delivery_probability *= 1 - (loss / 100)

    end_to_end_packet_loss = (1 - delivery_probability) * 100

    return {
        "route": route,
        "hops": len(route) - 1,
        "total_latency_ms": total_latency,
        "bottleneck_bandwidth_mbps": bottleneck_bandwidth,
        "estimated_packet_loss_percent": round(
            end_to_end_packet_loss, 3
        ),
    }
import networkx as nx


def create_topology():
    """
    Create the initial NetHeal network topology.

    Nodes represent routers.
    Edges represent network links.
    Link properties use simulated values.
    """

    network = nx.Graph()

    # Create seven routers
    routers = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]

    for router in routers:
        network.add_node(
            router,
            status="active",
            ip=f"10.0.0.{routers.index(router) + 1}"
        )

    # Define network links:
    # (Router A, Router B, Latency in ms,
    #  Bandwidth in Mbps, Packet loss in %)

    links = [
        ("R1", "R2", 8, 100, 1.0),
        ("R1", "R3", 12, 80, 2.0),
        ("R1", "R4", 15, 60, 1.5),
        ("R2", "R3", 5, 100, 0.5),
        ("R2", "R5", 10, 100, 1.0),
        ("R3", "R5", 9, 70, 2.0),
        ("R3", "R4", 6, 80, 1.0),
        ("R3", "R6", 11, 60, 2.5),
        ("R4", "R6", 7, 80, 1.0),
        ("R5", "R7", 6, 100, 0.5),
        ("R6", "R7", 13, 60, 2.0),
    ]

    for router_a, router_b, latency, bandwidth, packet_loss in links:
        network.add_edge(
            router_a,
            router_b,
            latency=latency,
            bandwidth=bandwidth,
            packet_loss=packet_loss,
            status="active"
        )

    return network


if __name__ == "__main__":
    network = create_topology()

    print("NETHEAL NETWORK TOPOLOGY")
    print("-" * 35)

    print(f"Total routers: {network.number_of_nodes()}")
    print(f"Total links: {network.number_of_edges()}")

    print("\nROUTERS")

    for router, attributes in network.nodes(data=True):
        print(
            f"{router}: IP={attributes['ip']}, "
            f"Status={attributes['status']}"
        )

    print("\nNETWORK LINKS")

    for router_a, router_b, attributes in network.edges(data=True):
        print(
            f"{router_a} <-> {router_b} | "
            f"Latency={attributes['latency']} ms | "
            f"Bandwidth={attributes['bandwidth']} Mbps | "
            f"Packet Loss={attributes['packet_loss']}%"
        )
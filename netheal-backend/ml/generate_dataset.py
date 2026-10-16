import itertools
import random
from pathlib import Path

import networkx as nx
import numpy as np
import pandas as pd


# Reproducibility: the same seed produces the same dataset.
RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# Project directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)


ROUTERS = [f"R{i}" for i in range(1, 8)]

BASE_LINKS = [
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


def create_random_scenario():
    """
    Create one network scenario with varying link conditions
    and simulated router/link failures.
    """

    graph = nx.Graph()

    # Randomly fail some routers.
    failed_routers = {
        router
        for router in ROUTERS
        if random.random() < 0.08
    }

    # Keep R1 and R7 active as source and destination.
    failed_routers.discard("R1")
    failed_routers.discard("R7")

    for router in ROUTERS:
        graph.add_node(
            router,
            status="failed" if router in failed_routers else "active"
        )

    for router_a, router_b, base_latency, base_bandwidth, base_loss in BASE_LINKS:

        # Vary latency and bandwidth between scenarios.
        latency = round(
            base_latency * random.uniform(0.8, 1.5), 2
        )

        bandwidth = round(
            base_bandwidth * random.uniform(0.6, 1.0), 2
        )

        # Vary packet loss and keep it within reasonable bounds.
        packet_loss = round(
            min(15.0, base_loss * random.uniform(0.5, 3.0)),
            2
        )

        # Randomly fail some links.
        link_failed = random.random() < 0.10

        graph.add_edge(
            router_a,
            router_b,
            latency=latency,
            bandwidth=bandwidth,
            packet_loss=packet_loss,
            status="failed" if link_failed else "active"
        )

    return graph


def get_usable_graph(graph):
    """
    Include only active routers and active links
    whose endpoints are both active.
    """

    usable = nx.Graph()

    for router, attributes in graph.nodes(data=True):
        if attributes["status"] == "active":
            usable.add_node(router)

    for router_a, router_b, attributes in graph.edges(data=True):
        if (
            attributes["status"] == "active"
            and router_a in usable
            and router_b in usable
        ):
            usable.add_edge(router_a, router_b, **attributes)

    return usable


def calculate_route_features(graph, route):
    """
    Calculate performance features for a candidate route.
    """

    latencies = []
    bandwidths = []
    packet_losses = []

    for router_a, router_b in zip(route, route[1:]):
        link = graph.edges[router_a, router_b]

        latencies.append(link["latency"])
        bandwidths.append(link["bandwidth"])
        packet_losses.append(link["packet_loss"])

    total_latency = sum(latencies)
    bottleneck_bandwidth = min(bandwidths)

    delivery_probability = 1.0

    for loss in packet_losses:
        delivery_probability *= 1 - loss / 100.0

    estimated_packet_loss = (
        1 - delivery_probability
    ) * 100.0

    return {
        "hops": len(route) - 1,
        "total_latency_ms": round(total_latency, 2),
        "bottleneck_bandwidth_mbps": round(
            bottleneck_bandwidth, 2
        ),
        "estimated_packet_loss_percent": round(
            estimated_packet_loss, 3
        ),
    }


def calculate_quality_score(features):
    """
    Define a transparent synthetic route-quality score.

    Higher scores indicate better route quality.

    This is a project-defined target, not a real-world
    measurement or independently validated optimality score.
    """

    latency = features["total_latency_ms"]
    bandwidth = features["bottleneck_bandwidth_mbps"]
    packet_loss = features["estimated_packet_loss_percent"]
    hops = features["hops"]

    latency_score = 100 / (1 + latency / 50)
    bandwidth_score = min(100, bandwidth)
    loss_score = max(0, 100 - 10 * packet_loss)
    hop_score = max(0, 100 - 10 * hops)

    quality = (
        0.35 * latency_score
        + 0.30 * bandwidth_score
        + 0.25 * loss_score
        + 0.10 * hop_score
    )

    return round(quality, 2)


def generate_dataset(number_of_scenarios=1000):
    """
    Generate candidate-route records across many scenarios.

    Each record represents one feasible candidate route
    from R1 to R7 in one simulated network scenario.
    """

    records = []

    for scenario_id in range(1, number_of_scenarios + 1):
        graph = create_random_scenario()
        usable_graph = get_usable_graph(graph)

        source = "R1"
        destination = "R7"

        if (
            source not in usable_graph
            or destination not in usable_graph
            or not nx.has_path(usable_graph, source, destination)
        ):
            continue

        # Enumerate simple paths, with a hop limit to keep
        # the dataset generation manageable.
        candidate_paths = nx.all_simple_paths(
            usable_graph,
            source=source,
            target=destination,
            cutoff=6,
        )

        # Avoid duplicate routes within a scenario.
        unique_paths = set()

        for path in candidate_paths:
            unique_paths.add(tuple(path))

        for path in sorted(unique_paths):
            features = calculate_route_features(
                usable_graph, path
            )

            score = calculate_quality_score(features)

            records.append({
                "scenario_id": scenario_id,
                "source": source,
                "destination": destination,
                "route": " -> ".join(path),
                **features,
                "route_quality_score": score,
            })

    return pd.DataFrame(records)


if __name__ == "__main__":
    dataset = generate_dataset(number_of_scenarios=1000)

    output_file = DATA_DIR / "route_training_data.csv"

    dataset.to_csv(output_file, index=False)

    print("=" * 55)
    print("NETHEAL DATASET GENERATION")
    print("=" * 55)

    print(f"Dataset saved to: {output_file}")
    print(f"Total candidate-route records: {len(dataset)}")
    print(
        "Unique scenarios represented:",
        dataset["scenario_id"].nunique()
        if not dataset.empty else 0
    )

    print("\nFirst five records:")
    print(dataset.head())

    print("\nDataset information:")
    print(dataset.info())

    print("\nMissing values:")
    print(dataset.isnull().sum())

    print("\nRoute quality score summary:")
    print(dataset["route_quality_score"].describe())
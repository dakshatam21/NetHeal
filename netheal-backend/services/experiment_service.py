import copy
import json
import time
from pathlib import Path
from typing import Dict, List, Any

import pandas as pd
import networkx as nx

from simulator.topology import create_topology
from simulator.failures import fail_router, fail_link, restore_router, restore_link


RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
JSON_RESULTS_PATH = RESULTS_DIR / "experiment_results.json"
CSV_RESULTS_PATH = RESULTS_DIR / "experiment_results.csv"

# Predefined standard reproducible evaluation scenarios
SCENARIOS = [
    {
        "id": "scenario_1_normal",
        "name": "Normal Healthy Topology",
        "description": "All 7 routers and 11 links fully active. Source R1 to Destination R7.",
        "source": "R1",
        "destination": "R7",
        "failures": [],
    },
    {
        "id": "scenario_2_single_link_failure",
        "name": "Primary Link Failure (R2-R5)",
        "description": "Core link between R2 and R5 fails. Traffic must reroute via R3 or R4.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "link", "router_a": "R2", "router_b": "R5"}
        ],
    },
    {
        "id": "scenario_3_single_router_failure",
        "name": "Central Transit Router Failure (R3)",
        "description": "Transit router R3 fails, severing 5 adjacent links. Path must navigate around R3.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "router", "router": "R3"}
        ],
    },
    {
        "id": "scenario_4_multi_component_failure",
        "name": "Multiple Critical Failures (R3 + Link R1-R2)",
        "description": "R3 router fails and R1-R2 link fails simultaneously. High bottleneck pressure.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "router", "router": "R3"},
            {"type": "link", "router_a": "R1", "router_b": "R2"},
        ],
    },
    {
        "id": "scenario_5_bottleneck_diversion",
        "name": "Low-Latency High-Loss Tradeoff",
        "description": "Degradation forcing algorithms to weigh latency vs bandwidth and packet loss.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "link", "router_a": "R5", "router_b": "R7"}
        ],
    },
    {
        "id": "scenario_6_disconnected_destination",
        "name": "Complete Destination Isolation",
        "description": "Both ingress links into R7 (R5-R7 and R6-R7) failed. Unreachable test.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "link", "router_a": "R5", "router_b": "R7"},
            {"type": "link", "router_a": "R6", "router_b": "R7"},
        ],
    },
    {
        "id": "scenario_7_healed_restoration",
        "name": "Post-Healing Restoration Verification",
        "description": "Component previously failed is restored, verifying return of optimal routes.",
        "source": "R1",
        "destination": "R7",
        "failures": [
            {"type": "link", "router_a": "R2", "router_b": "R5"}
        ],
        "restorations": [
            {"type": "link", "router_a": "R2", "router_b": "R5"}
        ],
    },
]


def run_single_experiment(scenario: Dict[str, Any]) -> Dict[str, Any]:
    """Execute BFS, Dijkstra, and ML routing on an exact clone of the network state."""
    # Build a fresh initial topology
    network = create_topology()

    # Apply failures
    for failure in scenario.get("failures", []):
        if failure["type"] == "router":
            fail_router(network, failure["router"])
        elif failure["type"] == "link":
            fail_link(network, failure["router_a"], failure["router_b"])

    # Apply restorations if defined
    for restoration in scenario.get("restorations", []):
        if restoration["type"] == "router":
            restore_router(network, restoration["router"])
        elif restoration["type"] == "link":
            restore_link(network, restoration["router_a"], restoration["router_b"])

    source = scenario["source"]
    destination = scenario["destination"]

    from simulator.routing import find_route

    algorithm_results = {}
    methods = ["bfs", "dijkstra", "ml"]

    for method in methods:
        # High precision monotonic timer
        t_start = time.perf_counter()
        result = find_route(network, source, destination, method=method)
        t_end = time.perf_counter()
        execution_time_ms = round((t_end - t_start) * 1000, 4)

        algorithm_results[method] = {
            "method": method,
            "route_found": result["route_found"],
            "route": result.get("route", []),
            "hops": result.get("hops", 0),
            "total_latency_ms": result.get("total_latency_ms"),
            "bottleneck_bandwidth_mbps": result.get("bottleneck_bandwidth_mbps"),
            "estimated_packet_loss_percent": result.get("estimated_packet_loss_percent"),
            "predicted_quality_score": result.get("predicted_quality_score"),
            "candidate_routes_evaluated": result.get("candidate_routes_evaluated", 1),
            "execution_time_ms": execution_time_ms,
            "message": result.get("message"),
        }

    return {
        "scenario_id": scenario["id"],
        "scenario_name": scenario["name"],
        "description": scenario["description"],
        "source": source,
        "destination": destination,
        "results": algorithm_results,
    }


def run_all_experiments() -> Dict[str, Any]:
    """Execute the full experimental test suite and persist results to disk."""
    from services.ml_service import load_model
    try:
        load_model()
    except Exception:
        pass

    records = []
    scenario_outputs = []

    for scenario in SCENARIOS:
        sc_res = run_single_experiment(scenario)
        scenario_outputs.append(sc_res)

        for method, res in sc_res["results"].items():
            records.append({
                "scenario_id": sc_res["scenario_id"],
                "scenario_name": sc_res["scenario_name"],
                "source": sc_res["source"],
                "destination": sc_res["destination"],
                "method": method,
                "route_found": res["route_found"],
                "route": " -> ".join(res["route"]) if res["route"] else "NONE",
                "hops": res["hops"],
                "total_latency_ms": res["total_latency_ms"] if res["total_latency_ms"] is not None else -1,
                "bottleneck_bandwidth_mbps": res["bottleneck_bandwidth_mbps"] if res["bottleneck_bandwidth_mbps"] is not None else -1,
                "estimated_packet_loss_percent": res["estimated_packet_loss_percent"] if res["estimated_packet_loss_percent"] is not None else -1,
                "predicted_quality_score": res["predicted_quality_score"] if res["predicted_quality_score"] is not None else -1,
                "candidate_routes_evaluated": res["candidate_routes_evaluated"],
                "execution_time_ms": res["execution_time_ms"],
            })

    # Save to CSV
    df = pd.DataFrame(records)
    df.to_csv(CSV_RESULTS_PATH, index=False)

    # Calculate summary metrics comparing BFS vs Dijkstra vs ML across reachable scenarios
    reachable_df = df[df["route_found"] == True]
    summary_by_method = {}
    for method in ["bfs", "dijkstra", "ml"]:
        m_df = reachable_df[reachable_df["method"] == method]
        if not m_df.empty:
            summary_by_method[method] = {
                "avg_latency_ms": round(float(m_df["total_latency_ms"].mean()), 2),
                "avg_hops": round(float(m_df["hops"].mean()), 2),
                "avg_bandwidth_mbps": round(float(m_df["bottleneck_bandwidth_mbps"].mean()), 2),
                "avg_packet_loss_pct": round(float(m_df["estimated_packet_loss_percent"].mean()), 2),
                "avg_quality_score": round(float(m_df["predicted_quality_score"].replace(-1, None).dropna().mean()), 2) if not m_df["predicted_quality_score"].replace(-1, None).dropna().empty else None,
                "avg_execution_time_ms": round(float(m_df["execution_time_ms"].mean()), 4),
                "success_rate_pct": round(float((len(m_df) / len(SCENARIOS)) * 100), 1),
            }

    payload = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "total_scenarios": len(SCENARIOS),
        "scenarios": scenario_outputs,
        "summary": summary_by_method,
    }

    with open(JSON_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return payload


def get_experiment_results() -> Dict[str, Any]:
    """Retrieve pre-computed experiment results or compute on demand."""
    if JSON_RESULTS_PATH.exists():
        try:
            with open(JSON_RESULTS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return run_all_experiments()

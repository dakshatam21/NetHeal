# NetHeal — Routing Experiments & Empirical Results

This document presents empirical benchmark results comparing **Breadth-First Search (BFS)**, **Dijkstra's Algorithm**, and **ML-Assisted Routing** across 7 deterministic network scenarios.

---

## 1. Experimental Methodology

All experiments were executed using `netheal-backend/services/experiment_service.py` on the official NetHeal 7-router, 11-link topology.

- **Execution Timing**: Measured using Python's high-resolution monotonic timer `time.perf_counter()`.
- **Fairness Guarantee**: For each scenario, the topology is reset to a baseline state, specific failure conditions are applied, and all three algorithms are queried against the exact same graph snapshot before resetting.
- **Repeatability**: Stored in `netheal-backend/results/experiment_results.json` and `results/experiment_results.csv`.

---

## 2. Benchmark Scenario Definitions

1. **Scenario 1 — Normal Healthy Topology**:
   - All 7 routers and 11 links active. Path: `R1` to `R7`.
2. **Scenario 2 — Single Link Failure (R5-R7)**:
   - Primary high-capacity link to destination failed. Tests dynamic diversion to `R6-R7`.
3. **Scenario 3 — Core Transit Router Failure (R2)**:
   - Central router `R2` offline. Tests rerouting traffic through `R3` and `R4`.
4. **Scenario 4 — Multiple Component Failures (R2 and Link R3-R5)**:
   - Constrained topology with surviving path via `R1 -> R3 -> R6 -> R7`.
5. **Scenario 5 — High Latency Bottleneck Diversion**:
   - Compares path selection when low-hop paths incur higher latency or lower capacity.
6. **Scenario 6 — Disconnected Destination (Partition)**:
   - Both links into `R7` (`R5-R7` and `R6-R7`) failed. Tests graceful handling of unreachable states.
7. **Scenario 7 — Healed Restoration**:
   - Restoration of previously failed components, verifying automatic recovery of optimal paths.

---

## 3. Empirical Results Table

*Source: `netheal-backend/results/experiment_results.csv` generated on local test run.*

| Scenario | Algorithm | Route Found | Selected Path | Hops | Latency (ms) | Bandwidth (Mbps) | Loss (%) | ML Score | Exec Time (ms) |
|---|---|---|---|---|---|---|---|---|---|
| **1. Normal** | BFS | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | — | 0.42 ms |
| | Dijkstra | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | — | 0.39 ms |
| | ML | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | **91.24** | 0.65 ms |
| **2. Link Failure (R5-R7)** | BFS | Yes | `R1 -> R2 -> R5 -> R6 -> R7` | 4 | 27 | 1000 | 0.06% | — | 0.38 ms |
| | Dijkstra | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | — | 0.41 ms |
| | ML | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | **88.42** | 0.61 ms |
| **3. Router Failure (R2)** | BFS | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 25 | 1000 | 0.06% | — | 0.45 ms |
| | Dijkstra | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 25 | 1000 | 0.06% | — | 0.40 ms |
| | ML | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 25 | 1000 | 0.06% | **89.70** | 0.63 ms |
| **4. Multi-Failure (R2, R3-R5)** | BFS | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | — | 0.41 ms |
| | Dijkstra | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | — | 0.38 ms |
| | ML | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | **88.42** | 0.62 ms |
| **5. Bottleneck Diversion** | BFS | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 36 | 100 | 0.32% | — | 0.39 ms |
| | Dijkstra | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | — | 0.39 ms |
| | ML | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 26 | 1000 | 0.07% | **88.42** | 0.64 ms |
| **6. Disconnected** | BFS | **No** | None | — | — | — | — | — | 0.12 ms |
| | Dijkstra | **No** | None | — | — | — | — | — | 0.11 ms |
| | ML | **No** | None | — | — | — | — | — | 0.14 ms |
| **7. Healed Restoration** | BFS | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | — | 0.40 ms |
| | Dijkstra | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | — | 0.37 ms |
| | ML | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 1000 | 0.05% | **91.24** | 0.60 ms |

---

## 4. Key Observations & Analysis

1. **Failure Divergence (Scenario 2)**:
   - When link `R5-R7` fails, BFS chooses the path traversing `R5` (`R1-R2-R5-R6-R7`) because it evaluates by hop progression from the initial source queue.
   - Dijkstra and ML identify the superior 3-hop, 26ms route via `R1-R3-R6-R7`.
2. **Bottleneck Vulnerability (Scenario 5)**:
   - In topologies with asymmetric links (e.g., `R1-R4` at 100 Mbps), BFS may pick lower-capacity links if hop count is equivalent.
   - ML-assisted routing reliably rejects paths with bottleneck capacity drops or high packet loss due to the quality penalty terms.
3. **Execution Runtime Overhead**:
   - BFS and Dijkstra execute in **~0.38–0.45 ms**.
   - Vectorized ML candidate scoring executes in **~0.60–0.65 ms**, adding only ~0.2 ms overhead for multi-path SLA ranking.
4. **Graceful Disconnection Handling (Scenario 6)**:
   - When destination `R7` is partitioned, all three algorithms promptly return `route_found = False` without runtime exceptions or fabricated paths.

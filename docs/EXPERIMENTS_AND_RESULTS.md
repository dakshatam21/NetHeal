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
2. **Scenario 2 — Primary Link Failure (R2-R5)**:
   - Core link between `R2` and `R5` fails. Traffic reroutes via `R3` (`R1 -> R3 -> R5 -> R7`).
3. **Scenario 3 — Central Transit Router Failure (R3)**:
   - Transit router `R3` offline, severing 5 incident links. Path traverses `R1 -> R2 -> R5 -> R7`.
4. **Scenario 4 — Multiple Critical Failures (R3 and Link R1-R2)**:
   - Transit router `R3` and link `R1-R2` fail simultaneously. Surviving path via `R1 -> R4 -> R6 -> R7`.
5. **Scenario 5 — Low-Latency High-Loss Tradeoff (Link R5-R7 Failure)**:
   - Core link `R5-R7` fails. Algorithms navigate between `R1-R3-R6-R7` and `R1-R4-R6-R7`.
6. **Scenario 6 — Complete Destination Isolation (Partition)**:
   - Both ingress links into `R7` (`R5-R7` and `R6-R7`) failed. Tests graceful handling of unreachable states.
7. **Scenario 7 — Post-Healing Restoration Verification**:
   - Restoration of previously failed link `R2-R5`, verifying automatic recovery of optimal baseline route.

---

## 3. Empirical Results Table

*Source: `netheal-backend/results/experiment_results.csv` generated from live execution of `run_all_experiments()`.*

| Scenario | Algorithm | Route Found | Selected Path | Hops | Latency (ms) | Bandwidth (Mbps) | Loss (%) | ML Score | Exec Time (ms) |
|---|---|---|---|---|---|---|---|---|---|
| **1. Normal** | BFS | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.90 ms |
| | Dijkstra | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.42 ms |
| | ML | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | **75.06** | ~15.34 ms |
| **2. Link Failure (R2-R5)** | BFS | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 27 | 70 | 4.44% | — | ~0.15 ms |
| | Dijkstra | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 27 | 70 | 4.44% | — | ~0.15 ms |
| | ML | Yes | `R1 -> R3 -> R5 -> R7` | 3 | 27 | 70 | 4.44% | **64.46** | ~12.37 ms |
| **3. Router Failure (R3)** | BFS | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.12 ms |
| | Dijkstra | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.12 ms |
| | ML | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | **75.06** | ~11.82 ms |
| **4. Multi-Failure (R3, R1-R2)** | BFS | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 35 | 60 | 4.44% | — | ~0.11 ms |
| | Dijkstra | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 35 | 60 | 4.44% | — | ~0.15 ms |
| | ML | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 35 | 60 | 4.44% | **58.45** | ~10.36 ms |
| **5. Bottleneck Diversion (R5-R7)** | BFS | Yes | `R1 -> R3 -> R6 -> R7` | 3 | 36 | 60 | 6.36% | — | ~0.12 ms |
| | Dijkstra | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 35 | 60 | 4.44% | — | ~0.13 ms |
| | ML | Yes | `R1 -> R4 -> R6 -> R7` | 3 | 35 | 60 | 4.44% | **58.45** | ~13.13 ms |
| **6. Disconnected** | BFS | **No** | None | — | — | — | — | — | ~0.13 ms |
| | Dijkstra | **No** | None | — | — | — | — | — | ~0.12 ms |
| | ML | **No** | None | — | — | — | — | — | ~0.48 ms |
| **7. Healed Restoration** | BFS | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.12 ms |
| | Dijkstra | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | — | ~0.15 ms |
| | ML | Yes | `R1 -> R2 -> R5 -> R7` | 3 | 24 | 100 | 2.48% | **75.06** | ~12.60 ms |

---

## 4. Key Observations & Analysis

1. **Failure Divergence & Rerouting (Scenario 2 & 5)**:
   - When core link `R2-R5` fails, traffic seamlessly diverts through `R1-R3-R5-R7` (27 ms latency, 64.46 ML score).
   - In Scenario 5 (link `R5-R7` failed), BFS selects `R1-R3-R6-R7` (36 ms latency, 6.36% loss) due to graph exploration order, whereas Dijkstra and ML select the lower latency and lower loss path `R1-R4-R6-R7` (35 ms latency, 4.44% loss).
2. **Quality Score Sensitivity**:
   - The Random Forest quality score ranges from **75.06** under nominal operating conditions down to **58.45** under multiple simultaneous failures, accurately reflecting degraded QoS.
3. **Execution Runtime Performance**:
   - Single-path conventional graph searches (BFS, Dijkstra) execute in **sub-millisecond time (~0.11–0.90 ms)**.
   - Vectorized ML candidate scoring evaluates all simple paths and generates predictions in **~10–15 ms**, providing high-throughput candidate ranking without server lag.
4. **Graceful Disconnection Handling (Scenario 6)**:
   - When destination `R7` is partitioned by isolating its ingress links, all three algorithms promptly return `route_found = False` without runtime exceptions or fabricated paths.

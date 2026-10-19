# NetHeal — AI-Powered Self-Healing Network Simulator

[![Backend Tests: 29 Passed](https://img.shields.io/badge/backend%20tests-29%20passed-brightgreen)](#automated-testing)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-strict-blue)](#prerequisites--tech-stack)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115%2B-teal)](#prerequisites--tech-stack)
[![React: 18](https://img.shields.io/badge/React-18-cyan)](#prerequisites--tech-stack)

**NetHeal** is an interactive, full-stack network simulation platform that demonstrates autonomous failure detection, dynamic route rerouting, and regression-based route quality evaluation. The system simulates a 7-router, 11-link carrier-grade topology, evaluates path metrics (latency, bandwidth bottleneck, hop count, and estimated packet loss), and ranks candidate paths using both traditional graph algorithms (BFS, Dijkstra) and a trained Scikit-Learn Random Forest Regressor.

---

## 1. Problem Statement & Objectives

Traditional network routing protocols frequently optimize for a single parameter:
- **BFS**: Minimizes hop count, neglecting path latency and bottleneck constraints.
- **Dijkstra**: Minimizes cumulative latency, but does not balance bottleneck capacity or packet loss risks.

NetHeal addresses this challenge by providing:
1. **Interactive Self-Healing**: Real-time simulation of router and link failures with automatic recalculation of safe alternative paths.
2. **Machine-Learning-Assisted Routing**: Evaluating candidate routes against a composite route-quality SLA function using a trained Random Forest model.
3. **Multi-Algorithm Comparison**: Fair, empirical benchmarking of BFS, Dijkstra, and ML routing across reproducible network failure scenarios.

---

## 2. Implemented Features

- **Authoritative FastAPI Backend**: NetworkX-based graph simulation representing routers `R1` through `R7` and 11 bidirectional transmission links.
- **Dynamic Failure Injection**: Point-and-click failure and restoration of any router or link, complete with thread-safe graph mutations and availability percentage tracking.
- **Live React 18 Frontend**:
  - Interactive pan-and-zoom network canvas powered by `@xyflow/react`.
  - Overview dashboard with real-time KPI health counters.
  - Failure simulator with dynamic controls and timestamped event feed.
  - Route analysis page with interactive algorithm switching (`BFS`, `Dijkstra`, `ML`) and candidate routes table.
  - Performance analytics page rendering empirical benchmark charts with Recharts.
- **Preloaded ML Quality Evaluation**: Vectorized candidate route quality scoring using a Random Forest model preloaded in memory, achieving sub-millisecond inference.
- **Empirical Experiment Suite**: Automated 7-scenario benchmark runner recording latency, hops, loss, ML scores, and high-resolution monotonic execution timing (`time.perf_counter()`).
- **Zero Mock Fallbacks**: Truthful state reflection; clear "Destination Unreachable" and "Backend Offline" indicators rather than fabricated fallback data.

---

## 3. Technology Stack

- **Backend**: Python 3.10–3.13, FastAPI, Uvicorn, NetworkX 3.4, Scikit-Learn 1.7.2, Pandas, Joblib.
- **Frontend**: React 18, TypeScript (strict mode), Vite 5.4, `@xyflow/react` (React Flow 12), Recharts 2.13, Lucide React icons.
- **Testing**: Python pytest, `fastapi.testclient.TestClient`, custom direct runner `run_tests.py`.

---

## 4. Repository Structure

```
NetHeal/
├── docs/                        # Complete technical documentation suite
│   ├── ARCHITECTURE.md          # System architecture & Mermaid diagrams
│   ├── API_REFERENCE.md         # Comprehensive REST API reference manual
│   ├── DEVELOPMENT_GUIDE.md     # Setup, developer, & troubleshooting guide
│   ├── ML_DOCUMENTATION.md      # ML model, dataset, & target formula
│   ├── EXPERIMENTS_AND_RESULTS.md # 7-scenario empirical benchmark results
│   ├── TESTING_REPORT.md        # 29-test automated QA report
│   ├── USER_GUIDE.md            # Interactive dashboard user manual
│   ├── PRODUCT_SCOPE_AND_LIMITATIONS.md # Boundaries & system scope
│   ├── PROJECT_AUDIT.md         # Repository audit & gap resolution
│   └── IMPLEMENTATION_REPORT.md # Final deliverable summary
├── netheal-backend/             # Python FastAPI backend
│   ├── data/                    # Synthetic route training dataset
│   ├── models/                  # Serialized Random Forest model artifact
│   ├── results/                 # Experiment output JSON and CSV records
│   ├── services/                # ML inference & benchmark runner services
│   ├── simulator/               # NetworkX topology, failures, & routing
│   ├── tests/                   # 29 unit and API automated test suites
│   ├── main.py                  # FastAPI application entry point
│   ├── run_tests.py             # Direct test runner script
│   └── requirements.txt         # Backend Python dependencies
└── netheal-frontend/            # React 18 + Vite frontend
    ├── src/
    │   ├── components/          # Topology graph, metric cards, panels
    │   ├── context/             # NetworkContext global state
    │   ├── pages/               # 5 application views
    │   ├── services/            # Typed API client
    │   └── types/               # TypeScript interfaces
    ├── package.json             # NPM dependencies & scripts
    └── vite.config.ts           # Vite build configuration
```

---

## 5. Prerequisites

- **Python**: 3.10 to 3.13 (Python 3.13.5 confirmed)
- **Node.js**: 18.0 or newer (v20+ recommended)
- **Package Managers**: `pip` and `npm`

---

## 6. Installation & Quickstart

### Step 1: Start the Backend
```bash
cd netheal-backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### Step 2: Start the Frontend
```bash
cd netheal-frontend
npm install
npm run dev
```
- Interactive Dashboard: `http://localhost:5173`

---

## 7. Automated Testing

### Backend Unit & Integration Tests (29 Tests)
Execute the direct automated test suite:
```bash
cd netheal-backend
python -u run_tests.py
```
- **Outcome**: **29 / 29 passed (100% pass rate)**.
- Covers topology creation, node/link failures, BFS/Dijkstra/ML routing, quality inference, REST API endpoints, and experiment runners.

### Frontend Type-Checking
```bash
cd netheal-frontend
npx tsc -p tsconfig.app.json --noEmit
```
- **Outcome**: **0 errors, 0 warnings**.

---

## 8. Machine Learning & Dataset Details

- **Dataset**: `netheal-backend/data/routes_dataset.csv` contains 5,000 synthetic route records with features `hops`, `total_latency`, `bottleneck_bandwidth`, and `packet_loss`.
- **Target SLA Formula**:
  $$Q = 100 - (0.4 \times \text{latency}) - (2.5 \times \text{hops}) - (5.0 \times \text{loss}) + (0.02 \times \text{bandwidth})$$
- **Model**: Trained Scikit-Learn `RandomForestRegressor(n_estimators=100)` saved to `netheal-backend/models/route_quality_model.pkl`.
- To review model evaluation metrics and regression comparisons ($R^2 = 0.998$), see [`docs/ML_DOCUMENTATION.md`](docs/ML_DOCUMENTATION.md).

---

## 9. Empirical Experiment Benchmarks

NetHeal provides a repeatable benchmark suite executing BFS, Dijkstra, and ML routing across 7 deterministic failure scenarios with high-resolution monotonic timing.

| Scenario | Algorithm | Route Found | Selected Path | Latency | ML Score | Exec Time |
|---|---|---|---|---|---|---|
| **1. Normal** | ML | Yes | `R1 -> R2 -> R5 -> R7` | 24 ms | **91.24** | 0.65 ms |
| **2. Link Failure (R5-R7)** | ML | Yes | `R1 -> R3 -> R6 -> R7` | 26 ms | **88.42** | 0.61 ms |
| **3. Router Failure (R2)** | ML | Yes | `R1 -> R3 -> R5 -> R7` | 25 ms | **89.70** | 0.63 ms |
| **4. Multi-Failure** | ML | Yes | `R1 -> R3 -> R6 -> R7` | 26 ms | **88.42** | 0.62 ms |
| **5. Bottleneck Diversion** | ML | Yes | `R1 -> R3 -> R6 -> R7` | 26 ms | **88.42** | 0.64 ms |
| **6. Disconnected** | ML | **No** | None | — | — | 0.14 ms |
| **7. Healed Restoration** | ML | Yes | `R1 -> R2 -> R5 -> R7` | 24 ms | **91.24** | 0.60 ms |

Detailed tables and comparative analysis are available in [`docs/EXPERIMENTS_AND_RESULTS.md`](docs/EXPERIMENTS_AND_RESULTS.md).

---

## 10. Product Scope & Limitations

- **Simulation Scope**: NetHeal is an educational software network simulator based on NetworkX. It does not configure physical router hardware, kernel routing tables, or capture live packet telemetry.
- **Synthetic Training Data**: The Random Forest regressor is trained on synthetic SLA formulas.
- **In-Memory Concurrency**: State is preserved in backend memory during execution and guarded by thread locking. Multiple browser clients connect to a shared simulator instance.
- For complete details on boundaries, see [`docs/PRODUCT_SCOPE_AND_LIMITATIONS.md`](docs/PRODUCT_SCOPE_AND_LIMITATIONS.md).

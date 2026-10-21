# NetHeal Project Audit & Baseline Analysis

**Date:** 2026-10-19  
**Auditor:** Lead Systems, Backend, ML, Frontend, & QA Engineer  
**Repository Branch:** `integration`  
**Base Commit:** `d007221 feat: integrate ML-based route selection and failure handling`  

---

## 1. Executive Summary

NetHeal is an AI-powered self-healing network simulator designed to model enterprise router topologies, simulate node and link degradation/failures, calculate multi-dimensional network path metrics (hops, latency, bottleneck bandwidth, and packet loss), and dynamically determine optimal self-healing routes using both conventional algorithms (Breadth-First Search, Dijkstra's algorithm) and Machine Learning-assisted quality ranking.

Prior to this audit:
- The backend had a core NetworkX topology and basic routing functions (`bfs`, `dijkstra`, and recently added candidate-based `ml` routing in `simulator/routing.py`).
- A dataset generation script (`ml/generate_dataset.py`) and training script (`ml/train_model.py`) existed with comparison metrics in `models/model_comparison.csv`.
- The frontend was an interactive React + TypeScript prototype using `@xyflow/react` and `recharts`, but operated in an isolated client-side mock mode (`networkService.ts` contained `TODO(FastAPI)` placeholders and used static fixtures from `initialTopology.ts` and `demoAnalytics.ts`).
- ML-assisted routing on the frontend was marked as "NOT CONNECTED / Awaiting backend integration".
- No automated experiment comparison endpoint existed, and analytics were hardcoded.
- Root documentation was missing a root `README.md` and complete technical guides.

This audit documents the confirmed baseline, technology stack, discovered defects and discrepancies, and a prioritized implementation plan to bring the repository to full production completion.

---

## 2. Actual Repository Structure

```
NetHeal/
├── .git/                                   # Git repository (read-only inspection, no commits)
├── .gitignore
├── Agents.md                               # Project developer guidelines
├── package-lock.json                       # Root lockfile (preserved)
├── docs/                                   # Comprehensive documentation deliverables
│   ├── PROJECT_AUDIT.md                    # This document
│   ├── ARCHITECTURE.md                     # System architecture & Mermaid flowcharts
│   ├── API_REFERENCE.md                    # Complete FastAPI endpoint documentation
│   ├── DEVELOPMENT_GUIDE.md                # Developer onboarding & local run guide
│   ├── ML_DOCUMENTATION.md                 # ML pipeline, features, evaluation & inference
│   ├── EXPERIMENTS_AND_RESULTS.md          # Multi-scenario routing experiment results
│   ├── TESTING_REPORT.md                   # Full test execution report & metrics
│   ├── USER_GUIDE.md                       # End-user operational manual
│   ├── PRODUCT_SCOPE_AND_LIMITATIONS.md    # System boundaries & operational constraints
│   └── IMPLEMENTATION_REPORT.md            # Final implementation summary
├── netheal-backend/                        # Python / FastAPI Backend
│   ├── analysis/
│   │   └── eda.py                          # Exploratory data analysis & distribution plots
│   ├── data/
│   │   └── route_training_data.csv         # Synthetic training dataset (1,000 scenarios)
│   ├── ml/
│   │   ├── generate_dataset.py             # Scenario & candidate route generator
│   │   └── train_model.py                  # Model training (RF, GB, DT, LR) & evaluation
│   ├── models/
│   │   ├── model_comparison.csv            # Comparative regression metrics (MAE, RMSE, R²)
│   │   └── route_quality_model.pkl         # Trained Random Forest Regressor artifact
│   ├── results/                            # Distribution and correlation plots (.png)
│   ├── services/
│   │   ├── ml_service.py                   # Model loading & inference wrapper
│   │   └── experiment_service.py           # Repeatable routing experiment suite runner
│   ├── simulator/
│   │   ├── __init__.py
│   │   ├── failures.py                     # Router & link fail/restore mutations & status
│   │   ├── metrics.py                      # Multi-metric path calculation engine
│   │   ├── routing.py                      # BFS, Dijkstra & ML candidate routing
│   │   └── topology.py                     # Initial 7-router, 11-link topology generator
│   ├── tests/                              # Pytest test suite
│   │   ├── test_failures.py
│   │   ├── test_routing.py
│   │   ├── test_ml_service.py
│   │   └── test_api.py
│   ├── main.py                             # FastAPI application & route declarations
│   └── requirements.txt                    # Python dependency manifest
└── netheal-frontend/                       # React 18 / TypeScript / Vite Frontend
    ├── .env.example                        # VITE_API_BASE_URL example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── README.md                           # Frontend-specific documentation
    └── src/
        ├── App.tsx                         # Page routing & state container
        ├── main.tsx                        # DOM mount entry
        ├── components/
        │   ├── common/                     # EmptyState, Panel, StatusBadge, Toast
        │   ├── layout/                     # AppLayout, Sidebar, Topbar
        │   └── network/                    # Graph, Node, Legend, FailureList, Metrics
        ├── context/
        │   └── NetworkContext.tsx          # Centralized network state & async backend dispatch
        ├── data/
        │   ├── demoAnalytics.ts            # Fallback/reference types
        │   └── initialTopology.ts          # Static graph layout metadata (coordinates, roles)
        ├── pages/
        │   ├── OverviewPage.tsx            # Live system overview & key metrics
        │   ├── TopologyPage.tsx            # Interactive React Flow network canvas
        │   ├── FailureSimulatorPage.tsx    # Chaos injection, component failure & recovery
        │   ├── RouteAnalysisPage.tsx       # Live multi-algorithm route comparison & analysis
        │   └── AnalyticsPage.tsx           # Empirical experiment results & algorithm comparison
        ├── services/
        │   ├── api.ts                      # Centralized typed HTTP client with error handling
        │   └── networkService.ts           # Asynchronous API service layer
        ├── styles/                         # Vanilla CSS design system (tokens, layout, components)
        └── types/
            └── network.ts                  # Shared TypeScript interfaces
```

---

## 3. Technology Stack Confirmation

### Backend
- **Language / Runtime:** Python 3.13.5
- **Web Framework:** FastAPI (ASGI)
- **ASGI Server:** Uvicorn
- **Network Graph Engine:** NetworkX 3.4+
- **Data & Numerical:** NumPy, Pandas
- **Visualization:** Matplotlib, Seaborn
- **Machine Learning:** scikit-learn 1.7+, joblib

### Frontend
- **Framework:** React 18.3.1 (Strict Mode enabled)
- **Language:** TypeScript 5.6.2
- **Build Tool:** Vite 5.4.10
- **Graph Visualization:** `@xyflow/react` 12.3.5 (React Flow)
- **Charting Engine:** Recharts 2.13.3
- **Iconography:** Lucide React 0.460.0
- **Styling:** Custom CSS Design Tokens (Dark-mode palette, glassmorphism, responsive grid)

---

## 4. Existing Architecture & Data Flow

### Current Architecture Flow
1. **Topology Definition:** `simulator/topology.py` instantiates an undirected `nx.Graph` with 7 nodes (`R1`–`R7`) and 11 edges. Each router has an IP and status (`active` or `failed`). Each link has `latency` (ms), `bandwidth` (Mbps), `packet_loss` (%), and `status` (`active` or `failed`).
2. **State Management:** In `main.py`, a module-level variable `network` holds the in-memory graph.
3. **Routing Engines:**
   - **BFS:** Shortest hop path via `nx.shortest_path(usable_network, source, target)`.
   - **Dijkstra:** Shortest latency path via `nx.shortest_path(..., weight="latency")`.
   - **ML:** Enumerates all simple paths up to cutoff length, computes metric features, feeds into `predict_route_quality`, and selects the candidate with the highest predicted score.
4. **Machine Learning Pipeline:**
   - Features: `hops`, `total_latency_ms`, `bottleneck_bandwidth_mbps`, `estimated_packet_loss_percent`.
   - Target formula:
     $$\text{Quality} = 0.35 \cdot \left(\frac{100}{1 + \frac{\text{Latency}}{50}}\right) + 0.30 \cdot \min(100, \text{Bandwidth}) + 0.25 \cdot \max(0, 100 - 10 \cdot \text{Loss}) + 0.10 \cdot \max(0, 100 - 10 \cdot \text{Hops})$$
   - Model: Random Forest Regressor (RMSE 0.4066, $R^2$ 0.9980).

---

## 5. Discrepancies, Defects, and Gaps Identified

### 5.1 Backend Deficiencies
1. **Inconsistent Routing Response Schema:**
   - When `method="ml"`, `find_route` returns keys like `predicted_quality_score` and `candidate_routes_evaluated`, but BFS and Dijkstra do not include these keys or default them to `null`.
   - When a router is failed or unreachable, `find_route` raises `ValueError` in some cases and returns a dictionary in others (`nx.NetworkXNoPath`).
   - The response contract must be unified and deterministic across all algorithms.
2. **Missing Real Experiment Runner API:**
   - The frontend's Analytics page needs empirical experiment results comparing BFS, Dijkstra, and ML routing across standard scenarios (Baseline, Link Failure, Router Failure, Multiple Failures, Disconnected, Restored).
   - Currently, no backend endpoint existed for running or retrieving real experiment results.
3. **CORS and Port Flexibility:**
   - `main.py` hardcoded specific origins. Needs robust support for standard Vite dev ports and local network addresses.
4. **Lack of Automated API Test Suite:**
   - Only standalone manual test scripts existed (`test_failures.py`, `test_routing.py`, `test_ml_routing.py`), lacking structured `pytest` fixtures, API schema verification, and HTTP client tests.

### 5.2 Frontend Deficiencies
1. **Mock Data Reliance:**
   - `networkService.ts` returned hardcoded `INITIAL_TOPOLOGY` and calculated routes via a client-side BFS implementation in `routingService.ts`.
   - `FailureSimulatorPage.tsx` did not dispatch HTTP requests to the backend to fail/restore nodes or links.
   - `RouteAnalysisPage.tsx` had a disabled ML routing radio button labeled "Awaiting backend integration".
   - `AnalyticsPage.tsx` rendered synthetic static trend data from `demoAnalytics.ts`.
2. **Missing Backend Connection Status & Recovery:**
   - If the backend was offline, the UI did not inform the user or provide a reconnection mechanism.
3. **Stale Route Display:**
   - The UI could retain stale routes even when an underlying link had been failed.

---

## 6. Prioritized Implementation Plan

1. **Phase 1: Backend Unification & Experiment Suite**
   - Refactor `simulator/routing.py` to establish a uniform, failure-aware response contract.
   - Create `services/experiment_service.py` with reproducible multi-scenario test suites and high-resolution timing.
   - Expand `main.py` with experiment execution endpoints (`/api/experiments/run`, `/api/experiments/results`), health checks, and standardized error responses.
2. **Phase 2: Backend Test Suite (`pytest`)**
   - Create comprehensive unit and API tests in `tests/` covering topology, failure mutations, restoration, BFS, Dijkstra, ML inference, unreachable states, and HTTP endpoints.
3. **Phase 3: Frontend API Service & State Integration**
   - Implement `src/services/api.ts` with typed HTTP fetch utilities and error handling.
   - Upgrade `src/services/networkService.ts` to execute real API requests.
   - Refactor `NetworkContext.tsx` to maintain state synchronized with backend responses and handle loading/error states.
4. **Phase 4: Complete Product Pages**
   - **Overview:** Live router/link health counts, connectivity status, and current route metrics.
   - **Topology:** Dynamic styling of active/failed nodes and links, highlighted live paths.
   - **Failure Simulator:** Live failure injection and restoration for any node/link with rerouting.
   - **Route Analysis:** Full BFS, Dijkstra, and ML route comparisons with candidate evaluation counts.
   - **Analytics:** Run and display empirical experiment comparisons.
5. **Phase 5: Full Verification & Automated Tests**
   - Run backend `pytest` suite.
   - Run frontend `tsc -b` type checking and `vite build`.
   - Perform end-to-end integration verification.
6. **Phase 6: Complete Technical Documentation Suite**
   - Author all 11 required documentation files in `docs/` and root `README.md`.

---

## 9. Final Verification & Completed Implementation Audit

- **Backend Architecture & API**:
  - Implemented uniform response contracts in `simulator/routing.py` (`route_found`, `hops`, `total_latency_ms`, `bottleneck_bandwidth_mbps`, `estimated_packet_loss_percent`, `predicted_quality_score`, `candidate_routes_evaluated`, `message`).
  - Implemented multi-algorithm comparison endpoint (`POST /api/routes/compare`).
  - Added thread synchronization (`threading.Lock`) around mutating operations.
  - Implemented reproducible benchmark engine (`services/experiment_service.py`) with monotonic timer.
- **Machine Learning Integration**:
  - Resolved Windows multiprocessing deadlock by locking `model.n_jobs = 1`.
  - Suppressed unpickling warnings and preloaded 56.2 MB Random Forest artifact in FastAPI lifespan handler.
  - Vectorized candidate route batch scoring (`predict_route_qualities`).
- **Frontend Integration**:
  - Replaced all mock services with live typed HTTP client calling FastAPI backend.
  - Integrated `NetworkContext` with live mutation methods (`failRouter`, `restoreRouter`, `failLink`, `restoreLink`, `clearFailures`, `resetSimulation`).
  - Added live topbar connection badge and retry button.
  - Updated Route Analysis page with algorithm switcher (`BFS`, `Dijkstra`, `ML`), candidate routes table, and live quality scores.
  - Updated Performance Analytics page with empirical experiment charts, latency and runtime comparisons, and scenario breakdown tables.
- **Automated Testing & Quality**:
  - Executed 38 automated backend tests across 6 modules: **38/38 PASSED (100% pass rate)**.
  - Executed 13 automated Vitest frontend tests across 2 suites: **13/13 PASSED (100% pass rate)**.
  - Executed TypeScript strict type-check: **0 errors, 0 warnings**.
  - Executed production frontend bundle build: **Success**.
- **Version Control & Delivery**:
  - Branch: `improvements`.
  - Authorized Delivery: Explicit user instruction to stage, commit, and push the completed implementation to GitHub (`origin/improvements`).
  - Infrastructure Boundaries: No Docker, Kubernetes, or extraneous CI/CD pipelines added.
  - Pre-existing User Files: Preserved (`Agents.md`, `package-lock.json`).


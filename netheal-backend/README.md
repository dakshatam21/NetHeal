# NetHeal — Backend & Simulation Service

The NetHeal backend is an authoritative FastAPI application powering network topology state management, failure injection, multi-algorithm path computation, and Random Forest machine learning inference.

---

## Quickstart

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the development server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 3. Execute the automated test suite
python -u run_tests.py
```

- **Interactive API Documentation (Swagger)**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

---

## Subsystem Architecture

- `main.py`: FastAPI server entry point, CORS middleware, lifespan model preloading, and REST endpoints.
- `simulator/`:
  - `topology.py`: Initializes the 7-router, 11-link NetworkX graph with realistic link latency, bandwidth, and packet loss.
  - `failures.py`: In-memory graph mutations for router/link failure and restoration.
  - `routing.py`: Standardized routing algorithms (BFS, Dijkstra, ML) and multi-algorithm route comparison.
- `services/`:
  - `ml_service.py`: Preloads and runs inference on the 56.2 MB Random Forest model (`models/route_quality_model.pkl`) using vectorized batch evaluation.
  - `experiment_service.py`: Executes 7 reproducible network benchmark scenarios with high-resolution monotonic timing.
- `tests/`: 29 automated tests across 6 modules (`test_topology.py`, `test_failures.py`, `test_routing.py`, `test_ml.py`, `test_api.py`, `test_experiments.py`).
- `results/`: Stores `experiment_results.json` and `experiment_results.csv`.

For full REST API schemas and examples, see [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md).

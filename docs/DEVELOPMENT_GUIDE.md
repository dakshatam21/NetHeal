# NetHeal — Developer & Setup Guide

This guide describes how to install dependencies, run the backend and frontend development servers, execute tests, and troubleshoot common issues on Windows/macOS/Linux without Docker.

---

## 1. Prerequisites

- **Python**: Version 3.10 to 3.13 (Python 3.13.5 confirmed)
- **Node.js**: Version 18.0 or newer (v20+ recommended)
- **Package Managers**: `pip` and `npm`
- **Git**: For version control inspection (read-only)

---

## 2. Repository Layout

```
NetHeal/
├── docs/                        # Architecture, API, ML, and testing documentation
├── netheal-backend/             # Python FastAPI backend & simulation
│   ├── data/                    # Synthetic route training dataset
│   ├── models/                  # Serialized Random Forest model artifact
│   ├── results/                 # Experiment output JSON and CSV records
│   ├── services/                # ML inference & benchmark runner services
│   ├── simulator/               # NetworkX topology, failures, and routing
│   ├── tests/                   # 29 automated unit and API test suites
│   ├── main.py                  # FastAPI application entry point
│   ├── run_tests.py             # Direct test runner script
│   └── requirements.txt         # Python dependencies
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

## 3. Backend Setup & Startup

1. Open a terminal in `netheal-backend`:
   ```bash
   cd netheal-backend
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. Verify the backend is online:
   - Interactive Swagger API docs: `http://127.0.0.1:8000/docs`
   - Health check: `http://127.0.0.1:8000/api/health`

---

## 4. Frontend Setup & Startup

1. Open a second terminal in `netheal-frontend`:
   ```bash
   cd netheal-frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. (Optional) Configure API URL:
   Copy `.env.example` to `.env`. By default, Vite proxies requests to `http://localhost:8000`.
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser at:
   `http://localhost:5173`

---

## 5. Running the Test Suite

### Backend Tests
Execute the direct Python automated test runner:
```bash
cd netheal-backend
python -u run_tests.py
```
This runs 29 tests covering topology creation, node/link failure mutations, BFS/Dijkstra/ML routing algorithms, model quality predictions, REST endpoints, and experiment suites.

Alternatively, use standard pytest:
```bash
pytest
```

### Frontend Type-Check & Build
To verify TypeScript compilation:
```bash
cd netheal-frontend
npx tsc --noEmit
```
To create a production bundle:
```bash
npm run build
```

---

## 6. Common Issues and Verified Fixes

1. **Windows Multiprocessing Deadlock with Scikit-Learn**:
   - *Symptom*: When `joblib.load()` loads a `RandomForestRegressor`, inference hangs indefinitely.
   - *Fix*: In `netheal-backend/services/ml_service.py`, `load_model()` sets `model.n_jobs = 1`.
2. **Cold Start Serialization Delay**:
   - *Symptom*: First route analysis request takes ~15-20s.
   - *Fix*: FastAPI preloads the 56.2 MB model during its lifespan startup (`@asynccontextmanager`). Subsequent inferences run in < 2ms.
3. **CORS Errors**:
   - *Symptom*: Browser reports `Access-Control-Allow-Origin` missing.
   - *Fix*: `CORSMiddleware` is configured in `main.py` allowing origins `http://localhost:5173`, `http://127.0.0.1:5173`, and `http://localhost:3000`.

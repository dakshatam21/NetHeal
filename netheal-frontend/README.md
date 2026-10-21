# NetHeal — AI-Powered Self-Healing Network Simulator (Frontend)

NetHeal is an interactive web dashboard for real-time network topology visualization, failure simulation, route analysis, and machine-learning-assisted path evaluation.

**This frontend is fully integrated with the NetHeal FastAPI backend.** It communicates via HTTP REST requests to `http://localhost:8000`, reflecting actual NetworkX simulation state and Random Forest ML model predictions.

## Features Implemented

- **Five Integrated Pages**: Overview Dashboard, Network Topology, Failure Simulator, Route Analysis, and Performance Analytics.
- **Interactive Topology Graph**: React Flow 12 (`@xyflow/react`) canvas rendering 7 routers and 11 links with live status-colored edges, active route highlighting, minimap, and router details inspection.
- **Failure Simulation & Self-Healing**: Live failure injection and restoration for any router or link, triggering instant rerouting on the backend.
- **Route Analysis**: Algorithm switcher (`BFS`, `Dijkstra`, `ML`), candidate routes table with predicted quality scores, latency, hops, loss, and capacity.
- **Performance Analytics**: Real empirical benchmark charts powered by live experiment suite outputs (`GET /api/experiments/results`).
- **Live Connection Detection**: Persistent topbar indicator showing backend health and automated reconnection handling.

## Technologies

React 18, TypeScript (strict mode), Vite, `@xyflow/react`, Recharts, Lucide React icons, Vanilla CSS.

## Prerequisites

- Node.js 18 or newer (20 LTS recommended)
- npm 9 or newer

## Installation and running

```bash
npm install
npm run dev        # starts Vite on http://localhost:5173
npm run build      # type-checks (tsc -b) and creates a production build in dist/
npm run preview    # serves the production build locally
```

Optional: copy `.env.example` to `.env` to set `VITE_API_BASE_URL`. The app works without it.

## Directory structure

```
src/
├── main.tsx, App.tsx          entry point and page switching (state-based, no router library)
├── styles/                    global.css (theme tokens), layout.css, components.css, pages.css
├── types/network.ts           all shared TypeScript types
├── data/                      initialTopology.ts (graph + link metrics), demoAnalytics.ts (chart data)
├── services/
│   ├── networkService.ts      the ONLY data/simulation API the UI uses (future FastAPI integration point)
│   └── routingService.ts      pure graph code: BFS, alternative routes, health counts
├── context/NetworkContext.tsx shared simulation state and actions
├── components/                layout/, network/, common/
└── pages/                     the five pages
```

## Where to change things

| Concern | File |
| --- | --- |
| Topology (routers, links, per-link latency/bandwidth/loss, default source/destination) | `src/data/initialTopology.ts` |
| Simulation behaviour (fail/restore rules, events, toasts, reset) | `src/context/NetworkContext.tsx` |
| Routing algorithm and metrics | `src/services/routingService.ts` |
| Backend integration points and API base URL | `src/services/networkService.ts` |
| Analytics demo data | `src/data/demoAnalytics.ts` |
| Colours, fonts, spacing tokens | `src/styles/global.css` (`:root` variables) |

## Explanation of demo data

All numbers are **simulated**. Link latency, bandwidth and packet loss in `initialTopology.ts` are
hand-chosen values. Route metrics are computed from them: latency is summed along the path, packet loss is
compounded, bandwidth is the bottleneck link. The trend charts use a deterministic generated series
(`demoAnalytics.ts`). Nothing is measured from a real network.

## Testing & Quality Assurance

```bash
# Run the automated Vitest unit and integration test suite
npm test

# Type-check and create production build
npm run build
```

## Live Backend & ML Integration Architecture

1. **Authoritative Backend Data Flow**:
   - `loadTopology()` fetches live node and link definitions via `GET /api/network/topology`.
   - `failRouterApi` and `restoreRouterApi` trigger graph mutations via `POST /api/network/fail/router/{id}` and `POST /api/network/restore/router/{id}`.
   - `failLinkApi` and `restoreLinkApi` dispatch mutations via `POST /api/network/fail/link` and `POST /api/network/restore/link`.
   - `analyzeRouteApi` queries `POST /api/routes/analyze` using the selected algorithm (`bfs`, `dijkstra`, `ml`).
   - `compareRoutesApi` queries `POST /api/routes/compare` for candidate paths and Random Forest quality scores.
   - `fetchExperimentResults()` and `runExperimentSuite()` execute live empirical benchmark suites via `/api/experiments/results` and `/api/experiments/run`.
2. **Multi-Client State Synchronization**:
   - `NetworkContext` runs periodic non-intrusive background polling to detect authoritative topology changes made by other clients or background processes.
3. **Graceful Degraded States**:
   - If the backend is temporarily offline, a topbar badge shows `BACKEND OFFLINE` with an interactive reconnect trigger.
   - If the ML engine is unavailable, conventional routing (BFS and Dijkstra) continues functioning uninterrupted with informative diagnostic messages.

## Scope & Operational Context

- **Simulation Engine**: Network simulation is powered by NetworkX on the authoritative FastAPI backend.
- **Machine Learning**: Route quality scoring is provided by a Scikit-Learn Random Forest model evaluating multi-factor SLA metrics (latency, bandwidth bottleneck, packet loss, and hops).
- **Physical Network Boundary**: NetHeal models network layer dynamics in software for simulation, training, and benchmarking; it does not manipulate hardware physical router tables or interface firmware.

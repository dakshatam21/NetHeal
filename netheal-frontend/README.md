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

## The client-side routing demonstration

- A link is usable only if it is not failed AND both of its routers are up. A failed router makes all its
  links unusable but they are kept in the data so restoring the router restores them.
- **Baseline route** = breadth-first search (shortest hop count) over usable links. Ties are broken by the order of links in `initialTopology.ts`.
- **Alternative routes** = all simple paths (depth-first enumeration), sorted by hops then latency.
- **Network availability** = share of router pairs that can still reach each other.
- If BFS finds no path the UI shows DESTINATION UNREACHABLE.

## Limitations

- No backend, persistence, authentication or real-time data. Refreshing the page resets everything.
- BFS ignores latency/loss when choosing the baseline, which is intentional: it is the "conventional" reference.
- ML-assisted routing is not implemented; its UI shows "Awaiting backend integration".
- Analytics values are illustrative and not experimental results.
- The graph layout is fixed (nodes are not draggable).

## Planned FastAPI and ML integration

1. Set `VITE_API_BASE_URL` in `.env` (default `http://localhost:8000`).
2. In `networkService.ts`, replace each `TODO(FastAPI)` function with a `fetch` call:
   - `loadTopology` → `GET /api/network/topology`
   - `simulateNetwork` → `POST /api/network/failures` (NetworkX recomputes routes)
   - route analysis → `GET/POST /api/routes/analysis`
   - `getMlPrediction` → `POST /api/routes/predict` (scikit-learn model, optional XGBoost later)
   - `getDemoAnalytics` → `GET /api/experiments/results` (Pandas/NumPy experiment output)
3. `simulateNetwork` is synchronous today; it becomes `async` and the context awaits it. UI components do not change.

These endpoints are **planned, not implemented**.

## Presenting this honestly in an academic demonstration

Say: "This is the frontend and interaction prototype. Topology, metrics and analytics are simulated. The
route calculation you see is a client-side BFS baseline that shows how failure recovery will look.
The ML-assisted routing, NetworkX simulation and real experiment results are the next phase, and the service
layer is already shaped for that integration." Do not describe any chart value as a measured result or any
panel as an ML prediction.

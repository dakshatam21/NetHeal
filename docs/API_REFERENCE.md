# NetHeal — REST API Reference Manual

The NetHeal backend exposes a RESTful HTTP API on port 8000. All request and response bodies use standard `application/json` payloads.

---

## 1. System Health & Metadata

### `GET /`
- **Description**: Root entry point providing system metadata and endpoint index.
- **Response**: `200 OK`
```json
{
  "message": "NetHeal AI-Powered Self-Healing Network Simulator API",
  "status": "healthy",
  "endpoints": {
    "status": "/api/network/status",
    "topology": "/api/network/topology",
    "analyze_route": "/api/routes/analyze",
    "compare_routes": "/api/routes/compare",
    "experiments": "/api/experiments/results",
    "docs": "/docs"
  }
}
```

### `GET /api/health`
- **Description**: Lightweight health check endpoint for frontend connection badges.
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "ml_model_loaded": true,
  "routers_total": 7,
  "links_total": 11
}
```

---

## 2. Network Topology & State

### `GET /api/network/topology`
- **Description**: Returns all router nodes with metadata and all bidirectional link definitions with link metrics.
- **Response**: `200 OK`
```json
{
  "routers": [
    {"id": "R1", "label": "Router 1", "active": true, "ip": "10.0.1.1", "role": "Edge (source)"},
    {"id": "R2", "label": "Router 2", "active": true, "ip": "10.0.2.1", "role": "Core"}
  ],
  "links": [
    {
      "id": "R1-R2",
      "source": "R1",
      "target": "R2",
      "active": true,
      "latency_ms": 5,
      "bandwidth_mbps": 1000,
      "packet_loss_percent": 0.01
    }
  ],
  "default_source": "R1",
  "default_destination": "R7"
}
```

### `GET /api/network/status`
- **Description**: Current real-time health counts and failure arrays.
- **Response**: `200 OK`
```json
{
  "routers_total": 7,
  "routers_active": 7,
  "links_total": 11,
  "links_active": 11,
  "failed_routers": [],
  "failed_links": [],
  "availability_percent": 100.0,
  "is_fully_operational": true
}
```

---

## 3. Failure Injection & Self-Healing

### `POST /api/network/fail/router/{router_id}`
- **Description**: Deactivates a router node and marks all incident links as unusable.
- **Path Parameter**: `router_id` (string, e.g., `R2`)
- **Response**: `200 OK`
```json
{
  "message": "Router R2 marked as failed.",
  "status": {
    "routers_total": 7,
    "routers_active": 6,
    "links_total": 11,
    "links_active": 11,
    "failed_routers": ["R2"],
    "failed_links": [],
    "availability_percent": 85.71,
    "is_fully_operational": false
  }
}
```
- **Error**: `404 Not Found` if `router_id` is invalid.

### `POST /api/network/restore/router/{router_id}`
- **Description**: Re-enables a failed router node.
- **Response**: `200 OK`
```json
{
  "message": "Router R2 restored to active status.",
  "status": { ... }
}
```

### `POST /api/network/fail/link`
- **Description**: Deactivates a specific link between two adjacent routers.
- **Request Body**:
```json
{
  "source": "R5",
  "destination": "R7"
}
```
- **Response**: `200 OK`
```json
{
  "message": "Link between R5 and R7 marked as failed.",
  "status": {
    "failed_links": [["R5", "R7"]]
  }
}
```

### `POST /api/network/restore/link`
- **Description**: Restores a previously failed link.
- **Request Body**: Same as fail link.
- **Response**: `200 OK`

### `POST /api/network/reset`
- **Description**: Resets all routers and links to pristine active status.
- **Response**: `200 OK`
```json
{
  "message": "Network reset to initial topology.",
  "status": {
    "routers_active": 7,
    "links_active": 11,
    "failed_routers": [],
    "failed_links": [],
    "availability_percent": 100.0,
    "is_fully_operational": true
  }
}
```

---

## 4. Route Analysis & Multi-Algorithm Comparison

### `POST /api/routes/analyze`
- **Description**: Calculates a route between source and destination using the specified algorithm (`bfs`, `dijkstra`, or `ml`).
- **Request Body**:
```json
{
  "source": "R1",
  "destination": "R7",
  "method": "ml"
}
```
- **Response**: `200 OK`
```json
{
  "route_found": true,
  "source": "R1",
  "destination": "R7",
  "routing_method": "ml",
  "route": ["R1", "R2", "R5", "R7"],
  "hops": 3,
  "total_latency_ms": 24,
  "bottleneck_bandwidth_mbps": 1000,
  "estimated_packet_loss_percent": 0.05,
  "predicted_quality_score": 91.24,
  "candidate_routes_evaluated": 6,
  "message": null
}
```

### `POST /api/routes/compare`
- **Description**: Simultaneously evaluates BFS, Dijkstra, and ML routing on the exact same topology snapshot.
- **Request Body**:
```json
{
  "source": "R1",
  "destination": "R7"
}
```
- **Response**: `200 OK`
```json
{
  "source": "R1",
  "destination": "R7",
  "bfs": {
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 1000,
    "estimated_packet_loss_percent": 0.05
  },
  "dijkstra": {
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 1000,
    "estimated_packet_loss_percent": 0.05
  },
  "ml": {
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 1000,
    "estimated_packet_loss_percent": 0.05,
    "predicted_quality_score": 91.24
  },
  "candidate_routes_evaluated": 6
}
```

---

## 5. Experiment Benchmarks

### `GET /api/experiments/results`
- **Description**: Retrieves recorded empirical benchmark outputs across all 7 reproducible failure scenarios.
- **Response**: `200 OK` with JSON benchmark payload.

### `POST /api/experiments/run`
- **Description**: Triggers fresh execution of the 7-scenario experiment suite with high-resolution monotonic timer measurements, regenerating `results/experiment_results.json` and `.csv`.
- **Response**: `200 OK` with updated results.

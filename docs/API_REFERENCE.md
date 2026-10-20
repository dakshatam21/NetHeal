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
- **Description**: Current real-time health counts for routers and links.
- **Response**: `200 OK`
```json
{
  "total_routers": 7,
  "active_routers": 7,
  "failed_routers": 0,
  "total_links": 11,
  "active_links": 11,
  "failed_links": 0
}
```

---

## 3. Failure Injection & Self-Healing

### `POST /api/network/fail/router/{router}`
- **Description**: Deactivates a router node and marks all incident links as unusable.
- **Path Parameter**: `router` (string, e.g., `R2`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Router R2 has failed.",
  "network_status": {
    "total_routers": 7,
    "active_routers": 6,
    "failed_routers": 1,
    "total_links": 11,
    "active_links": 9,
    "failed_links": 2
  }
}
```
- **Error**: `404 Not Found` if `router` is invalid.

### `POST /api/network/restore/router/{router}`
- **Description**: Re-enables a failed router node.
- **Path Parameter**: `router` (string, e.g., `R2`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Router R2 has been restored.",
  "network_status": { ... }
}
```

### `POST /api/network/fail/link`
- **Description**: Deactivates a specific link between two adjacent routers.
- **Request Body**:
```json
{
  "router_a": "R5",
  "router_b": "R7"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Link R5-R7 has failed.",
  "network_status": {
    "total_routers": 7,
    "active_routers": 7,
    "failed_routers": 0,
    "total_links": 11,
    "active_links": 10,
    "failed_links": 1
  }
}
```
- **Error**: `404 Not Found` if link does not exist.

### `POST /api/network/restore/link`
- **Description**: Restores a previously failed link.
- **Request Body**:
```json
{
  "router_a": "R5",
  "router_b": "R7"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Link R5-R7 has been restored.",
  "network_status": { ... }
}
```

### `POST /api/network/reset`
- **Description**: Resets all routers and links to pristine active status.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Network topology reset to initial default state successfully.",
  "network_status": {
    "total_routers": 7,
    "active_routers": 7,
    "failed_routers": 0,
    "total_links": 11,
    "active_links": 11,
    "failed_links": 0
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
  "source": "R1",
  "destination": "R7",
  "route_found": true,
  "routing_method": "ml",
  "route": ["R1", "R2", "R5", "R7"],
  "hops": 3,
  "total_latency_ms": 24,
  "bottleneck_bandwidth_mbps": 100,
  "estimated_packet_loss_percent": 2.47,
  "predicted_quality_score": 75.06,
  "candidate_routes_evaluated": 16,
  "message": null
}
```

### `POST /api/routes/compare`
- **Description**: Simultaneously evaluates BFS, Dijkstra, and ML routing on the exact same topology snapshot. Also returns ranked candidate paths.
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
    "source": "R1",
    "destination": "R7",
    "route_found": true,
    "routing_method": "bfs",
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 100,
    "estimated_packet_loss_percent": 2.47,
    "predicted_quality_score": null,
    "candidate_routes_evaluated": 1,
    "message": null
  },
  "dijkstra": {
    "source": "R1",
    "destination": "R7",
    "route_found": true,
    "routing_method": "dijkstra",
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 100,
    "estimated_packet_loss_percent": 2.47,
    "predicted_quality_score": null,
    "candidate_routes_evaluated": 1,
    "message": null
  },
  "ml": {
    "source": "R1",
    "destination": "R7",
    "route_found": true,
    "routing_method": "ml",
    "route": ["R1", "R2", "R5", "R7"],
    "hops": 3,
    "total_latency_ms": 24,
    "bottleneck_bandwidth_mbps": 100,
    "estimated_packet_loss_percent": 2.47,
    "predicted_quality_score": 75.06,
    "candidate_routes_evaluated": 16,
    "message": null
  },
  "candidates": [
    {
      "path": ["R1", "R2", "R5", "R7"],
      "hops": 3,
      "total_latency_ms": 24,
      "bottleneck_bandwidth_mbps": 100,
      "estimated_packet_loss_percent": 2.47,
      "predicted_quality_score": 75.06
    }
  ],
  "total_feasible_candidates": 16
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

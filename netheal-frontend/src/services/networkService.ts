import { apiRequest } from './api';
import type {
  BackendNetworkStatus,
  BackendRouteComparison,
  BackendRouteResponse,
  ExperimentResultsPayload,
  RoutingMethod,
  Topology,
  RouteResult,
} from '../types/network';

export { API_BASE_URL } from './api';

const ROUTER_LAYOUT_MAP: Record<string, { role: string; x: number; y: number }> = {
  R1: { role: 'Edge (source)', x: 0, y: 160 },
  R2: { role: 'Core', x: 250, y: 10 },
  R3: { role: 'Core', x: 250, y: 160 },
  R4: { role: 'Core', x: 250, y: 310 },
  R5: { role: 'Aggregation', x: 500, y: 60 },
  R6: { role: 'Aggregation', x: 500, y: 260 },
  R7: { role: 'Edge (destination)', x: 750, y: 160 },
};

/**
 * Fetch authoritative topology from the FastAPI backend.
 * Merges backend link attributes and live router statuses with coordinates.
 */
export async function loadTopology(): Promise<Topology> {
  const data = await apiRequest<{
    routers: Array<{ id: string; ip: string; status: string }>;
    links: Array<{
      id: string;
      source: string;
      target: string;
      latency: number;
      bandwidth: number;
      packet_loss: number;
      status: string;
    }>;
  }>('/api/network/topology');

  const routers = data.routers.map((r) => {
    const layout = ROUTER_LAYOUT_MAP[r.id] ?? { role: 'Router', x: 300, y: 150 };
    return {
      id: r.id,
      ip: r.ip,
      role: layout.role,
      x: layout.x,
      y: layout.y,
      status: r.status,
    };
  });

  const links = data.links.map((l, index) => ({
    id: l.id || `L${index + 1}`,
    source: l.source,
    target: l.target,
    latencyMs: l.latency,
    bandwidthMbps: l.bandwidth,
    packetLossPct: l.packet_loss,
    status: l.status,
  }));

  return {
    routers,
    links,
    defaultSource: 'R1',
    defaultDestination: 'R7',
  };
}

/**
 * Fetch current router and link health counts from backend.
 */
export async function fetchNetworkStatus(): Promise<BackendNetworkStatus> {
  return apiRequest<BackendNetworkStatus>('/api/network/status');
}

/**
 * Trigger router failure on the backend.
 */
export async function failRouterApi(routerId: string): Promise<{ message: string; network_status: BackendNetworkStatus }> {
  return apiRequest(`/api/network/fail/router/${routerId}`, { method: 'POST' });
}

/**
 * Trigger router restoration on the backend.
 */
export async function restoreRouterApi(routerId: string): Promise<{ message: string; network_status: BackendNetworkStatus }> {
  return apiRequest(`/api/network/restore/router/${routerId}`, { method: 'POST' });
}

/**
 * Trigger link failure on the backend.
 */
export async function failLinkApi(
  routerA: string,
  routerB: string
): Promise<{ message: string; network_status: BackendNetworkStatus }> {
  return apiRequest('/api/network/fail/link', {
    method: 'POST',
    body: JSON.stringify({ router_a: routerA, router_b: routerB }),
  });
}

/**
 * Trigger link restoration on the backend.
 */
export async function restoreLinkApi(
  routerA: string,
  routerB: string
): Promise<{ message: string; network_status: BackendNetworkStatus }> {
  return apiRequest('/api/network/restore/link', {
    method: 'POST',
    body: JSON.stringify({ router_a: routerA, router_b: routerB }),
  });
}

/**
 * Reset network topology on the backend to its initial default state.
 */
export async function resetNetworkApi(): Promise<{ message: string; network_status: BackendNetworkStatus }> {
  return apiRequest('/api/network/reset', { method: 'POST' });
}

/**
 * Request server-side route calculation using BFS, Dijkstra, or ML.
 */
export async function analyzeRouteApi(
  source: string,
  destination: string,
  method: RoutingMethod = 'bfs'
): Promise<BackendRouteResponse> {
  return apiRequest<BackendRouteResponse>('/api/routes/analyze', {
    method: 'POST',
    body: JSON.stringify({ source, destination, method }),
  });
}

/**
 * Request server-side multi-algorithm comparison (BFS vs Dijkstra vs ML) on current state.
 */
export async function compareRoutesApi(
  source: string,
  destination: string
): Promise<BackendRouteComparison> {
  return apiRequest<BackendRouteComparison>('/api/routes/compare', {
    method: 'POST',
    body: JSON.stringify({ source, destination }),
  });
}

/**
 * Fetch empirical experiment results suite.
 */
export async function fetchExperimentResults(): Promise<ExperimentResultsPayload> {
  return apiRequest<ExperimentResultsPayload>('/api/experiments/results');
}

/**
 * Execute a new live experiment suite on the backend.
 */
export async function runExperimentSuite(): Promise<ExperimentResultsPayload> {
  return apiRequest<ExperimentResultsPayload>('/api/experiments/run', { method: 'POST' }, 25000);
}

/**
 * Helper to build link IDs list for path visualization in React Flow.
 */
export function getLinkIdsForPath(topology: Topology, path: string[]): string[] {
  if (!path || path.length < 2) return [];
  const linkIds: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const link = topology.links.find(
      (l) => (l.source === u && l.target === v) || (l.source === v && l.target === u)
    );
    if (link) {
      linkIds.push(link.id);
    }
  }
  return linkIds;
}

/**
 * Convert backend route response to frontend RouteResult.
 */
export function mapBackendRouteToResult(
  routeRes: BackendRouteResponse,
  topology: Topology
): RouteResult | null {
  if (!routeRes.route_found || !routeRes.route || routeRes.route.length === 0) {
    return null;
  }
  return {
    path: routeRes.route,
    linkIds: getLinkIdsForPath(topology, routeRes.route),
    routingMethod: routeRes.routing_method,
    candidateCount: routeRes.candidate_routes_evaluated,
    metrics: {
      hops: routeRes.hops,
      latencyMs: routeRes.total_latency_ms ?? 0,
      packetLossPct: routeRes.estimated_packet_loss_percent ?? 0,
      bandwidthMbps: routeRes.bottleneck_bandwidth_mbps ?? 0,
      predictedScore: routeRes.predicted_quality_score,
    },
  };
}

export type PageId = 'overview' | 'topology' | 'simulator' | 'analysis' | 'analytics';

export type ComponentStatus = 'healthy' | 'degraded' | 'failed';
export type RouteStatus = 'optimal' | 'rerouted' | 'unreachable';
export type EventLevel = 'info' | 'success' | 'warning' | 'error';
export type RoutingMethod = 'bfs' | 'dijkstra' | 'ml';
export type PacketSimulationState = 'idle' | 'calculating' | 'running' | 'completed' | 'failed';

export interface ForwardingEntry {
  router: string;
  destination: string;
  nextHop: string;
  status: 'passed' | 'current' | 'upcoming';
}

export interface RouterInfo {
  id: string;
  ip: string;
  role: string;
  x: number;
  y: number;
  status?: string;
}

export interface LinkInfo {
  id: string;
  source: string;
  target: string;
  latencyMs: number;
  bandwidthMbps: number;
  packetLossPct: number;
  status?: string;
}

export interface Topology {
  routers: RouterInfo[];
  links: LinkInfo[];
  defaultSource: string;
  defaultDestination: string;
}

/** IDs of routers/links that are currently failed. Original definitions stay in Topology. */
export interface FailureState {
  routers: string[];
  links: string[];
}

export interface RouteMetrics {
  hops: number;
  latencyMs: number;
  packetLossPct: number;
  bandwidthMbps: number;
  predictedScore?: number | null;
}

export interface RouteResult {
  path: string[];
  linkIds: string[];
  metrics: RouteMetrics;
  routingMethod?: RoutingMethod;
  candidateCount?: number;
}

export interface HealthCounts {
  routersTotal: number;
  routersActive: number;
  linksTotal: number;
  linksActive: number;
  healthy: number;
  degraded: number;
  failed: number;
  availabilityPct: number;
  avgLatencyMs: number | null;
}

export interface SimulationSnapshot {
  route: RouteResult | null;
  alternatives: RouteResult[];
  status: RouteStatus;
  counts: HealthCounts;
}

export interface NetworkEvent {
  id: number;
  time: string;
  level: EventLevel;
  message: string;
}

export interface ToastMessage {
  id: number;
  level: EventLevel;
  message: string;
}

export interface MlPrediction {
  available: boolean;
  message: string;
  score?: number | null;
  modelName?: string;
}

export interface TrendPoint {
  time: string;
  avgLatency: number;
  peakLatency: number;
  availability: number;
  quality: number;
}

export interface DemoAnalytics {
  trend: TrendPoint[];
  baseline: { packetLossPct: number; recoveryTimeS: number };
}

// ----------------------------------------------------
// Backend API Schemas
// ----------------------------------------------------

export interface BackendNetworkStatus {
  total_routers: number;
  active_routers: number;
  failed_routers: number;
  total_links: number;
  active_links: number;
  failed_links: number;
}

export interface BackendRouteResponse {
  source: string;
  destination: string;
  route_found: boolean;
  routing_method: RoutingMethod;
  route: string[];
  hops: number;
  total_latency_ms: number | null;
  bottleneck_bandwidth_mbps: number | null;
  estimated_packet_loss_percent: number | null;
  predicted_quality_score: number | null;
  candidate_routes_evaluated: number;
  message: string | null;
}

export interface BackendCandidateRoute {
  path: string[];
  hops: number;
  total_latency_ms: number;
  bottleneck_bandwidth_mbps: number;
  estimated_packet_loss_percent: number;
  predicted_quality_score: number;
}

export interface BackendRouteComparison {
  source: string;
  destination: string;
  bfs: BackendRouteResponse;
  dijkstra: BackendRouteResponse;
  ml: BackendRouteResponse;
  candidates: BackendCandidateRoute[];
  total_feasible_candidates: number;
}

export interface ExperimentScenarioResult {
  method: string;
  route_found: boolean;
  route: string[];
  hops: number;
  total_latency_ms: number | null;
  bottleneck_bandwidth_mbps: number | null;
  estimated_packet_loss_percent: number | null;
  predicted_quality_score: number | null;
  candidate_routes_evaluated: number;
  execution_time_ms: number;
  message: string | null;
}

export interface ExperimentScenario {
  scenario_id: string;
  scenario_name: string;
  description: string;
  source: string;
  destination: string;
  results: Record<string, ExperimentScenarioResult>;
}

export interface ExperimentMethodSummary {
  avg_latency_ms: number;
  avg_hops: number;
  avg_bandwidth_mbps: number;
  avg_packet_loss_pct: number;
  avg_quality_score: number | null;
  avg_execution_time_ms: number;
  success_rate_pct: number;
}

export interface ExperimentResultsPayload {
  timestamp: string;
  total_scenarios: number;
  scenarios: ExperimentScenario[];
  summary: Record<string, ExperimentMethodSummary>;
}

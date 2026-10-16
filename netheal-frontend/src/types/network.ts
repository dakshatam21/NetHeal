export type PageId = 'overview' | 'topology' | 'simulator' | 'analysis' | 'analytics';

export type ComponentStatus = 'healthy' | 'degraded' | 'failed';
export type RouteStatus = 'optimal' | 'rerouted' | 'unreachable';
export type EventLevel = 'info' | 'success' | 'warning' | 'error';

export interface RouterInfo {
  id: string;
  ip: string;
  role: string;
  x: number;
  y: number;
}

export interface LinkInfo {
  id: string;
  source: string;
  target: string;
  latencyMs: number;
  bandwidthMbps: number;
  packetLossPct: number;
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
}

export interface RouteResult {
  path: string[];
  linkIds: string[];
  metrics: RouteMetrics;
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

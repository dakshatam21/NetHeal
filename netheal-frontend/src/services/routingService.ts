import type {
  ComponentStatus,
  FailureState,
  HealthCounts,
  LinkInfo,
  RouteResult,
  Topology,
} from '../types/network';

export const NO_FAILURES: FailureState = { routers: [], links: [] };

interface Neighbor {
  to: string;
  link: LinkInfo;
}
type Adjacency = Map<string, Neighbor[]>;

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const routeKey = (route: RouteResult): string => route.path.join('>');

/** A link is failed if flagged, or "degraded" (unusable) when one of its routers is down. */
export function getLinkStatus(link: LinkInfo, failures: FailureState): ComponentStatus {
  if (failures.links.includes(link.id)) return 'failed';
  if (failures.routers.includes(link.source) || failures.routers.includes(link.target)) return 'degraded';
  return 'healthy';
}

/** A router is failed if flagged, or degraded when it is up but has at least one unusable link. */
export function getRouterStatus(routerId: string, topology: Topology, failures: FailureState): ComponentStatus {
  if (failures.routers.includes(routerId)) return 'failed';
  const impaired = topology.links.some(
    (l) => (l.source === routerId || l.target === routerId) && getLinkStatus(l, failures) !== 'healthy',
  );
  return impaired ? 'degraded' : 'healthy';
}

export function getUsableLinks(topology: Topology, failures: FailureState): LinkInfo[] {
  return topology.links.filter((l) => getLinkStatus(l, failures) === 'healthy');
}

function buildAdjacency(links: LinkInfo[]): Adjacency {
  const adjacency: Adjacency = new Map();
  const add = (from: string, to: string, link: LinkInfo) => {
    const list = adjacency.get(from) ?? [];
    list.push({ to, link });
    adjacency.set(from, list);
  };
  for (const link of links) {
    add(link.source, link.target, link);
    add(link.target, link.source, link);
  }
  return adjacency;
}

function buildRoute(path: string[], links: LinkInfo[]): RouteResult {
  const used: LinkInfo[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const link = links.find((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a));
    if (link) used.push(link);
  }
  const survival = used.reduce((acc, l) => acc * (1 - l.packetLossPct / 100), 1);
  return {
    path,
    linkIds: used.map((l) => l.id),
    metrics: {
      hops: used.length,
      latencyMs: round(used.reduce((sum, l) => sum + l.latencyMs, 0), 1),
      packetLossPct: round((1 - survival) * 100, 2),
      bandwidthMbps: used.length > 0 ? Math.min(...used.map((l) => l.bandwidthMbps)) : 0,
    },
  };
}

/** Baseline route: breadth-first search (fewest hops) over usable links. */
export function findBaselineRoute(
  topology: Topology,
  failures: FailureState,
  source: string,
  destination: string,
): RouteResult | null {
  if (failures.routers.includes(source) || failures.routers.includes(destination)) return null;
  const usable = getUsableLinks(topology, failures);
  const adjacency = buildAdjacency(usable);
  const parent = new Map<string, string | null>([[source, null]]);
  const queue: string[] = [source];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === destination) break;
    for (const { to } of adjacency.get(current) ?? []) {
      if (!parent.has(to)) {
        parent.set(to, current);
        queue.push(to);
      }
    }
  }
  if (!parent.has(destination)) return null;

  const path: string[] = [];
  let node: string | null = destination;
  while (node !== null) {
    path.unshift(node);
    node = parent.get(node) ?? null;
  }
  return buildRoute(path, usable);
}

/** All simple paths via depth-first search, sorted by hops then latency. Fine for a 7-router graph. */
export function findAlternativeRoutes(
  topology: Topology,
  failures: FailureState,
  source: string,
  destination: string,
  limit: number,
): RouteResult[] {
  if (failures.routers.includes(source) || failures.routers.includes(destination)) return [];
  const usable = getUsableLinks(topology, failures);
  const adjacency = buildAdjacency(usable);
  const found: string[][] = [];

  const walk = (node: string, visited: string[]) => {
    if (node === destination) {
      found.push(visited);
      return;
    }
    for (const { to } of adjacency.get(node) ?? []) {
      if (!visited.includes(to)) walk(to, [...visited, to]);
    }
  };
  walk(source, [source]);

  return found
    .map((p) => buildRoute(p, usable))
    .sort((a, b) => a.metrics.hops - b.metrics.hops || a.metrics.latencyMs - b.metrics.latencyMs)
    .slice(0, limit);
}

/** Percentage of router pairs that can still reach each other (failed routers reach nobody). */
function connectedPairPercent(topology: Topology, failures: FailureState): number {
  const n = topology.routers.length;
  const totalPairs = (n * (n - 1)) / 2;
  if (totalPairs === 0) return 100;
  const adjacency = buildAdjacency(getUsableLinks(topology, failures));
  const seen = new Set<string>();
  let connectedPairs = 0;

  for (const router of topology.routers) {
    if (seen.has(router.id) || failures.routers.includes(router.id)) continue;
    let size = 0;
    const stack = [router.id];
    seen.add(router.id);
    while (stack.length > 0) {
      const current = stack.pop() as string;
      size++;
      for (const { to } of adjacency.get(current) ?? []) {
        if (!seen.has(to)) {
          seen.add(to);
          stack.push(to);
        }
      }
    }
    connectedPairs += (size * (size - 1)) / 2;
  }
  return round((connectedPairs / totalPairs) * 100, 1);
}

export function computeHealthCounts(topology: Topology, failures: FailureState): HealthCounts {
  const routerStatuses = topology.routers.map((r) => getRouterStatus(r.id, topology, failures));
  const linkStatuses = topology.links.map((l) => getLinkStatus(l, failures));
  const all = [...routerStatuses, ...linkStatuses];
  const usable = getUsableLinks(topology, failures);

  return {
    routersTotal: topology.routers.length,
    routersActive: routerStatuses.filter((s) => s !== 'failed').length,
    linksTotal: topology.links.length,
    linksActive: usable.length,
    healthy: all.filter((s) => s === 'healthy').length,
    degraded: all.filter((s) => s === 'degraded').length,
    failed: all.filter((s) => s === 'failed').length,
    availabilityPct: connectedPairPercent(topology, failures),
    avgLatencyMs:
      usable.length > 0 ? round(usable.reduce((sum, l) => sum + l.latencyMs, 0) / usable.length, 1) : null,
  };
}

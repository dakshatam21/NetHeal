import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadTopology, simulateNetwork } from '../services/networkService';
import { NO_FAILURES, routeKey } from '../services/routingService';
import type {
  EventLevel,
  FailureState,
  NetworkEvent,
  SimulationSnapshot,
  ToastMessage,
  Topology,
} from '../types/network';

interface NetworkContextValue {
  topology: Topology;
  failures: FailureState;
  source: string;
  destination: string;
  selectedRouterId: string | null;
  snapshot: SimulationSnapshot;
  events: NetworkEvent[];
  toasts: ToastMessage[];
  lastUpdated: Date;
  setSource: (id: string) => void;
  setDestination: (id: string) => void;
  selectRouter: (id: string | null) => void;
  failRouter: (id: string) => void;
  restoreRouter: (id: string) => void;
  failLink: (id: string) => void;
  restoreLink: (id: string) => void;
  clearFailures: () => void;
  resetSimulation: () => void;
  dismissToast: (id: number) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used inside <NetworkProvider>');
  return ctx;
}

let nextId = 1;
const makeEvent = (level: EventLevel, message: string): NetworkEvent => ({
  id: nextId++,
  time: new Date().toLocaleTimeString('en-GB'),
  level,
  message,
});

function initialEvents(topology: Topology): NetworkEvent[] {
  const first = simulateNetwork(topology, NO_FAILURES, topology.defaultSource, topology.defaultDestination);
  const routeText = first.route ? first.route.path.join(' → ') : 'none';
  return [
    makeEvent('info', `Baseline route computed (BFS): ${routeText}`),
    makeEvent('success', `Network initialized: ${topology.routers.length} routers, ${topology.links.length} links`),
  ];
}

function describeRouteChange(
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  source: string,
  destination: string,
): { level: EventLevel; message: string } | null {
  const route = after.route;
  if (!route) {
    return before.route
      ? { level: 'error', message: `DESTINATION UNREACHABLE — no path from ${source} to ${destination}` }
      : null;
  }
  const changed = !before.route || routeKey(before.route) !== routeKey(route);
  if (!changed) return null;
  const pathText = route.path.join(' → ');
  if (!before.route) return { level: 'success', message: `Connectivity restored via ${pathText}` };
  if (after.status === 'optimal') return { level: 'success', message: `Baseline route restored: ${pathText}` };
  return { level: 'warning', message: `Alternative path selected: ${pathText}` };
}

/** Loads the topology through the service layer, then mounts the simulation state. */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadTopology()
      .then((t) => {
        if (active) setTopology(t);
      })
      .catch((e: unknown) => {
        if (active) setLoadError(e instanceof Error ? e.message : 'Unknown error');
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <div className="boot-screen">Failed to load topology: {loadError}</div>;
  if (!topology) return <div className="boot-screen">Loading topology…</div>;
  return <SimulationProvider topology={topology}>{children}</SimulationProvider>;
}

function SimulationProvider({ topology, children }: { topology: Topology; children: ReactNode }) {
  const [failures, setFailures] = useState<FailureState>(NO_FAILURES);
  const [source, setSourceState] = useState(topology.defaultSource);
  const [destination, setDestinationState] = useState(topology.defaultDestination);
  const [selectedRouterId, setSelectedRouterId] = useState<string | null>(null);
  const [events, setEvents] = useState<NetworkEvent[]>(() => initialEvents(topology));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const snapshot = useMemo(
    () => simulateNetwork(topology, failures, source, destination),
    [topology, failures, source, destination],
  );

  const pushEvents = useCallback((entries: NetworkEvent[]) => {
    // entries are chronological; the feed shows newest first
    setEvents((prev) => [...[...entries].reverse(), ...prev].slice(0, 50));
  }, []);

  const pushToast = useCallback((level: EventLevel, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, level, message }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyChange = useCallback(
    (next: FailureState, headline: string, headlineLevel: EventLevel) => {
      const after = simulateNetwork(topology, next, source, destination);
      const entries: NetworkEvent[] = [makeEvent(headlineLevel, headline)];
      const follow = describeRouteChange(snapshot, after, source, destination);
      if (follow) entries.push(makeEvent(follow.level, follow.message));

      const toastEntry = entries[entries.length - 1];
      setFailures(next);
      pushEvents(entries);
      pushToast(toastEntry.level, toastEntry.message);
      setLastUpdated(new Date());
    },
    [topology, source, destination, snapshot, pushEvents, pushToast],
  );

  const changeComponent = useCallback(
    (kind: 'router' | 'link', id: string, action: 'fail' | 'restore') => {
      const exists =
        kind === 'router' ? topology.routers.some((r) => r.id === id) : topology.links.some((l) => l.id === id);
      const label = kind === 'router' ? `Router ${id}` : `Link ${id}`;
      if (!exists) {
        pushToast('error', `${label} does not exist.`);
        return;
      }
      const list = kind === 'router' ? failures.routers : failures.links;
      const isFailed = list.includes(id);
      if (action === 'fail' && isFailed) {
        pushToast('warning', `${label} is already failed.`);
        return;
      }
      if (action === 'restore' && !isFailed) {
        pushToast('warning', `${label} is already operational.`);
        return;
      }
      const nextList = action === 'fail' ? [...list, id] : list.filter((x) => x !== id);
      const next: FailureState =
        kind === 'router' ? { ...failures, routers: nextList } : { ...failures, links: nextList };
      applyChange(
        next,
        action === 'fail' ? `${label} marked as failed` : `${label} restored`,
        action === 'fail' ? 'warning' : 'success',
      );
    },
    [topology, failures, applyChange, pushToast],
  );

  const failRouter = useCallback((id: string) => changeComponent('router', id, 'fail'), [changeComponent]);
  const restoreRouter = useCallback((id: string) => changeComponent('router', id, 'restore'), [changeComponent]);
  const failLink = useCallback((id: string) => changeComponent('link', id, 'fail'), [changeComponent]);
  const restoreLink = useCallback((id: string) => changeComponent('link', id, 'restore'), [changeComponent]);

  const clearFailures = useCallback(() => {
    if (failures.routers.length + failures.links.length === 0) {
      pushToast('info', 'There are no active failures to clear.');
      return;
    }
    applyChange(NO_FAILURES, 'All failures cleared', 'success');
  }, [failures, applyChange, pushToast]);

  const setEndpoints = useCallback(
    (nextSource: string, nextDestination: string) => {
      const valid = (id: string) => topology.routers.some((r) => r.id === id);
      if (!valid(nextSource) || !valid(nextDestination)) return;
      if (nextSource === source && nextDestination === destination) return;
      setSourceState(nextSource);
      setDestinationState(nextDestination);
      const after = simulateNetwork(topology, failures, nextSource, nextDestination);
      pushEvents([
        after.route
          ? makeEvent('info', `Route evaluated ${nextSource} → ${nextDestination}: ${after.route.path.join(' → ')}`)
          : makeEvent('error', `DESTINATION UNREACHABLE — no path from ${nextSource} to ${nextDestination}`),
      ]);
      setLastUpdated(new Date());
    },
    [topology, failures, source, destination, pushEvents],
  );

  // Choosing the other endpoint's router swaps them, so source and destination are never equal.
  const setSource = useCallback(
    (id: string) => setEndpoints(id, id === destination ? source : destination),
    [setEndpoints, source, destination],
  );
  const setDestination = useCallback(
    (id: string) => setEndpoints(id === source ? destination : source, id),
    [setEndpoints, source, destination],
  );

  const selectRouter = useCallback((id: string | null) => setSelectedRouterId(id), []);

  const resetSimulation = useCallback(() => {
    const base = initialEvents(topology);
    setFailures(NO_FAILURES);
    setSourceState(topology.defaultSource);
    setDestinationState(topology.defaultDestination);
    setSelectedRouterId(null);
    setEvents([makeEvent('info', 'Simulation reset to initial topology'), ...base]);
    setLastUpdated(new Date());
    pushToast('success', 'Simulation reset to initial topology.');
  }, [topology, pushToast]);

  const value: NetworkContextValue = {
    topology,
    failures,
    source,
    destination,
    selectedRouterId,
    snapshot,
    events,
    toasts,
    lastUpdated,
    setSource,
    setDestination,
    selectRouter,
    failRouter,
    restoreRouter,
    failLink,
    restoreLink,
    clearFailures,
    resetSimulation,
    dismissToast,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

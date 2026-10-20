import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  analyzeRouteApi,
  compareRoutesApi,
  failLinkApi,
  failRouterApi,
  loadTopology,
  mapBackendRouteToResult,
  resetNetworkApi,
  restoreLinkApi,
  restoreRouterApi,
} from '../services/networkService';
import { computeHealthCounts } from '../services/routingService';
import type {
  BackendCandidateRoute,
  BackendNetworkStatus,
  EventLevel,
  FailureState,
  HealthCounts,
  NetworkEvent,
  RouteResult,
  RouteStatus,
  RoutingMethod,
  SimulationSnapshot,
  ToastMessage,
  Topology,
} from '../types/network';

interface NetworkContextValue {
  topology: Topology;
  failures: FailureState;
  source: string;
  destination: string;
  routingMethod: RoutingMethod;
  algorithm: RoutingMethod;
  selectedRouterId: string | null;
  snapshot: SimulationSnapshot;
  candidates: BackendCandidateRoute[];
  events: NetworkEvent[];
  toasts: ToastMessage[];
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: Date;
  healthStatus: BackendNetworkStatus | null;
  setSource: (id: string) => void;
  setDestination: (id: string) => void;
  setRoutingMethod: (method: RoutingMethod) => void;
  setAlgorithm: (method: RoutingMethod) => void;
  selectRouter: (id: string | null) => void;
  failRouter: (id: string) => Promise<void>;
  restoreRouter: (id: string) => Promise<void>;
  failLink: (id: string) => Promise<void>;
  restoreLink: (id: string) => Promise<void>;
  clearFailures: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  dismissToast: (id: number) => void;
  reconnect: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used inside <NetworkProvider>');
  return ctx;
}

let nextEventId = 1;
const makeEvent = (level: EventLevel, message: string): NetworkEvent => ({
  id: nextEventId++,
  time: new Date().toLocaleTimeString('en-GB'),
  level,
  message,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failures, setFailures] = useState<FailureState>({ routers: [], links: [] });
  const [source, setSourceState] = useState<string>('R1');
  const [destination, setDestinationState] = useState<string>('R7');
  const [routingMethod, setRoutingMethodState] = useState<RoutingMethod>('bfs');
  const [selectedRouterId, setSelectedRouterId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [alternatives, setAlternatives] = useState<RouteResult[]>([]);
  const [candidates, setCandidates] = useState<BackendCandidateRoute[]>([]);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('optimal');
  const [healthStatus, setHealthStatus] = useState<BackendNetworkStatus | null>(null);
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const lastMutationTimeRef = useRef<number>(0);

  const pushEvents = useCallback((entries: NetworkEvent[]) => {
    setEvents((prev) => [...[...entries].reverse(), ...prev].slice(0, 50));
  }, []);

  const pushToast = useCallback((level: EventLevel, message: string) => {
    const id = nextEventId++;
    setToasts((prev) => [...prev.slice(-2), { id, level, message }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Compute live route and alternatives from backend with isolated error handling
  const evaluateRoutes = useCallback(
    async (
      currentTopology: Topology,
      src: string,
      dst: string,
      method: RoutingMethod
    ): Promise<boolean> => {
      try {
        const [routeResult, compareResult] = await Promise.allSettled([
          analyzeRouteApi(src, dst, method),
          compareRoutesApi(src, dst),
        ]);

        let hasActiveSuccess = false;

        if (routeResult.status === 'fulfilled') {
          hasActiveSuccess = true;
          const routeRes = routeResult.value;
          const mappedMain = mapBackendRouteToResult(routeRes, currentTopology);
          setActiveRoute(mappedMain);

          if (!routeRes.route_found) {
            setRouteStatus('unreachable');
          } else {
            setRouteStatus('optimal');
          }
        } else {
          const err = routeResult.reason;
          const msg = err instanceof Error ? err.message : 'Route calculation failed';
          pushToast('error', `Route analysis error: ${msg}`);
        }

        if (compareResult.status === 'fulfilled') {
          hasActiveSuccess = true;
          const compareRes = compareResult.value;
          setCandidates(compareRes.candidates || []);

          // Derive alternative routes from compare response candidates
          const altRoutes: RouteResult[] = (compareRes.candidates || []).slice(0, 6).map((c) => ({
            path: c.path,
            linkIds: currentTopology.links
              .filter((l) => {
                for (let i = 0; i < c.path.length - 1; i++) {
                  if (
                    (l.source === c.path[i] && l.target === c.path[i + 1]) ||
                    (l.source === c.path[i + 1] && l.target === c.path[i])
                  ) {
                    return true;
                  }
                }
                return false;
              })
              .map((l) => l.id),
            routingMethod: method,
            metrics: {
              hops: c.hops,
              latencyMs: c.total_latency_ms,
              packetLossPct: c.estimated_packet_loss_percent,
              bandwidthMbps: c.bottleneck_bandwidth_mbps,
              predictedScore: c.predicted_quality_score,
            },
          }));

          setAlternatives(altRoutes);

          if (routeResult.status === 'fulfilled' && routeResult.value.route_found) {
            const mainPath = routeResult.value.route.join('-');
            if (altRoutes.length > 0 && altRoutes[0].path.join('-') === mainPath) {
              setRouteStatus('optimal');
            } else {
              setRouteStatus('rerouted');
            }
          }
        } else {
          // Compare failed (e.g. optional ML failure or server delay), but never erase successful main route!
          console.warn('Comparison service warning:', compareResult.reason);
        }

        if (hasActiveSuccess) {
          setIsConnected(true);
          return true;
        } else {
          setIsConnected(false);
          pushToast('error', 'Routing service unreachable.');
          return false;
        }
      } catch (err: unknown) {
        setIsConnected(false);
        const msg = err instanceof Error ? err.message : 'Backend connection error';
        pushToast('error', `Routing analysis failed: ${msg}`);
        return false;
      }
    },
    [pushToast]
  );

  // Initialize network and load topology
  const initApp = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const topo = await loadTopology();
      setTopology(topo);
      setSourceState(topo.defaultSource);
      setDestinationState(topo.defaultDestination);

      // Track initial failed routers and links from backend
      const failedR = topo.routers.filter((r) => r.status === 'failed').map((r) => r.id);
      const failedL = topo.links.filter((l) => l.status === 'failed').map((l) => l.id);
      setFailures({ routers: failedR, links: failedL });

      const routeSuccess = await evaluateRoutes(topo, topo.defaultSource, topo.defaultDestination, routingMethod);

      if (!routeSuccess) {
        setIsConnected(false);
        setLoadError('Failed to initialize active routes from backend.');
        setEvents([
          makeEvent('warning', 'Topology loaded, but initial route evaluation failed. Check backend status.'),
        ]);
        return;
      }

      setEvents([
        makeEvent('success', `Live backend connected: ${topo.routers.length} routers, ${topo.links.length} links loaded.`),
        makeEvent('info', `Initial routing method active: ${routingMethod.toUpperCase()}`),
      ]);
      setIsConnected(true);
    } catch (err: unknown) {
      setIsConnected(false);
      setLoadError(err instanceof Error ? err.message : 'Could not connect to FastAPI backend.');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [evaluateRoutes, routingMethod]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Handle router failure
  const failRouter = useCallback(
    async (id: string) => {
      if (!topology) return;
      lastMutationTimeRef.current = Date.now();
      setIsLoading(true);
      try {
        const res = await failRouterApi(id);
        setFailures((prev) => ({
          ...prev,
          routers: prev.routers.includes(id) ? prev.routers : [...prev.routers, id],
        }));
        setHealthStatus(res.network_status);

        // Update topology node status
        setTopology((prev) =>
          prev
            ? {
                ...prev,
                routers: prev.routers.map((r) => (r.id === id ? { ...r, status: 'failed' } : r)),
              }
            : null
        );

        pushEvents([makeEvent('warning', `Router ${id} failed (authoritative backend state)`)]);
        pushToast('warning', `Router ${id} marked as failed`);

        await evaluateRoutes(topology, source, destination, routingMethod);
      } catch (err: unknown) {
        pushToast('error', err instanceof Error ? err.message : `Failed to fail router ${id}`);
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    },
    [topology, source, destination, routingMethod, pushEvents, pushToast, evaluateRoutes]
  );

  // Handle router restoration
  const restoreRouter = useCallback(
    async (id: string) => {
      if (!topology) return;
      lastMutationTimeRef.current = Date.now();
      setIsLoading(true);
      try {
        const res = await restoreRouterApi(id);
        setFailures((prev) => ({
          ...prev,
          routers: prev.routers.filter((r) => r !== id),
        }));
        setHealthStatus(res.network_status);

        setTopology((prev) =>
          prev
            ? {
                ...prev,
                routers: prev.routers.map((r) => (r.id === id ? { ...r, status: 'active' } : r)),
              }
            : null
        );

        pushEvents([makeEvent('success', `Router ${id} restored to active service`)]);
        pushToast('success', `Router ${id} restored`);

        await evaluateRoutes(topology, source, destination, routingMethod);
      } catch (err: unknown) {
        pushToast('error', err instanceof Error ? err.message : `Failed to restore router ${id}`);
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    },
    [topology, source, destination, routingMethod, pushEvents, pushToast, evaluateRoutes]
  );

  // Parse link endpoints from link ID or topology
  const resolveLinkEndpoints = useCallback(
    (id: string): [string, string] | null => {
      if (!topology) return null;
      const link = topology.links.find((l) => l.id === id);
      if (link) return [link.source, link.target];
      if (id.includes('-')) {
        const parts = id.split('-');
        return [parts[0], parts[1]];
      }
      return null;
    },
    [topology]
  );

  // Handle link failure
  const failLink = useCallback(
    async (id: string) => {
      if (!topology) return;
      const endpoints = resolveLinkEndpoints(id);
      if (!endpoints) {
        pushToast('error', `Could not resolve endpoints for link ${id}`);
        return;
      }
      const [u, v] = endpoints;
      lastMutationTimeRef.current = Date.now();
      setIsLoading(true);
      try {
        const res = await failLinkApi(u, v);
        setFailures((prev) => ({
          ...prev,
          links: prev.links.includes(id) ? prev.links : [...prev.links, id],
        }));
        setHealthStatus(res.network_status);

        setTopology((prev) =>
          prev
            ? {
                ...prev,
                links: prev.links.map((l) => (l.id === id ? { ...l, status: 'failed' } : l)),
              }
            : null
        );

        pushEvents([makeEvent('warning', `Link ${u}-${v} failed`)]);
        pushToast('warning', `Link ${u}-${v} failed`);

        await evaluateRoutes(topology, source, destination, routingMethod);
      } catch (err: unknown) {
        pushToast('error', err instanceof Error ? err.message : `Failed to fail link ${id}`);
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    },
    [topology, resolveLinkEndpoints, source, destination, routingMethod, pushEvents, pushToast, evaluateRoutes]
  );

  // Handle link restoration
  const restoreLink = useCallback(
    async (id: string) => {
      if (!topology) return;
      const endpoints = resolveLinkEndpoints(id);
      if (!endpoints) {
        pushToast('error', `Could not resolve endpoints for link ${id}`);
        return;
      }
      const [u, v] = endpoints;
      lastMutationTimeRef.current = Date.now();
      setIsLoading(true);
      try {
        const res = await restoreLinkApi(u, v);
        setFailures((prev) => ({
          ...prev,
          links: prev.links.filter((l) => l !== id),
        }));
        setHealthStatus(res.network_status);

        setTopology((prev) =>
          prev
            ? {
                ...prev,
                links: prev.links.map((l) => (l.id === id ? { ...l, status: 'active' } : l)),
              }
            : null
        );

        pushEvents([makeEvent('success', `Link ${u}-${v} restored`)]);
        pushToast('success', `Link ${u}-${v} restored`);

        await evaluateRoutes(topology, source, destination, routingMethod);
      } catch (err: unknown) {
        pushToast('error', err instanceof Error ? err.message : `Failed to restore link ${id}`);
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    },
    [topology, resolveLinkEndpoints, source, destination, routingMethod, pushEvents, pushToast, evaluateRoutes]
  );

  // Clear all failures
  const clearFailures = useCallback(async () => {
    if (!topology) return;
    lastMutationTimeRef.current = Date.now();
    setIsLoading(true);
    try {
      await resetNetworkApi();
      const fresh = await loadTopology();
      setTopology(fresh);
      setFailures({ routers: [], links: [] });
      pushEvents([makeEvent('success', 'All simulated failures cleared')]);
      pushToast('success', 'All failures cleared');
      await evaluateRoutes(fresh, source, destination, routingMethod);
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to clear failures');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [topology, source, destination, routingMethod, pushEvents, pushToast, evaluateRoutes]);

  // Reset entire simulation
  const resetSimulation = useCallback(async () => {
    lastMutationTimeRef.current = Date.now();
    setIsLoading(true);
    try {
      await resetNetworkApi();
      const fresh = await loadTopology();
      setTopology(fresh);
      setFailures({ routers: [], links: [] });
      setSourceState(fresh.defaultSource);
      setDestinationState(fresh.defaultDestination);
      setSelectedRouterId(null);
      pushEvents([makeEvent('info', 'Simulation reset to authoritative default topology')]);
      pushToast('success', 'Network simulation reset successfully');
      await evaluateRoutes(fresh, fresh.defaultSource, fresh.defaultDestination, routingMethod);
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [routingMethod, pushEvents, pushToast, evaluateRoutes]);

  // Set endpoints
  const setSource = useCallback(
    (nextSource: string) => {
      if (!topology) return;
      if (nextSource === source) return;
      const nextDest = nextSource === destination ? source : destination;
      setSourceState(nextSource);
      setDestinationState(nextDest);
      evaluateRoutes(topology, nextSource, nextDest, routingMethod);
    },
    [topology, source, destination, routingMethod, evaluateRoutes]
  );

  const setDestination = useCallback(
    (nextDest: string) => {
      if (!topology) return;
      if (nextDest === destination) return;
      const nextSrc = nextDest === source ? destination : source;
      setSourceState(nextSrc);
      setDestinationState(nextDest);
      evaluateRoutes(topology, nextSrc, nextDest, routingMethod);
    },
    [topology, source, destination, routingMethod, evaluateRoutes]
  );

  // Set algorithm method (BFS / Dijkstra / ML)
  const setRoutingMethod = useCallback(
    (method: RoutingMethod) => {
      setRoutingMethodState(method);
      if (topology) {
        evaluateRoutes(topology, source, destination, method);
        pushEvents([makeEvent('info', `Routing algorithm switched to: ${method.toUpperCase()}`)]);
      }
    },
    [topology, source, destination, evaluateRoutes, pushEvents]
  );

  // Health counts computed from topology and failures using authoritative reachability and link status
  const counts: HealthCounts = useMemo(() => {
    if (!topology) {
      return {
        routersTotal: 0,
        routersActive: 0,
        linksTotal: 0,
        linksActive: 0,
        healthy: 0,
        degraded: 0,
        failed: 0,
        availabilityPct: 100,
        avgLatencyMs: null,
      };
    }
    return computeHealthCounts(topology, failures);
  }, [topology, failures]);

  // Multi-client synchronization: non-intrusive background polling every 6 seconds
  useEffect(() => {
    if (!isConnected || isLoading) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastMutationTimeRef.current < 4000) {
        return;
      }
      try {
        const fresh = await loadTopology();
        const serverFailedR = fresh.routers.filter((r) => r.status === 'failed').map((r) => r.id);
        const serverFailedL = fresh.links.filter((l) => l.status === 'failed').map((l) => l.id);

        const currentRStr = failures.routers.slice().sort().join(',');
        const serverRStr = serverFailedR.slice().sort().join(',');
        const currentLStr = failures.links.slice().sort().join(',');
        const serverLStr = serverFailedL.slice().sort().join(',');

        if (currentRStr !== serverRStr || currentLStr !== serverLStr) {
          if (Date.now() - lastMutationTimeRef.current < 4000) return;
          setFailures({ routers: serverFailedR, links: serverFailedL });
          setTopology(fresh);
          evaluateRoutes(fresh, source, destination, routingMethod);
        }
      } catch {
        // Suppress non-blocking background polling errors
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isConnected, isLoading, failures, source, destination, routingMethod, evaluateRoutes]);

  const snapshot: SimulationSnapshot = useMemo(
    () => ({
      route: activeRoute,
      alternatives,
      status: routeStatus,
      counts,
    }),
    [activeRoute, alternatives, routeStatus, counts]
  );

  const contextValue: NetworkContextValue = {
    topology: topology || {
      routers: [],
      links: [],
      defaultSource: 'R1',
      defaultDestination: 'R7',
    },
    failures,
    source,
    destination,
    routingMethod,
    algorithm: routingMethod,
    selectedRouterId,
    snapshot,
    candidates,
    events,
    toasts,
    isConnected,
    isLoading,
    lastUpdated,
    healthStatus,
    setSource,
    setDestination,
    setRoutingMethod,
    setAlgorithm: setRoutingMethod,
    selectRouter: setSelectedRouterId,
    failRouter,
    restoreRouter,
    failLink,
    restoreLink,
    clearFailures,
    resetSimulation,
    dismissToast,
    reconnect: initApp,
  };

  if (loadError && !topology) {
    return (
      <div className="boot-screen" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#FF5C70', marginBottom: '1rem' }}>Backend Disconnected</h2>
        <p style={{ color: '#91A6BB', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          Unable to connect to the NetHeal FastAPI backend at <code>http://localhost:8000</code>.
          <br />
          Make sure the backend is running with <code>uvicorn main:app --reload</code>.
        </p>
        <button
          className="btn btn--primary"
          onClick={initApp}
          style={{ padding: '0.6rem 1.4rem', cursor: 'pointer' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!topology) {
    return <div className="boot-screen">Connecting to NetHeal backend…</div>;
  }

  return <NetworkContext.Provider value={contextValue}>{children}</NetworkContext.Provider>;
}

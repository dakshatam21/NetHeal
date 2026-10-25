import { useState } from 'react';
import { Play, RotateCcw, Square, Zap, ZapOff } from 'lucide-react';
import { Panel } from '../components/common/Panel';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventFeed } from '../components/network/EventFeed';
import { FailureList } from '../components/network/FailureList';
import { NetworkGraph } from '../components/network/NetworkGraph';
import { RoutePath } from '../components/network/RoutePath';
import { useNetwork } from '../context/NetworkContext';

export function FailureSimulatorPage() {
  const {
    topology,
    failures,
    snapshot,
    source,
    destination,
    algorithm,
    failRouter,
    restoreRouter,
    failLink,
    restoreLink,
    clearFailures,
    simulationState,
    runSimulation,
    stopSimulation,
  } = useNetwork();
  const { route, status, counts } = snapshot;

  const isRunning = simulationState === 'running';

  const [routerChoice, setRouterChoice] = useState(topology.routers[0].id);
  const [linkChoice, setLinkChoice] = useState(topology.links[0].id);

  const routerFailed = failures.routers.includes(routerChoice);
  const linkFailed = failures.links.includes(linkChoice);
  const anyFailure = failures.routers.length + failures.links.length > 0;

  return (
    <div className="page">
      <div className="sim-layout">
        <Panel title="Failure Controls" tag="INJECT / RESTORE">
          <div className="control-group">
            <label className="label" htmlFor="sim-router">
              Router
            </label>
            <select id="sim-router" className="select mono" value={routerChoice} onChange={(e) => setRouterChoice(e.target.value)}>
              {topology.routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.ip}
                  {failures.routers.includes(r.id) ? ' (FAILED)' : ''}
                </option>
              ))}
            </select>
            <div className="btn-row">
              <button type="button" className="btn btn--danger btn--sm" disabled={routerFailed} onClick={() => failRouter(routerChoice)}>
                <ZapOff size={14} /> Fail router
              </button>
              <button type="button" className="btn btn--primary btn--sm" disabled={!routerFailed} onClick={() => restoreRouter(routerChoice)}>
                <Zap size={14} /> Restore router
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="label" htmlFor="sim-link">
              Link
            </label>
            <select id="sim-link" className="select mono" value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)}>
              {topology.links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} — {l.source}–{l.target} ({l.latencyMs} ms)
                  {failures.links.includes(l.id) ? ' (FAILED)' : ''}
                </option>
              ))}
            </select>
            <div className="btn-row">
              <button type="button" className="btn btn--danger btn--sm" disabled={linkFailed} onClick={() => failLink(linkChoice)}>
                <ZapOff size={14} /> Fail link
              </button>
              <button type="button" className="btn btn--primary btn--sm" disabled={!linkFailed} onClick={() => restoreLink(linkChoice)}>
                <Zap size={14} /> Restore link
              </button>
            </div>
          </div>

          <button type="button" className="btn btn--ghost btn--sm btn--block" disabled={!anyFailure} onClick={clearFailures}>
            <RotateCcw size={14} /> Reset all failures
          </button>
        </Panel>

        <Panel title="Live Topology" tag="SIMULATED" className="panel--flush">
          <NetworkGraph height={440} />
        </Panel>
      </div>

      <div className="sim-lower">
        <Panel title="Active Failures" tag={`${failures.routers.length + failures.links.length} ACTIVE`}>
          <FailureList />
        </Panel>

        <Panel title="Connectivity & Route Status">
          {status === 'unreachable' && (
            <div className="alert alert--bad" role="alert">
              <strong>DESTINATION UNREACHABLE</strong>
              <span>
                No usable path from {source} to {destination}. Restore a component to recover connectivity.
              </span>
            </div>
          )}
          <dl className="kv">
            <dt>Endpoints</dt>
            <dd className="mono">
              {source} → {destination}
            </dd>
            <dt>Active route ({algorithm})</dt>
            <dd>
              <RoutePath path={route?.path ?? null} />
            </dd>
            <dt>Status</dt>
            <dd>
              <StatusBadge status={status} />
            </dd>
            <dt>Active routers</dt>
            <dd className="mono">
              {counts.routersActive}/{counts.routersTotal}
            </dd>
            <dt>Active links</dt>
            <dd className="mono">
              {counts.linksActive}/{counts.linksTotal}
            </dd>
            <dt>Availability</dt>
            <dd className="mono">{counts.availabilityPct.toFixed(1)} %</dd>
            <dt>ML Routing Engine</dt>
            <dd className="mono">
              {algorithm === 'ml' && route?.metrics?.predictedScore != null ? (
                <span className="text-accent">Active (Quality: {route.metrics.predictedScore.toFixed(2)})</span>
              ) : (
                <span className="muted">Ready (Random Forest Regressor)</span>
              )}
            </dd>
          </dl>
          <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
            {!isRunning ? (
              <button
                type="button"
                className="btn btn--primary btn--sm btn--block"
                onClick={runSimulation}
                disabled={status === 'unreachable'}
              >
                <Play size={14} fill="currentColor" /> Run Packet Simulation Along Active Route
              </button>
            ) : (
              <button type="button" className="btn btn--danger btn--sm btn--block" onClick={stopSimulation}>
                <Square size={14} fill="currentColor" /> Stop Packet Simulation
              </button>
            )}
          </div>
        </Panel>

        <Panel title="Event Feed" tag="TIMESTAMPED">
          <EventFeed limit={10} />
        </Panel>
      </div>
    </div>
  );
}

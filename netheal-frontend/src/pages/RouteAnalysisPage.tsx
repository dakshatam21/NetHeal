import { Cable, Cpu, Gauge, Layers, Percent } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { Panel } from '../components/common/Panel';
import { StatusBadge } from '../components/common/StatusBadge';
import { EndpointSelector } from '../components/network/EndpointSelector';
import { FailureList } from '../components/network/FailureList';
import { MetricCard } from '../components/network/MetricCard';
import { RoutePath } from '../components/network/RoutePath';
import { useNetwork } from '../context/NetworkContext';
import { getMlPrediction } from '../services/networkService';
import { routeKey } from '../services/routingService';

export function RouteAnalysisPage() {
  const { snapshot, source, destination } = useNetwork();
  const { route, alternatives, status } = snapshot;
  const ml = getMlPrediction();

  const bestLatency = alternatives.length > 0 ? Math.min(...alternatives.map((a) => a.metrics.latencyMs)) : null;

  return (
    <div className="page">
      <Panel title="Route Selection">
        <EndpointSelector idPrefix="analysis" />
      </Panel>

      {status === 'unreachable' && (
        <div className="alert alert--bad" role="alert">
          <strong>DESTINATION UNREACHABLE</strong>
          <span>
            No feasible route from {source} to {destination}. Restore the failed components below to recover a path.
          </span>
          <FailureList />
        </div>
      )}

      <Panel title="Baseline Route" tag="IMPLEMENTED · BFS SHORTEST-HOP">
        <div className="baseline-head">
          <RoutePath path={route?.path ?? null} />
          <StatusBadge status={status} label={status === 'unreachable' ? 'Unreachable' : status} />
        </div>
        {route ? (
          <div className="stat-grid">
            <MetricCard label="Hop count" value={String(route.metrics.hops)} icon={<Layers size={16} />} />
            <MetricCard label="Latency" value={route.metrics.latencyMs.toFixed(1)} unit="ms" hint="Simulated, summed over links" icon={<Gauge size={16} />} />
            <MetricCard label="Packet loss" value={route.metrics.packetLossPct.toFixed(2)} unit="%" hint="Simulated, compounded" icon={<Percent size={16} />} />
            <MetricCard label="Bandwidth" value={String(route.metrics.bandwidthMbps)} unit="Mbps" hint="Simulated bottleneck link" icon={<Cable size={16} />} />
          </div>
        ) : (
          <p className="hint">Route metrics are unavailable while the destination is unreachable.</p>
        )}
      </Panel>

      <Panel title="Route Comparison" tag="SIMULATED METRICS">
        {alternatives.length === 0 ? (
          <EmptyState title="No feasible routes" message="Every path between the selected routers is currently blocked by failures." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Route</th>
                  <th>Hops</th>
                  <th>Latency</th>
                  <th>Loss</th>
                  <th>Bandwidth</th>
                  <th>Tag</th>
                </tr>
              </thead>
              <tbody>
                {alternatives.map((r, i) => {
                  const isBaseline = route !== null && routeKey(r) === routeKey(route);
                  const isLowest = r.metrics.latencyMs === bestLatency;
                  return (
                    <tr key={routeKey(r)} className={isBaseline ? 'row--baseline' : undefined}>
                      <td className="mono">{i + 1}</td>
                      <td>
                        <RoutePath path={r.path} />
                      </td>
                      <td className="mono">{r.metrics.hops}</td>
                      <td className="mono">{r.metrics.latencyMs.toFixed(1)} ms</td>
                      <td className="mono">{r.metrics.packetLossPct.toFixed(2)} %</td>
                      <td className="mono">{r.metrics.bandwidthMbps} Mbps</td>
                      <td>
                        <span className="tag-row">
                          {isBaseline && <StatusBadge status="info" label="Baseline" />}
                          {isLowest && <StatusBadge status="healthy" label="Lowest latency" />}
                          {!isBaseline && !isLowest && <StatusBadge status="muted" label="Alternative" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">
          The baseline minimises hop count only, so a longer route can have lower latency. This is exactly the gap an ML-assisted
          router is meant to explore.
        </p>
      </Panel>

      <section className="ml-placeholder" aria-label="ML-assisted routing placeholder">
        <div className="ml-placeholder__head">
          <Cpu size={18} />
          <h2>ML-ASSISTED ROUTING — NOT CONNECTED</h2>
        </div>
        <p>{ml.message}</p>
        <dl className="kv">
          <dt>Predicted route quality</dt>
          <dd className="muted">Awaiting backend integration</dd>
          <dt>Predicted latency</dt>
          <dd className="muted">Awaiting backend integration</dd>
          <dt>Recommended route</dt>
          <dd className="muted">Awaiting backend integration</dd>
        </dl>
      </section>
    </div>
  );
}

import { Cable, Gauge, Layers, Percent, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { RoutePath } from './RoutePath';
import { StatusBadge } from '../common/StatusBadge';

export function RouteResultsPanel() {
  const { snapshot, source, destination, routingMethod, simulationState } = useNetwork();
  const { route, status } = snapshot;

  return (
    <div className="route-results-panel">
      {/* Route Path and Badges */}
      <div className="route-results-header">
        <div>
          <div className="label muted">Selected Route ({routingMethod.toUpperCase()})</div>
          <RoutePath path={route?.path ?? null} />
        </div>
        <div className="route-results-status">
          <StatusBadge status={status} label={status === 'unreachable' ? 'Unreachable' : status} />
          {status === 'rerouted' && (
            <span className="badge badge--success" title="Traffic rerouted around network failures">
              <ShieldCheck size={12} /> Healed
            </span>
          )}
        </div>
      </div>

      {route ? (
        <div className="route-metrics-grid">
          <div className="metric-box">
            <div className="metric-box__label">
              <Layers size={13} /> Hops
            </div>
            <div className="metric-box__val mono">{route.metrics.hops}</div>
          </div>

          <div className="metric-box">
            <div className="metric-box__label">
              <Gauge size={13} /> Latency
            </div>
            <div className="metric-box__val mono">{route.metrics.latencyMs.toFixed(1)} ms</div>
          </div>

          <div className="metric-box">
            <div className="metric-box__label">
              <Cable size={13} /> Bandwidth
            </div>
            <div className="metric-box__val mono">{route.metrics.bandwidthMbps} Mbps</div>
          </div>

          <div className="metric-box">
            <div className="metric-box__label">
              <Percent size={13} /> Packet Loss
            </div>
            <div className="metric-box__val mono">{route.metrics.packetLossPct.toFixed(2)}%</div>
          </div>

          {route.metrics.predictedScore != null && (
            <div className="metric-box metric-box--highlight">
              <div className="metric-box__label">
                <Zap size={13} /> Quality Score
              </div>
              <div className="metric-box__val mono text-cyan">{route.metrics.predictedScore.toFixed(2)}/100</div>
            </div>
          )}
        </div>
      ) : (
        <div className="route-unavailable-box">
          <AlertTriangle size={16} className="text-danger" />
          <span>No route metrics available under current network failures.</span>
        </div>
      )}

      {/* Summary Row */}
      <div className="route-details-list">
        <div className="route-detail-row">
          <span className="muted">Source Router</span>
          <span className="mono font-bold">{source}</span>
        </div>
        <div className="route-detail-row">
          <span className="muted">Destination Router</span>
          <span className="mono font-bold">{destination}</span>
        </div>
        <div className="route-detail-row">
          <span className="muted">Algorithm Engine</span>
          <span className="mono font-semibold uppercase">{routingMethod}</span>
        </div>
        <div className="route-detail-row">
          <span className="muted">Packet Delivery Status</span>
          <span className="mono">
            {simulationState === 'completed' && <span className="text-success">Delivered ✓</span>}
            {simulationState === 'running' && <span className="text-cyan">In Transit…</span>}
            {simulationState === 'calculating' && <span className="text-amber">Calculating…</span>}
            {simulationState === 'failed' && <span className="text-danger">Failed / Blocked</span>}
            {simulationState === 'idle' && <span className="muted">Idle (Ready)</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

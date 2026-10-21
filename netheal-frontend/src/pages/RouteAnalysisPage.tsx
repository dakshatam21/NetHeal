import { Cable, Cpu, Gauge, Layers, Percent, Zap } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { Panel } from '../components/common/Panel';
import { StatusBadge } from '../components/common/StatusBadge';
import { EndpointSelector } from '../components/network/EndpointSelector';
import { FailureList } from '../components/network/FailureList';
import { MetricCard } from '../components/network/MetricCard';
import { RoutePath } from '../components/network/RoutePath';
import { useNetwork } from '../context/NetworkContext';

export function RouteAnalysisPage() {
  const {
    snapshot,
    source,
    destination,
    routingMethod,
    setRoutingMethod,
    candidates,
    isLoading,
  } = useNetwork();

  const { route, status } = snapshot;

  const bestLatency =
    candidates.length > 0 ? Math.min(...candidates.map((c) => c.total_latency_ms)) : null;
  const bestScore =
    candidates.length > 0 ? Math.max(...candidates.map((c) => c.predicted_quality_score)) : null;

  return (
    <div className="page">
      <Panel title="Route Selection & Algorithm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <EndpointSelector idPrefix="analysis" />

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#91A6BB',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Active Routing Algorithm
            </label>
            <div className="segmented" role="group" aria-label="Routing Algorithm">
              <button
                type="button"
                className={routingMethod === 'bfs' ? 'is-active' : ''}
                onClick={() => setRoutingMethod('bfs')}
                disabled={isLoading}
              >
                BFS (Shortest Hop)
              </button>
              <button
                type="button"
                className={routingMethod === 'dijkstra' ? 'is-active' : ''}
                onClick={() => setRoutingMethod('dijkstra')}
                disabled={isLoading}
              >
                Dijkstra (Lowest Latency)
              </button>
              <button
                type="button"
                className={routingMethod === 'ml' ? 'is-active' : ''}
                onClick={() => setRoutingMethod('ml')}
                disabled={isLoading}
              >
                ML Quality-Assisted
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {status === 'unreachable' && (
        <div className="alert alert--bad" role="alert">
          <strong>DESTINATION UNREACHABLE</strong>
          <span>
            No feasible route from {source} to {destination} under current network failures. Restore the failed components below to recover connectivity.
          </span>
          <FailureList />
        </div>
      )}

      <Panel
        title="Authoritative Active Route"
        tag={
          routingMethod === 'bfs'
            ? 'ALGORITHM · BFS MIN-HOP'
            : routingMethod === 'dijkstra'
              ? 'ALGORITHM · DIJKSTRA MIN-LATENCY'
              : 'ALGORITHM · ML RANDOM FOREST RANKED'
        }
      >
        <div className="baseline-head">
          <RoutePath path={route?.path ?? null} />
          <StatusBadge status={status} label={status === 'unreachable' ? 'Unreachable' : status} />
        </div>
        {route ? (
          <div className="stat-grid">
            <MetricCard
              label="Hop count"
              value={String(route.metrics.hops)}
              hint="Total router-to-router hops"
              icon={<Layers size={16} />}
            />
            <MetricCard
              label="Latency"
              value={route.metrics.latencyMs.toFixed(1)}
              unit="ms"
              hint="Summed physical link latency"
              icon={<Gauge size={16} />}
            />
            <MetricCard
              label="Packet loss"
              value={route.metrics.packetLossPct.toFixed(2)}
              unit="%"
              hint="Compounded end-to-end probability"
              icon={<Percent size={16} />}
            />
            <MetricCard
              label="Bandwidth"
              value={String(route.metrics.bandwidthMbps)}
              unit="Mbps"
              hint="Bottleneck minimum link capacity"
              icon={<Cable size={16} />}
            />
            {route.metrics.predictedScore !== undefined && route.metrics.predictedScore !== null && (
              <MetricCard
                label="Predicted Quality"
                value={route.metrics.predictedScore.toFixed(2)}
                unit="/100"
                hint="Empirical Random Forest regression score"
                icon={<Zap size={16} />}
              />
            )}
          </div>
        ) : (
          <p className="hint">Route metrics are unavailable while the destination is unreachable.</p>
        )}
      </Panel>

      <Panel title="Feasible Route Candidates & Algorithm Comparison" tag="LIVE SERVER COMPUTATION">
        {candidates.length === 0 ? (
          <EmptyState
            title="No feasible routes"
            message="Every path between the selected routers is currently blocked by simulated failures."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate Route</th>
                  <th>Hops</th>
                  <th>Latency</th>
                  <th>Loss</th>
                  <th>Bandwidth</th>
                  <th>ML Quality Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const isCurrent = route !== null && route.path.join('-') === c.path.join('-');
                  const isMinLatency = c.total_latency_ms === bestLatency;
                  const isMaxQuality = c.predicted_quality_score === bestScore;

                  return (
                    <tr
                      key={c.path.join('-')}
                      className={isCurrent ? 'row--baseline' : undefined}
                    >
                      <td className="mono">{i + 1}</td>
                      <td>
                        <RoutePath path={c.path} />
                      </td>
                      <td className="mono">{c.hops}</td>
                      <td className="mono">{c.total_latency_ms.toFixed(1)} ms</td>
                      <td className="mono">{c.estimated_packet_loss_percent.toFixed(2)} %</td>
                      <td className="mono">{c.bottleneck_bandwidth_mbps} Mbps</td>
                      <td className="mono font-bold" style={{ color: isMaxQuality ? '#38D6B0' : '#EAF2FA' }}>
                        {c.predicted_quality_score != null ? `${c.predicted_quality_score.toFixed(2)} / 100` : '—'}
                      </td>
                      <td>
                        <span className="tag-row">
                          {isCurrent && <StatusBadge status="info" label="Active Selection" />}
                          {isMinLatency && <StatusBadge status="healthy" label="Min Latency" />}
                          {isMaxQuality && <StatusBadge status="healthy" label="Top ML Quality" />}
                          {!isCurrent && !isMinLatency && !isMaxQuality && (
                            <StatusBadge status="muted" label="Feasible" />
                          )}
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
          BFS optimizes strictly for minimum hop count. Dijkstra optimizes strictly for minimum total latency. ML-assisted routing evaluates all feasible candidate paths and selects the route that maximizes predicted end-to-end quality balancing latency, bandwidth, packet loss, and hop penalties.
        </p>
      </Panel>

      <section className="ml-placeholder" aria-label="ML-assisted routing details" style={{ borderColor: '#38D6B0' }}>
        <div className="ml-placeholder__head">
          <Cpu size={18} style={{ color: '#38D6B0' }} />
          <h2 style={{ color: '#38D6B0' }}>ML-ASSISTED ROUTING ENGINE — ACTIVE & INTEGRATED</h2>
        </div>
        <dl className="kv">
          <dt>Model Architecture</dt>
          <dd style={{ color: '#EAF2FA' }}>Random Forest Regressor (100 Estimators)</dd>
          <dt>Model Accuracy</dt>
          <dd className="mono" style={{ color: '#38D6B0', fontWeight: 600 }}>R² = 0.998</dd>
          <dt>Model Features</dt>
          <dd>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
              <span className="tag" style={{ color: '#EAF2FA', borderColor: 'rgba(56, 214, 176, 0.4)', background: 'rgba(56, 214, 176, 0.08)' }}>Hops</span>
              <span className="tag" style={{ color: '#EAF2FA', borderColor: 'rgba(56, 214, 176, 0.4)', background: 'rgba(56, 214, 176, 0.08)' }}>Total Latency (ms)</span>
              <span className="tag" style={{ color: '#EAF2FA', borderColor: 'rgba(56, 214, 176, 0.4)', background: 'rgba(56, 214, 176, 0.08)' }}>Bottleneck Bandwidth (Mbps)</span>
              <span className="tag" style={{ color: '#EAF2FA', borderColor: 'rgba(56, 214, 176, 0.4)', background: 'rgba(56, 214, 176, 0.08)' }}>Packet Loss (%)</span>
            </div>
          </dd>
        </dl>
      </section>
    </div>
  );
}

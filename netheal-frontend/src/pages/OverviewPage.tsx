import { Activity, Cable, Gauge, Server } from 'lucide-react';
import { Panel } from '../components/common/Panel';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventFeed } from '../components/network/EventFeed';
import { MetricCard } from '../components/network/MetricCard';
import type { Tone } from '../components/network/MetricCard';
import { NetworkGraph } from '../components/network/NetworkGraph';
import { RoutePath } from '../components/network/RoutePath';
import { useNetwork } from '../context/NetworkContext';

export function OverviewPage() {
  const { snapshot, source, destination, routingMethod } = useNetwork();
  const { counts, route, status } = snapshot;

  const total = counts.healthy + counts.degraded + counts.failed;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const availabilityTone: Tone = counts.availabilityPct >= 99.9 ? 'ok' : counts.availabilityPct >= 60 ? 'warn' : 'bad';

  return (
    <div className="page">
      <div className="kpi-grid">
        <MetricCard
          label="Active Routers"
          value={`${counts.routersActive}/${counts.routersTotal}`}
          hint={`${counts.routersTotal - counts.routersActive} failed`}
          icon={<Server size={16} />}
          tone={counts.routersActive < counts.routersTotal ? 'warn' : 'ok'}
        />
        <MetricCard
          label="Active Links"
          value={`${counts.linksActive}/${counts.linksTotal}`}
          hint={`${counts.linksTotal - counts.linksActive} unusable`}
          icon={<Cable size={16} />}
          tone={counts.linksActive < counts.linksTotal ? 'warn' : 'ok'}
        />
        <MetricCard
          label="Network Availability"
          value={counts.availabilityPct.toFixed(1)}
          unit="%"
          hint="Router pairs that can still communicate"
          icon={<Activity size={16} />}
          tone={availabilityTone}
        />
        <MetricCard
          label="Average Latency"
          value={counts.avgLatencyMs === null ? '—' : counts.avgLatencyMs.toFixed(1)}
          unit={counts.avgLatencyMs === null ? undefined : 'ms'}
          hint="Mean of active links (simulated)"
          icon={<Gauge size={16} />}
        />
      </div>

      <div className="overview-grid">
        <Panel title="Topology Preview" tag="SIMULATION" className="panel--flush">
          <NetworkGraph height={420} />
        </Panel>

        <div className="overview-grid__side">
          <Panel title="Network Health" tag="ROUTERS + LINKS">
            <div className="health-bar" role="img" aria-label={`${counts.healthy} healthy, ${counts.degraded} degraded, ${counts.failed} failed`}>
              <span className="health-bar__seg health-bar__seg--ok" style={{ width: `${pct(counts.healthy)}%` }} />
              <span className="health-bar__seg health-bar__seg--warn" style={{ width: `${pct(counts.degraded)}%` }} />
              <span className="health-bar__seg health-bar__seg--bad" style={{ width: `${pct(counts.failed)}%` }} />
            </div>
            <ul className="health-list">
              <li>
                <span className="dot dot--ok" /> Healthy <strong className="mono">{counts.healthy}</strong>
              </li>
              <li>
                <span className="dot dot--warn" /> Degraded <strong className="mono">{counts.degraded}</strong>
              </li>
              <li>
                <span className="dot dot--bad" /> Failed <strong className="mono">{counts.failed}</strong>
              </li>
            </ul>
            <p className="hint">Degraded = a component that is up but unusable because a neighbour has failed.</p>
          </Panel>

          <Panel title="Routing Summary">
            <dl className="kv">
              <dt>Source</dt>
              <dd className="mono">{source}</dd>
              <dt>Destination</dt>
              <dd className="mono">{destination}</dd>
              <dt>Current route</dt>
              <dd>
                <RoutePath path={route?.path ?? null} />
              </dd>
              <dt>Routing method</dt>
              <dd className="mono">{routingMethod.toUpperCase()}</dd>
              <dt>ML Engine</dt>
              <dd style={{ color: '#38D6B0' }}>Random Forest (Active)</dd>
              {route?.metrics.predictedScore !== undefined && route.metrics.predictedScore !== null && (
                <>
                  <dt>Predicted Quality</dt>
                  <dd className="mono" style={{ color: '#38D6B0' }}>
                    {route.metrics.predictedScore.toFixed(2)} / 100
                  </dd>
                </>
              )}
              <dt>Route status</dt>
              <dd>
                <StatusBadge status={status} label={status === 'unreachable' ? 'Destination unreachable' : status} />
              </dd>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel title="Recent Network Events" tag="SIMULATED LOG">
        <EventFeed limit={8} />
      </Panel>
    </div>
  );
}

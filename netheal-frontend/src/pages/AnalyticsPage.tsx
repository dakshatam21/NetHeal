import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../components/common/EmptyState';
import { Panel } from '../components/common/Panel';
import { MetricCard } from '../components/network/MetricCard';
import { useNetwork } from '../context/NetworkContext';
import { getDemoAnalytics } from '../services/networkService';
import { getLinkStatus } from '../services/routingService';
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-react';

const COLORS = { cyan: '#36D6F5', teal: '#38D6B0', amber: '#F5A623', red: '#FF5C70', grid: '#20374D', muted: '#91A6BB', slate: '#3A5873' };
const tick = { fill: COLORS.muted, fontSize: 11 };
const tooltipStyle: CSSProperties = { background: '#0D1B2A', border: '1px solid #20374D', borderRadius: 4, fontSize: 12 };
const labelStyle: CSSProperties = { color: '#EAF2FA' };
const barCursor = { fill: 'rgba(54, 214, 245, 0.06)' };

const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

type LinkMetric = 'packetLossPct' | 'bandwidthMbps';

export function AnalyticsPage() {
  const { topology, failures, snapshot } = useNetwork();
  const { trend, baseline } = useMemo(() => getDemoAnalytics(), []);
  const [linkMetric, setLinkMetric] = useState<LinkMetric>('packetLossPct');

  const stats = useMemo(
    () => ({
      meanLatency: mean(trend.map((p) => p.avgLatency)),
      peakLatency: Math.max(...trend.map((p) => p.peakLatency)),
      minAvailability: Math.min(...trend.map((p) => p.availability)),
      meanQuality: mean(trend.map((p) => p.quality)),
    }),
    [trend],
  );

  const routeBars = snapshot.alternatives.map((r, i) => ({
    name: `P${i + 1} ${r.path.join('-')}`,
    latencyMs: r.metrics.latencyMs,
    isBaseline: snapshot.route !== null && r.path.join('>') === snapshot.route.path.join('>'),
  }));

  const linkBars = topology.links.map((l) => ({
    name: l.id,
    packetLossPct: l.packetLossPct,
    bandwidthMbps: l.bandwidthMbps,
    status: getLinkStatus(l, failures),
  }));
  const linkColor = (status: string): string => (status === 'failed' ? COLORS.red : status === 'degraded' ? COLORS.amber : COLORS.teal);

  return (
    <div className="page">
      <div className="kpi-grid">
        <MetricCard label="Mean latency" value={stats.meanLatency.toFixed(1)} unit="ms" hint="DEMO DATA · 24 h series" icon={<Gauge size={16} />} />
        <MetricCard label="Peak latency" value={stats.peakLatency.toFixed(1)} unit="ms" hint="DEMO DATA" icon={<TrendingUp size={16} />} tone="warn" />
        <MetricCard label="Min availability" value={stats.minAvailability.toFixed(1)} unit="%" hint="DEMO DATA · simulated incident" icon={<Activity size={16} />} tone="warn" />
        <MetricCard label="Mean route quality" value={stats.meanQuality.toFixed(1)} unit="/100" hint="DEMO DATA · illustrative score" icon={<Zap size={16} />} />
      </div>

      <div className="analytics-grid">
        <Panel title="Latency Trend" tag="DEMO DATA">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={tick} stroke={COLORS.grid} interval={3} />
              <YAxis tick={tick} stroke={COLORS.grid} unit=" ms" width={56} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgLatency" name="Average" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="peakLatency" name="Peak" stroke={COLORS.amber} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Network Health Trend" tag="DEMO DATA">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={tick} stroke={COLORS.grid} interval={3} />
              <YAxis tick={tick} stroke={COLORS.grid} domain={[40, 100]} unit=" %" width={56} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="availability" name="Availability" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.15} />
              <Area type="monotone" dataKey="quality" name="Route quality" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Baseline vs Alternative Routes" tag="SIMULATED DATA · CURRENT TOPOLOGY">
          {routeBars.length === 0 ? (
            <EmptyState title="No routes to compare" message="The destination is unreachable, so there are no feasible routes." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, routeBars.length * 38 + 40)}>
              <BarChart data={routeBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={tick} stroke={COLORS.grid} unit=" ms" />
                <YAxis type="category" dataKey="name" tick={tick} stroke={COLORS.grid} width={128} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={barCursor} />
                <Bar dataKey="latencyMs" name="Latency (ms)" radius={[0, 2, 2, 0]}>
                  {routeBars.map((d) => (
                    <Cell key={d.name} fill={d.isBaseline ? COLORS.cyan : COLORS.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="hint">Cyan bar = baseline (BFS) route. Values come from simulated link attributes.</p>
        </Panel>

        <Panel title="Per-Link Quality" tag="SIMULATED DATA">
          <div className="segmented" role="group" aria-label="Link metric">
            <button
              type="button"
              className={linkMetric === 'packetLossPct' ? 'is-active' : ''}
              aria-pressed={linkMetric === 'packetLossPct'}
              onClick={() => setLinkMetric('packetLossPct')}
            >
              Packet loss
            </button>
            <button
              type="button"
              className={linkMetric === 'bandwidthMbps' ? 'is-active' : ''}
              aria-pressed={linkMetric === 'bandwidthMbps'}
              onClick={() => setLinkMetric('bandwidthMbps')}
            >
              Bandwidth
            </button>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={linkBars} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={tick} stroke={COLORS.grid} />
              <YAxis tick={tick} stroke={COLORS.grid} unit={linkMetric === 'packetLossPct' ? ' %' : ''} width={56} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={barCursor} />
              <Bar dataKey={linkMetric} name={linkMetric === 'packetLossPct' ? 'Packet loss (%)' : 'Bandwidth (Mbps)'} radius={[2, 2, 0, 0]}>
                {linkBars.map((d) => (
                  <Cell key={d.name} fill={linkColor(d.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="hint">Red = failed link, amber = unusable (router down), teal = healthy.</p>
        </Panel>
      </div>

      <Panel title="Baseline vs ML-Assisted Routing" tag="COMPARISON RESERVED">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline (BFS) · DEMO DATA</th>
                <th>ML-assisted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Average latency</td>
                <td className="mono">{stats.meanLatency.toFixed(1)} ms</td>
                <td className="muted">Awaiting backend integration</td>
              </tr>
              <tr>
                <td>Packet loss</td>
                <td className="mono">{baseline.packetLossPct.toFixed(1)} %</td>
                <td className="muted">Awaiting backend integration</td>
              </tr>
              <tr>
                <td>Failover recovery time</td>
                <td className="mono">{baseline.recoveryTimeS.toFixed(1)} s</td>
                <td className="muted">Awaiting backend integration</td>
              </tr>
              <tr>
                <td>Route quality score</td>
                <td className="mono">{stats.meanQuality.toFixed(1)} / 100</td>
                <td className="muted">Awaiting backend integration</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint">
          Baseline values are illustrative demo data, not measurements. ML results will appear after integration with the Python
          FastAPI backend and a trained model.
        </p>
      </Panel>
    </div>
  );
}

import { Panel } from '../components/common/Panel';
import { StatusBadge } from '../components/common/StatusBadge';
import { EndpointSelector } from '../components/network/EndpointSelector';
import { NetworkGraph } from '../components/network/NetworkGraph';
import { NetworkLegend } from '../components/network/NetworkLegend';
import { RouterDetails } from '../components/network/RouterDetails';
import { RoutePath } from '../components/network/RoutePath';
import { useNetwork } from '../context/NetworkContext';

export function TopologyPage() {
  const { snapshot } = useNetwork();
  const { route, status } = snapshot;

  return (
    <div className="topology-layout">
      <Panel title="Interactive Topology" tag="SIMULATED" className="panel--flush" footer={<NetworkLegend />}>
        <NetworkGraph height={560} showMiniMap />
      </Panel>

      <div className="topology-layout__side">
        <Panel title="Route Endpoints">
          <EndpointSelector idPrefix="topo" />
          <div className="route-summary">
            <div className="label">Baseline route (BFS)</div>
            <RoutePath path={route?.path ?? null} />
            <div className="route-summary__row">
              <StatusBadge status={status} label={status === 'unreachable' ? 'Unreachable' : status} />
              {route && (
                <span className="mono muted">
                  {route.metrics.hops} hops · {route.metrics.latencyMs} ms
                </span>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Router Details">
          <RouterDetails />
        </Panel>
      </div>
    </div>
  );
}

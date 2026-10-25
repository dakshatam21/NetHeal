import { Panel } from '../components/common/Panel';
import { NetworkGraph } from '../components/network/NetworkGraph';
import { NetworkLegend } from '../components/network/NetworkLegend';
import { RouterDetails } from '../components/network/RouterDetails';
import { SimulationController } from '../components/network/SimulationController';
import { RouteResultsPanel } from '../components/network/RouteResultsPanel';
import { ForwardingTable } from '../components/network/ForwardingTable';
import { useNetwork } from '../context/NetworkContext';

export function TopologyPage() {
  const { routingMethod } = useNetwork();

  return (
    <div className="topology-page">
      {/* Simulation Controller Topbar */}
      <Panel title="Network Simulation & Self-Healing Controller" tag="INTERACTIVE WORKFLOW">
        <SimulationController />
      </Panel>

      <div className="topology-layout">
        {/* Main Network Graph */}
        <Panel
          title="Live Network Topology"
          tag={`ALGORITHM: ${routingMethod.toUpperCase()}`}
          className="panel--flush"
          footer={
            <div className="topology-footer">
              <NetworkLegend />
              <div className="graph-hint">
                <span className="text-cyan">💡 Interactive Graph:</span> Click any link or router to toggle failure / restoration.
              </div>
            </div>
          }
        >
          <NetworkGraph height={540} showMiniMap />
        </Panel>

        {/* Side Panels */}
        <div className="topology-layout__side">
          <Panel title="Route Analysis & Metrics">
            <RouteResultsPanel />
          </Panel>

          <Panel title="Forwarding Table (Next-Hop Routing)">
            <ForwardingTable />
          </Panel>

          <Panel title="Selected Router Details">
            <RouterDetails />
          </Panel>
        </div>
      </div>
    </div>
  );
}

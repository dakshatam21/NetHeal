import { useMemo } from 'react';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import { RouterNode } from './RouterNode';
import type { RouterFlowNode } from './RouterNode';
import { useNetwork } from '../../context/NetworkContext';
import { getLinkStatus, getRouterStatus } from '../../services/routingService';

const nodeTypes = { router: RouterNode };

const COLORS = { normal: '#3A5873', route: '#36D6F5', failed: '#FF5C70', degraded: '#F5A623' };
const MONO = 'ui-monospace, Consolas, monospace';

interface Props {
  height?: number;
  showMiniMap?: boolean;
}

export function NetworkGraph({ height = 480, showMiniMap = false }: Props) {
  const { topology, failures, snapshot, source, destination, selectedRouterId, selectRouter } = useNetwork();
  const route = snapshot.route;

  const nodes = useMemo(
    () =>
      topology.routers.map(
        (r): RouterFlowNode => ({
          id: r.id,
          type: 'router',
          position: { x: r.x, y: r.y },
          draggable: false,
          data: {
            routerId: r.id,
            ip: r.ip,
            status: getRouterStatus(r.id, topology, failures),
            selected: r.id === selectedRouterId,
            isSource: r.id === source,
            isDestination: r.id === destination,
            onRoute: route?.path.includes(r.id) ?? false,
          },
        }),
      ),
    [topology, failures, route, source, destination, selectedRouterId],
  );

  const edges = useMemo(
    () =>
      topology.links.map((l): Edge => {
        const status = getLinkStatus(l, failures);
        const onRoute = route?.linkIds.includes(l.id) ?? false;
        const color =
          status === 'failed' ? COLORS.failed : status === 'degraded' ? COLORS.degraded : onRoute ? COLORS.route : COLORS.normal;
        const label =
          status === 'failed' ? `${l.id} FAILED` : status === 'degraded' ? `${l.id} UNUSABLE` : `${l.id} · ${l.latencyMs} ms`;
        return {
          id: l.id,
          source: l.source,
          target: l.target,
          type: 'straight',
          animated: onRoute,
          zIndex: onRoute ? 5 : 0,
          label,
          style: {
            stroke: color,
            strokeWidth: onRoute ? 3 : 1.5,
            strokeDasharray: status === 'healthy' ? undefined : '6 4',
          },
          labelStyle: { fill: status === 'healthy' ? '#EAF2FA' : color, fontFamily: MONO, fontSize: 10 },
          labelBgStyle: { fill: '#0D1B2A', stroke: '#20374D' },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 2,
        };
      }),
    [topology, failures, route],
  );

  return (
    <div className="graph-canvas" style={{ height }} role="group" aria-label="Interactive network topology graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => selectRouter(node.id)}
        onPaneClick={() => selectRouter(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Lines} gap={40} color="rgba(54, 214, 245, 0.06)" />
        <Controls showInteractive={false} position="bottom-left" />
        {showMiniMap && (
          <MiniMap pannable zoomable position="top-right" nodeColor="#2A4A66" maskColor="rgba(7, 17, 31, 0.7)" />
        )}
      </ReactFlow>
    </div>
  );
}

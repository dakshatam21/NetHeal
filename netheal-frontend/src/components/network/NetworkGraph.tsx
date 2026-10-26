import { useMemo } from 'react';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import { RouterNode } from './RouterNode';
import type { RouterFlowNode } from './RouterNode';
import { PacketNode } from './PacketNode';
import type { PacketFlowNode } from './PacketNode';
import { useNetwork } from '../../context/NetworkContext';
import { getLinkStatus, getRouterStatus } from '../../services/routingService';

const nodeTypes = { router: RouterNode, packet: PacketNode };

const COLORS = {
  normal: '#3A5873',
  route: '#36D6F5',
  activeHop: '#00E5FF',
  failed: '#FF5C70',
  degraded: '#F5A623',
};
const MONO = 'ui-monospace, Consolas, monospace';

interface Props {
  height?: number;
  showMiniMap?: boolean;
}

export function NetworkGraph({ height = 480, showMiniMap = false }: Props) {
  const {
    topology,
    failures,
    snapshot,
    source,
    destination,
    selectedRouterId,
    selectRouter,
    simulationState,
    packetCoords,
    currentHopIndex,
    activeEdgeId,
    simulationSpeed,
    failLink,
    restoreLink,
  } = useNetwork();

  const route = snapshot.route;

  const currentHopRouterId = useMemo(() => {
    return route && currentHopIndex >= 0 && currentHopIndex < route.path.length
      ? route.path[currentHopIndex]
      : null;
  }, [route, currentHopIndex]);

  const baseRouterNodes = useMemo(() => {
    return topology.routers.map(
      (r): RouterFlowNode => ({
        id: r.id,
        type: 'router',
        position: { x: r.x, y: r.y },
        draggable: false,
        width: 116,
        height: 62,
        initialWidth: 116,
        initialHeight: 62,
        data: {
          routerId: r.id,
          ip: r.ip,
          status: getRouterStatus(r.id, topology, failures),
          selected: r.id === selectedRouterId,
          isSource: r.id === source,
          isDestination: r.id === destination,
          onRoute: route?.path.includes(r.id) ?? false,
          isCurrentHop: r.id === currentHopRouterId,
          isDelivered: simulationState === 'completed' && r.id === destination,
        },
      }),
    );
  }, [
    topology,
    failures,
    route,
    source,
    destination,
    selectedRouterId,
    currentHopRouterId,
    simulationState,
  ]);

  const nodes = useMemo(() => {
    if (!packetCoords || !Number.isFinite(packetCoords.x) || !Number.isFinite(packetCoords.y)) {
      return baseRouterNodes as Node[];
    }

    const packetNode: PacketFlowNode = {
      id: '__sim_packet__',
      type: 'packet',
      position: { x: packetCoords.x - 18, y: packetCoords.y - 18 },
      draggable: false,
      selectable: false,
      zIndex: 1000,
      width: 36,
      height: 36,
      initialWidth: 36,
      initialHeight: 36,
      data: {
        hop: Math.max(0, currentHopIndex),
        label: 'PKT',
        state: simulationState,
        speed: simulationSpeed,
      },
    };

    return [...baseRouterNodes, packetNode] as Node[];
  }, [baseRouterNodes, packetCoords, currentHopIndex, simulationState, simulationSpeed]);

  const edges = useMemo(
    () =>
      topology.links.map((l): Edge => {
        const status = getLinkStatus(l, failures);
        const onRoute = route?.linkIds.includes(l.id) ?? false;
        const isActiveHopEdge = l.id === activeEdgeId;

        let strokeColor = COLORS.normal;
        if (status === 'failed') {
          strokeColor = COLORS.failed;
        } else if (status === 'degraded') {
          strokeColor = COLORS.degraded;
        } else if (isActiveHopEdge) {
          strokeColor = COLORS.activeHop;
        } else if (onRoute) {
          strokeColor = COLORS.route;
        }

        const label =
          status === 'failed'
            ? `${l.id} FAILED`
            : status === 'degraded'
              ? `${l.id} UNUSABLE`
              : isActiveHopEdge
                ? `⚡ ${l.id} (${l.latencyMs}ms)`
                : `${l.id} · ${l.latencyMs} ms`;

        return {
          id: l.id,
          source: l.source,
          target: l.target,
          type: 'straight',
          animated: onRoute || isActiveHopEdge,
          zIndex: isActiveHopEdge ? 20 : onRoute ? 5 : 0,
          label,
          style: {
            stroke: strokeColor,
            strokeWidth: isActiveHopEdge ? 4.5 : onRoute ? 3 : 1.5,
            strokeDasharray: status === 'healthy' ? undefined : '6 4',
            filter: isActiveHopEdge ? 'drop-shadow(0 0 6px #00E5FF)' : undefined,
          },
          labelStyle: {
            fill: status === 'healthy' ? '#EAF2FA' : strokeColor,
            fontFamily: MONO,
            fontSize: isActiveHopEdge ? 11 : 10,
            fontWeight: isActiveHopEdge ? '700' : '500',
          },
          labelBgStyle: {
            fill: isActiveHopEdge ? '#062035' : '#0D1B2A',
            stroke: isActiveHopEdge ? '#00E5FF' : '#20374D',
            strokeWidth: isActiveHopEdge ? 1.5 : 1,
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 3,
        };
      }),
    [topology, failures, route, activeEdgeId],
  );

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    if (failures.links.includes(edge.id)) {
      restoreLink(edge.id);
    } else {
      failLink(edge.id);
    }
  };

  const fitViewOptions = useMemo(() => ({ padding: 0.2 }), []);

  return (
    <div className="graph-canvas" style={{ height }} role="group" aria-label="Interactive network topology graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.id !== '__sim_packet__') {
            selectRouter(node.id);
          }
        }}
        onEdgeClick={handleEdgeClick}
        onPaneClick={() => selectRouter(null)}
        fitView
        fitViewOptions={fitViewOptions}
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

import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { ComponentStatus } from '../../types/network';

export type RouterNodeData = {
  routerId: string;
  ip: string;
  status: ComponentStatus;
  selected: boolean;
  isSource: boolean;
  isDestination: boolean;
  onRoute: boolean;
  isCurrentHop?: boolean;
  isDelivered?: boolean;
};

export type RouterFlowNode = Node<RouterNodeData, 'router'>;

export function RouterNode({ data }: NodeProps<RouterFlowNode>) {
  const className = [
    'router-node',
    `router-node--${data.status}`,
    data.selected ? 'router-node--selected' : '',
    data.onRoute ? 'router-node--route' : '',
    data.isCurrentHop ? 'router-node--active-hop' : '',
    data.isDelivered ? 'router-node--delivered' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} title={`${data.routerId} — ${data.status}`}>
      {/* Handles are centred and invisible so edges connect centre-to-centre. */}
      <Handle type="target" position={Position.Left} className="router-node__handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="router-node__handle" isConnectable={false} />
      <div className="router-node__top">
        <span className="router-node__id">{data.routerId}</span>
        {data.isSource && <span className="router-node__tag">SRC</span>}
        {data.isDestination && <span className="router-node__tag">DST</span>}
      </div>
      <div className="router-node__ip">{data.ip}</div>
      <div className="router-node__status">{data.status}</div>
    </div>
  );
}

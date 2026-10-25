import type { Node, NodeProps } from '@xyflow/react';
import type { PacketSimulationState } from '../../types/network';

export type PacketNodeData = {
  hop: number;
  label: string;
  state: PacketSimulationState;
  speed: number;
};

export type PacketFlowNode = Node<PacketNodeData, 'packet'>;

export function PacketNode({ data }: NodeProps<PacketFlowNode>) {
  return (
    <div className={`packet-marker packet-marker--${data.state}`} title={`Packet at Hop ${data.hop + 1}`}>
      <div className="packet-marker__halo" />
      <div className="packet-marker__pulse" />
      <div className="packet-marker__core">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="packet-marker__icon"
        >
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
      <div className="packet-marker__tag">
        <span className="packet-marker__dot" />
        PKT
      </div>
    </div>
  );
}

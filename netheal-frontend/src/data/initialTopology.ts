import type { Topology } from '../types/network';

/**
 * Centralised mock topology (7 routers, 11 links, several redundant paths between R1 and R7).
 * Link order matters: BFS tie-breaking follows this order, so the default baseline route is R1 → R3 → R5 → R7.
 * TODO(FastAPI): replace with GET /api/network/topology (see services/networkService.ts).
 */
export const initialTopology: Topology = {
  defaultSource: 'R1',
  defaultDestination: 'R7',
  routers: [
    { id: 'R1', ip: '10.0.0.1', role: 'Edge (source)', x: 0, y: 160 },
    { id: 'R2', ip: '10.0.0.2', role: 'Core', x: 250, y: 10 },
    { id: 'R3', ip: '10.0.0.3', role: 'Core', x: 250, y: 160 },
    { id: 'R4', ip: '10.0.0.4', role: 'Core', x: 250, y: 310 },
    { id: 'R5', ip: '10.0.0.5', role: 'Aggregation', x: 500, y: 60 },
    { id: 'R6', ip: '10.0.0.6', role: 'Aggregation', x: 500, y: 260 },
    { id: 'R7', ip: '10.0.0.7', role: 'Edge (destination)', x: 750, y: 160 },
  ],
  links: [
    { id: 'L1', source: 'R1', target: 'R3', latencyMs: 12, bandwidthMbps: 1000, packetLossPct: 0.1 },
    { id: 'L2', source: 'R1', target: 'R2', latencyMs: 8, bandwidthMbps: 1000, packetLossPct: 0.1 },
    { id: 'L3', source: 'R1', target: 'R4', latencyMs: 15, bandwidthMbps: 500, packetLossPct: 0.3 },
    { id: 'L4', source: 'R2', target: 'R3', latencyMs: 5, bandwidthMbps: 1000, packetLossPct: 0.1 },
    { id: 'L5', source: 'R3', target: 'R4', latencyMs: 6, bandwidthMbps: 500, packetLossPct: 0.2 },
    { id: 'L6', source: 'R3', target: 'R5', latencyMs: 9, bandwidthMbps: 1000, packetLossPct: 0.1 },
    { id: 'L7', source: 'R3', target: 'R6', latencyMs: 11, bandwidthMbps: 500, packetLossPct: 0.4 },
    { id: 'L8', source: 'R2', target: 'R5', latencyMs: 10, bandwidthMbps: 1000, packetLossPct: 0.2 },
    { id: 'L9', source: 'R4', target: 'R6', latencyMs: 7, bandwidthMbps: 500, packetLossPct: 0.3 },
    { id: 'L10', source: 'R5', target: 'R7', latencyMs: 6, bandwidthMbps: 1000, packetLossPct: 0.1 },
    { id: 'L11', source: 'R6', target: 'R7', latencyMs: 13, bandwidthMbps: 500, packetLossPct: 0.5 },
  ],
};

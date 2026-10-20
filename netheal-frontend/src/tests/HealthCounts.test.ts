import { describe, it, expect } from 'vitest';
import { computeHealthCounts, getLinkStatus, getRouterStatus } from '../services/routingService';
import type { Topology, FailureState } from '../types/network';

const MOCK_TOPOLOGY: Topology = {
  routers: [
    { id: 'R1', ip: '10.0.0.1', role: 'Edge (source)', x: 0, y: 160, status: 'active' },
    { id: 'R2', ip: '10.0.0.2', role: 'Core', x: 250, y: 10, status: 'active' },
    { id: 'R3', ip: '10.0.0.3', role: 'Core', x: 250, y: 160, status: 'active' },
    { id: 'R4', ip: '10.0.0.4', role: 'Core', x: 250, y: 310, status: 'active' },
    { id: 'R5', ip: '10.0.0.5', role: 'Aggregation', x: 500, y: 60, status: 'active' },
    { id: 'R6', ip: '10.0.0.6', role: 'Aggregation', x: 500, y: 260, status: 'active' },
    { id: 'R7', ip: '10.0.0.7', role: 'Edge (destination)', x: 750, y: 160, status: 'active' },
  ],
  links: [
    { id: 'R1-R2', source: 'R1', target: 'R2', latencyMs: 8, bandwidthMbps: 100, packetLossPct: 1.0, status: 'active' },
    { id: 'R1-R3', source: 'R1', target: 'R3', latencyMs: 12, bandwidthMbps: 80, packetLossPct: 2.0, status: 'active' },
    { id: 'R1-R4', source: 'R1', target: 'R4', latencyMs: 15, bandwidthMbps: 60, packetLossPct: 1.5, status: 'active' },
    { id: 'R2-R3', source: 'R2', target: 'R3', latencyMs: 5, bandwidthMbps: 100, packetLossPct: 0.5, status: 'active' },
    { id: 'R2-R5', source: 'R2', target: 'R5', latencyMs: 10, bandwidthMbps: 100, packetLossPct: 1.0, status: 'active' },
    { id: 'R3-R5', source: 'R3', target: 'R5', latencyMs: 9, bandwidthMbps: 70, packetLossPct: 2.0, status: 'active' },
    { id: 'R3-R4', source: 'R3', target: 'R4', latencyMs: 6, bandwidthMbps: 80, packetLossPct: 1.0, status: 'active' },
    { id: 'R3-R6', source: 'R3', target: 'R6', latencyMs: 11, bandwidthMbps: 60, packetLossPct: 2.5, status: 'active' },
    { id: 'R4-R6', source: 'R4', target: 'R6', latencyMs: 7, bandwidthMbps: 80, packetLossPct: 1.0, status: 'active' },
    { id: 'R5-R7', source: 'R5', target: 'R7', latencyMs: 6, bandwidthMbps: 100, packetLossPct: 0.5, status: 'active' },
    { id: 'R6-R7', source: 'R6', target: 'R7', latencyMs: 13, bandwidthMbps: 60, packetLossPct: 2.0, status: 'active' },
  ],
  defaultSource: 'R1',
  defaultDestination: 'R7',
};

describe('computeHealthCounts', () => {
  it('computes 100% availability and all active routers/links on healthy topology', () => {
    const failures: FailureState = { routers: [], links: [] };
    const counts = computeHealthCounts(MOCK_TOPOLOGY, failures);

    expect(counts.routersTotal).toBe(7);
    expect(counts.routersActive).toBe(7);
    expect(counts.linksTotal).toBe(11);
    expect(counts.linksActive).toBe(11);
    expect(counts.healthy).toBe(18); // 7 routers + 11 links
    expect(counts.degraded).toBe(0);
    expect(counts.failed).toBe(0);
    expect(counts.availabilityPct).toBe(100);
    expect(counts.avgLatencyMs).toBeGreaterThan(0);
  });

  it('marks router as failed and updates active router count', () => {
    const failures: FailureState = { routers: ['R2'], links: [] };
    const counts = computeHealthCounts(MOCK_TOPOLOGY, failures);

    expect(counts.routersActive).toBe(6);
    expect(counts.failed).toBeGreaterThanOrEqual(1);
    expect(getRouterStatus('R2', MOCK_TOPOLOGY, failures)).toBe('failed');
    expect(getRouterStatus('R1', MOCK_TOPOLOGY, failures)).toBe('degraded'); // R1 connects to R2
  });

  it('marks link as degraded when endpoint router fails', () => {
    const failures: FailureState = { routers: ['R5'], links: [] };
    const r5r7Link = MOCK_TOPOLOGY.links.find((l) => l.id === 'R5-R7')!;
    expect(getLinkStatus(r5r7Link, failures)).toBe('degraded');

    const counts = computeHealthCounts(MOCK_TOPOLOGY, failures);
    // Degraded links are excluded from active links count
    expect(counts.linksActive).toBeLessThan(11);
  });

  it('marks link as failed when explicitly in failures list', () => {
    const failures: FailureState = { routers: [], links: ['R1-R2'] };
    const r1r2Link = MOCK_TOPOLOGY.links.find((l) => l.id === 'R1-R2')!;
    expect(getLinkStatus(r1r2Link, failures)).toBe('failed');

    const counts = computeHealthCounts(MOCK_TOPOLOGY, failures);
    expect(counts.linksActive).toBe(10);
    expect(counts.failed).toBe(1);
  });

  it('computes availability drop when disconnected partition occurs', () => {
    // Failing R5 and R6 isolates R7
    const failures: FailureState = { routers: [], links: ['R5-R7', 'R6-R7'] };
    const counts = computeHealthCounts(MOCK_TOPOLOGY, failures);

    expect(counts.availabilityPct).toBeLessThan(100);
  });
});

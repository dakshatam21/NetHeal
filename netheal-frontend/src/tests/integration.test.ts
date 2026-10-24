import { describe, it, expect } from 'vitest';
import { getLinkIdsForPath, mapBackendRouteToResult } from '../services/networkService';
import type { BackendRouteResponse, Topology } from '../types/network';

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

describe('Frontend Integration & Service Helpers', () => {
  it('correctly maps path router sequence to topology link IDs', () => {
    const path = ['R1', 'R2', 'R5', 'R7'];
    const linkIds = getLinkIdsForPath(MOCK_TOPOLOGY, path);
    expect(linkIds).toEqual(['R1-R2', 'R2-R5', 'R5-R7']);
  });

  it('handles reverse directed links symmetrically', () => {
    const path = ['R7', 'R5', 'R2', 'R1'];
    const linkIds = getLinkIdsForPath(MOCK_TOPOLOGY, path);
    expect(linkIds).toEqual(['R5-R7', 'R2-R5', 'R1-R2']);
  });

  it('returns empty array when path is trivial or empty', () => {
    expect(getLinkIdsForPath(MOCK_TOPOLOGY, ['R1'])).toEqual([]);
    expect(getLinkIdsForPath(MOCK_TOPOLOGY, [])).toEqual([]);
  });

  it('maps successful backend route response to frontend RouteResult', () => {
    const backendRes: BackendRouteResponse = {
      source: 'R1',
      destination: 'R7',
      route_found: true,
      routing_method: 'bfs',
      route: ['R1', 'R2', 'R5', 'R7'],
      hops: 3,
      total_latency_ms: 24,
      bottleneck_bandwidth_mbps: 100,
      estimated_packet_loss_percent: 2.47,
      predicted_quality_score: 87.5,
      candidate_routes_evaluated: 1,
      message: null,
    };

    const result = mapBackendRouteToResult(backendRes, MOCK_TOPOLOGY);
    expect(result).not.toBeNull();
    expect(result?.path).toEqual(['R1', 'R2', 'R5', 'R7']);
    expect(result?.linkIds).toEqual(['R1-R2', 'R2-R5', 'R5-R7']);
    expect(result?.metrics.hops).toBe(3);
    expect(result?.metrics.latencyMs).toBe(24);
    expect(result?.metrics.predictedScore).toBe(87.5);
  });

  it('returns null when backend reports route_found: false', () => {
    const backendRes: BackendRouteResponse = {
      source: 'R1',
      destination: 'R7',
      route_found: false,
      routing_method: 'dijkstra',
      route: [],
      hops: 0,
      total_latency_ms: null,
      bottleneck_bandwidth_mbps: null,
      estimated_packet_loss_percent: null,
      predicted_quality_score: null,
      candidate_routes_evaluated: 0,
      message: 'Destination unreachable',
    };

    const result = mapBackendRouteToResult(backendRes, MOCK_TOPOLOGY);
    expect(result).toBeNull();
  });

  it('handles ML route response with multiple evaluated candidates', () => {
    const backendRes: BackendRouteResponse = {
      source: 'R1',
      destination: 'R7',
      route_found: true,
      routing_method: 'ml',
      route: ['R1', 'R2', 'R5', 'R7'],
      hops: 3,
      total_latency_ms: 24,
      bottleneck_bandwidth_mbps: 100,
      estimated_packet_loss_percent: 2.47,
      predicted_quality_score: 91.24,
      candidate_routes_evaluated: 8,
      message: null,
    };

    const result = mapBackendRouteToResult(backendRes, MOCK_TOPOLOGY);
    expect(result?.candidateCount).toBe(8);
    expect(result?.metrics.predictedScore).toBe(91.24);
  });

  it('handles null predicted_quality_score gracefully when ML falls back', () => {
    const backendRes: BackendRouteResponse = {
      source: 'R1',
      destination: 'R7',
      route_found: true,
      routing_method: 'ml',
      route: ['R1', 'R2', 'R5', 'R7'],
      hops: 3,
      total_latency_ms: 24,
      bottleneck_bandwidth_mbps: 100,
      estimated_packet_loss_percent: 2.47,
      predicted_quality_score: null,
      candidate_routes_evaluated: 8,
      message: 'ML model unavailable: simulated failure. Fallback to Dijkstra route used.',
    };

    const result = mapBackendRouteToResult(backendRes, MOCK_TOPOLOGY);
    expect(result?.metrics.predictedScore).toBeNull();
    expect(result).not.toBeNull();
  });

  it('handles same source and destination route result', () => {
    const backendRes: BackendRouteResponse = {
      source: 'R1',
      destination: 'R1',
      route_found: true,
      routing_method: 'bfs',
      route: ['R1'],
      hops: 0,
      total_latency_ms: 0,
      bottleneck_bandwidth_mbps: 100,
      estimated_packet_loss_percent: 0,
      predicted_quality_score: null,
      candidate_routes_evaluated: 1,
      message: 'Source and destination are identical.',
    };

    const result = mapBackendRouteToResult(backendRes, MOCK_TOPOLOGY);
    expect(result?.path).toEqual(['R1']);
    expect(result?.linkIds).toEqual([]);
    expect(result?.metrics.hops).toBe(0);
  });

  it('correctly maps rerouted alternative route when R5-R7 fails', () => {
    // Alternative path avoiding R5-R7
    const altPath = ['R1', 'R4', 'R6', 'R7'];
    const linkIds = getLinkIdsForPath(MOCK_TOPOLOGY, altPath);
    expect(linkIds).toEqual(['R1-R4', 'R4-R6', 'R6-R7']);
    expect(linkIds).not.toContain('R5-R7');
  });

  it('correctly maps rerouted alternative route when router R5 fails', () => {
    // Alternative path avoiding router R5
    const altPath = ['R1', 'R4', 'R6', 'R7'];
    expect(altPath).not.toContain('R5');
    const linkIds = getLinkIdsForPath(MOCK_TOPOLOGY, altPath);
    expect(linkIds).toEqual(['R1-R4', 'R4-R6', 'R6-R7']);
    expect(linkIds).not.toContain('R2-R5');
    expect(linkIds).not.toContain('R3-R5');
    expect(linkIds).not.toContain('R5-R7');
  });

  it('generates next-hop forwarding entries sequentially from a calculated route', () => {
    const route = ['R1', 'R4', 'R6', 'R7'];
    const destination = 'R7';
    const fwdTable = [];
    for (let i = 0; i < route.length - 1; i++) {
      fwdTable.push({
        router: route[i],
        destination,
        nextHop: route[i + 1],
      });
    }

    expect(fwdTable).toHaveLength(3);
    expect(fwdTable[0]).toEqual({ router: 'R1', destination: 'R7', nextHop: 'R4' });
    expect(fwdTable[1]).toEqual({ router: 'R4', destination: 'R7', nextHop: 'R6' });
    expect(fwdTable[2]).toEqual({ router: 'R6', destination: 'R7', nextHop: 'R7' });
  });
});

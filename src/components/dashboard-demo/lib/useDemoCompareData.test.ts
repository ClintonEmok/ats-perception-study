import { describe, expect, it } from 'vitest';
import type { StkdeResponse, StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { buildDemoComparableSlices } from './useDemoCompareData';

const makeSurface = (eventCount: number, intensity: number): StkdeSurfaceResponse => ({
  meta: {
    eventCount,
    computeMs: 1,
    truncated: false,
    requestedComputeMode: 'sampled',
    effectiveComputeMode: 'sampled',
    fallbackApplied: null,
    clampsApplied: [],
  },
  heatmap: { cells: [{ lng: -87.7, lat: 41.8, intensity, support: eventCount }], maxIntensity: 1 },
  hotspots: [],
  contracts: { scoreVersion: 'stkde-v1' },
});

const response: StkdeResponse = {
  ...makeSurface(99, 0.1),
  sliceResults: {
    later: makeSurface(8, 0.8),
    earlier: makeSurface(3, 0.2),
  },
};

const slices = [
  { id: 'later', name: 'Later', type: 'range' as const, time: 75, range: [50, 80] as [number, number], isLocked: false, isVisible: true },
  { id: 'hidden', name: 'Hidden', type: 'range' as const, time: 25, range: [10, 20] as [number, number], isLocked: false, isVisible: false },
  { id: 'earlier', name: 'Earlier', type: 'range' as const, time: 25, range: [20, 40] as [number, number], isLocked: false, isVisible: true },
];

describe('dashboard server-backed comparison model', () => {
  it('orders canonical slices while resolving counts by source ID, not response order', () => {
    const comparable = buildDemoComparableSlices(slices, 0, 100, response);
    expect(comparable.map((slice) => slice.id)).toEqual(['earlier', 'later']);
    expect(comparable.map((slice) => slice.crimeCount)).toEqual([3, 8]);
    expect(comparable.map((slice) => slice.sourceSliceIndex)).toEqual([0, 1]);
  });

  it('keeps source indexes stable when a brushed scope filters the visible set', () => {
    const comparable = buildDemoComparableSlices(slices, 0, 100, response, [45, 90]);
    expect(comparable.map((slice) => slice.id)).toEqual(['later']);
    expect(comparable[0]?.sourceSliceIndex).toBe(1);
  });

  it('makes missing results explicit without fabricating cells or signed difference fields', () => {
    const comparable = buildDemoComparableSlices([
      ...slices,
      { id: 'missing', type: 'range' as const, time: 90, range: [80, 95] as [number, number], isLocked: false, isVisible: true },
    ], 0, 100, response);
    expect(comparable.find((slice) => slice.id === 'missing')?.crimeCount).toBe(0);
    expect(response.sliceResults.missing).toBeUndefined();
    expect('signedDifference' in response).toBe(false);
  });
});

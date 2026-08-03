import { describe, expect, it } from 'vitest';
import type { StkdeResponse, StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import {
  adaptStkdeSurfaceToKdeCells,
  projectStkdeResponseToSceneSlices,
} from './adaptStkdeSurfaceToKdeCells';

function surface(cells: StkdeSurfaceResponse['heatmap']['cells'] = []): StkdeSurfaceResponse {
  return {
    meta: {
      eventCount: cells.length,
      computeMs: 1,
      truncated: false,
      requestedComputeMode: 'sampled',
      effectiveComputeMode: 'sampled',
      fallbackApplied: null,
      clampsApplied: [],
    },
    heatmap: { cells, maxIntensity: 1 },
    hotspots: [],
    contracts: { scoreVersion: 'stkde-v1' },
  };
}

function response(sliceResults: Record<string, StkdeSurfaceResponse>): StkdeResponse {
  return { ...surface(), sliceResults };
}

describe('adaptStkdeSurfaceToKdeCells', () => {
  it('maps finite server cells into normalized X/Z while preserving sparse semantics', () => {
    const cells = adaptStkdeSurfaceToKdeCells(surface([
      { lng: -87.7, lat: 41.8, intensity: 1.4, support: 2.4 },
      { lng: -87.8, lat: 41.9, intensity: -0.2, support: -4 },
    ]));

    expect(cells).toHaveLength(2);
    expect(cells[0]).toMatchObject({ intensity: 1, support: 2 });
    expect(cells[1]).toMatchObject({ intensity: 0, support: 0 });
    expect(cells[0]?.x).toBeCloseTo(0);
    expect(cells[0]?.z).toBeCloseTo(-10);
  });

  it('rejects invalid and out-of-domain cells without clamping them into the scene', () => {
    const cells = adaptStkdeSurfaceToKdeCells(surface([
      { lng: Number.NaN, lat: 41.8, intensity: 1, support: 1 },
      { lng: -87.7, lat: Number.POSITIVE_INFINITY, intensity: 1, support: 1 },
      { lng: -88.4, lat: 41.8, intensity: 1, support: 1 },
      { lng: -87.7, lat: 41.8, intensity: Number.NaN, support: 1 },
    ]));

    expect(cells).toEqual([]);
    expect(adaptStkdeSurfaceToKdeCells(undefined)).toEqual([]);
  });

  it('projects reordered, brushed, duplicate-looking, and missing IDs without positional lookup', () => {
    const first = surface([{ lng: -87.7, lat: 41.8, intensity: 0.2, support: 3 }]);
    const second = surface([{ lng: -87.6, lat: 41.9, intensity: 0.8, support: 9 }]);
    const third = surface([{ lng: -87.8, lat: 41.7, intensity: 0.5, support: 5 }]);
    const result = projectStkdeResponseToSceneSlices(
      [
        { sourceSliceId: 'same-date-b', sourceSliceIndex: 4, index: 0 },
        { sourceSliceId: 'missing', sourceSliceIndex: 9, index: 1 },
        { sourceSliceId: 'same-date-a', sourceSliceIndex: 2, index: 2 },
      ],
      response({ 'same-date-a': first, 'same-date-b': second, 'hidden': third }),
    );

    expect(result.sliceKdes.map((cells) => cells[0]?.intensity)).toEqual([0.8, undefined, 0.2]);
    expect(result.sliceKdes[0]?.[0]?.support).toBe(9);
    expect(result.hotspotSliceResults['same-date-b']?.heatmap.cells[0]?.intensity).toBe(0.8);
    expect(result.hotspotSliceResults.missing?.heatmap.cells).toEqual([]);
    expect(result.hotspotSliceResults).not.toHaveProperty('hidden');
  });
});

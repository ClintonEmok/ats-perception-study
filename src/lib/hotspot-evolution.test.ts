import { describe, expect, test } from 'vitest';
import { buildHotspotEvolution } from './hotspot-evolution';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';

function makeSurface(overrides: Partial<StkdeSurfaceResponse> = {}): StkdeSurfaceResponse {
  return {
    meta: { eventCount: 10, computeMs: 5, truncated: false, requestedComputeMode: 'sampled', effectiveComputeMode: 'sampled', fallbackApplied: null, clampsApplied: [] },
    heatmap: { cells: [], maxIntensity: 1 },
    hotspots: [],
    contracts: { scoreVersion: 'stkde-v1' },
    ...overrides,
  };
}

function hotspot(
  centroidLng: number,
  centroidLat: number,
  supportCount = 10,
  intensityScore = 0.8,
  radiusMeters = 500,
) {
  return {
    id: `hs-${centroidLng}-${centroidLat}`,
    centroidLng,
    centroidLat,
    intensityScore,
    supportCount,
    peakStartEpochSec: 1_700_000_000,
    peakEndEpochSec: 1_700_086_400,
    radiusMeters,
  };
}

describe('buildHotspotEvolution', () => {
  test('returns empty result for null sliceResults', () => {
    const result = buildHotspotEvolution(null);
    expect(result.tracks).toEqual([]);
    expect(result.hasMultiSlice).toBe(false);
  });

  test('returns empty for single slice', () => {
    const result = buildHotspotEvolution({ 'slice-a': makeSurface({ hotspots: [hotspot(-87.63, 41.88)] }) });
    expect(result.tracks).toEqual([]);
    expect(result.hasMultiSlice).toBe(false);
  });

  test('links matching hotspots across two adjacent slices', () => {
    const sliceA = makeSurface({
      hotspots: [
        hotspot(-87.63, 41.88, 10, 0.9, 500),
      ],
    });
    const sliceB = makeSurface({
      hotspots: [
        hotspot(-87.631, 41.881, 15, 0.85, 550),
      ],
    });

    const result = buildHotspotEvolution({ 'slice-a': sliceA, 'slice-b': sliceB });
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].snapshots).toHaveLength(2);
    expect(result.tracks[0].snapshots.map((snapshot) => snapshot.hotspotId)).toEqual([
      'hs--87.63-41.88',
      'hs--87.631-41.881',
    ]);
    expect(result.tracks[0].status).toBe('stable');
    expect(result.tracks[0].supportTrend).toBe('increasing');
  });

  test('marks large displacement as displacing', () => {
    const sliceA = makeSurface({
      hotspots: [
        hotspot(-87.63, 41.88, 10, 0.9, 500),
      ],
    });
    const sliceB = makeSurface({
      hotspots: [
        hotspot(-87.61, 41.90, 8, 0.7, 400),
      ],
    });

    const result = buildHotspotEvolution({ 'slice-a': sliceA, 'slice-b': sliceB });
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].status).toBe('displacing');
    expect(result.tracks[0].displacementKm).toBeGreaterThan(1.5);
  });

  test('sorts tracks by average intensity descending', () => {
    const sliceA = makeSurface({
      hotspots: [
        hotspot(-87.63, 41.88, 10, 0.9, 500),
        hotspot(-87.60, 41.85, 10, 0.3, 500),
      ],
    });
    const sliceB = makeSurface({
      hotspots: [
        hotspot(-87.631, 41.881, 10, 0.85, 500),
        hotspot(-87.601, 41.851, 10, 0.25, 500),
      ],
    });

    const result = buildHotspotEvolution({ 'slice-a': sliceA, 'slice-b': sliceB });
    expect(result.tracks.length).toBeGreaterThanOrEqual(2);
    const firstIntensity = result.tracks[0].snapshots.reduce((s, hs) => s + hs.intensityScore, 0) / result.tracks[0].snapshots.length;
    const secondIntensity = result.tracks[1].snapshots.reduce((s, hs) => s + hs.intensityScore, 0) / result.tracks[1].snapshots.length;
    expect(firstIntensity).toBeGreaterThanOrEqual(secondIntensity);
  });
});

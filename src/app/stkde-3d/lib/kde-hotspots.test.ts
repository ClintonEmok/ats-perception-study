import { describe, expect, test } from 'vitest';
import { buildKdeHotspotSliceResults, selectKdeHotspotCells } from './kde-hotspots';

const slices = [
  { index: 0, label: 'Slice 1', startEpoch: 100, endEpoch: 200, burstScore: 0, crimeCount: 5, sourceSliceId: 'slice-a' },
  { index: 1, label: 'Slice 2', startEpoch: 200, endEpoch: 400, burstScore: 0, crimeCount: 6, sourceSliceId: 'slice-b' },
];

describe('KDE hotspot candidates', () => {
  test('selects separated high-intensity cells instead of adjacent cells from one peak', () => {
    const selected = selectKdeHotspotCells([
      { x: 0, z: 0, intensity: 1, support: 5 },
      { x: 1, z: 1, intensity: 0.9, support: 4 },
      { x: 25, z: 25, intensity: 0.8, support: 3 },
    ], 10);

    expect(selected).toEqual([
      { x: 0, z: 0, intensity: 1, support: 5 },
      { x: 25, z: 25, intensity: 0.8, support: 3 },
    ]);
  });

  test('builds results keyed by source slice and preserves actual slice intervals', () => {
    const results = buildKdeHotspotSliceResults(
      slices,
      [
        [{ x: 0, z: 0, intensity: 1, support: 5 }],
        [{ x: 5, z: 5, intensity: 0.8, support: 4 }],
      ],
      10,
    );

    expect(Object.keys(results)).toEqual(['slice-a', 'slice-b']);
    expect(results['slice-b']?.hotspots[0]).toMatchObject({
      peakStartEpochSec: 200,
      peakEndEpochSec: 400,
      intensityScore: 0.8,
    });
  });

  test('does not impose a fixed candidate count when separated cells qualify', () => {
    const cells = [
      { x: -40, z: -20, intensity: 1, support: 5 },
      { x: -20, z: -20, intensity: 0.9, support: 4 },
      { x: 0, z: -20, intensity: 0.8, support: 3 },
      { x: 20, z: -20, intensity: 0.7, support: 3 },
      { x: 40, z: -20, intensity: 0.6, support: 2 },
      { x: 0, z: 20, intensity: 0.5, support: 2 },
    ];

    expect(selectKdeHotspotCells(cells, 10)).toHaveLength(6);
  });
});

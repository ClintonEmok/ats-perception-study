import { describe, expect, test } from 'vitest';
import { buildStandaloneAdaptiveTimeMaps } from './standalone-adaptive-time';

describe('standalone adaptive time maps', () => {
  test('builds a density-backed warp from event timestamps', () => {
    const result = buildStandaloneAdaptiveTimeMaps(
      [[
        { x: 0, z: 0, type: 'A', timestampEpochSec: 10 },
        { x: 1, z: 1, type: 'B', timestampEpochSec: 20 },
        { x: 2, z: 2, type: 'C', timestampEpochSec: 90 },
      ]],
      [0, 100],
    );

    expect(result.timestamps).toEqual([10, 20, 90]);
    expect(result.densityMap).toHaveLength(1024);
    expect(result.warpMap).toHaveLength(1024);
    expect(result.warpMap?.[512]).not.toBeCloseTo(50, 3);
  });

  test('returns linear fallback inputs when timestamps or domain are invalid', () => {
    const result = buildStandaloneAdaptiveTimeMaps(
      [[{ x: 0, z: 0, type: 'A', timestampEpochSec: Number.NaN }]],
      [0, 100],
    );

    expect(result.timestamps).toEqual([]);
    expect(result.densityMap).toBeNull();
    expect(result.warpMap).toBeNull();
  });
});

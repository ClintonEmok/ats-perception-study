import { describe, expect, test } from 'vitest';
import type { FilteredPoint } from '@/lib/data/types';
import { analyzeClusters, groupClusterAnalysesBySlice } from './cluster-analysis';

const buildPoint = ({
  typeId = 1,
  districtId = 1,
  originalIndex = 0,
  ...overrides
}: Partial<FilteredPoint> & { typeId?: number; districtId?: number; originalIndex?: number } = {}): FilteredPoint => ({
  x: 0,
  y: 0,
  z: 0,
  originalIndex,
  typeId,
  districtId,
  ...overrides,
});

describe('cluster-analysis', () => {
  test('returns clusters for dense points', () => {
    const points: FilteredPoint[] = [
      buildPoint({ x: 10, y: 12, z: 10, typeId: 1, districtId: 1, originalIndex: 0 }),
      buildPoint({ x: 11, y: 13, z: 10, typeId: 1, districtId: 1, originalIndex: 1 }),
      buildPoint({ x: 10.5, y: 12.5, z: 11, typeId: 2, districtId: 1, originalIndex: 2 }),
      buildPoint({ x: 10.8, y: 12.2, z: 10.6, typeId: 2, districtId: 1, originalIndex: 3 }),
      buildPoint({ x: 10.2, y: 12.1, z: 10.4, typeId: 3, districtId: 2, originalIndex: 4 }),
      buildPoint({ x: 30, y: 80, z: 30, typeId: 3, districtId: 2, originalIndex: 5 }),
    ];

    const result = analyzeClusters(points, 0.9);

    expect(result.clusters.length).toBeGreaterThan(0);
    expect(result.clusters[0]).toMatchObject({
      count: expect.any(Number),
      dominantType: expect.any(String),
      typeCounts: expect.any(Object),
      timeRange: expect.any(Array),
    });
  });

  test('returns no clusters for empty input', () => {
    const result = analyzeClusters([], 0.5);
    expect(result.clusters).toEqual([]);
    expect(result.noiseIndexes).toEqual([]);
  });

  test('groups per-slice analyses by slice id', () => {
    const grouped = groupClusterAnalysesBySlice([
      { sliceId: 'slice-a', clusters: [] },
      { sliceId: 'slice-b', clusters: [] },
    ]);

    expect(Object.keys(grouped)).toEqual(['slice-a', 'slice-b']);
  });
});

import { describe, expect, test } from 'vitest';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import {
  applySliceMultipliersToDensityMap,
  buildDemoSliceAuthoredWarpAllocation,
  buildDemoSliceAuthoredWarpMap,
  resolveDensityDerivedSliceWeights,
} from './demo-warp-map';

const buildSlice = (
  id: string,
  range: [number, number],
  overrides: Partial<TimeSlice> = {},
): TimeSlice => ({
  id,
  type: 'range',
  time: (range[0] + range[1]) / 2,
  range: [...range],
  isLocked: false,
  isVisible: true,
  ...overrides,
});

const expectFiniteMonotonicMap = (map: Float32Array | null, domain: [number, number]) => {
  expect(map).not.toBeNull();
  const values = Array.from(map ?? []);
  expect(values.every((value) => Number.isFinite(value))).toBe(true);
  expect(values.every((value) => value >= domain[0] && value <= domain[1])).toBe(true);
  expect(values.every((value, index) => index === 0 || value >= (values[index - 1] ?? value))).toBe(true);
  expect(values.at(-1)).toBe(domain[1]);
};

describe('buildDemoSliceAuthoredWarpMap', () => {
  test('converts normalized ranges to the requested epoch domain without mutating slices', () => {
    const slices = [buildSlice('range', [25, 75])];
    const sourceRange = [...slices[0]!.range!] as [number, number];
    const allocation = buildDemoSliceAuthoredWarpAllocation(slices, null, [1000, 2000]);

    expect(allocation?.bins[0]).toMatchObject({ startTime: 1250, endTime: 1750 });
    expect(slices[0]!.range).toEqual(sourceRange);
  });

  test('allocates more display space to an interval with a higher mean density', () => {
    const weights = resolveDensityDerivedSliceWeights(
      [
        buildSlice('sparse', [0, 50]),
        buildSlice('dense', [50, 100]),
      ],
      Float32Array.from([1, 1, 1, 1, 10, 10, 10, 10]),
      [0, 100],
    );

    expect(weights.dense).toBeGreaterThan(weights.sparse);
  });

  test('uses a bounded manual warp-weight hint to change allocation', () => {
    const allocation = buildDemoSliceAuthoredWarpAllocation(
      [
        buildSlice('hinted', [0, 50], { warpWeight: 4 }),
        buildSlice('other', [50, 100], { warpWeight: 0.25 }),
      ],
      Float32Array.from([1, 1, 1, 1]),
      [0, 100],
    );

    expect(allocation?.bins[0]?.widthShare).toBeGreaterThan(allocation?.bins[1]?.widthShare ?? 0);
  });

  test('authored allocation follows seeded weights without reapplying density', () => {
    const allocation = buildDemoSliceAuthoredWarpAllocation(
      [
        buildSlice('a', [0, 50], { warpWeight: 1 }),
        buildSlice('b', [50, 100], { warpWeight: 2 }),
      ],
      Float32Array.from([1, 1, 1, 1, 10, 10, 10, 10]),
      [0, 100],
    );

    expect(allocation?.bins[1]?.widthShare).toBeGreaterThan(allocation?.bins[0]?.widthShare ?? 0);
    expect(allocation?.bins[0]?.warpWeight).toBe(1);
    expect(allocation?.bins[1]?.warpWeight).toBe(2);
  });

  test('clamps invalid manual weights and keeps allocation output finite', () => {
    const allocation = buildDemoSliceAuthoredWarpAllocation(
      [
        buildSlice('nan', [0, 20], { warpWeight: Number.NaN }),
        buildSlice('infinity', [20, 40], { warpWeight: Number.POSITIVE_INFINITY }),
        buildSlice('negative-infinity', [40, 60], { warpWeight: Number.NEGATIVE_INFINITY }),
        buildSlice('large', [60, 80], { warpWeight: 100 }),
        buildSlice('small', [80, 100], { warpWeight: -100 }),
      ],
      Float32Array.from([1, 2, 3, 4, 5]),
      [0, 100],
    );

    expect(allocation).not.toBeNull();
    expect(allocation?.bins.every((bin) => Number.isFinite(bin.warpWeight))).toBe(true);
    expect(allocation?.boundaries.every((boundary) => Number.isFinite(boundary))).toBe(true);
  });

  test('sorts reversed input slices into the same chronological allocation', () => {
    const chronological = [buildSlice('a', [60, 80]), buildSlice('b', [10, 30])];
    const reversed = [...chronological].reverse();
    const first = buildDemoSliceAuthoredWarpAllocation(chronological, null, [0, 100]);
    const second = buildDemoSliceAuthoredWarpAllocation(reversed, null, [0, 100]);

    expect(first?.bins.map((bin) => bin.id)).toEqual(['b', 'a']);
    expect(second?.bins.map((bin) => bin.id)).toEqual(first?.bins.map((bin) => bin.id));
    expect(Array.from(second?.boundaries ?? [])).toEqual(Array.from(first?.boundaries ?? []));
  });

  test('returns finite monotonic samples clamped to the requested epoch domain', () => {
    const map = buildDemoSliceAuthoredWarpMap(
      [buildSlice('clamped', [-50, 150])],
      Float32Array.from([0, 1, 0, 1]),
      [1000, 2000],
      32,
    );

    expectFiniteMonotonicMap(map, [1000, 2000]);
  });

  test('keeps authored warp identical to density warp when all multipliers are 1', () => {
    const slices = [
      buildSlice('a', [0, 50], { warpWeight: 1 }),
      buildSlice('b', [50, 100], { warpWeight: 1 }),
    ];
    const densityMap = Float32Array.from([0, 1, 0.5, 1]);

    expect(Array.from(buildDemoSliceAuthoredWarpMap(slices, densityMap, [0, 100], 16) ?? [])).toEqual(
      Array.from(buildDensityWarpMap(densityMap, [0, 100]) ?? []),
    );
  });

  test('applies slice multipliers directly onto the density map', () => {
    const adjusted = applySliceMultipliersToDensityMap(
      [
        buildSlice('early', [0, 50], { warpWeight: 1 }),
        buildSlice('late', [50, 100], { warpWeight: 4 }),
      ],
      Float32Array.from([1, 1, 1, 1]),
      [0, 100],
    );

    expect(Array.from(adjusted ?? [])).toEqual([1, 1, 4, 4]);
  });

  test('supports applying slice multipliers to a scoped map domain', () => {
    const adjusted = applySliceMultipliersToDensityMap(
      [buildSlice('late', [50, 100], { warpWeight: 4 })],
      Float32Array.from([1, 1, 1, 1]),
      [0, 100],
      [50, 100],
    );

    expect(Array.from(adjusted ?? [])).toEqual([4, 4, 4, 4]);
  });

  test('uses neutral allocation for missing or all-zero density signals', () => {
    const slices = [buildSlice('a', [0, 50]), buildSlice('b', [50, 100])];
    const missing = buildDemoSliceAuthoredWarpAllocation(slices, null, [0, 100]);
    const zero = buildDemoSliceAuthoredWarpAllocation(slices, new Float32Array(4), [0, 100]);

    expect(missing?.neutralFallback).toBe(true);
    expect(zero?.neutralFallback).toBe(true);
    expect(missing?.bins.every((bin) => bin.warpWeight === 1)).toBe(true);
    expect(zero?.bins.every((bin) => bin.warpWeight === 1)).toBe(true);
    expectFiniteMonotonicMap(buildDemoSliceAuthoredWarpMap(slices, null, [0, 100], 16), [0, 100]);
  });

  test('keeps every valid comparable bin non-negative and chronologically ordered', () => {
    const allocation = buildDemoSliceAuthoredWarpAllocation(
      [
        buildSlice('a', [0, 20]),
        buildSlice('b', [20, 40]),
        buildSlice('c', [40, 60]),
        buildSlice('d', [60, 80]),
        buildSlice('e', [80, 100]),
      ],
      Float32Array.from([1, 1, 2, 3, 5]),
      [0, 100],
    );

    expect(allocation).not.toBeNull();
    expect(allocation?.minimumWidthShare).toBeCloseTo(1e-6, 9);
    expect(allocation?.bins.every((bin) => bin.widthShare >= 0)).toBe(true);
    expect(Array.from(allocation?.boundaries ?? []).every((boundary, index, boundaries) => (
      index === 0 || boundary > (boundaries[index - 1] ?? boundary)
    ))).toBe(true);
  });

  test('keeps overlapping source intervals separate in cumulative display space', () => {
    const slices = [buildSlice('later', [40, 90]), buildSlice('earlier', [10, 60])];
    const allocation = buildDemoSliceAuthoredWarpAllocation(slices, Float32Array.from([1, 2, 3, 4]), [0, 100]);
    const boundaries = Array.from(allocation?.boundaries ?? []);

    expect(allocation?.bins.map((bin) => bin.id)).toEqual(['earlier', 'later']);
    expect(boundaries.every((boundary, index) => index === 0 || boundary > (boundaries[index - 1] ?? boundary))).toBe(true);
    expectFiniteMonotonicMap(buildDemoSliceAuthoredWarpMap(slices, Float32Array.from([1, 2, 3, 4]), [0, 100], 64), [0, 100]);
  });

  test('derives density-seeded warp weights for visible range slices', () => {
    const weights = resolveDensityDerivedSliceWeights(
      [
        buildSlice('a', [0, 50]),
        buildSlice('b', [50, 100]),
      ],
      Float32Array.from([1, 1, 1, 1, 10, 10, 10, 10]),
      [0, 100],
    );

    expect(weights.a).toBeDefined();
    expect(weights.b).toBeDefined();
    expect(weights.b).toBeGreaterThan(weights.a);
  });
});

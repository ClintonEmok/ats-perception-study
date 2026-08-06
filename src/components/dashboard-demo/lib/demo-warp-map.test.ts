import { describe, expect, test } from 'vitest';
import type { TimeSlice } from '@/store/useSliceDomainStore';
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
  expect(values[0]).toBe(domain[0]);
  expect(values.at(-1)).toBe(domain[1]);
};

/** Read the map at a fraction of the sample axis, rounding to the nearest sample. */
const sampleValue = (map: Float32Array | null, ratio: number): number => {
  expect(map).not.toBeNull();
  const values = Array.from(map ?? []);
  const index = Math.round(ratio * (values.length - 1));
  return values[index] ?? Number.NaN;
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

  test('all-neutral weights produce the identity map at any exaggeration', () => {
    const slices = [buildSlice('a', [10, 30]), buildSlice('b', [50, 70])];

    for (const exaggeration of [1, 3]) {
      const map = buildDemoSliceAuthoredWarpMap(slices, null, [0, 100], 101, [0, 100], exaggeration);
      expect(map).not.toBeNull();
      // With every slice weight at 1 the effective weight is 1 regardless of
      // exaggeration, so each linear position maps to itself.
      expect(sampleValue(map, 0.2)).toBeCloseTo(20, 1);
      expect(sampleValue(map, 0.6)).toBeCloseTo(60, 1);
      expectFiniteMonotonicMap(map, [0, 100]);
    }
  });

  test('maps a weighted interval to its duration times weight share of the whole domain', () => {
    // Slice [25,75] with weight 2 over domain [0,100] at exaggeration 1.
    // Weighted lengths: 25*1 + 50*2 + 25*1 = 150, so the slice's 50-long
    // duration at weight 2 maps to 100 * (100/150) = 66.67 display units.
    const map = buildDemoSliceAuthoredWarpMap(
      [buildSlice('weighted', [25, 75], { warpWeight: 2 })],
      null,
      [0, 100],
      101,
    );

    expect(map).not.toBeNull();
    const start = sampleValue(map, 0.25);
    const end = sampleValue(map, 0.75);
    expect(start).toBeCloseTo(25 * (100 / 150), 1);
    expect(end).toBeCloseTo(125 * (100 / 150), 1);
    expect(end - start).toBeCloseTo(50 * 2 * (100 / 150), 1);
    expectFiniteMonotonicMap(map, [0, 100]);
  });

  test('overlapping intervals use the maximum covering weight instead of summing', () => {
    // earlier [10,60] weight 1 and later [40,90] weight 4 overlap on [40,60].
    // Segments: [0,10]w1 [10,40]w1 [40,60]w4 [60,90]w4 [90,100]w1; the overlap
    // advances at the max covering weight 4 (not 1+4=5, not the lighter 1).
    const slices = [
      buildSlice('earlier', [10, 60], { warpWeight: 1 }),
      buildSlice('later', [40, 90], { warpWeight: 4 }),
    ];
    const map = buildDemoSliceAuthoredWarpMap(slices, null, [0, 100], 101);

    expect(map).not.toBeNull();
    // Cumulative weighted length at 40 is 40 and at 60 is 40 + 20*4 = 120;
    // total weighted length is 250, so the overlap maps 32 units wide.
    const overlapStart = sampleValue(map, 0.4);
    const overlapEnd = sampleValue(map, 0.6);
    expect(overlapStart).toBeCloseTo(40 * (100 / 250), 1);
    expect(overlapEnd).toBeCloseTo(120 * (100 / 250), 1);
    expect(overlapEnd - overlapStart).toBeCloseTo(20 * 4 * (100 / 250), 1);
    expectFiniteMonotonicMap(map, [0, 100]);
  });

  test('leaves uncovered gaps neutral while weighted intervals compress them', () => {
    // Slice [10,30] weight 3 over domain [0,100] at exaggeration 1.
    // Weighted lengths: 10*1 + 20*3 + 70*1 = 140, so the leading gap [0,10]
    // maps to 100 * (10/140) = 7.14 display units and the weighted center
    // pushes the trailing gap outward.
    const map = buildDemoSliceAuthoredWarpMap(
      [buildSlice('burst', [10, 30], { warpWeight: 3 })],
      null,
      [0, 100],
      101,
    );

    expect(map).not.toBeNull();
    expect(sampleValue(map, 0.1)).toBeCloseTo(10 * (100 / 140), 1);
    expect(sampleValue(map, 0.3)).toBeCloseTo(70 * (100 / 140), 1);
    expectFiniteMonotonicMap(map, [0, 100]);
  });

  test('uniform weights across full-domain coverage cancel through normalization and stay linear', () => {
    // Both slices share weight 2 across the whole domain, so every segment
    // carries weight 2. The cumulative weighted lengths are uniformly scaled
    // and normalization cancels the common factor, yielding the identity map.
    // This is expected normalization semantics, not a special case.
    const slices = [
      buildSlice('a', [0, 50], { warpWeight: 2 }),
      buildSlice('b', [50, 100], { warpWeight: 2 }),
    ];
    const map = buildDemoSliceAuthoredWarpMap(slices, null, [0, 100], 101);

    expect(map).not.toBeNull();
    expect(sampleValue(map, 0.25)).toBeCloseTo(25, 1);
    expect(sampleValue(map, 0.5)).toBeCloseTo(50, 1);
    expect(sampleValue(map, 0.75)).toBeCloseTo(75, 1);
    expectFiniteMonotonicMap(map, [0, 100]);
  });

  test('exaggeration scales deviation from neutral instead of exponentiating weights', () => {
    // Weight 2 on [25,75]: effective = 1 + (2 - 1) * exaggeration, so the
    // interval's mapped span grows 50 -> 66.67 -> 80 as exaggeration
    // goes 0 -> 1 -> 3 while staying linear inside each segment.
    const slice = buildSlice('weighted', [25, 75], { warpWeight: 2 });
    const none = buildDemoSliceAuthoredWarpMap([slice], null, [0, 100], 101, [0, 100], 0);
    const normal = buildDemoSliceAuthoredWarpMap([slice], null, [0, 100], 101, [0, 100], 1);
    const extreme = buildDemoSliceAuthoredWarpMap([slice], null, [0, 100], 101, [0, 100], 3);

    const span = (map: Float32Array | null) => sampleValue(map, 0.75) - sampleValue(map, 0.25);
    const spanNone = span(none);
    const spanNormal = span(normal);
    const spanExtreme = span(extreme);
    expect(spanNone).toBeCloseTo(50, 1);
    expect(spanNormal).toBeCloseTo(50 * 2 * (100 / 150), 1);
    expect(spanExtreme).toBeCloseTo(50 * 4 * (100 / 250), 1);
    expect(spanExtreme).toBeGreaterThan(spanNormal);
    expect(spanNormal).toBeGreaterThan(spanNone);
    expectFiniteMonotonicMap(extreme, [0, 100]);
  });

  test('very light weights stay above a positive floor and keep the map finite and monotonic', () => {
    // NaN weight clamps to 1; weight 0.25 at exaggeration 3 would go negative
    // under the deviation formula (1 + (0.25-1)*3 = -1.25) and is floored to
    // 0.01, so the covered segment keeps a tiny positive slope.
    const slices = [
      buildSlice('nan', [0, 20], { warpWeight: Number.NaN }),
      buildSlice('tiny', [40, 60], { warpWeight: 0.25 }),
    ];
    const map = buildDemoSliceAuthoredWarpMap(slices, null, [0, 100], 101, [0, 100], 3);

    expect(map).not.toBeNull();
    const overlapStart = sampleValue(map, 0.4);
    const overlapEnd = sampleValue(map, 0.6);
    expect(overlapEnd - overlapStart).toBeCloseTo(20 * 0.01 * (100 / 80.2), 1);
    expect(overlapEnd - overlapStart).toBeGreaterThan(0);
    expectFiniteMonotonicMap(map, [0, 100]);
  });

  test('anchors the map exactly at both map-domain endpoints', () => {
    const map = buildDemoSliceAuthoredWarpMap(
      [buildSlice('weighted', [25, 75], { warpWeight: 2 })],
      null,
      [0, 100],
      101,
      [0, 100],
      3,
    );

    expect(map).not.toBeNull();
    const values = Array.from(map ?? []);
    expect(values[0]).toBe(0);
    expect(values[values.length - 1]).toBe(100);
  });

  test('clips slice ranges to a scoped map domain', () => {
    // Slice [25,75] in sliceDomain [1000,2000] resolves to epoch [1250,1750];
    // the scoped map domain [1000,1600] clips it to [1250,1600], leaving a
    // neutral leading gap of 250 seconds.
    const map = buildDemoSliceAuthoredWarpMap(
      [buildSlice('scoped', [25, 75], { warpWeight: 2 })],
      null,
      [1000, 2000],
      61,
      [1000, 1600],
    );

    expect(map).not.toBeNull();
    // Weighted lengths: 250*1 + 350*2 = 950 over a 600-wide map domain.
    expect(sampleValue(map, (1250 - 1000) / 600)).toBeCloseTo(1000 + 250 * (600 / 950), 1);
    expect(sampleValue(map, (1600 - 1000) / 600) - sampleValue(map, (1250 - 1000) / 600))
      .toBeCloseTo(350 * 2 * (600 / 950), 1);
    expectFiniteMonotonicMap(map, [1000, 1600]);
  });

  test('keeps uniform neutral weights linear regardless of density', () => {
    const slices = [
      buildSlice('a', [0, 50], { warpWeight: 1 }),
      buildSlice('b', [50, 100], { warpWeight: 1 }),
    ];
    const densityMap = Float32Array.from([0, 1, 0.5, 1]);

    const values = Array.from(buildDemoSliceAuthoredWarpMap(slices, densityMap, [0, 100], 101) ?? []);
    // Equal neutral weights make the map linear, and the authored mode ignores
    // the density map entirely, so density cannot skew the timeline.
    expect(values[Math.round(0.5 * 100)]).toBeCloseTo(50, 1);
    expectFiniteMonotonicMap(buildDemoSliceAuthoredWarpMap(slices, densityMap, [0, 100], 101), [0, 100]);
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

  test('keeps overlapping source intervals chronologically ordered with finite boundaries', () => {
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

import { describe, expect, test } from 'vitest';
import {
  buildAllocationMetrics,
  buildDurationVolumeProfile,
  DEFAULT_DURATION_VOLUME_SETTINGS,
} from './volume-encoding';
import { buildFixedDurationWindow, proposeFixedDurationWindowAtY } from './temporal-interactions';

describe('buildDurationVolumeProfile', () => {
  const slices = [
    { index: 0, startEpoch: 0, endEpoch: 3_600 },
    { index: 1, startEpoch: 0, endEpoch: 7_200 },
    { index: 2, startEpoch: 0, endEpoch: 7_200 },
  ];

  test('returns an empty profile for empty input', () => {
    expect(buildDurationVolumeProfile([], DEFAULT_DURATION_VOLUME_SETTINGS)).toEqual([]);
  });

  test('keeps longer durations thicker and deterministic', () => {
    const profileA = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.2,
      normalizationMode: 'window',
    });
    const profileB = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.2,
      normalizationMode: 'window',
    });

    expect(profileA).toEqual(profileB);
    expect(profileA).toHaveLength(3);
    expect(profileA[0]?.durationSeconds).toBe(3_600);
    expect(profileA[1]?.durationSeconds).toBe(7_200);
    expect(profileA[1]?.thickness).toBeGreaterThan(profileA[0]?.thickness ?? 0);
    expect(profileA[1]?.normalizedDuration).toBeGreaterThan(profileA[0]?.normalizedDuration ?? 0);
  });

  test('responds to exaggeration changes without changing ordering', () => {
    const conservative = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 0.8,
      normalizationMode: 'reference',
    });
    const exaggerated = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.6,
      normalizationMode: 'reference',
    });

    expect(exaggerated[1]?.thickness).toBeGreaterThan(conservative[1]?.thickness ?? 0);
    expect(exaggerated.map((entry) => entry.index)).toEqual(conservative.map((entry) => entry.index));
    expect(exaggerated[2]?.opacity).toBeLessThanOrEqual(exaggerated[0]?.opacity ?? 1);
  });

  test('uses warp-adjusted duration when adaptive warp is enabled', () => {
    const warpedSlices = [
      { index: 0, startEpoch: 0, endEpoch: 50 },
      { index: 1, startEpoch: 50, endEpoch: 100 },
    ];

    const profile = buildDurationVolumeProfile(warpedSlices, {
      scaleSeconds: 50,
      exaggeration: 1,
      normalizationMode: 'reference',
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: new Float32Array([0, 10, 100]),
      warpDomain: [0, 100],
    });

    expect(profile).toHaveLength(2);
    expect(profile[0]?.durationSeconds).toBeCloseTo(10, 5);
    expect(profile[1]?.durationSeconds).toBeCloseTo(90, 5);
    expect(profile[1]?.thickness).toBeGreaterThan(profile[0]?.thickness ?? 0);
  });

  test('recovers clock duration separately from warped display allocation', () => {
    const sourceSlices = [
      { index: 0, startEpoch: 0, endEpoch: 3_600, crimeCount: 12, warpWeight: 1.5, signal: 0.8 },
      { index: 1, startEpoch: 3_600, endEpoch: 10_800, crimeCount: 24 },
    ];
    const profile = [
      { index: 0, durationSeconds: 7_200, normalizedDuration: 0.4, thickness: 2.5, opacity: 0.2, falloff: 0.1 },
      { index: 1, durationSeconds: 3_600, normalizedDuration: 0.2, thickness: 1.5, opacity: 0.2, falloff: 0.1 },
    ];

    expect(buildAllocationMetrics({ slice: sourceSlices[0]!, slices: sourceSlices, profile })).toEqual({
      clockDurationSeconds: 3_600,
      eventCount: 12,
      eventDensityPerDay: 288,
      adaptiveWeight: 1.5,
      signal: 0.8,
      displayDurationSeconds: 7_200,
      linearShare: 1 / 3,
      visualShare: 2 / 3,
      expansionCompressionRatio: 2,
      expansionCompressionPercent: 100,
      visualThickness: 2.5,
    });
  });

  test('keeps unavailable allocation inputs unavailable', () => {
    const metrics = buildAllocationMetrics({
      slice: { index: 0, startEpoch: 100, endEpoch: 100 },
      slices: [{ index: 0, startEpoch: 100, endEpoch: 100 }],
    });

    expect(metrics.eventCount).toBeNull();
    expect(metrics.eventDensityPerDay).toBeNull();
    expect(metrics.adaptiveWeight).toBeNull();
    expect(metrics.signal).toBeNull();
    expect(metrics.displayDurationSeconds).toBeNull();
    expect(metrics.visualShare).toBeNull();
    expect(metrics.expansionCompressionRatio).toBeNull();
    expect(metrics.visualThickness).toBeNull();
  });

  test('clamps a fixed-duration window at both domain edges', () => {
    expect(buildFixedDurationWindow(10, 20, [0, 100])).toEqual([0, 20]);
    expect(buildFixedDurationWindow(90, 20, [0, 100])).toEqual([80, 100]);
    expect(buildFixedDurationWindow(50, 20, [0, 100])).toEqual([40, 60]);
    expect(buildFixedDurationWindow(50, 200, [0, 100])).toEqual([0, 100]);
  });

  test('proposes fixed-duration windows from adaptive-axis Y without mutating state', () => {
    const proposal = proposeFixedDurationWindowAtY(75, (y) => y * 2, 20, [0, 200]);
    expect(proposal).toEqual([140, 160]);
  });
});

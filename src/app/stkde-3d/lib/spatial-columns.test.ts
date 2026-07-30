/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import type { KdeCell } from '@/lib/kde/types';
import {
  buildPersistentSpatialColumns,
  mapPersistentSpatialSegmentToY,
  type PersistentSpatialSlice,
} from './spatial-columns';

const cell = (x: number, z: number, intensity: number, support = 1): KdeCell => ({
  x,
  z,
  intensity,
  support,
});

const slice = (index: number, startEpoch: number, endEpoch: number): PersistentSpatialSlice => ({
  index,
  startEpoch,
  endEpoch,
});

describe('persistent spatial columns', () => {
  it('returns no segments for empty slices or missing KDE arrays', () => {
    expect(buildPersistentSpatialColumns([], [])).toEqual([]);
    expect(buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [[], undefined],
    )).toEqual([]);
  });

  it('preserves a non-consecutive persistence gap instead of interpolating it', () => {
    const columns = buildPersistentSpatialColumns(
      [slice(4, 100, 110), slice(8, 110, 150), slice(12, 150, 175)],
      [[cell(12.5, -8.25, 0.4)], [], [cell(12.5, -8.25, 0.8)]],
    );

    expect(columns).toHaveLength(1);
    expect(columns[0]?.x).toBe(12.5);
    expect(columns[0]?.z).toBe(-8.25);
    expect(columns[0]?.segments.map(({ sliceIndex }) => sliceIndex)).toEqual([4, 12]);
    expect(columns[0]?.segments.map(({ startEpoch, endEpoch }) => [startEpoch, endEpoch])).toEqual([
      [100, 110],
      [150, 175],
    ]);
  });

  it('treats cells at or below the existing cutoff as absent', () => {
    expect(buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [[cell(1, 2, 0.5)], [cell(1, 2, 0.4)]],
      2,
      0.5,
    )).toEqual([]);
  });

  it('keeps nonuniform source durations and excludes one-off cells', () => {
    const columns = buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 40), slice(2, 40, 41)],
      [
        [cell(0, 0, 0.5), cell(30, 30, 0.9)],
        [cell(0, 0, 0.7)],
        [],
      ],
      2,
    );

    expect(columns).toHaveLength(1);
    expect(columns[0]?.segments.map(({ startEpoch, endEpoch }) => [startEpoch, endEpoch])).toEqual([
      [0, 10],
      [10, 40],
    ]);
  });

  it('counts duplicate records once per slice and selects the strongest deterministic winner', () => {
    const duplicateOnly = buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [[cell(5, 6, 0.3), cell(5, 6, 0.4, 4)], []],
    );
    expect(duplicateOnly).toEqual([]);

    const columns = buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [
        [cell(5, 6, 0.3, 2), cell(5, 6, 0.8, 3), cell(5, 6, 0.8, 7)],
        [cell(5, 6, 0.6, 1)],
      ],
    );

    expect(columns[0]?.segments).toEqual([
      expect.objectContaining({ sliceIndex: 0, intensity: 0.8, support: 7 }),
      expect.objectContaining({ sliceIndex: 1, intensity: 0.6, support: 1 }),
    ]);
  });

  it('ignores invalid and zero intensities during normalization', () => {
    const columns = buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [
        [cell(1, 1, 0), cell(2, 2, Number.NaN), cell(3, 3, 0.25)],
        [cell(1, 1, -1), cell(2, 2, Number.POSITIVE_INFINITY), cell(3, 3, 0.5)],
      ],
    );

    expect(columns).toHaveLength(1);
    expect(columns[0]?.segments.every(({ normalizedIntensity }) => Number.isFinite(normalizedIntensity))).toBe(true);
    expect(columns[0]?.segments.map(({ normalizedIntensity }) => normalizedIntensity)).toEqual([0.5, 1]);
  });

  it('normalizes all retained segment intensities against the retained global maximum', () => {
    const columns = buildPersistentSpatialColumns(
      [slice(0, 0, 10), slice(1, 10, 20)],
      [
        [cell(-20, -20, 0.2), cell(20, 20, 0.8)],
        [cell(-20, -20, 0.4), cell(20, 20, 0.6)],
      ],
    );

    expect(columns.map(({ x }) => x)).toEqual([-20, 20]);
    expect(columns[0]?.segments.map(({ normalizedIntensity }) => normalizedIntensity)).toEqual([0.25, 0.5]);
    expect(columns[1]?.segments.map(({ normalizedIntensity }) => normalizedIntensity)).toEqual([1, expect.closeTo(0.75)]);
  });

  it('keeps normalized heatmap x/z anchors rather than geographic coordinates', () => {
    const columns = buildPersistentSpatialColumns(
      [slice(10, 50, 60), slice(11, 60, 70)],
      [[cell(42.25, -17.75, 0.6)], [cell(42.25, -17.75, 0.7)]],
    );

    expect(columns[0]).toMatchObject({ x: 42.25, z: -17.75 });
  });

  it('maps both actual epoch endpoints through an uneven epoch-to-Y resolver', () => {
    const segment = {
      sliceIndex: 3,
      startEpoch: 2,
      endEpoch: 5,
      intensity: 0.5,
      support: 2,
      normalizedIntensity: 1,
    };
    const mapped = mapPersistentSpatialSegmentToY(segment, (epoch) => epoch ** 3);

    expect(mapped).toEqual({
      startY: 8,
      endY: 125,
      centerY: 66.5,
      height: 117,
    });
    expect(mapPersistentSpatialSegmentToY(segment, () => Number.NaN)).toBeNull();
  });
});

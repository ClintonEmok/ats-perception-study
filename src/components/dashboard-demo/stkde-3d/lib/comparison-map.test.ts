import { describe, expect, test } from 'vitest';
import {
  getComparisonCellCenter,
  mapAbsoluteIntensity,
  mapKdeRowToCanvasRow,
  mapSignedContrast,
} from './comparison-map';

describe('comparison field map helpers', () => {
  test('maps cell centers into the canonical [-50, 50] extent', () => {
    expect(getComparisonCellCenter(0, 0, 4)).toEqual({ x: -37.5, z: -37.5 });
    expect(getComparisonCellCenter(3, 3, 4)).toEqual({ x: 37.5, z: 37.5 });
  });

  test('flips canvas rows without changing the KDE geographic row', () => {
    expect(mapKdeRowToCanvasRow(0, 4)).toBe(3);
    expect(mapKdeRowToCanvasRow(3, 4)).toBe(0);
  });

  test('uses one raw shared absolute domain and clamps display values', () => {
    expect(mapAbsoluteIntensity(2, [0, 4])).toBe(0.5);
    expect(mapAbsoluteIntensity(8, [0, 4])).toBe(1);
    expect(mapAbsoluteIntensity(-1, [0, 4])).toBe(0);
    expect(mapAbsoluteIntensity(0, [0, 0])).toBe(0);
  });

  test('applies finite, clamped, sign-preserving gamma contrast', () => {
    expect(mapSignedContrast(0, 4)).toBe(0);
    expect(mapSignedContrast(0.01, 4)).toBeGreaterThan(0);
    expect(mapSignedContrast(-0.01, 4)).toBeLessThan(0);
    expect(mapSignedContrast(8, 4)).toBe(1);
    expect(mapSignedContrast(-8, 4)).toBe(-1);
    expect(mapSignedContrast(Number.NaN, 4)).toBe(0);
    expect(mapSignedContrast(1, 0)).toBe(0);
  });
});

import { describe, expect, test } from 'vitest';
import type { KdeField } from '@/lib/kde';
import {
  computeSharedAbsoluteDomain,
  computeSignedKdeDifference,
  convertKdeFieldToDisplayCells,
  KdeComparisonError,
  MIN_COMPARISON_DOMAIN,
} from './comparison-difference';

function createField(values: number[], maxIntensity = Math.max(0, ...values)): KdeField {
  return {
    values: new Float32Array(values),
    support: new Float32Array(values.map((value) => (value > 0 ? 1 : 0))),
    gridSize: 2,
    cellWidth: 50,
    cellHeight: 50,
    maxIntensity,
  };
}

describe('comparison KDE math', () => {
  test('uses one shared absolute raw maximum and preserves sparse display filtering', () => {
    const a = createField([0.25, 2, 0, 0]);
    const b = createField([4, 0, 0, 0]);
    const domain = computeSharedAbsoluteDomain(a, b);

    expect(domain).toEqual([0, 4]);
    expect(convertKdeFieldToDisplayCells(a, domain[1], 0.1)).toEqual([
      { x: 25, z: -25, intensity: 0.5, support: 1 },
    ]);
  });

  test('subtracts raw values below a display cutoff', () => {
    const a = createField([0.02, 0, 0, 0]);
    const b = createField([0, 0, 0, 0]);
    const result = computeSignedKdeDifference(a, b);

    expect(result.values[0]).toBeCloseTo(0.02);
    expect(result.maxAbs).toBeCloseTo(0.02);
    expect(result.domain[0]).toBeCloseTo(-0.02);
    expect(result.domain[1]).toBeCloseTo(0.02);
  });

  test('keeps positive, negative, and zero signs in a symmetric domain', () => {
    const result = computeSignedKdeDifference(
      createField([2, 0.25, 0, 0]),
      createField([1, 0.5, 0, 0]),
    );

    expect(Array.from(result.values)).toEqual([1, -0.25, 0, 0]);
    expect(result.domain).toEqual([-1, 1]);
    expect(result.field.maxIntensity).toBe(1);
  });

  test('returns a deterministic neutral field for empty and identical inputs', () => {
    const empty = computeSignedKdeDifference(createField([0, 0, 0, 0]), createField([0, 0, 0, 0]));
    const identical = computeSignedKdeDifference(createField([1, 0.5, 0, 0]), createField([1, 0.5, 0, 0]));

    expect(Array.from(empty.values)).toEqual([0, 0, 0, 0]);
    expect(empty.domain).toEqual([-MIN_COMPARISON_DOMAIN, MIN_COMPARISON_DOMAIN]);
    expect(Array.from(identical.values)).toEqual([0, 0, 0, 0]);
    expect(identical.domain).toEqual([-MIN_COMPARISON_DOMAIN, MIN_COMPARISON_DOMAIN]);
  });

  test('rejects missing, malformed, and mismatched comparison fields', () => {
    expect(() => computeSignedKdeDifference(undefined, createField([0, 0, 0, 0]))).toThrow(
      KdeComparisonError,
    );
    expect(() => computeSignedKdeDifference(
      { ...createField([1, 0, 0, 0]), values: new Float32Array([1]) },
      createField([0, 0, 0, 0]),
    )).toThrow(/valid grid metadata/);
    expect(() => computeSignedKdeDifference(
      createField([1, 0, 0, 0]),
      {
        ...createField([1, 0, 0, 0]),
        gridSize: 4,
        cellWidth: 25,
        cellHeight: 25,
        values: new Float32Array(16),
        support: new Float32Array(16),
      },
    )).toThrow(/matching grids/);
  });
});

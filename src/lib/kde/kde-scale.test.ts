import { describe, expect, test } from 'vitest';
import { smoothingMetersToSigmaCells } from './types';

describe('smoothingMetersToSigmaCells', () => {
  test('keeps physical smoothing stable as grid resolution changes', () => {
    expect(smoothingMetersToSigmaCells(100, 100)).toBe(1);
    expect(smoothingMetersToSigmaCells(100, 50)).toBe(0.5);
    expect(smoothingMetersToSigmaCells(100, 200)).toBe(2);
  });

  test('clamps invalid physical values and grid sizes', () => {
    expect(smoothingMetersToSigmaCells(Number.NaN, 2)).toBeCloseTo(0.0004);
    expect(smoothingMetersToSigmaCells(0, 100)).toBeCloseTo(0.01);
  });
});

import { describe, expect, it } from 'vitest';
import type { KdeCell } from '@/lib/kde';
import {
  buildSparseKdeGrid,
  computeSparseKdeDifference,
} from './compare-sparse-surfaces';

const cell = (x: number, z: number, intensity: number, support: number): KdeCell => ({
  x,
  z,
  intensity,
  support,
});

describe('dashboard sparse KDE comparison', () => {
  it('subtracts matching rendered cells and treats missing cells as zero', () => {
    const result = computeSparseKdeDifference(
      [cell(0, 0, 0.8, 4), cell(25, 25, 0.2, 1)],
      [cell(0, 0, 0.2, 2), cell(-25, -25, 0.6, 3)],
    );

    expect(result.maxAbs).toBeCloseTo(0.6);
    expect(result.activeCellCount).toBe(3);
    expect(result.cells.find((entry) => entry.x === 1.5625 && entry.z === 1.5625)).toMatchObject({
      intensity: 1,
      support: 4,
    });
    expect(result.cells.find((entry) => entry.x === 26.5625 && entry.z === 26.5625)?.intensity).toBeCloseTo(1 / 3);
    expect(result.cells.find((entry) => entry.x === -23.4375 && entry.z === -23.4375)?.intensity).toBeCloseTo(-1);
  });

  it('keeps active neutral cells visible when both surfaces agree', () => {
    const result = computeSparseKdeDifference(
      [cell(0, 0, 0.4, 2)],
      [cell(0, 0, 0.4, 2)],
    );

    expect(result.activeCellCount).toBe(1);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]?.intensity).toBe(0);
  });

  it('returns an empty field when neither sparse surface has cells', () => {
    expect(computeSparseKdeDifference([], [])).toEqual({
      cells: [],
      maxAbs: 0,
      activeCellCount: 0,
    });
  });

  it('preserves negative signed cells for the difference renderer', () => {
    const grid = buildSparseKdeGrid([cell(0, 0, -0.75, 2)], 'signed');

    expect(grid.intensities[16 * 32 + 16]).toBeCloseTo(-0.75);
    expect(grid.active[16 * 32 + 16]).toBe(1);
  });

});

import { describe, expect, test } from 'vitest';
import { computeSliceKde } from './compute-slice-kde';

describe('computeSliceKde raw field', () => {
  test('keeps below-threshold values in the complete field while cells stay sparse', () => {
    const result = computeSliceKde(
      [{ x: 0, z: 0 }],
      {
        gridSize: 4,
        sigmaCells: 0.5,
        kernelRadiusCells: 1,
        threshold: 0.9,
      },
    );

    expect(result.field.values).toBeInstanceOf(Float32Array);
    expect(result.field.support).toBeInstanceOf(Float32Array);
    expect(result.field.values).toHaveLength(16);
    expect(result.field.support).toHaveLength(16);
    expect(result.field.gridSize).toBe(4);
    expect(result.field.cellWidth).toBe(25);
    expect(result.field.cellHeight).toBe(25);
    expect(result.field.maxIntensity).toBe(1);

    const belowThresholdValues = Array.from(result.field.values).filter(
      (value) => value > 0 && value < result.field.maxIntensity,
    );
    expect(belowThresholdValues.length).toBeGreaterThan(0);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({
      x: 12.5,
      z: 12.5,
      intensity: 1,
      support: 1,
    });
    expect(result.field.support[10]).toBe(1);
  });

  test('preserves deterministic row-major value and support ordering', () => {
    const result = computeSliceKde(
      [
        { x: -49, z: -49 },
        { x: 49, z: 49 },
      ],
      {
        gridSize: 4,
        sigmaCells: 0.5,
        kernelRadiusCells: 1,
        threshold: 0,
      },
    );

    expect(Array.from(result.field.support)).toEqual([
      1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 1,
    ]);
    expect(result.field.values[0]).toBe(1);
    expect(result.field.values[15]).toBe(1);
    expect(result.cells[0]).toMatchObject({ x: -37.5, z: -37.5 });
    expect(result.cells.at(-1)).toMatchObject({ x: 37.5, z: 37.5 });
  });

  test('returns a safe empty display result with a complete zero field', () => {
    const result = computeSliceKde([], {
      gridSize: 4,
      threshold: 0,
    });

    expect(result.cells).toEqual([]);
    expect(result.maxIntensity).toBe(1);
    expect(result.meanIntensity).toBe(0);
    expect(result.field.maxIntensity).toBe(0);
    expect(Array.from(result.field.values)).toEqual(new Array(16).fill(0));
    expect(Array.from(result.field.support)).toEqual(new Array(16).fill(0));
  });
});

import { describe, expect, test } from 'vitest';
import { computeSliceKde, type KdeField } from '@/lib/kde';

describe('@/lib/kde public barrel', () => {
  test('exports complete raw fields alongside the existing display result', () => {
    const result = computeSliceKde([{ x: 0, z: 0 }], {
      gridSize: 4,
      sigmaCells: 0.5,
      kernelRadiusCells: 1,
      threshold: 0.9,
    });
    const field: KdeField = result.field;

    expect(field.values).toBeInstanceOf(Float32Array);
    expect(field.support).toBeInstanceOf(Float32Array);
    expect(field.values.length).toBe(field.gridSize * field.gridSize);
    expect(field.support.length).toBe(field.values.length);
    expect(result.cells).toHaveLength(1);
  });
});

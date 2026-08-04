import { describe, expect, it } from 'vitest';
import { buildDensityWarpMap } from './adaptive-warp-utils';

describe('buildDensityWarpMap', () => {
  it('returns null for missing or undersized density maps', () => {
    expect(buildDensityWarpMap(null, [0, 10])).toBeNull();
    expect(buildDensityWarpMap(new Float32Array([1]), [0, 10])).toBeNull();
  });

  it('keeps the warp map monotonic within the requested domain', () => {
    const result = buildDensityWarpMap(Float32Array.from([0, 2, 5, 1]), [100, 200]);

    expect(result).not.toBeNull();
    const values = Array.from(result ?? []);
    expect(values[0]).toBe(100);
    expect(values.every((value, index) => index === 0 || value >= (values[index - 1] ?? value))).toBe(true);
    expect(values.every((value) => value >= 100 && value <= 200)).toBe(true);
  });

  it('applies dramatic contrast by shrinking mid-density bins relative to the peak', () => {
    const result = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40]);

    expect(result).not.toBeNull();
    const values = Array.from(result ?? []);
    expect(values[1]).toBeCloseTo(4.1558, 3);
    expect(values[2]).toBeCloseTo(10.9091, 3);
    expect(values[3]).toBe(40);
  });
});

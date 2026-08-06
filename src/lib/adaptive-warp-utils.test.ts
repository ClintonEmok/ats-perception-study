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

  it('keeps the default map identical when exaggeration is omitted', () => {
    const baseline = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40]);
    const defaulted = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40], 1);

    expect(Array.from(defaulted ?? [])).toEqual(Array.from(baseline ?? []));
  });

  it('shrinks the sparse mid-bin further and inflates the peak when exaggerated', () => {
    const normal = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40]);
    const extreme = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40], 3);

    expect(extreme).not.toBeNull();
    const normalValues = Array.from(normal ?? []);
    const extremeValues = Array.from(extreme ?? []);
    expect(extremeValues[0]).toBe(0);
    expect(extremeValues[extremeValues.length - 1]).toBe(40);
    // The mid-density bin lands earlier (squeezed toward the sparse end) …
    expect(extremeValues[1]).toBeLessThan(normalValues[1] ?? 0);
    // … while the peak bin's segment stretches further into the axis.
    const normalPeakSpan = (normalValues[3] ?? 0) - (normalValues[2] ?? 0);
    const extremePeakSpan = (extremeValues[3] ?? 0) - (extremeValues[2] ?? 0);
    expect(extremePeakSpan).toBeGreaterThan(normalPeakSpan);
    expect(extremeValues.every((value, index) => index === 0 || value >= (extremeValues[index - 1] ?? value))).toBe(true);
  });

  it('ignores non-finite exaggeration and falls back to neutral contrast', () => {
    const neutral = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40], Number.NaN);
    const baseline = buildDensityWarpMap(Float32Array.from([0, 0.5, 1, 0]), [0, 40]);

    expect(Array.from(neutral ?? [])).toEqual(Array.from(baseline ?? []));
  });
});

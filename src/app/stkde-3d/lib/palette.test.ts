import { describe, expect, test } from 'vitest';
import {
  getLegacyStkdeIntensityColor,
  getSignedDifferenceColor,
  getSignedDifferencePaletteGradient,
  getStkdeIntensityColor,
  getStkdePaletteGradient,
  getStkdeSignedDifferenceColor,
  STKDE_INTENSITY_STOPS,
  STKDE_SIGNED_DIFFERENCE_LABELS,
  STKDE_SIGNED_DIFFERENCE_STOPS,
} from './palette';

describe('STKDE palettes', () => {
  test('maps negative, zero, and positive normalized differences to blue, neutral, and red', () => {
    expect(getStkdeSignedDifferenceColor(-1)).toBe('rgba(23, 92, 211, 1.000)');
    expect(getStkdeSignedDifferenceColor(0)).toBe('rgba(244, 241, 235, 1.000)');
    expect(getStkdeSignedDifferenceColor(1)).toBe('rgba(180, 35, 24, 1.000)');
    expect(getStkdeSignedDifferenceColor(-1, 0.25)).toBe('rgba(23, 92, 211, 0.250)');
    expect(getSignedDifferenceColor(0)).toBe(getStkdeSignedDifferenceColor(0));
  });

  test('clamps signed values and keeps non-finite values at the neutral stop', () => {
    expect(getStkdeSignedDifferenceColor(-2)).toBe(getStkdeSignedDifferenceColor(-1));
    expect(getStkdeSignedDifferenceColor(2)).toBe(getStkdeSignedDifferenceColor(1));
    expect(getStkdeSignedDifferenceColor(Number.NaN)).toBe(getStkdeSignedDifferenceColor(0));
    expect(getStkdeSignedDifferenceColor(Number.POSITIVE_INFINITY)).toBe(getStkdeSignedDifferenceColor(0));
  });

  test('provides a dedicated signed gradient and explicit sign semantics', () => {
    const gradient = getSignedDifferencePaletteGradient();

    expect(gradient).toContain('rgb(23, 92, 211) 0%');
    expect(gradient).toContain('rgb(244, 241, 235) 50%');
    expect(gradient).toContain('rgb(180, 35, 24) 100%');
    expect(STKDE_SIGNED_DIFFERENCE_STOPS).toHaveLength(3);
    expect(STKDE_SIGNED_DIFFERENCE_LABELS.red).toBe('Red = A higher');
    expect(STKDE_SIGNED_DIFFERENCE_LABELS.neutralColor).toBe('Neutral = no difference');
    expect(STKDE_SIGNED_DIFFERENCE_LABELS.blue).toBe('Blue = B higher');
  });

  test('continues to use the existing sequential helpers and stop list', () => {
    const fieldStop = STKDE_INTENSITY_STOPS[0]!;
    const expectedFieldColor = `rgba(${fieldStop.rgb[0]}, ${fieldStop.rgb[1]}, ${fieldStop.rgb[2]}, 0.500)`;

    expect(getStkdeIntensityColor(0, 0.5)).toBe(expectedFieldColor);
    expect(getLegacyStkdeIntensityColor(0, 0.5)).toMatch(/^rgba\(/);
    expect(getStkdePaletteGradient()).toContain(`rgb(${fieldStop.rgb.join(', ')}) 0%`);
  });
});

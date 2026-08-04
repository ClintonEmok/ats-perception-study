import { describe, expect, test } from 'vitest';
import {
  DASHBOARD_WARP_FACTOR_MAX,
  dashboardWarpFactorToBlend,
  dashboardWarpPercentToFactor,
} from './warp-contract';

describe('dashboard warp contract', () => {
  test('maps the global percentage to a 0 to 5x factor', () => {
    expect(dashboardWarpPercentToFactor(0)).toBe(0);
    expect(dashboardWarpPercentToFactor(50)).toBe(2.5);
    expect(dashboardWarpPercentToFactor(100)).toBe(DASHBOARD_WARP_FACTOR_MAX);
  });

  test('normalizes the effective factor to the shared blend range', () => {
    expect(dashboardWarpFactorToBlend(0)).toBe(0);
    expect(dashboardWarpFactorToBlend(2.5)).toBe(0.5);
    expect(dashboardWarpFactorToBlend(5)).toBe(1);
    expect(dashboardWarpFactorToBlend(9)).toBe(1);
  });
});

export const DASHBOARD_WARP_FACTOR_MAX = 5;

export const dashboardWarpPercentToFactor = (percent: number): number =>
  (Math.min(100, Math.max(0, percent)) / 100) * DASHBOARD_WARP_FACTOR_MAX;

export const dashboardWarpFactorToBlend = (factor: number): number =>
  Math.min(1, Math.max(0, factor / DASHBOARD_WARP_FACTOR_MAX));

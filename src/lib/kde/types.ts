export interface KdeCell {
  x: number;
  z: number;
  intensity: number;
  support: number;
}

export interface SliceKdeResult {
  cells: KdeCell[];
  maxIntensity: number;
  meanIntensity: number;
}

export interface KdeParams {
  gridSize: number;
  sigmaCells: number;
  smoothingMeters?: number;
  kernelRadiusCells: number;
  threshold: number;
}

// The KDE coordinate space covers the Chicago scene at approximately 10 km.
// Physical smoothing is converted to cells at the selected grid resolution.
export const KDE_SCENE_SPAN_METERS = 10_000;

export function smoothingMetersToSigmaCells(smoothingMeters: number, gridSize: number): number {
  const safeMeters = Number.isFinite(smoothingMeters) ? Math.max(1, smoothingMeters) : 1;
  const safeGridSize = Number.isFinite(gridSize) ? Math.max(4, gridSize) : 4;
  return safeMeters / (KDE_SCENE_SPAN_METERS / safeGridSize);
}

export const DEFAULT_KDE_PARAMS: KdeParams = {
  gridSize: 32,
  sigmaCells: 2,
  kernelRadiusCells: 6,
  threshold: 0.005,
};

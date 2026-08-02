import type { ComparisonDomain } from './comparison-difference';

export const COMPARISON_MAP_EXTENT = 100;
export const COMPARISON_MAP_MIN = -50;

export type ComparisonCellCenter = {
  x: number;
  z: number;
};

function safeGridSize(gridSize: number): number {
  return Number.isInteger(gridSize) && gridSize > 0 ? gridSize : 1;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function getComparisonCellCenter(
  row: number,
  column: number,
  gridSize: number,
): ComparisonCellCenter {
  const safeSize = safeGridSize(gridSize);
  const cellSize = COMPARISON_MAP_EXTENT / safeSize;
  return {
    x: COMPARISON_MAP_MIN + (column + 0.5) * cellSize,
    z: COMPARISON_MAP_MIN + (row + 0.5) * cellSize,
  };
}

export const mapKdeCellCenter = getComparisonCellCenter;

/** Flip the KDE row so row zero keeps the geographic orientation on canvas. */
export function mapKdeRowToCanvasRow(row: number, gridSize: number): number {
  return safeGridSize(gridSize) - 1 - row;
}

export const getCanvasRowForKdeRow = mapKdeRowToCanvasRow;

export function mapAbsoluteIntensity(value: number, domain: ComparisonDomain): number {
  const maximum = Math.max(Math.abs(domain[0]), Math.abs(domain[1]));
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  return clamp(value / maximum, 0, 1);
}

/**
 * Apply display-only contrast to a signed raw difference. The raw subtraction
 * and symmetric domain remain unchanged; zero is always exactly neutral.
 */
export function mapSignedContrast(value: number, maxAbs: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maxAbs) || maxAbs <= 0 || value === 0) {
    return 0;
  }

  const ratio = clamp(value / maxAbs, -1, 1);
  if (ratio === 0) return 0;
  return Math.sign(ratio) * Math.pow(Math.abs(ratio), 0.65);
}

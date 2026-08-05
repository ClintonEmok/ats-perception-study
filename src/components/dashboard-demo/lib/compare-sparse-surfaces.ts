import type { KdeCell } from '@/lib/kde';

export const COMPARISON_GRID_SIZE = 32;

export interface SparseKdeGrid {
  intensities: Float32Array;
  supports: Float32Array;
  active: Uint8Array;
}

export interface SparseKdeDifference {
  cells: KdeCell[];
  maxAbs: number;
  activeCellCount: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getCellIndex(cell: KdeCell): number | null {
  if (![cell.x, cell.z, cell.intensity, cell.support].every(Number.isFinite)) return null;

  const column = clamp(
    Math.floor(((cell.x + 50) / 100) * COMPARISON_GRID_SIZE),
    0,
    COMPARISON_GRID_SIZE - 1,
  );
  const row = clamp(
    Math.floor(((cell.z + 50) / 100) * COMPARISON_GRID_SIZE),
    0,
    COMPARISON_GRID_SIZE - 1,
  );
  return row * COMPARISON_GRID_SIZE + column;
}

function getCellCenter(index: number): { x: number; z: number } {
  const row = Math.floor(index / COMPARISON_GRID_SIZE);
  const column = index % COMPARISON_GRID_SIZE;
  const cellSize = 100 / COMPARISON_GRID_SIZE;
  return {
    x: -50 + (column + 0.5) * cellSize,
    z: -50 + (row + 0.5) * cellSize,
  };
}

export function buildSparseKdeGrid(
  cells: readonly KdeCell[],
  mode: 'absolute' | 'signed' = 'absolute',
): SparseKdeGrid {
  const cellCount = COMPARISON_GRID_SIZE * COMPARISON_GRID_SIZE;
  const intensities = new Float32Array(cellCount);
  const supports = new Float32Array(cellCount);
  const active = new Uint8Array(cellCount);

  for (const cell of cells) {
    const index = getCellIndex(cell);
    if (index === null) continue;

    const intensity = clamp(cell.intensity, mode === 'signed' ? -1 : 0, 1);
    const support = Math.max(0, cell.support);
    const currentIntensity = intensities[index] ?? 0;
    if (mode === 'signed' && Math.abs(intensity) >= Math.abs(currentIntensity)) {
      intensities[index] = intensity;
      supports[index] = support;
    } else if (mode === 'absolute' && intensity >= currentIntensity) {
      intensities[index] = intensity;
      supports[index] = support;
    } else {
      supports[index] = Math.max(supports[index] ?? 0, support);
    }
    active[index] = 1;
  }

  return { intensities, supports, active };
}

export function computeSparseKdeDifference(
  leftCells: readonly KdeCell[],
  rightCells: readonly KdeCell[],
): SparseKdeDifference {
  const left = buildSparseKdeGrid(leftCells);
  const right = buildSparseKdeGrid(rightCells);
  const cellCount = COMPARISON_GRID_SIZE * COMPARISON_GRID_SIZE;
  const rawDifferences = new Float32Array(cellCount);
  let maxAbs = 0;
  let activeCellCount = 0;

  for (let index = 0; index < cellCount; index += 1) {
    const difference = (left.intensities[index] ?? 0) - (right.intensities[index] ?? 0);
    rawDifferences[index] = difference;
    maxAbs = Math.max(maxAbs, Math.abs(difference));
    if (left.active[index] === 1 || right.active[index] === 1) activeCellCount += 1;
  }

  const cells: KdeCell[] = [];
  for (let index = 0; index < cellCount; index += 1) {
    if (left.active[index] !== 1 && right.active[index] !== 1) continue;
    const { x, z } = getCellCenter(index);
    cells.push({
      x: Number(x.toFixed(4)),
      z: Number(z.toFixed(4)),
      intensity: maxAbs > 0 ? Number(((rawDifferences[index] ?? 0) / maxAbs).toFixed(4)) : 0,
      support: Math.max(left.supports[index] ?? 0, right.supports[index] ?? 0),
    });
  }

  return { cells, maxAbs, activeCellCount };
}

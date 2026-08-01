import {
  DEFAULT_KDE_PARAMS,
  smoothingMetersToSigmaCells,
  type KdeCell,
  type KdeField,
  type KdeParams,
} from './types';

function kdeColor(t: number): string {
  const intensity = Math.min(1, Math.max(0, t));
  const value = Math.round(24 + intensity * 205);
  return `rgb(${value}, ${value}, ${value})`;
}

export function computeSliceKde(
  points: Array<{ x: number; z: number }>,
  params: Partial<KdeParams> = {},
): {
  cells: KdeCell[];
  maxIntensity: number;
  meanIntensity: number;
  field: KdeField;
} {
  const gridRows = Math.max(4, Math.round(params.gridSize ?? DEFAULT_KDE_PARAMS.gridSize));
  const gridCols = gridRows;
  const sigmaCells = Math.max(
    0.1,
    params.smoothingMeters !== undefined
      ? smoothingMetersToSigmaCells(params.smoothingMeters, gridRows)
      : params.sigmaCells ?? DEFAULT_KDE_PARAMS.sigmaCells,
  );
  const kernelRadiusCells = Math.max(
    1,
    Math.round(params.kernelRadiusCells ?? DEFAULT_KDE_PARAMS.kernelRadiusCells),
  );
  const threshold = Math.max(0, params.threshold ?? DEFAULT_KDE_PARAMS.threshold);
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;

  const support = new Float32Array(gridRows * gridCols);

  for (const point of points) {
    const col = Math.min(
      gridCols - 1,
      Math.max(0, Math.floor((point.x + 50) / cellWidth)),
    );
    const row = Math.min(
      gridRows - 1,
      Math.max(0, Math.floor((point.z + 50) / cellHeight)),
    );
    support[row * gridCols + col] += 1;
  }

  const intensity = new Float32Array(gridRows * gridCols);
  let maxIntensity = 0;
  let intensitySum = 0;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const centerIdx = row * gridCols + col;
      let sum = 0;

      const rowStart = Math.max(0, row - kernelRadiusCells);
      const rowEnd = Math.min(gridRows - 1, row + kernelRadiusCells);
      const colStart = Math.max(0, col - kernelRadiusCells);
      const colEnd = Math.min(gridCols - 1, col + kernelRadiusCells);

      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          const neighborIdx = r * gridCols + c;
          const count = support[neighborIdx];
          if (count <= 0) continue;
          const dr = r - row;
          const dc = c - col;
          const dist = Math.sqrt(dr * dr + dc * dc);
          const weight = Math.exp(-0.5 * (dist / sigmaCells) ** 2);
          sum += count * weight;
        }
      }

      intensity[centerIdx] = sum;
      intensitySum += sum;
      if (sum > maxIntensity) maxIntensity = sum;
    }
  }

  const safeMax = Math.max(1, maxIntensity);
  const cells: KdeCell[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const idx = row * gridCols + col;
      const x = -50 + (col + 0.5) * cellWidth;
      const z = -50 + (row + 0.5) * cellHeight;
      const normalized = intensity[idx] / safeMax;

      if (normalized > threshold) {
        cells.push({
          x: Number(x.toFixed(2)),
          z: Number(z.toFixed(2)),
          intensity: Number(normalized.toFixed(4)),
          support: Math.round(support[idx]),
        });
      }
    }
  }

  const meanIntensity = intensitySum / (gridRows * gridCols);
  const field: KdeField = {
    values: intensity,
    support,
    gridSize: gridRows,
    cellWidth,
    cellHeight,
    maxIntensity,
  };

  return { cells, maxIntensity: safeMax, meanIntensity, field };
}

export { kdeColor };

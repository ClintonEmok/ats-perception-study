import { normalizedToLonLat } from '@/lib/coordinate-normalization';
import type { StkdeHeatmapCell, StkdeHotspot, StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import type { KdeCell } from '@/lib/kde';
import type { EvolvingSlice } from './types';

const MIN_SEPARATION_CELLS = 1.5;

function isUsableCell(cell: KdeCell): boolean {
  return Number.isFinite(cell.x) && Number.isFinite(cell.z) && Number.isFinite(cell.intensity) && cell.intensity > 0;
}

export function selectKdeHotspotCells(
  cells: readonly KdeCell[],
  gridSize: number,
): KdeCell[] {
  const safeGridSize = Number.isFinite(gridSize) ? Math.max(4, Math.round(gridSize)) : 4;
  const minSeparation = (100 / safeGridSize) * MIN_SEPARATION_CELLS;
  const minSeparationSquared = minSeparation ** 2;
  const selected: KdeCell[] = [];

  for (const cell of [...cells].filter(isUsableCell).sort((left, right) => right.intensity - left.intensity)) {
    const isSeparated = selected.every((candidate) => {
      const dx = cell.x - candidate.x;
      const dz = cell.z - candidate.z;
      return dx * dx + dz * dz >= minSeparationSquared;
    });

    if (!isSeparated) continue;
    selected.push(cell);
  }

  return selected;
}

function toHotspot(
  cell: KdeCell,
  slice: EvolvingSlice & { sourceSliceId?: string },
  index: number,
): StkdeHotspot {
  const { lon, lat } = normalizedToLonLat(cell.x, cell.z);
  return {
    id: `kde-${slice.sourceSliceId ?? slice.index}-${index}`,
    centroidLng: lon,
    centroidLat: lat,
    intensityScore: cell.intensity,
    supportCount: Math.max(0, Math.round(cell.support)),
    peakStartEpochSec: slice.startEpoch,
    peakEndEpochSec: slice.endEpoch,
    // Local KDE cells do not have a physical hotspot boundary.
    radiusMeters: 0,
  };
}

export function buildKdeHotspotSliceResults(
  slices: readonly (EvolvingSlice & { sourceSliceId?: string })[],
  sliceKdes: readonly (readonly KdeCell[] | undefined)[],
  gridSize: number,
): Record<string, StkdeSurfaceResponse> {
  return Object.fromEntries(slices.map((slice, index) => {
    const cells = sliceKdes[index] ?? [];
    const hotspots = selectKdeHotspotCells(cells, gridSize).map((cell, hotspotIndex) => (
      toHotspot(cell, slice, hotspotIndex)
    ));
    const heatmapCells: StkdeHeatmapCell[] = cells
      .filter(isUsableCell)
      .map((cell) => {
        const { lon, lat } = normalizedToLonLat(cell.x, cell.z);
        return { lng: lon, lat, intensity: cell.intensity, support: Math.max(0, Math.round(cell.support)) };
      });

    return [slice.sourceSliceId ?? String(slice.index), {
      meta: {
        eventCount: slice.crimeCount,
        computeMs: 0,
        truncated: false,
        requestedComputeMode: 'sampled',
        effectiveComputeMode: 'sampled',
        fallbackApplied: null,
        clampsApplied: [],
      },
      heatmap: {
        cells: heatmapCells,
        maxIntensity: Math.max(0, ...cells.filter(isUsableCell).map((cell) => cell.intensity)),
      },
      hotspots,
      contracts: { scoreVersion: 'stkde-v1' },
    } satisfies StkdeSurfaceResponse];
  }));
}

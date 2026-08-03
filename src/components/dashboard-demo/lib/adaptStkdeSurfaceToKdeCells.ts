import { lonLatToNormalized } from '@/lib/coordinate-normalization';
import type { KdeCell } from '@/lib/kde';
import type { StkdeResponse, StkdeSurfaceResponse } from '@/lib/stkde/contracts';

export interface DashboardSceneSliceIdentity {
  sourceSliceId: string;
  sourceSliceIndex: number;
  index?: number;
}

export interface StkdeSceneProjection {
  sliceKdes: KdeCell[][];
  hotspotSliceResults: Record<string, StkdeSurfaceResponse>;
}

/**
 * Convert the sparse server heatmap contract into the cell contract consumed by
 * the shared 3D renderer. Missing cells remain missing: this is intentionally
 * not a dense-field conversion.
 */
export function adaptStkdeSurfaceToKdeCells(
  surface: StkdeSurfaceResponse | undefined,
): KdeCell[] {
  if (!surface) return [];

  return surface.heatmap.cells.flatMap((cell) => {
    if (![cell.lng, cell.lat, cell.intensity, cell.support].every(Number.isFinite)) {
      return [];
    }

    const { x, z } = lonLatToNormalized(cell.lng, cell.lat);
    if (![x, z].every(Number.isFinite) || x < -50 || x > 50 || z < -50 || z > 50) {
      return [];
    }

    return [{
      x,
      z,
      intensity: Math.min(1, Math.max(0, cell.intensity)),
      support: Math.max(0, Math.round(cell.support)),
    }];
  });
}

function emptySurface(response: StkdeResponse | null): StkdeSurfaceResponse {
  const meta = response?.meta;
  return {
    meta: {
      eventCount: 0,
      computeMs: 0,
      truncated: meta?.truncated ?? false,
      requestedComputeMode: meta?.requestedComputeMode ?? 'sampled',
      effectiveComputeMode: meta?.effectiveComputeMode ?? 'sampled',
      fallbackApplied: meta?.fallbackApplied ?? null,
      clampsApplied: meta?.clampsApplied ?? [],
    },
    heatmap: { cells: [], maxIntensity: 0 },
    hotspots: [],
    contracts: { scoreVersion: 'stkde-v1' },
  };
}

/**
 * Project a response by canonical source ID. The complete ordered identity
 * list is used for both arrays and the result map so brushing can only change
 * local render indexes, never the source/result association.
 */
export function projectStkdeResponseToSceneSlices(
  orderedSlices: readonly DashboardSceneSliceIdentity[],
  response: StkdeResponse | null | undefined,
): StkdeSceneProjection {
  const sliceKdes: KdeCell[][] = [];
  const hotspotSliceResults: Record<string, StkdeSurfaceResponse> = {};

  for (const slice of orderedSlices) {
    const surface = response?.sliceResults[slice.sourceSliceId];
    sliceKdes.push(adaptStkdeSurfaceToKdeCells(surface));
    hotspotSliceResults[slice.sourceSliceId] = surface ?? emptySurface(response ?? null);
  }

  return { sliceKdes, hotspotSliceResults };
}

// Keep the identity-safe name discoverable to consumers that describe this
// operation as a projection rather than an adaptation.
export const projectStkdeSlicesBySourceId = projectStkdeResponseToSceneSlices;

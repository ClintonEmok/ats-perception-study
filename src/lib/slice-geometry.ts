/**
 * Slice geometry computation utilities
 * Extracted from DualTimeline.tsx for reusable slice rendering logic
 */
import type { TimeSlice } from '@/store/slice-domain/types';

export interface SliceGeometry {
  x: number;
  width: number;
  y: number;
  height: number;
  opacity: number;
}

export interface ComputeSliceGeometryOptions {
  slice: TimeSlice;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
  height: number;
  density?: number;
}

const resolveSliceBoundsPercent = (slice: TimeSlice): [number, number] => {
  if (slice.type === 'range' && slice.range) {
    return [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])];
  }

  return [slice.time, slice.time];
};

/**
 * Compute geometry for a single time slice
 */
export function computeSliceGeometry({
  slice,
  xScale,
  yScale,
  height,
  density = 1,
}: ComputeSliceGeometryOptions): SliceGeometry {
  const [startPercent, endPercent] = resolveSliceBoundsPercent(slice);
  const startX = xScale(startPercent / 100);
  const endX = xScale(endPercent / 100);
  const width = Math.max(1, endX - startX);

  return {
    x: startX,
    width,
    y: 0,
    height,
    opacity: Math.min(1, density * 0.5 + 0.2),
  };
}

export interface SliceCluster {
  slices: TimeSlice[];
  totalWidth: number;
  maxDensity: number;
}

/**
 * Group slices into clusters based on gap threshold
 */
export function clusterSlices(
  slices: TimeSlice[],
  gapThreshold: number = 0.05
): SliceCluster[] {
  if (slices.length === 0) return [];

  const clusters: SliceCluster[] = [];
  let currentCluster: TimeSlice[] = [slices[0]];
  const maxDensity = 1;

  for (let i = 1; i < slices.length; i++) {
    const slice = slices[i];
    const prevSlice = currentCluster[currentCluster.length - 1];
    const [sliceStartPercent, sliceEndPercent] = resolveSliceBoundsPercent(slice);
    const [, prevEndPercent] = resolveSliceBoundsPercent(prevSlice);
    const gap = sliceStartPercent - prevEndPercent;

    if (gap < gapThreshold * 100) {
      currentCluster.push(slice);
    } else {
      clusters.push({
        slices: currentCluster,
        totalWidth: currentCluster.reduce((sum, s) => {
          const [startPercent, endPercent] = resolveSliceBoundsPercent(s);
          return sum + (endPercent - startPercent);
        }, 0),
        maxDensity,
      });
      currentCluster = [slice];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push({
      slices: currentCluster,
      totalWidth: currentCluster.reduce((sum, s) => {
        const [startPercent, endPercent] = resolveSliceBoundsPercent(s);
        return sum + (endPercent - startPercent);
      }, 0),
      maxDensity,
    });
  }

  return clusters;
}

/**
 * Slice color palette for timeline visualization
 */
export const SLICE_COLOR_PALETTE: Record<string, { fill: string; stroke: string }> = {
  amber: { fill: 'rgba(251, 191, 36, 0.28)', stroke: 'rgba(251, 191, 36, 0.9)' },
  blue: { fill: 'rgba(59, 130, 246, 0.24)', stroke: 'rgba(96, 165, 250, 0.9)' },
  green: { fill: 'rgba(34, 197, 94, 0.26)', stroke: 'rgba(74, 222, 128, 0.9)' },
  red: { fill: 'rgba(248, 113, 113, 0.26)', stroke: 'rgba(252, 165, 165, 0.9)' },
  purple: { fill: 'rgba(167, 139, 250, 0.24)', stroke: 'rgba(196, 181, 253, 0.9)' },
  cyan: { fill: 'rgba(34, 211, 238, 0.24)', stroke: 'rgba(103, 232, 249, 0.9)' },
  pink: { fill: 'rgba(244, 114, 182, 0.26)', stroke: 'rgba(251, 207, 232, 0.9)' },
  gray: { fill: 'rgba(148, 163, 184, 0.24)', stroke: 'rgba(203, 213, 225, 0.9)' },
};

/**
 * Default slice color when none specified
 */
export const DEFAULT_SLICE_COLOR = { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };

/**
 * Resolve slice color from color name
 */
export function resolveSliceColor(color?: string): { fill: string; stroke: string } {
  if (!color) {
    return DEFAULT_SLICE_COLOR;
  }
  return SLICE_COLOR_PALETTE[color] ?? DEFAULT_SLICE_COLOR;
}

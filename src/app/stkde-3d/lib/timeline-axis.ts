import { toDisplaySeconds, toLinearSeconds } from '@/components/timeline/hooks/useScaleTransforms';

export const START_Y = -32.625;
export const SLICE_SPACING = 7.25;
export const AXIS_HEIGHT = 100;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const span = Math.max(1e-9, inMax - inMin);
  const t = clamp((value - inMin) / span, 0, 1);
  return outMin + t * (outMax - outMin);
};

export interface WarpTimelineAxisSettings {
  timeScaleMode: 'linear' | 'adaptive';
  warpBlend: number;
  warpMap: Float32Array | null;
  displayDomain?: [number, number];
  warpDomain: [number, number];
  yOffset?: number;
}

export interface TemporalSlabBounds {
  startY: number;
  endY: number;
  minY: number;
  maxY: number;
  centerY: number;
  height: number;
}

export function resolveTemporalSlabBounds(
  startEpoch: number,
  endEpoch: number,
  resolveEpochY: (epochSec: number) => number,
): TemporalSlabBounds {
  const startY = resolveEpochY(startEpoch);
  const endY = resolveEpochY(endEpoch);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  return {
    startY,
    endY,
    minY,
    maxY,
    centerY: (startY + endY) / 2,
    height: maxY - minY,
  };
}

export function resolveWarpedEpochY(epochSec: number, axisStartY: number, settings: WarpTimelineAxisSettings): number {
  const axisEndY = axisStartY + AXIS_HEIGHT;
  const yOffset = settings.yOffset ?? 0;
  const displayDomain = settings.displayDomain ?? settings.warpDomain;

  if (
    settings.timeScaleMode !== 'adaptive' ||
    settings.warpBlend <= 0 ||
    !settings.warpMap ||
    settings.warpMap.length < 2
  ) {
    return mapRange(epochSec, displayDomain[0], displayDomain[1], axisStartY, axisEndY) + yOffset;
  }

  const displayStart = toDisplaySeconds(displayDomain[0], settings.warpBlend, settings.warpMap, settings.warpDomain);
  const displayEnd = toDisplaySeconds(displayDomain[1], settings.warpBlend, settings.warpMap, settings.warpDomain);
  const displayEpoch = toDisplaySeconds(epochSec, settings.warpBlend, settings.warpMap, settings.warpDomain);

  return mapRange(displayEpoch, displayStart, displayEnd, axisStartY, axisEndY) + yOffset;
}

export function resolveEpochFromWarpedY(y: number, axisStartY: number, settings: WarpTimelineAxisSettings): number {
  const axisEndY = axisStartY + AXIS_HEIGHT;
  const displayDomain = settings.displayDomain ?? settings.warpDomain;

  if (
    settings.timeScaleMode === 'adaptive' &&
    settings.warpBlend > 0 &&
    settings.warpMap &&
    settings.warpMap.length > 1
  ) {
    const displayStart = toDisplaySeconds(displayDomain[0], settings.warpBlend, settings.warpMap, settings.warpDomain);
    const displayEnd = toDisplaySeconds(displayDomain[1], settings.warpBlend, settings.warpMap, settings.warpDomain);
    const displayEpoch = mapRange(y, axisStartY, axisEndY, displayStart, displayEnd);
    return toLinearSeconds(displayEpoch, settings.warpDomain, settings.warpBlend, settings.warpMap, settings.warpDomain);
  }

  return mapRange(y, axisStartY, axisEndY, displayDomain[0], displayDomain[1]);
}

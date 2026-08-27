import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import { computeDensityMap } from '@/components/timeline/hooks/useDensityStripDerivation';
import type { MockCrimeEvent } from './types';

export interface StandaloneAdaptiveTimeMaps {
  timestamps: number[];
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
}

export function buildStandaloneAdaptiveTimeMaps(
  sliceEvents: readonly (readonly MockCrimeEvent[])[],
  domain: [number, number],
): StandaloneAdaptiveTimeMaps {
  const timestamps = sliceEvents
    .flatMap((events) => events.map((event) => event.timestampEpochSec))
    .filter((timestamp) => Number.isFinite(timestamp));

  if (timestamps.length === 0 || !Number.isFinite(domain[0]) || !Number.isFinite(domain[1]) || domain[1] <= domain[0]) {
    return { timestamps, densityMap: null, warpMap: null };
  }

  const densityMap = computeDensityMap(
    timestamps,
    domain,
    ADAPTIVE_BIN_COUNT,
    ADAPTIVE_KERNEL_WIDTH,
  );

  return {
    timestamps,
    densityMap,
    warpMap: buildDensityWarpMap(densityMap, domain),
  };
}

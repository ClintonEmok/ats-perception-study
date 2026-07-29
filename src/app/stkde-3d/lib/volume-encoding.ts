import type { EvolvingSlice } from './types';
import { toDisplaySeconds } from '@/components/timeline/hooks/useScaleTransforms';

export type DurationVolumeNormalizationMode = 'window' | 'reference';

export interface DurationVolumeSettings {
  scaleSeconds: number;
  exaggeration: number;
  normalizationMode: DurationVolumeNormalizationMode;
  timeScaleMode?: 'linear' | 'adaptive';
  warpBlend?: number;
  warpMap?: Float32Array | null;
  warpDomain?: [number, number];
}

export interface DurationVolumeSourceSlice {
  index: number;
  startEpoch: number;
  endEpoch: number;
}

export interface DurationVolumeProfileEntry {
  index: number;
  durationSeconds: number;
  normalizedDuration: number;
  thickness: number;
  opacity: number;
  falloff: number;
}

export interface AllocationMetricsSourceSlice extends DurationVolumeSourceSlice {
  crimeCount?: number;
  eventCount?: number;
  warpWeight?: number;
  signal?: number;
}

export interface AllocationMetricsInput {
  slice: AllocationMetricsSourceSlice;
  slices: readonly AllocationMetricsSourceSlice[];
  profile?: readonly DurationVolumeProfileEntry[];
}

export interface AllocationMetrics {
  clockDurationSeconds: number | null;
  eventCount: number | null;
  eventDensityPerDay: number | null;
  adaptiveWeight: number | null;
  signal: number | null;
  displayDurationSeconds: number | null;
  linearShare: number | null;
  visualShare: number | null;
  expansionCompressionRatio: number | null;
  expansionCompressionPercent: number | null;
  visualThickness: number | null;
}

export const DEFAULT_DURATION_VOLUME_SETTINGS: DurationVolumeSettings = {
  scaleSeconds: 12 * 60 * 60,
  exaggeration: 1.15,
  normalizationMode: 'window',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function resolveDuration(slice: Pick<DurationVolumeSourceSlice, 'startEpoch' | 'endEpoch'>): number {
  return Math.max(0, slice.endEpoch - slice.startEpoch);
}

function finiteNonNegative(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function resolveProfileEntry(
  slice: AllocationMetricsSourceSlice,
  profile: readonly DurationVolumeProfileEntry[] | undefined,
): DurationVolumeProfileEntry | undefined {
  if (!profile) return undefined;
  return profile.find((entry) => entry.index === slice.index) ?? profile[slice.index];
}

function resolveWarpAdjustedDuration(
  slice: Pick<DurationVolumeSourceSlice, 'startEpoch' | 'endEpoch'>,
  settings: Pick<DurationVolumeSettings, 'timeScaleMode' | 'warpBlend' | 'warpMap' | 'warpDomain'>,
): number {
  if (
    settings.timeScaleMode !== 'adaptive' ||
    !settings.warpMap ||
    settings.warpMap.length < 2 ||
    !settings.warpDomain ||
    settings.warpBlend === undefined ||
    settings.warpBlend <= 0
  ) {
    return resolveDuration(slice);
  }

  const startDisplay = toDisplaySeconds(slice.startEpoch, settings.warpBlend, settings.warpMap, settings.warpDomain);
  const endDisplay = toDisplaySeconds(slice.endEpoch, settings.warpBlend, settings.warpMap, settings.warpDomain);
  return Math.max(0, endDisplay - startDisplay);
}

export function buildDurationVolumeProfile(
  slices: Array<DurationVolumeSourceSlice | EvolvingSlice>,
  settings: Partial<DurationVolumeSettings> = {},
): DurationVolumeProfileEntry[] {
  if (slices.length === 0) return [];

  const resolvedSettings: DurationVolumeSettings = {
    scaleSeconds: Math.max(1, Math.floor(settings.scaleSeconds ?? DEFAULT_DURATION_VOLUME_SETTINGS.scaleSeconds)),
    exaggeration: clamp(settings.exaggeration ?? DEFAULT_DURATION_VOLUME_SETTINGS.exaggeration, 0.1, 4),
    normalizationMode: settings.normalizationMode ?? DEFAULT_DURATION_VOLUME_SETTINGS.normalizationMode,
    timeScaleMode: settings.timeScaleMode,
    warpBlend: settings.warpBlend,
    warpMap: settings.warpMap,
    warpDomain: settings.warpDomain,
  };

  const durations = slices.map((slice) => resolveWarpAdjustedDuration(slice, resolvedSettings));
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const durationSpan = Math.max(1, maxDuration - minDuration);
  const countCompensation = clamp(1 - Math.log2(slices.length + 1) * 0.04, 0.72, 1);

  return slices.map((slice, index) => {
    const durationSeconds = durations[index] ?? 0;
    const referenceRatio = clamp(durationSeconds / resolvedSettings.scaleSeconds, 0, 1);
    const windowRatio = durationSpan === 0 ? (durationSeconds > 0 ? 1 : 0) : clamp((durationSeconds - minDuration) / durationSpan, 0, 1);
    const normalizedDuration = clamp(
      ((resolvedSettings.normalizationMode === 'reference' ? referenceRatio : referenceRatio * 0.65 + windowRatio * 0.35) * countCompensation),
      0,
      1,
    );
    const eased = normalizedDuration ** 0.9;
    const thickness = clamp(lerp(0.95, 6.2, eased) * resolvedSettings.exaggeration, 0.65, 8.5);
    const opacity = clamp(lerp(0.32, 0.11, eased), 0.08, 0.35);
    const falloff = clamp(lerp(0.12, 0.3, 1 - eased), 0.06, 0.3);

    return {
      index: slice.index,
      durationSeconds,
      normalizedDuration,
      thickness,
      opacity,
      falloff,
    } satisfies DurationVolumeProfileEntry;
  });
}

export function buildAllocationMetrics({ slice, slices, profile }: AllocationMetricsInput): AllocationMetrics {
  const startEpoch = Number.isFinite(slice.startEpoch) ? slice.startEpoch : null;
  const endEpoch = Number.isFinite(slice.endEpoch) ? slice.endEpoch : null;
  const clockDurationSeconds = startEpoch !== null && endEpoch !== null
    ? Math.max(0, endEpoch - startEpoch)
    : null;
  const eventCount = finiteNonNegative(slice.eventCount ?? slice.crimeCount);
  const eventDensityPerDay = clockDurationSeconds !== null && clockDurationSeconds > 0 && eventCount !== null
    ? (eventCount / clockDurationSeconds) * 86_400
    : null;
  const adaptiveWeight = finiteNonNegative(slice.warpWeight);
  const signal = finiteNonNegative(slice.signal);
  const profileEntry = resolveProfileEntry(slice, profile);
  const displayDurationSeconds = finiteNonNegative(profileEntry?.durationSeconds);
  const visualThickness = finiteNonNegative(profileEntry?.thickness);

  const clockDurationTotal = slices.reduce((total, entry) => {
    const duration = Number.isFinite(entry.startEpoch) && Number.isFinite(entry.endEpoch)
      ? Math.max(0, entry.endEpoch - entry.startEpoch)
      : 0;
    return total + duration;
  }, 0);
  const displayDurationTotal = profile
    ? profile.reduce((total, entry) => total + (finiteNonNegative(entry.durationSeconds) ?? 0), 0)
    : 0;
  const linearShare = clockDurationSeconds !== null && clockDurationTotal > 0
    ? clockDurationSeconds / clockDurationTotal
    : null;
  const visualShare = displayDurationSeconds !== null && displayDurationTotal > 0
    ? displayDurationSeconds / displayDurationTotal
    : null;
  const expansionCompressionRatio = clockDurationSeconds !== null
    && clockDurationSeconds > 0
    && displayDurationSeconds !== null
    ? displayDurationSeconds / clockDurationSeconds
    : null;

  return {
    clockDurationSeconds,
    eventCount,
    eventDensityPerDay,
    adaptiveWeight,
    signal,
    displayDurationSeconds,
    linearShare,
    visualShare,
    expansionCompressionRatio,
    expansionCompressionPercent: expansionCompressionRatio === null
      ? null
      : (expansionCompressionRatio - 1) * 100,
    visualThickness,
  };
}

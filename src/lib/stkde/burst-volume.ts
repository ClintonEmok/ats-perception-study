import type { StkdeHotspot, StkdeSurfaceResponse } from './contracts';
import { project } from '@/lib/projection';

const DEFAULT_SAMPLE_COUNT = 5;
const MIN_SAMPLE_COUNT = 3;
const MAX_SAMPLE_COUNT = 5;

export interface BurstVolumeWindowInput {
  id: string;
  startEpochSec: number;
  peakEpochSec?: number;
  endEpochSec: number;
  count?: number;
  burstScore?: number;
  burstClass?: string;
  label?: string;
}

export interface BurstVolumeInput {
  burstWindow: BurstVolumeWindowInput | null | undefined;
  sliceResults: Record<string, StkdeSurfaceResponse> | null | undefined;
  sampleCount?: number;
  label?: string;
}

export interface BurstVolumeSample {
  sampleId: string;
  index: number;
  timeEpochSec: number;
  sliceId: string;
  hotspotId: string | null;
  centroidLng: number;
  centroidLat: number;
  spreadMeters: number;
  supportCount: number;
  intensityScore: number;
  projectedX: number;
  projectedZ: number;
}

export interface BurstVolumeCentroidPoint {
  sampleId: string;
  index: number;
  timeEpochSec: number;
  centroidLng: number;
  centroidLat: number;
  projectedX: number;
  projectedZ: number;
}

export interface BurstVolumeFootprint {
  centroidLng: number;
  centroidLat: number;
  spreadMeters: number;
  maxSpreadMeters: number;
  supportCount: number;
}

export interface BurstVolumeModel {
  id: string;
  label: string;
  startEpochSec: number;
  peakEpochSec: number;
  endEpochSec: number;
  durationSec: number;
  eventCount: number;
  adaptiveHeight: number;
  samples: BurstVolumeSample[];
  centroidPath: BurstVolumeCentroidPoint[];
  spatialFootprint: BurstVolumeFootprint;
  isNeutral: boolean;
}

const neutralFootprint: BurstVolumeFootprint = {
  centroidLng: 0,
  centroidLat: 0,
  spreadMeters: 0,
  maxSpreadMeters: 0,
  supportCount: 0,
};

const neutralModel = (): BurstVolumeModel => ({
  id: 'neutral-burst-volume',
  label: 'No active burst',
  startEpochSec: 0,
  peakEpochSec: 0,
  endEpochSec: 0,
  durationSec: 0,
  eventCount: 0,
  adaptiveHeight: 0,
  samples: [],
  centroidPath: [],
  spatialFootprint: neutralFootprint,
  isNeutral: true,
});

function clampSampleCount(sampleCount: number | undefined): number {
  const candidate = Math.floor(sampleCount ?? DEFAULT_SAMPLE_COUNT);
  return Math.max(MIN_SAMPLE_COUNT, Math.min(MAX_SAMPLE_COUNT, candidate));
}

function clampEpoch(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return fallback;
  }

  return Math.floor(value as number);
}

function sortHotspots(hotspots: StkdeHotspot[]): StkdeHotspot[] {
  return [...hotspots].sort(
    (left, right) =>
      right.intensityScore - left.intensityScore ||
      right.supportCount - left.supportCount ||
      left.id.localeCompare(right.id),
  );
}

function selectLeadHotspot(hotspots: StkdeHotspot[] | null | undefined): StkdeHotspot | null {
  if (!hotspots || hotspots.length === 0) {
    return null;
  }

  return sortHotspots(hotspots)[0] ?? null;
}

function buildSortedSlices(sliceResults: Record<string, StkdeSurfaceResponse>): Array<{
  id: string;
  surface: StkdeSurfaceResponse;
  leadHotspot: StkdeHotspot | null;
}> {
  return Object.entries(sliceResults)
    .map(([id, surface]) => ({
      id,
      surface,
      leadHotspot: selectLeadHotspot(surface.hotspots),
    }))
    .sort((left, right) => {
      const leftStart = left.leadHotspot?.peakStartEpochSec;
      const rightStart = right.leadHotspot?.peakStartEpochSec;
      const leftTime = typeof leftStart === 'number' && Number.isFinite(leftStart) ? leftStart : Number.POSITIVE_INFINITY;
      const rightTime = typeof rightStart === 'number' && Number.isFinite(rightStart) ? rightStart : Number.POSITIVE_INFINITY;
      return leftTime - rightTime || left.id.localeCompare(right.id);
    });
}

function buildFallbackHotspot(
  slices: Array<{ id: string; surface: StkdeSurfaceResponse; leadHotspot: StkdeHotspot | null }>,
): StkdeHotspot | null {
  const allHotspots = slices.flatMap((slice) => slice.surface.hotspots ?? []);
  return selectLeadHotspot(allHotspots);
}

function toFixedNumber(value: number, digits = 6): number {
  return Number(value.toFixed(digits));
}

function interpolate(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

export function buildNeutralBurstVolumeModel(): BurstVolumeModel {
  return neutralModel();
}

export function buildBurstVolumeModel(input: BurstVolumeInput): BurstVolumeModel {
  const burstWindow = input.burstWindow;
  const sliceResults = input.sliceResults;

  if (!burstWindow || !sliceResults) {
    return neutralModel();
  }

  const sortedSlices = buildSortedSlices(sliceResults);
  if (sortedSlices.length === 0) {
    return neutralModel();
  }

  const fallbackHotspot = buildFallbackHotspot(sortedSlices);
  if (!fallbackHotspot) {
    return neutralModel();
  }

  const sampleCount = clampSampleCount(input.sampleCount);
  const startEpochSec = clampEpoch(burstWindow.startEpochSec, 0);
  const endEpochSec = Math.max(startEpochSec, clampEpoch(burstWindow.endEpochSec, startEpochSec));
  const peakEpochCandidate = burstWindow.peakEpochSec ?? Math.round((startEpochSec + endEpochSec) / 2);
  const peakEpochSec = Math.max(startEpochSec, Math.min(endEpochSec, clampEpoch(peakEpochCandidate, peakEpochCandidate)));
  const durationSec = Math.max(0, endEpochSec - startEpochSec);
  const eventCount = Math.max(0, Math.floor(burstWindow.count ?? 0));
  const burstScore = Math.max(0, burstWindow.burstScore ?? 0);
  const label = input.label?.trim() || burstWindow.label?.trim() || burstWindow.burstClass?.trim() || `Burst ${burstWindow.id}`;

  const samples: BurstVolumeSample[] = Array.from({ length: sampleCount }, (_, index) => {
    const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const timeEpochSec = Math.round(interpolate(startEpochSec, endEpochSec, ratio));
    const sliceIndex = Math.min(sortedSlices.length - 1, Math.round(ratio * (sortedSlices.length - 1)));
    const slice = sortedSlices[sliceIndex] ?? sortedSlices[0];
    const hotspot = slice?.leadHotspot ?? fallbackHotspot;
    const centroidLng = toFixedNumber(hotspot?.centroidLng ?? 0);
    const centroidLat = toFixedNumber(hotspot?.centroidLat ?? 0);
    const [projectedX, projectedZ] = project(centroidLat, centroidLng);

    return {
      sampleId: `${burstWindow.id}-sample-${index + 1}`,
      index,
      timeEpochSec,
      sliceId: slice?.id ?? burstWindow.id,
      hotspotId: hotspot?.id ?? null,
      centroidLng,
      centroidLat,
      spreadMeters: Number((hotspot?.radiusMeters ?? 0).toFixed(2)),
      supportCount: hotspot?.supportCount ?? 0,
      intensityScore: Number((hotspot?.intensityScore ?? 0).toFixed(4)),
      projectedX: toFixedNumber(projectedX, 3),
      projectedZ: toFixedNumber(projectedZ, 3),
    };
  });

  const supportWeight = samples.reduce((sum, sample) => sum + Math.max(1, sample.supportCount), 0);
  const weightedCentroidLng = samples.reduce((sum, sample) => sum + sample.centroidLng * Math.max(1, sample.supportCount), 0);
  const weightedCentroidLat = samples.reduce((sum, sample) => sum + sample.centroidLat * Math.max(1, sample.supportCount), 0);
  const averageSpread = samples.reduce((sum, sample) => sum + sample.spreadMeters * Math.max(1, sample.supportCount), 0);
  const supportCount = samples.reduce((sum, sample) => sum + sample.supportCount, 0);
  const maxSpreadMeters = samples.reduce((max, sample) => Math.max(max, sample.spreadMeters), 0);

  const spatialFootprint: BurstVolumeFootprint = {
    centroidLng: supportWeight > 0 ? toFixedNumber(weightedCentroidLng / supportWeight) : 0,
    centroidLat: supportWeight > 0 ? toFixedNumber(weightedCentroidLat / supportWeight) : 0,
    spreadMeters: supportWeight > 0 ? Number((averageSpread / supportWeight).toFixed(2)) : 0,
    maxSpreadMeters: Number(maxSpreadMeters.toFixed(2)),
    supportCount,
  };

  const adaptiveHeight = Number(
    (
      Math.max(1, durationSec / 3600) * (1 + burstScore * 4) +
      eventCount / Math.max(1, sampleCount) +
      spatialFootprint.maxSpreadMeters / 1000
    ).toFixed(2),
  );

  return {
    id: burstWindow.id,
    label,
    startEpochSec,
    peakEpochSec,
    endEpochSec,
    durationSec,
    eventCount,
    adaptiveHeight,
    samples,
    centroidPath: samples.map((sample) => ({
      sampleId: sample.sampleId,
      index: sample.index,
      timeEpochSec: sample.timeEpochSec,
      centroidLng: sample.centroidLng,
      centroidLat: sample.centroidLat,
      projectedX: sample.projectedX,
      projectedZ: sample.projectedZ,
    })),
    spatialFootprint,
    isNeutral: false,
  };
}

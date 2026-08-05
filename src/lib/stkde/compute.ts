import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';
import type { CrimeRecord } from '@/types/crime';
import {
  STKDE_RESPONSE_SIZE_LIMIT_BYTES,
  type StkdeComputeMode,
  type StkdeHeatmapCell,
  type StkdeHotspot,
  type StkdeRequest,
  type StkdeResponse,
  type StkdeSurfaceResponse,
} from './contracts';
import type { FullPopulationStkdeInputs } from './full-population-pipeline';

const METERS_PER_LAT_DEGREE = 111_320;
const TEMPORAL_BUCKET_SIZE_SEC = 3600;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toLonDegreeMeters = (lat: number) => METERS_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180);

const stableCrimeSort = (a: CrimeRecord, b: CrimeRecord) => {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  if (a.lon !== b.lon) return a.lon - b.lon;
  if (a.lat !== b.lat) return a.lat - b.lat;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  if (a.district !== b.district) return a.district < b.district ? -1 : 1;
  return 0;
};

export interface StkdeGridConfig {
  bbox: [number, number, number, number];
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  meanLat: number;
  rows: number;
  cols: number;
  latCellDegrees: number;
  lonCellDegrees: number;
  coarsenFactor: number;
}

export function buildStkdeGridConfig(request: StkdeRequest): StkdeGridConfig {
  const bbox = request.filters.bbox ?? [CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLon, CHICAGO_BOUNDS.maxLat];
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const meanLat = (minLat + maxLat) / 2;

  const latCellDegrees = request.params.gridCellMeters / METERS_PER_LAT_DEGREE;
  const lonMeters = Math.max(1, Math.abs(toLonDegreeMeters(meanLat)));
  const lonCellDegrees = request.params.gridCellMeters / lonMeters;

  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lonSpan = Math.max(1e-6, maxLng - minLng);

  let rows = Math.max(1, Math.ceil(latSpan / latCellDegrees));
  let cols = Math.max(1, Math.ceil(lonSpan / lonCellDegrees));
  const totalCells = rows * cols;
  let coarsenFactor = 1;

  if (totalCells > request.limits.maxGridCells) {
    coarsenFactor = Math.ceil(Math.sqrt(totalCells / request.limits.maxGridCells));
    rows = Math.max(1, Math.ceil(rows / coarsenFactor));
    cols = Math.max(1, Math.ceil(cols / coarsenFactor));
  }

  return {
    bbox,
    minLng,
    minLat,
    maxLng,
    maxLat,
    meanLat,
    rows,
    cols,
    latCellDegrees: latSpan / rows,
    lonCellDegrees: lonSpan / cols,
    coarsenFactor,
  };
}

function computePeakWindow(
  timestamps: number[],
  domainStart: number,
  domainEnd: number,
  windowSeconds: number,
): [number, number] {
  if (timestamps.length === 0) {
    return [domainStart, Math.min(domainEnd, domainStart + windowSeconds)];
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  let bestStart = sorted[0];
  let bestCount = 1;
  let startIdx = 0;
  for (let endIdx = 0; endIdx < sorted.length; endIdx += 1) {
    const endValue = sorted[endIdx] ?? sorted[0];
    while (endValue - (sorted[startIdx] ?? endValue) > windowSeconds) {
      startIdx += 1;
    }
    const count = endIdx - startIdx + 1;
    if (count > bestCount) {
      bestCount = count;
      bestStart = sorted[startIdx] ?? bestStart;
    }
  }

  const clampedStart = clamp(bestStart, domainStart, domainEnd);
  const clampedEnd = clamp(clampedStart + windowSeconds, domainStart, domainEnd);
  return [clampedStart, Math.max(clampedStart, clampedEnd)];
}

function createHotspotId(row: number, col: number, peakStartEpochSec: number, peakEndEpochSec: number): string {
  return `hs-${row}-${col}-${peakStartEpochSec}-${peakEndEpochSec}`;
}

function buildIntensityFromSupport(
  signal: Float64Array,
  rows: number,
  cols: number,
  request: StkdeRequest,
) {
  const bandwidthCells = Math.max(1, Math.ceil(request.params.spatialBandwidthMeters / request.params.gridCellMeters));
  const sigmaCells = Math.max(0.5, bandwidthCells / 2);
  const kernelRadius = Math.max(1, Math.ceil(3 * sigmaCells));
  const intensity = new Float64Array(rows * cols);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const centerIndex = row * cols + col;
      let sum = 0;
      for (let r = Math.max(0, row - kernelRadius); r <= Math.min(rows - 1, row + kernelRadius); r += 1) {
        for (let c = Math.max(0, col - kernelRadius); c <= Math.min(cols - 1, col + kernelRadius); c += 1) {
          const neighborIndex = r * cols + c;
          const count = signal[neighborIndex];
          if (count <= 0) continue;
          const dr = r - row;
          const dc = c - col;
          const distance = Math.sqrt(dr * dr + dc * dc);
          const weight = Math.exp(-0.5 * (distance / sigmaCells) ** 2);
          sum += count * weight;
        }
      }
      intensity[centerIndex] = sum;
    }
  }

  let maxIntensity = 0;
  for (let i = 0; i < intensity.length; i += 1) {
    if (intensity[i] > maxIntensity) maxIntensity = intensity[i];
  }
  if (maxIntensity <= 0) maxIntensity = 1;
  return { intensity, maxIntensity };
}

function bucketizeTimestamps(timestamps: number[]): Array<{ bucketStartEpochSec: number; count: number }> {
  if (timestamps.length === 0) return [];

  const counts = new Map<number, number>();
  for (const timestamp of timestamps) {
    const bucketStartEpochSec = Math.floor(timestamp / TEMPORAL_BUCKET_SIZE_SEC) * TEMPORAL_BUCKET_SIZE_SEC;
    counts.set(bucketStartEpochSec, (counts.get(bucketStartEpochSec) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([bucketStartEpochSec, count]) => ({ bucketStartEpochSec, count }))
    .sort((a, b) => a.bucketStartEpochSec - b.bucketStartEpochSec);
}

function computeTemporalPeakSupportFromBuckets(
  buckets: Array<{ bucketStartEpochSec: number; count: number }>,
  temporalBandwidthSec: number,
): number {
  if (buckets.length === 0) return 0;
  if (buckets.length === 1) return buckets[0]?.count ?? 0;

  const safeBandwidthSec = Math.max(TEMPORAL_BUCKET_SIZE_SEC, temporalBandwidthSec);
  let peak = 0;

  for (let centerIdx = 0; centerIdx < buckets.length; centerIdx += 1) {
    const center = buckets[centerIdx]?.bucketStartEpochSec ?? 0;
    let weighted = 0;

    for (let bucketIdx = 0; bucketIdx < buckets.length; bucketIdx += 1) {
      const bucket = buckets[bucketIdx];
      if (!bucket || bucket.count <= 0) continue;
      const deltaSec = bucket.bucketStartEpochSec - center;
      const weight = Math.exp(-0.5 * (deltaSec / safeBandwidthSec) ** 2);
      weighted += bucket.count * weight;
    }

    if (weighted > peak) peak = weighted;
  }

  return peak;
}

function computeTemporalPeakSupportFromTimestamps(
  timestamps: number[],
  temporalBandwidthSec: number,
): number {
  return computeTemporalPeakSupportFromBuckets(bucketizeTimestamps(timestamps), temporalBandwidthSec);
}

function applyResponsePayloadGuard<T extends StkdeSurfaceResponse & { sliceResults?: Record<string, StkdeSurfaceResponse> }>(response: T): T {
  let next = response;
  let payloadBytes = new TextEncoder().encode(JSON.stringify(next)).length;
  if (payloadBytes > STKDE_RESPONSE_SIZE_LIMIT_BYTES && next.heatmap.cells.length > 1) {
    const sortedCells = [...next.heatmap.cells].sort((a, b) => {
      if (b.intensity !== a.intensity) return b.intensity - a.intensity;
      return b.support - a.support;
    });
    let keep = sortedCells.length;
    while (payloadBytes > STKDE_RESPONSE_SIZE_LIMIT_BYTES && keep > 1) {
      keep = Math.max(1, Math.floor(keep * 0.85));
      next = {
        ...next,
        meta: {
          ...next.meta,
          truncated: true,
          fallbackApplied: next.meta.fallbackApplied
            ? `${next.meta.fallbackApplied},response-size-guard`
            : 'response-size-guard',
        },
        heatmap: {
          ...next.heatmap,
          cells: sortedCells.slice(0, keep),
        },
      };
      payloadBytes = new TextEncoder().encode(JSON.stringify(next)).length;
    }
  }
  return next;
}

function computePeakWindowFromBuckets(
  buckets: Array<{ bucketStartEpochSec: number; count: number }>,
  domainStart: number,
  domainEnd: number,
  windowSeconds: number,
): [number, number] {
  if (buckets.length === 0) {
    return [domainStart, Math.min(domainEnd, domainStart + windowSeconds)];
  }

  const sorted = [...buckets].sort((a, b) => a.bucketStartEpochSec - b.bucketStartEpochSec);
  let bestStart = sorted[0]?.bucketStartEpochSec ?? domainStart;
  let bestWeight = sorted[0]?.count ?? 0;
  let startIdx = 0;
  let runningWeight = 0;

  for (let endIdx = 0; endIdx < sorted.length; endIdx += 1) {
    runningWeight += sorted[endIdx]?.count ?? 0;
    const endValue = sorted[endIdx]?.bucketStartEpochSec ?? domainStart;
    while (endValue - (sorted[startIdx]?.bucketStartEpochSec ?? endValue) > windowSeconds) {
      runningWeight -= sorted[startIdx]?.count ?? 0;
      startIdx += 1;
    }
    if (runningWeight > bestWeight) {
      bestWeight = runningWeight;
      bestStart = sorted[startIdx]?.bucketStartEpochSec ?? bestStart;
    }
  }

  const clampedStart = clamp(bestStart, domainStart, domainEnd);
  const clampedEnd = clamp(clampedStart + windowSeconds, domainStart, domainEnd);
  return [clampedStart, Math.max(clampedStart, clampedEnd)];
}

export interface ComputeStkdeOutput {
  response: StkdeResponse;
  metaNotes: string[];
}

interface ComputeMetaOverrides {
  requestedComputeMode?: StkdeComputeMode;
  effectiveComputeMode?: StkdeComputeMode;
  fallbackApplied?: string | null;
  clampsApplied?: string[];
  fullPopulationStats?: {
    scannedRows: number;
    aggregatedCells: number;
    queryMs: number;
  };
}

function computeSingleStkdeSurfaceFromCrimes(
  request: StkdeRequest,
  crimes: CrimeRecord[],
  metaOverrides?: ComputeMetaOverrides,
  perSliceCrimes?: Map<string, CrimeRecord[]>,
): ComputeStkdeOutput {
  const computeStart = performance.now();
  const metaNotes: string[] = [];
  const grid = buildStkdeGridConfig(request);
  if (grid.coarsenFactor > 1) {
    metaNotes.push(`grid-coarsened-x${grid.coarsenFactor}`);
  }

  const [domainStart, domainEnd] = [request.domain.startEpochSec, request.domain.endEpochSec];
  const [minLng, minLat, maxLng, maxLat] = [grid.minLng, grid.minLat, grid.maxLng, grid.maxLat];
  const allowedTypes = request.filters.crimeTypes?.length ? new Set(request.filters.crimeTypes) : null;

  const filtered = crimes
    .filter((crime) => {
      if (crime.timestamp < domainStart || crime.timestamp > domainEnd) return false;
      if (allowedTypes && !allowedTypes.has(crime.type)) return false;
      if (crime.lon < minLng || crime.lon > maxLng || crime.lat < minLat || crime.lat > maxLat) return false;
      return Number.isFinite(crime.lon) && Number.isFinite(crime.lat);
    })
    .sort(stableCrimeSort);

  const truncatedByEvents = filtered.length > request.limits.maxEvents;
  const boundedEvents = truncatedByEvents ? filtered.slice(0, request.limits.maxEvents) : filtered;
  if (truncatedByEvents) {
    metaNotes.push(`event-cap:${request.limits.maxEvents}`);
  }

  const cellCount = grid.rows * grid.cols;
  const support = new Float64Array(cellCount);
  const cellTimestamps = Array.from({ length: cellCount }, () => [] as number[]);
  const temporalPeakSupport = new Float64Array(cellCount);

  const toCellIndex = (lon: number, lat: number): number => {
    const col = clamp(Math.floor((lon - minLng) / grid.lonCellDegrees), 0, grid.cols - 1);
    const row = clamp(Math.floor((lat - minLat) / grid.latCellDegrees), 0, grid.rows - 1);
    return row * grid.cols + col;
  };

  for (const crime of boundedEvents) {
    const idx = toCellIndex(crime.lon, crime.lat);
    support[idx] += 1;
    cellTimestamps[idx].push(crime.timestamp);
  }

  const temporalBandwidthSec = request.params.temporalBandwidthHours * 3600;
  for (let idx = 0; idx < cellCount; idx += 1) {
    temporalPeakSupport[idx] = computeTemporalPeakSupportFromTimestamps(cellTimestamps[idx], temporalBandwidthSec);
  }

  const { intensity, maxIntensity } = buildIntensityFromSupport(temporalPeakSupport, grid.rows, grid.cols, request);

  const cells: StkdeHeatmapCell[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const idx = row * grid.cols + col;
      const rawIntensity = intensity[idx];
      const normalized = rawIntensity / maxIntensity;
      const count = support[idx];
      if (normalized <= 0 && count <= 0) continue;
      const lng = minLng + (col + 0.5) * grid.lonCellDegrees;
      const lat = minLat + (row + 0.5) * grid.latCellDegrees;
      cells.push({
        lng,
        lat,
        intensity: Number(normalized.toFixed(6)),
        support: Math.round(count),
      });
    }
  }

  const hotspotCandidates: StkdeHotspot[] = [];
  const timeWindowSec = request.params.timeWindowHours * 3600;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const idx = row * grid.cols + col;
      const supportCount = Math.round(support[idx]);
      if (supportCount < request.params.minSupport) continue;
      const peak = computePeakWindow(cellTimestamps[idx], domainStart, domainEnd, timeWindowSec);
      const normalizedIntensity = Number((intensity[idx] / maxIntensity).toFixed(6));
      hotspotCandidates.push({
        id: createHotspotId(row, col, peak[0], peak[1]),
        centroidLng: Number((minLng + (col + 0.5) * grid.lonCellDegrees).toFixed(6)),
        centroidLat: Number((minLat + (row + 0.5) * grid.latCellDegrees).toFixed(6)),
        intensityScore: normalizedIntensity,
        supportCount,
        peakStartEpochSec: peak[0],
        peakEndEpochSec: peak[1],
        radiusMeters: request.params.spatialBandwidthMeters,
      });
    }
  }

  const hotspots = hotspotCandidates
    .sort((a, b) => {
      if (b.intensityScore !== a.intensityScore) return b.intensityScore - a.intensityScore;
      if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
      if (a.centroidLat !== b.centroidLat) return a.centroidLat - b.centroidLat;
      if (a.centroidLng !== b.centroidLng) return a.centroidLng - b.centroidLng;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, request.params.topK);

  const sliceResults: Record<string, StkdeSurfaceResponse> = {};
  const sliceDescriptors = request.filters.slices ?? [];
  if (sliceDescriptors.length > 0) {
    for (const slice of sliceDescriptors) {
      // Prefer per-slice fetched crimes (each slice gets its own bounded query)
      // over subdividing the single capped domain set, which dilutes narrow
      // slices when the request domain spans many years.
      const sliceCrimes = perSliceCrimes?.get(slice.id)
        ?? boundedEvents.filter(
          (crime) => crime.timestamp >= slice.startEpochSec && crime.timestamp < slice.endEpochSec,
        );
      const sliceRequest: StkdeRequest = {
        ...request,
        domain: {
          startEpochSec: slice.startEpochSec,
          endEpochSec: slice.endEpochSec,
        },
        filters: {
          ...request.filters,
          slices: undefined,
        },
      };
      sliceResults[slice.id] = computeSingleStkdeSurfaceFromCrimes(sliceRequest, sliceCrimes, {
        requestedComputeMode: metaOverrides?.requestedComputeMode ?? request.computeMode,
        effectiveComputeMode: metaOverrides?.effectiveComputeMode ?? request.computeMode,
        fallbackApplied: metaOverrides?.fallbackApplied ?? (metaNotes.length > 0 ? metaNotes.join(',') : null),
        clampsApplied: metaOverrides?.clampsApplied ?? [],
        fullPopulationStats: metaOverrides?.fullPopulationStats,
      }).response;
    }
  }

  let response: StkdeSurfaceResponse = {
    meta: {
      eventCount: boundedEvents.length,
      computeMs: 0,
      truncated: truncatedByEvents,
      requestedComputeMode: metaOverrides?.requestedComputeMode ?? request.computeMode,
      effectiveComputeMode: metaOverrides?.effectiveComputeMode ?? request.computeMode,
      fallbackApplied:
        metaOverrides?.fallbackApplied ?? (metaNotes.length > 0 ? metaNotes.join(',') : null),
      clampsApplied: metaOverrides?.clampsApplied ?? [],
      fullPopulationStats: metaOverrides?.fullPopulationStats,
    },
    heatmap: {
      cells,
      maxIntensity: 1,
    },
    hotspots,
    contracts: {
      scoreVersion: 'stkde-v1',
    },
  };
  response = applyResponsePayloadGuard(response);

  response.meta.computeMs = Math.max(0, Math.round((performance.now() - computeStart) * 100) / 100);
  return { response: { ...response, sliceResults }, metaNotes };
}

export function computeStkdeFromCrimes(
  request: StkdeRequest,
  crimes: CrimeRecord[],
  metaOverrides?: ComputeMetaOverrides,
  perSliceCrimes?: Map<string, CrimeRecord[]>,
): ComputeStkdeOutput {
  return computeSingleStkdeSurfaceFromCrimes(request, crimes, metaOverrides, perSliceCrimes);
}

export function computeStkdeFromAggregates(
  request: StkdeRequest,
  inputs: FullPopulationStkdeInputs,
  metaOverrides?: ComputeMetaOverrides,
): ComputeStkdeOutput {
  const computeStart = performance.now();
  const metaNotes: string[] = [];
  const grid = inputs.grid;
  if (grid.coarsenFactor > 1) {
    metaNotes.push(`grid-coarsened-x${grid.coarsenFactor}`);
  }

  const [domainStart, domainEnd] = [request.domain.startEpochSec, request.domain.endEpochSec];
  const [minLng, minLat] = [grid.minLng, grid.minLat];
  const cellCount = grid.rows * grid.cols;
  const support = inputs.cellSupport;
  const temporalPeakSupport = new Float64Array(cellCount);
  const temporalBandwidthSec = request.params.temporalBandwidthHours * 3600;
  for (let idx = 0; idx < cellCount; idx += 1) {
    temporalPeakSupport[idx] = computeTemporalPeakSupportFromBuckets(
      inputs.cellTemporalBuckets.get(idx) ?? [],
      temporalBandwidthSec,
    );
  }

  const { intensity, maxIntensity } = buildIntensityFromSupport(temporalPeakSupport, grid.rows, grid.cols, request);

  const cells: StkdeHeatmapCell[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const idx = row * grid.cols + col;
      const rawIntensity = intensity[idx];
      const normalized = rawIntensity / maxIntensity;
      const count = support[idx];
      if (normalized <= 0 && count <= 0) continue;
      const lng = minLng + (col + 0.5) * grid.lonCellDegrees;
      const lat = minLat + (row + 0.5) * grid.latCellDegrees;
      cells.push({
        lng,
        lat,
        intensity: Number(normalized.toFixed(6)),
        support: Math.round(count),
      });
    }
  }

  const hotspotCandidates: StkdeHotspot[] = [];
  const timeWindowSec = request.params.timeWindowHours * 3600;
  for (let idx = 0; idx < cellCount; idx += 1) {
    const supportCount = Math.round(support[idx] ?? 0);
    if (supportCount < request.params.minSupport) continue;
    const row = Math.floor(idx / grid.cols);
    const col = idx % grid.cols;
    const peak = computePeakWindowFromBuckets(
      inputs.cellTemporalBuckets.get(idx) ?? [],
      domainStart,
      domainEnd,
      timeWindowSec,
    );
    const normalizedIntensity = Number((intensity[idx] / maxIntensity).toFixed(6));
    hotspotCandidates.push({
      id: createHotspotId(row, col, peak[0], peak[1]),
      centroidLng: Number((minLng + (col + 0.5) * grid.lonCellDegrees).toFixed(6)),
      centroidLat: Number((minLat + (row + 0.5) * grid.latCellDegrees).toFixed(6)),
      intensityScore: normalizedIntensity,
      supportCount,
      peakStartEpochSec: peak[0],
      peakEndEpochSec: peak[1],
      radiusMeters: request.params.spatialBandwidthMeters,
    });
  }

  const hotspots = hotspotCandidates
    .sort((a, b) => {
      if (b.intensityScore !== a.intensityScore) return b.intensityScore - a.intensityScore;
      if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
      if (a.centroidLat !== b.centroidLat) return a.centroidLat - b.centroidLat;
      if (a.centroidLng !== b.centroidLng) return a.centroidLng - b.centroidLng;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, request.params.topK);

  let response: StkdeResponse = {
    meta: {
      eventCount: inputs.eventCount,
      computeMs: 0,
      truncated: false,
      requestedComputeMode: metaOverrides?.requestedComputeMode ?? request.computeMode,
      effectiveComputeMode: metaOverrides?.effectiveComputeMode ?? request.computeMode,
      fallbackApplied:
        metaOverrides?.fallbackApplied ?? (metaNotes.length > 0 ? metaNotes.join(',') : null),
      clampsApplied: metaOverrides?.clampsApplied ?? [],
      fullPopulationStats: metaOverrides?.fullPopulationStats,
    },
    heatmap: {
      cells,
      maxIntensity: 1,
    },
    hotspots,
    contracts: {
      scoreVersion: 'stkde-v1',
    },
    sliceResults: {},
  };

  response = applyResponsePayloadGuard(response);
  response.meta.computeMs = Math.max(0, Math.round((performance.now() - computeStart) * 100) / 100);
  return { response, metaNotes };
}

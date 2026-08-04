import type { TimeSlice } from '@/store/useSliceDomainStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import {
  buildComparableWarpMap,
  clampComparableWarpWeight,
  scoreComparableWarpBins,
  type ComparableWarpBinInput,
  type ComparableWarpMapResult,
} from '@/lib/binning/warp-scaling';

const DEFAULT_DOMAIN: [number, number] = [0, 100];
const MINIMUM_WIDTH_SHARE = 1e-6;
const MIN_WARP_WEIGHT = 0.25;
const MAX_WARP_WEIGHT = 4;

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const sampleWarpedEpoch = (
  epoch: number,
  warpMap: Float32Array,
  domain: [number, number],
): number => {
  if (warpMap.length === 0) {
    return epoch;
  }

  const [domainStart, domainEnd] = domain;
  const span = Math.max(Number.EPSILON, domainEnd - domainStart);
  const normalized = Math.min(1, Math.max(0, (epoch - domainStart) / span));
  const rawIndex = normalized * (warpMap.length - 1);
  const low = Math.floor(rawIndex);
  const high = Math.min(low + 1, warpMap.length - 1);
  const mix = rawIndex - low;
  const lowValue = warpMap[Math.max(0, low)] ?? epoch;
  const highValue = warpMap[Math.max(0, high)] ?? lowValue;
  return lowValue * (1 - mix) + highValue * mix;
};

const clampMinimumWidthShare = (value: number, binCount: number): number => {
  const finite = Number.isFinite(value) ? value : MINIMUM_WIDTH_SHARE;
  const positive = Math.max(0, finite);
  const upperBound = binCount > 0 ? Math.min(0.45, 1 / (binCount * 2)) : MINIMUM_WIDTH_SHARE;
  return Math.min(upperBound, positive || MINIMUM_WIDTH_SHARE);
};

export const applySliceMultipliersToDensityMap = (
  slices: TimeSlice[],
  densityMap: Float32Array | null,
  sliceDomain: [number, number],
  mapDomain: [number, number] = sliceDomain,
): Float32Array | null => {
  if (!densityMap || densityMap.length === 0) {
    return null;
  }

  const resolvedSliceDomain = normalizeDomain(sliceDomain);
  const resolvedMapDomain = normalizeDomain(mapDomain);
  const [mapStart, mapEnd] = resolvedMapDomain;
  const mapSpan = Math.max(Number.EPSILON, mapEnd - mapStart);
  const multipliers = new Float32Array(densityMap.length).fill(1);

  slices
    .filter((slice) => slice.isVisible && (slice.warpEnabled ?? true))
    .forEach((slice) => {
      const range = resolveSliceRange(slice, resolvedSliceDomain);
      if (!range) {
        return;
      }

      const multiplier = clampComparableWarpWeight(slice.warpWeight ?? 1, MIN_WARP_WEIGHT, MAX_WARP_WEIGHT);

      for (let index = 0; index < densityMap.length; index += 1) {
        const centerRatio = (index + 0.5) / densityMap.length;
        const centerEpoch = mapStart + centerRatio * mapSpan;
        if (centerEpoch >= range[0] && centerEpoch <= range[1]) {
          multipliers[index] = Math.max(multipliers[index] ?? 1, multiplier);
        }
      }
    });

  return Float32Array.from(densityMap, (value, index) => (value ?? 0) * (multipliers[index] ?? 1));
};

const normalizeDomain = (domain: [number, number]): [number, number] => {
  if (!Number.isFinite(domain[0]) || !Number.isFinite(domain[1]) || domain[0] === domain[1]) {
    return DEFAULT_DOMAIN;
  }

  return domain[0] < domain[1] ? [domain[0], domain[1]] : [domain[1], domain[0]];
};

const resolveSliceRange = (slice: TimeSlice, domain: [number, number]): [number, number] | null => {
  const [domainStart, domainEnd] = domain;
  const toEpoch = (normalized: number): number => normalizedToEpochSeconds(normalized, domainStart, domainEnd);

  if (slice.range) {
    if (!Number.isFinite(slice.range[0]) || !Number.isFinite(slice.range[1])) {
      return null;
    }

    const normalizedStart = clampPercent(Math.min(slice.range[0], slice.range[1]));
    const normalizedEnd = clampPercent(Math.max(slice.range[0], slice.range[1]));
    const start = toEpoch(normalizedStart);
    const end = toEpoch(normalizedEnd);
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
  }

  if (!Number.isFinite(slice.time)) {
    return null;
  }

  const center = clampPercent(slice.time);
  const halfWidth = slice.isBurst ? 2.5 : 1.5;
  const start = toEpoch(clampPercent(center - halfWidth));
  const end = toEpoch(clampPercent(center + halfWidth));
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
};

const buildSampleWarpMapFromComparableWarp = (
  result: ComparableWarpMapResult,
  sampleCount: number,
  domain: [number, number],
): Float32Array | null => {
  const safeSampleCount = Math.floor(sampleCount);
  if (safeSampleCount < 2) {
    return null;
  }

  const [domainStart, domainEnd] = normalizeDomain(domain);
  const domainSpan = Math.max(Number.EPSILON, domainEnd - domainStart);
  const validBinIndexes = result.bins
    .map((bin, index) => ({ bin, index }))
    .filter(({ bin, index }) => {
      const warpedStart = result.boundaries[index];
      const warpedEnd = result.boundaries[index + 1];
      return Number.isFinite(bin.startTime)
        && Number.isFinite(bin.endTime)
        && bin.endTime > bin.startTime
        && Number.isFinite(warpedStart)
        && Number.isFinite(warpedEnd);
    })
    .map(({ index }) => index);

  if (validBinIndexes.length === 0) {
    return null;
  }

  const clampToDomain = (value: number): number => Math.min(domainEnd, Math.max(domainStart, value));
  const warpMap = new Float32Array(safeSampleCount);
  let previousValue = domainStart;

  for (let index = 0; index < safeSampleCount; index += 1) {
    const ratio = safeSampleCount === 1 ? 0 : index / (safeSampleCount - 1);
    const logicalPosition = clampToDomain(domainStart + (ratio * domainSpan));
    const matchingPosition = validBinIndexes.findIndex((binPosition, positionIndex) => {
      const bin = result.bins[binPosition];
      if (!bin) return false;
      const isLast = positionIndex === validBinIndexes.length - 1;
      return logicalPosition >= bin.startTime
        && (isLast ? logicalPosition <= bin.endTime : logicalPosition < bin.endTime);
    });
    const positionIndex = matchingPosition >= 0
      ? matchingPosition
      : logicalPosition <= (result.bins[validBinIndexes[0]!]?.startTime ?? domainStart)
        ? 0
        : validBinIndexes.length - 1;
    const binIndex = validBinIndexes[positionIndex] ?? validBinIndexes[0]!;
    const bin = result.bins[binIndex];
    const start = bin?.startTime;
    const end = bin?.endTime;
    const warpedStart = result.boundaries[binIndex];
    const warpedEnd = result.boundaries[binIndex + 1];

    let nextValue = previousValue;
    if (bin && Number.isFinite(start) && Number.isFinite(end) && end > start
      && Number.isFinite(warpedStart) && Number.isFinite(warpedEnd)) {
      const localProgress = Math.min(1, Math.max(0, (logicalPosition - start) / (end - start)));
      const interpolated = warpedStart + (localProgress * (warpedEnd - warpedStart));
      if (Number.isFinite(interpolated)) {
        nextValue = clampToDomain(interpolated);
      }
    }

    nextValue = Math.max(previousValue, nextValue);
    warpMap[index] = Number.isFinite(nextValue) ? nextValue : previousValue;
    previousValue = warpMap[index] ?? previousValue;
  }

  warpMap[safeSampleCount - 1] = domainEnd;
  return warpMap;
};

export const buildDemoSliceAuthoredWarpAllocation = (
  slices: TimeSlice[],
  densityMap: Float32Array | null,
  domain: [number, number],
): ComparableWarpMapResult | null => {
  const resolvedDomain = normalizeDomain(domain);
  const enabledSlices = slices.filter((slice) => slice.isVisible && (slice.warpEnabled ?? true));
  if (enabledSlices.length === 0) {
    return null;
  }

  const comparableBins: ComparableWarpBinInput[] = enabledSlices.flatMap((slice) => {
    const range = resolveSliceRange(slice, resolvedDomain);
    if (!range) {
      return [];
    }

    return [{
      id: slice.id,
      startTime: range[0],
      endTime: range[1],
      // Slice-authored mode treats `warpWeight` as the authored emphasis signal.
      // The density-derived baseline is seeded into each slice when the user
      // switches away from pure density mode, so the authored allocation should
      // not multiply density a second time here.
      count: 1,
      granularity: 'daily',
      hintWeight: clampComparableWarpWeight(slice.warpWeight ?? 1, MIN_WARP_WEIGHT, MAX_WARP_WEIGHT),
    } satisfies ComparableWarpBinInput];
  }).sort((left, right) => {
    const startDelta = left.startTime - right.startTime;
    if (startDelta !== 0) return startDelta;
    const endDelta = left.endTime - right.endTime;
    if (endDelta !== 0) return endDelta;
    return left.id.localeCompare(right.id);
  });

  if (comparableBins.length === 0) {
    return null;
  }

  const comparableScores = scoreComparableWarpBins(comparableBins, {
    minWarpWeight: MIN_WARP_WEIGHT,
    maxWarpWeight: MAX_WARP_WEIGHT,
  });
  return buildComparableWarpMap(comparableScores.bins, resolvedDomain, {
    minimumWidthShare: MINIMUM_WIDTH_SHARE,
    minWarpWeight: MIN_WARP_WEIGHT,
    maxWarpWeight: MAX_WARP_WEIGHT,
  });
};

export const resolveDensityDerivedSliceWeights = (
  slices: TimeSlice[],
  densityMap: Float32Array | null,
  domain: [number, number],
): Record<string, number> => {
  const resolvedDomain = normalizeDomain(domain);
  const resolvedSlices = slices
    .filter((slice) => slice.isVisible && slice.type === 'range')
    .flatMap((slice) => {
      const range = resolveSliceRange(slice, resolvedDomain);
      if (!range) {
        return [];
      }

      return [{
        id: slice.id,
        range,
      }];
    })
    .sort((left, right) => left.range[0] - right.range[0] || left.range[1] - right.range[1] || left.id.localeCompare(right.id));

  if (resolvedSlices.length === 0) {
    return {};
  }

  const densityWarpMap = buildDensityWarpMap(densityMap, resolvedDomain);
  if (!densityWarpMap) {
    return Object.fromEntries(resolvedSlices.map((slice) => [slice.id, 1]));
  }

  const minimumWidthShare = clampMinimumWidthShare(MINIMUM_WIDTH_SHARE, resolvedSlices.length);
  const domainSpan = Math.max(Number.EPSILON, resolvedDomain[1] - resolvedDomain[0]);
  const rawWeights = resolvedSlices.map(({ range }) => {
    const warpedStart = sampleWarpedEpoch(range[0], densityWarpMap, resolvedDomain);
    const warpedEnd = sampleWarpedEpoch(range[1], densityWarpMap, resolvedDomain);
    const widthShare = Math.max(0, (warpedEnd - warpedStart) / domainSpan);
    return Math.max(Number.EPSILON, widthShare - minimumWidthShare);
  });
  const maxRawWeight = Math.max(...rawWeights);
  if (!Number.isFinite(maxRawWeight) || maxRawWeight <= 0) {
    return Object.fromEntries(resolvedSlices.map((slice) => [slice.id, 1]));
  }

  const scale = MAX_WARP_WEIGHT / maxRawWeight;

  return Object.fromEntries(
    resolvedSlices.map((slice, index) => [
      slice.id,
      clampComparableWarpWeight((rawWeights[index] ?? 1) * scale, MIN_WARP_WEIGHT, MAX_WARP_WEIGHT),
    ]),
  );
};

export const buildDemoSliceAuthoredWarpMap = (
  slices: TimeSlice[],
  densityMap: Float32Array | null,
  sliceDomain: [number, number],
  sampleCount: number,
  mapDomain: [number, number] = sliceDomain,
): Float32Array | null => {
  const weightedDensityMap = applySliceMultipliersToDensityMap(slices, densityMap, sliceDomain, mapDomain);
  const densityWarpMap = buildDensityWarpMap(weightedDensityMap, normalizeDomain(mapDomain));
  if (densityWarpMap) {
    return densityWarpMap;
  }

  const allocation = buildDemoSliceAuthoredWarpAllocation(slices, densityMap, sliceDomain);
  return allocation
    ? buildSampleWarpMapFromComparableWarp(allocation, sampleCount, sliceDomain)
    : null;
};

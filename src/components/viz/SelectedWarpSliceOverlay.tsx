"use client";

import { Edges, Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useStore } from 'zustand';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import type { TimeSlice } from '@/store/useSliceStore';
import type { WarpSlice } from '@/store/useWarpSliceStore';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const DATA_MIN_TIMESTAMP = 978307200; // 2001-01-01
const DATA_MAX_TIMESTAMP = 1767571200; // 2026-01-01
const DEFAULT_MAP_DOMAIN: [number, number] = [0, 100];

type OverlaySlice = TimeSlice | WarpSlice;

type SliceStoreSelectionState = {
  activeSliceId?: string | null;
  activeWarpId?: string | null;
  selectedSliceId?: string | null;
};

const isWarpSlice = (slice: OverlaySlice): slice is WarpSlice => 'label' in slice;

const getOverlaySliceRange = (slice: OverlaySlice): [number, number] => {
  if (Array.isArray(slice.range) && slice.range.length >= 2) {
    return [Number(slice.range[0]), Number(slice.range[1])];
  }

  if (isWarpSlice(slice)) {
    return [0, 0];
  }

  return [Number(slice.time), Number(slice.time)];
};

const isOverlaySliceEnabled = (slice: OverlaySlice) =>
  isWarpSlice(slice) ? slice.enabled : slice.isVisible;

const getOverlaySliceWeight = (slice: OverlaySlice) =>
  isWarpSlice(slice) ? slice.weight : (slice.warpWeight ?? 1);

const getOverlaySliceLabel = (slice: OverlaySlice) =>
  isWarpSlice(slice) ? slice.label : slice.name;

const buildSliceAuthoredWarpMap = (
  slices: Array<{ enabled: boolean; range: [number, number]; weight: number }>,
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.enabled);
  if (enabledSlices.length === 0 || sampleCount < 2) return null;

  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);
  const density = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const percent = ratio * 100;
    let boost = 0;

    for (const slice of enabledSlices) {
      const start = Math.min(slice.range[0], slice.range[1]);
      const end = Math.max(slice.range[0], slice.range[1]);
      if (percent < start || percent > end) continue;

      const center = (start + end) / 2;
      const halfWidth = Math.max(0.5, (end - start) / 2);
      const normalizedDistance = Math.abs((percent - center) / halfWidth);
      const falloff = Math.max(0, 1 - normalizedDistance);
      boost += Math.max(0, slice.weight) * (0.35 + 0.65 * falloff);
    }

    density[i] = 1 + boost;
  }

  const cumulative = new Float32Array(sampleCount);
  cumulative[0] = 0;
  for (let i = 1; i < sampleCount; i += 1) {
    const prev = density[i - 1] ?? 1;
    const curr = density[i] ?? 1;
    cumulative[i] = cumulative[i - 1] + (prev + curr) * 0.5;
  }

  const total = cumulative[sampleCount - 1] ?? 0;
  if (!Number.isFinite(total) || total <= 0) return null;

  const authoredMap = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const progress = (cumulative[i] ?? 0) / total;
    authoredMap[i] = domainStart + progress * domainSpan;
  }

  return authoredMap;
};

const normalizeStoreSlices = (slices: OverlaySlice[]): Array<{ enabled: boolean; range: [number, number]; weight: number }> =>
  slices.map((slice) => {
    const range = getOverlaySliceRange(slice);

    return {
      enabled: isOverlaySliceEnabled(slice),
      range,
      weight: Number.isFinite(getOverlaySliceWeight(slice)) ? getOverlaySliceWeight(slice) : 1,
    };
  });

interface SelectedWarpSliceOverlayProps {
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}

const toRawEpoch = (percent: number, domain: [number, number], usesNormalizedDomain: boolean) => {
  if (usesNormalizedDomain) {
    const normalized = clamp(percent, 0, 100);
    return DATA_MIN_TIMESTAMP + (normalized / 100) * (DATA_MAX_TIMESTAMP - DATA_MIN_TIMESTAMP);
  }
  const [domainStart, domainEnd] = domain;
  return domainStart + (percent / 100) * (domainEnd - domainStart);
};

export function SelectedWarpSliceOverlay({
  adaptiveStoreOverride,
  timeStoreOverride,
  sliceStoreOverride,
}: SelectedWarpSliceOverlayProps = {}) {
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const viewportFilters = useViewportStore((state) => state.filters);

  const { data: crimeRecords } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });

  const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const slices = useStore(sliceStore, (state) => state.slices as OverlaySlice[]);
  const selectedSliceId = useStore(
    sliceStore,
    (state: SliceStoreSelectionState) => state.selectedSliceId ?? state.activeSliceId ?? state.activeWarpId ?? null
  );
  const timeScaleMode = useStore(timeStore, (state) => state.timeScaleMode);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
  const warpMap = useStore(adaptiveStore, (state) => state.warpMap);
  const mapDomain = useStore(adaptiveStore, (state) => state.mapDomain ?? DEFAULT_MAP_DOMAIN);

  const authoredWarpMap = useMemo(
    () => buildSliceAuthoredWarpMap(normalizeStoreSlices(slices), mapDomain, Math.max(96, warpMap?.length || 0)),
    [mapDomain, slices, warpMap?.length]
  );
  const effectiveWarpMap = warpSource === 'slice-authored' ? authoredWarpMap : warpMap;
  // The adaptive warp domain can be either normalized percentages or raw epoch seconds.
  const usesNormalizedDomain = mapDomain[0] >= 0 && mapDomain[1] <= 100;

  const { yMin, yRange } = useMemo(() => {
    let minYData = Infinity;
    let maxYData = -Infinity;

    for (const record of crimeRecords ?? []) {
      const y = record.timestamp;
      if (!Number.isFinite(y)) continue;
      if (y < minYData) minYData = y;
      if (y > maxYData) maxYData = y;
    }

    if (!Number.isFinite(minYData) || !Number.isFinite(maxYData)) {
      return {
        yMin: DATA_MIN_TIMESTAMP,
        yRange: DATA_MAX_TIMESTAMP - DATA_MIN_TIMESTAMP || 1,
      };
    }

    return {
      yMin: minYData,
      yRange: maxYData - minYData || 1,
    };
  }, [crimeRecords]);

  const sampleWarp = (inputT: number) => {
    if (!effectiveWarpMap || effectiveWarpMap.length === 0) return inputT;
    const [domainMin, domainMax] = mapDomain;
    const domainSpan = domainMax - domainMin || 1;
    const normalized = (inputT - domainMin) / domainSpan;
    const clamped = Math.max(0, Math.min(1, normalized));
    const idx = clamped * (effectiveWarpMap.length - 1);
    const low = Math.floor(idx);
    const high = Math.min(low + 1, effectiveWarpMap.length - 1);
    const frac = idx - low;
    return effectiveWarpMap[low] * (1 - frac) + effectiveWarpMap[high] * frac;
  };

  const toDisplayY = (value: number, assumeNormalizedDomain: boolean) => {
    if (assumeNormalizedDomain) {
      return value - 50;
    }
    return ((value - yMin) / yRange) * 100 - 50;
  };

  const selectedSlice = useMemo(() => {
    if (!selectedSliceId) {
      return null;
    }
    return slices.find((slice) => slice.id === selectedSliceId && isOverlaySliceEnabled(slice)) ?? null;
  }, [selectedSliceId, slices]);

  const selectedSliceRange: [number, number] = selectedSlice ? getOverlaySliceRange(selectedSlice) : [0, 0];

  const sliceLabel = selectedSlice
    ? `${getOverlaySliceLabel(selectedSlice)?.trim() || 'Applied slice'} · linked selection`
    : 'Linked selection';

  if (!selectedSlice) {
    return null;
  }

  const startPercent = Math.min(selectedSliceRange[0], selectedSliceRange[1]);
  const endPercent = Math.max(selectedSliceRange[0], selectedSliceRange[1]);

  const startRaw = toRawEpoch(startPercent, mapDomain, usesNormalizedDomain);
  const endRaw = toRawEpoch(endPercent, mapDomain, usesNormalizedDomain);

  let startY = ((startRaw - yMin) / yRange) * 100 - 50;
  let endY = ((endRaw - yMin) / yRange) * 100 - 50;

  if (timeScaleMode === 'adaptive') {
    const startInput = usesNormalizedDomain
      ? ((startRaw - yMin) / yRange) * 100
      : startRaw;
    const endInput = usesNormalizedDomain
      ? ((endRaw - yMin) / yRange) * 100
      : endRaw;
    const startAdaptive = toDisplayY(sampleWarp(startInput), usesNormalizedDomain);
    const endAdaptive = toDisplayY(sampleWarp(endInput), usesNormalizedDomain);
    startY = startY * (1 - warpFactor) + startAdaptive * warpFactor;
    endY = endY * (1 - warpFactor) + endAdaptive * warpFactor;
  }

  const bandMinY = Math.min(startY, endY);
  const bandMaxY = Math.max(startY, endY);
  const height = Math.max(0.8, bandMaxY - bandMinY);
  const centerY = bandMinY + height / 2;

  return (
    <group position={[50, centerY, 50]}>
      <mesh>
        <boxGeometry args={[100, height, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} depthWrite={false} />
        <Edges color="#22d3ee" linewidth={1} scale={1.001} />
      </mesh>
      <Html position={[0, height / 2 + 4, 0]} center className="pointer-events-none select-none">
        <div className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] text-cyan-950 shadow-sm">
          {sliceLabel}
          {timeScaleMode === 'adaptive' ? ' · compare cue' : ' · relational cue'}
        </div>
      </Html>
    </group>
  );
}

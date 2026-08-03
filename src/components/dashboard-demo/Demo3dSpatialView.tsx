'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { normalizeTimeRange } from '@/lib/time-range';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { Stkde3DScene } from '@/app/stkde-3d/components/Stkde3DScene';
import { StkdeIntensityLegend } from '@/app/stkde-3d/components/StkdeIntensityLegend';
import { createStkde3DSceneRuntime } from '@/app/stkde-3d/components/Stkde3DSceneProvider';
import { buildDurationVolumeProfile } from '@/app/stkde-3d/lib/volume-encoding';
import { resolveEpochFromWarpedY, resolveWarpedEpochY } from '@/app/stkde-3d/lib/timeline-axis';
import { computeDensityMap } from '@/components/timeline/hooks/useDensityStripDerivation';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { buildBurstVolumeModel } from '@/lib/stkde/burst-volume';
import { buildDemoSliceAuthoredWarpMap } from '@/components/dashboard-demo/lib/demo-warp-map';
import { useDashboardDemo3d } from '@/components/dashboard-demo/DashboardDemo3dProvider';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { START_Y } from '@/app/stkde-3d/lib/timeline-axis';
import { applyRangeToStoresContract } from '@/components/timeline/DemoDualTimeline';
import { deriveDemo3dInteractionCommand } from '@/components/dashboard-demo/lib/syncDemo3dInteraction';
import { lonLatToNormalized } from '@/lib/coordinate-normalization';
import { toMockCrimeEvents } from '@/app/stkde-3d/lib/event-data';
import { projectStkdeResponseToSceneSlices } from '@/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells';
import { buildSliceEventCountMap, resolveSliceEventCount } from '@/components/dashboard-demo/lib/stkde-slice-accounting';
import type { SpatialBounds } from '@/store/useDashboardDemoFilterStore';
import type {
  Stkde3DBurstInteractionPayload,
  Stkde3DClusterInteractionPayload,
  Stkde3DTemporalWindowPayload,
} from '@/app/stkde-3d/components/Stkde3DSceneProvider';
import type { CrimeRecord } from '@/types/crime';
import type { TimeSlice } from '@/store/useSliceDomainStore';

interface SceneSlice {
  sourceSliceId: string;
  sourceSliceIndex: number;
  index: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
  crimeCount: number;
  serverEventCount?: number | null;
  warpWeight?: number;
  signal?: number;
}

function normalizeBurstScore(score: number): number {
  if (!Number.isFinite(score)) return 0;

  const clamped = Math.max(0, score);
  return clamped > 1 ? Math.min(1, clamped / 100) : clamped;
}

const normalizeWarpBlend = (warpFactor: number): number => Math.min(1, Math.max(0, warpFactor / 3));

const MIN_DRAFT_WINDOW_SEC = 6 * 60 * 60;

function buildDraftWindow(
  centerEpoch: number,
  viewportStart: number,
  viewportEnd: number,
): { startEpoch: number; endEpoch: number } | null {
  if (!Number.isFinite(centerEpoch) || !Number.isFinite(viewportStart) || !Number.isFinite(viewportEnd) || viewportEnd <= viewportStart) {
    return null;
  }

  const windowDuration = Math.min(viewportEnd - viewportStart, MIN_DRAFT_WINDOW_SEC * 2);
  const halfWindow = windowDuration / 2;
  let startEpoch = centerEpoch - halfWindow;
  let endEpoch = centerEpoch + halfWindow;

  if (startEpoch < viewportStart) {
    endEpoch = Math.min(viewportEnd, endEpoch + (viewportStart - startEpoch));
    startEpoch = viewportStart;
  }

  if (endEpoch > viewportEnd) {
    startEpoch = Math.max(viewportStart, startEpoch - (endEpoch - viewportEnd));
    endEpoch = viewportEnd;
  }

  return endEpoch > startEpoch ? { startEpoch, endEpoch } : null;
}

function resolveSliceEpochRange(
  slice: TimeSlice,
  minTimestampSec: number,
  maxTimestampSec: number,
): [number, number] {
  if (slice.startDateTimeMs !== undefined || slice.endDateTimeMs !== undefined) {
    const startMs = slice.startDateTimeMs ?? slice.endDateTimeMs ?? 0;
    const endMs = slice.endDateTimeMs ?? slice.startDateTimeMs ?? startMs;
    const start = startMs / 1000;
    const end = endMs / 1000;
    return start <= end ? [start, end] : [end, start];
  }

  if (slice.type === 'range' && slice.range) {
    const start = normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec);
    return start <= end ? [start, end] : [end, start];
  }

  const time = normalizedToEpochSeconds(slice.time, minTimestampSec, maxTimestampSec);
  return [time, time];
}

function buildSpatialBoundsFromCentroid({
  centroidLat,
  centroidLng,
  radiusMeters,
}: {
  centroidLat: number;
  centroidLng: number;
  radiusMeters: number | null;
}): SpatialBounds | null {
  if (!Number.isFinite(centroidLat) || !Number.isFinite(centroidLng)) return null;

  const radius = Number.isFinite(radiusMeters ?? Number.NaN) ? Math.max(0, radiusMeters ?? 0) : 0;
  const latDelta = radius / 111_320;
  const lonDelta = radius / Math.max(1, 111_320 * Math.cos((centroidLat * Math.PI) / 180));
  const southwest = lonLatToNormalized(centroidLng - lonDelta, centroidLat - latDelta);
  const northeast = lonLatToNormalized(centroidLng + lonDelta, centroidLat + latDelta);

  return {
    minX: Math.min(southwest.x, northeast.x),
    maxX: Math.max(southwest.x, northeast.x),
    minZ: Math.min(southwest.z, northeast.z),
    maxZ: Math.max(southwest.z, northeast.z),
    minLat: centroidLat - latDelta,
    maxLat: centroidLat + latDelta,
    minLon: centroidLng - lonDelta,
    maxLon: centroidLng + lonDelta,
  };
}

export function Demo3dSpatialView() {
  const {
    response: stkdeResponse,
    isLoading: stkdeIsLoading,
    error: stkdeError,
    isStale: stkdeIsStale,
    responseMetadata: stkdeMetadata,
  } = useDashboardDemo3d();
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const overviewTimestampSec = useTimelineDataStore((state) => state.overviewTimestampSec);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const setSelectedTimeRange = useDashboardDemoFilterStore((state) => state.setTimeRange);
  const setSpatialBounds = useDashboardDemoFilterStore((state) => state.setSpatialBounds);
  const clearSpatialBounds = useDashboardDemoFilterStore((state) => state.clearSpatialBounds);
  const currentTime = useDashboardDemoTimeStore((state) => state.currentTime);
  const setTime = useDashboardDemoTimeStore((state) => state.setTime);
  const setRange = useDashboardDemoTimeStore((state) => state.setRange);
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const setBrushRange = useDashboardDemoCoordinationStore((state) => state.setBrushRange);
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const sliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectSliceOpacity);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const densityMap = useDashboardDemoCoordinationStore((state) => state.densityMap);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const cubeScopeMode = useDashboardDemoCoordinationStore((state) => state.cubeScopeMode);
  const volumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.volumeScaleSeconds);
  const volumeExaggeration = useDashboardDemoCoordinationStore((state) => state.volumeExaggeration);
  const volumeNormalizationMode = useDashboardDemoCoordinationStore((state) => state.volumeNormalizationMode);
  const warpSource = useDashboardDemoCoordinationStore((state) => state.warpSource);
  const showRawEvents = useDashboardDemoCoordinationStore((state) => state.showRawEvents);
  const showHotspotTrajectories = useDashboardDemoCoordinationStore((state) => state.showHotspotTrajectories);
  const hotspotMatchingMode = useDashboardDemoCoordinationStore((state) => state.hotspotMatchingMode);
  const heatmapRenderer = useDashboardDemoCoordinationStore((state) => state.heatmapRenderer);
  const activeSliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectActiveSliceOpacity);
  const nonActiveSliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectNonActiveSliceOpacity);
  const stkdeParams = useDashboardDemoCoordinationStore((state) => state.stkdeParams);
  // The cube intentionally renders only the active selected burst. The hook
  // returns a neutral model when the timeline has no selected burst window.
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((state) => state.setSliceCrimeCounts);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const setSelectedBurstWindow = useDashboardDemoCoordinationStore((state) => state.toggleBurstWindow);
  const setDetailsOpen = useDashboardDemoCoordinationStore((state) => state.setDetailsOpen);
  const setSelectedHotspot = useDashboardDemoCoordinationStore((state) => state.setSelectedHotspot);
  const setStkdeActiveEventsStatus = useDashboardDemoCoordinationStore((state) => state.setCrimeFetchStatus);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const [activeEvents, setActiveEvents] = useState<ReturnType<typeof toMockCrimeEvents>>([]);
  const [activeEventsError, setActiveEventsError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const activeEventsRequestIdRef = useRef(0);
  const activeEventsAbortRef = useRef<AbortController | null>(null);
  const [canvasPointer, setCanvasPointer] = useState<{ x: number; y: number } | null>(null);
  const [scanProposal, setScanProposal] = useState<Stkde3DTemporalWindowPayload | null>(null);

  const orderedSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        const serverEventCount = resolveSliceEventCount(stkdeResponse, slice.id);
        return {
          sourceSliceId: slice.id,
          sourceSliceIndex: 0,
          index: 0,
          label: slice.name ?? '',
          startEpoch,
          endEpoch,
          burstScore: normalizeBurstScore(slice.burstScore ?? 0),
          // Rendering helpers still require a number, but the explicit field
          // preserves the difference between a real zero and an unavailable
          // keyed server result for labels and inspectors.
          crimeCount: serverEventCount ?? 0,
          serverEventCount,
          warpWeight: slice.warpWeight,
          signal: slice.burstinessCoefficient,
        } satisfies SceneSlice;
      })
      .sort((left, right) => {
        const startDelta = left.startEpoch - right.startEpoch;
        if (startDelta !== 0) return startDelta;
        const endDelta = left.endEpoch - right.endEpoch;
        if (endDelta !== 0) return endDelta;
        return left.sourceSliceId.localeCompare(right.sourceSliceId);
      })
      .map((slice, index) => ({
        ...slice,
        sourceSliceIndex: index,
        index,
        label: slice.label || `Slice ${index + 1}`,
      }));
  }, [slices, minTimestampSec, maxTimestampSec, stkdeResponse]);

  useEffect(() => {
    const counts = Object.fromEntries(
      Object.entries(buildSliceEventCountMap(stkdeResponse, orderedSlices.map((slice) => slice.sourceSliceId)))
        .map(([sourceSliceId, count]) => [sourceSliceId, count ?? 0]),
    );
    setSliceCrimeCounts(counts);
  }, [orderedSlices, setSliceCrimeCounts, stkdeResponse]);

  const countedSlices = orderedSlices;
  const activeSourceSlice = countedSlices[activeIndex] ?? null;

  useEffect(() => {
    activeEventsAbortRef.current?.abort();
    activeEventsAbortRef.current = null;
    const sourceSlice = activeSourceSlice;

    if (!showRawEvents || !sourceSlice) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the opt-in overlay when its owner changes
      setActiveEvents([]);
      setActiveEventsError(null);
      setStkdeActiveEventsStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    activeEventsAbortRef.current = controller;
    const requestId = ++activeEventsRequestIdRef.current;
    setStkdeActiveEventsStatus('loading');
    setActiveEventsError(null);

    const params = new URLSearchParams({
      startEpoch: Math.floor(sourceSlice.startEpoch).toString(),
      endEpoch: Math.ceil(sourceSlice.endEpoch).toString(),
      bufferDays: '0',
      pageSize: '50000',
    });

    void fetch(`/api/crimes/range?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { data?: CrimeRecord[] };
      })
      .then((result) => {
        if (controller.signal.aborted || requestId !== activeEventsRequestIdRef.current) return;
        setActiveEvents(toMockCrimeEvents(result.data ?? []));
        setStkdeActiveEventsStatus('success');
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || requestId !== activeEventsRequestIdRef.current) return;
        setActiveEvents([]);
        setActiveEventsError(requestError instanceof Error ? requestError.message : 'Active events fetch failed');
        setStkdeActiveEventsStatus('error');
      });

    return () => controller.abort();
  }, [activeSourceSlice, setStkdeActiveEventsStatus, showRawEvents]);

  const fullTimeDomain = useMemo<[number, number]>(() => (
    minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec
      ? [minTimestampSec, maxTimestampSec]
      : [0, 100]
  ), [maxTimestampSec, minTimestampSec]);

  const commitTemporalRange = useCallback((range: [number, number] | null) => {
    if (!range) return;
    applyRangeToStoresContract({
      interactive: true,
      startSec: range[0],
      endSec: range[1],
      domainStart: fullTimeDomain[0],
      domainEnd: fullTimeDomain[1],
      currentTime,
      setTimeRange: setSelectedTimeRange,
      setRange,
      setBrushRange,
      setTime,
    });
  }, [currentTime, fullTimeDomain, setBrushRange, setRange, setSelectedTimeRange, setTime]);

  const brushedTimeDomain = useMemo<[number, number]>(() => {
    if (
      brushRange &&
      minTimestampSec !== null &&
      maxTimestampSec !== null &&
      maxTimestampSec > minTimestampSec
    ) {
      const [start, end] = brushRange;
      const brushedStart = normalizedToEpochSeconds(start, minTimestampSec, maxTimestampSec);
      const brushedEnd = normalizedToEpochSeconds(end, minTimestampSec, maxTimestampSec);
      if (Number.isFinite(brushedStart) && Number.isFinite(brushedEnd) && brushedEnd > brushedStart) {
        return [brushedStart, brushedEnd];
      }
    }

    if (slices.length > 0) {
      const appliedSlices = slices.filter((s) => s.source === 'generated-applied' && s.isVisible);
      if (appliedSlices.length > 0) {
        let minStart = Infinity;
        let maxEnd = -Infinity;
        for (const s of appliedSlices) {
          const [startSec, endSec] = resolveSliceEpochRange(s, minTimestampSec ?? 0, maxTimestampSec ?? 0);
          if (Number.isFinite(startSec) && startSec < minStart) minStart = startSec;
          if (Number.isFinite(endSec) && endSec > maxEnd) maxEnd = endSec;
        }
        if (Number.isFinite(minStart) && Number.isFinite(maxEnd) && maxEnd > minStart) {
          return [minStart, maxEnd];
        }
      }
    }

    const normalized = normalizeTimeRange(selectedTimeRange);
    return normalized && normalized[1] > normalized[0] ? normalized : fullTimeDomain;
  }, [brushRange, fullTimeDomain, maxTimestampSec, minTimestampSec, selectedTimeRange, slices]);

  const cubeTimeDomain = cubeScopeMode === 'brushed' ? brushedTimeDomain : fullTimeDomain;

  const scopedDensityMap = useMemo(() => {
    if (cubeScopeMode !== 'brushed') return null;
    if (!overviewTimestampSec.length || cubeTimeDomain[1] <= cubeTimeDomain[0]) return null;
    return computeDensityMap(overviewTimestampSec, cubeTimeDomain, ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH);
  }, [cubeScopeMode, cubeTimeDomain, overviewTimestampSec]);

  const scopedWarpMap = useMemo(
    () => cubeScopeMode === 'brushed' ? buildDensityWarpMap(scopedDensityMap, cubeTimeDomain) : null,
    [cubeScopeMode, scopedDensityMap, cubeTimeDomain],
  );

  const hasVisibleWarpSlices = useMemo(
    () => slices.some((slice) => slice.isVisible && (slice.warpEnabled ?? true)),
    [slices],
  );

  const authoredWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, densityMap, fullTimeDomain, Math.max(96, slices.length * 8 || 0)),
    [densityMap, fullTimeDomain, slices],
  );

  const usingDensitySource = warpSource === 'density';
  const shouldForceAdaptiveFromSlices = warpSource === 'slice-authored' && hasVisibleWarpSlices;
  const activeWarpMap = scopedWarpMap ?? (usingDensitySource ? warpMap : authoredWarpMap);
  const activeWarpDomain = cubeScopeMode === 'brushed'
    ? cubeTimeDomain
    : (usingDensitySource && mapDomain[1] > mapDomain[0] ? mapDomain : fullTimeDomain);
  const effectiveWarpFactor = shouldForceAdaptiveFromSlices ? (warpFactor > 0 ? warpFactor : 1) : warpFactor;
  const effectiveWarpBlend = normalizeWarpBlend(effectiveWarpFactor);
  const effectiveTimeScaleMode = shouldForceAdaptiveFromSlices ? 'adaptive' : timeScaleMode;

  const volumeProfile = useMemo(
    () => buildDurationVolumeProfile(countedSlices, {
      scaleSeconds: volumeScaleSeconds,
      exaggeration: volumeExaggeration,
      normalizationMode: volumeNormalizationMode,
      timeScaleMode: effectiveTimeScaleMode,
      warpBlend: effectiveWarpBlend,
      warpMap: activeWarpMap,
      warpDomain: activeWarpDomain,
    }),
    [countedSlices, activeWarpDomain, activeWarpMap, effectiveTimeScaleMode, effectiveWarpBlend, volumeScaleSeconds, volumeExaggeration, volumeNormalizationMode],
  );

  const cubeSlices = useMemo(() => {
    if (cubeScopeMode !== 'brushed') return countedSlices;
    const [scopeStart, scopeEnd] = cubeTimeDomain;
    return countedSlices
      .filter((slice) => slice.endEpoch >= scopeStart && slice.startEpoch <= scopeEnd)
      .map((slice, index) => ({ ...slice, index }));
  }, [countedSlices, cubeScopeMode, cubeTimeDomain]);

  const { sliceKdes: cubeSliceKdes, hotspotSliceResults: cubeHotspotSliceResults } = useMemo(
    () => projectStkdeResponseToSceneSlices(cubeSlices, stkdeResponse),
    [cubeSlices, stkdeResponse],
  );

  const burstVolumeModel = useMemo(() => {
    const selectedBurstWindow = selectedBurstWindows[0];
    return buildBurstVolumeModel({
      burstWindow: selectedBurstWindow
        ? {
            id: selectedBurstWindow.id,
            startEpochSec: selectedBurstWindow.start,
            peakEpochSec: selectedBurstWindow.peak,
            endEpochSec: selectedBurstWindow.end,
            count: selectedBurstWindow.count,
            burstScore: selectedBurstWindow.burstScore,
            burstClass: selectedBurstWindow.burstClass,
            label: selectedBurstWindow.burstRationale,
          }
        : null,
      sliceResults: cubeHotspotSliceResults,
    });
  }, [cubeHotspotSliceResults, selectedBurstWindows]);

  const cubeVolumeProfile = useMemo(() => {
    if (cubeScopeMode !== 'brushed') return volumeProfile;

    return buildDurationVolumeProfile(cubeSlices, {
      scaleSeconds: volumeScaleSeconds,
      exaggeration: volumeExaggeration,
      normalizationMode: volumeNormalizationMode,
      timeScaleMode: effectiveTimeScaleMode,
      warpBlend: effectiveWarpBlend,
      warpMap: activeWarpMap,
      warpDomain: activeWarpDomain,
    });
  }, [activeWarpDomain, activeWarpMap, cubeScopeMode, cubeSlices, effectiveTimeScaleMode, effectiveWarpBlend, volumeExaggeration, volumeNormalizationMode, volumeProfile, volumeScaleSeconds]);

  const cubeActiveIndex = useMemo(() => {
    if (cubeSlices.length === 0) {
      return -1;
    }

    const activeSliceId = countedSlices[activeIndex]?.sourceSliceId;
    if (!activeSliceId) {
      return Math.min(activeIndex, cubeSlices.length - 1);
    }

    const nextIndex = cubeSlices.findIndex((slice) => slice.sourceSliceId === activeSliceId);
    return nextIndex;
  }, [activeIndex, countedSlices, cubeSlices]);

  const sceneYToEpoch = useCallback((y: number): number => resolveEpochFromWarpedY(y, START_Y, {
    timeScaleMode: effectiveTimeScaleMode,
    warpBlend: effectiveWarpBlend,
    warpMap: activeWarpMap,
    displayDomain: cubeTimeDomain,
    warpDomain: activeWarpDomain,
  }), [activeWarpDomain, activeWarpMap, cubeTimeDomain, effectiveTimeScaleMode, effectiveWarpBlend]);

  const sceneEpochToY = useCallback((epoch: number): number => resolveWarpedEpochY(epoch, START_Y, {
    timeScaleMode: effectiveTimeScaleMode,
    warpBlend: effectiveWarpBlend,
    warpMap: activeWarpMap,
    displayDomain: cubeTimeDomain,
    warpDomain: activeWarpDomain,
  }), [activeWarpDomain, activeWarpMap, cubeTimeDomain, effectiveTimeScaleMode, effectiveWarpBlend]);

  const handleCreateDraftAtPoint = useCallback(({ y, clientX, clientY }: { y: number; clientX: number; clientY: number }) => {
    const pointer = canvasPointer;
    const movedTooFar = pointer ? Math.hypot(clientX - pointer.x, clientY - pointer.y) > 8 : false;
    if (movedTooFar) return;

    const draftWindow = buildDraftWindow(sceneYToEpoch(y), cubeTimeDomain[0], cubeTimeDomain[1]);
    if (!draftWindow) return;

    const draftId = addManualDraftRange({
      startMs: draftWindow.startEpoch * 1000,
      endMs: draftWindow.endEpoch * 1000,
    });
    setActiveRailTab('slices');
    void computeManualDraftBin(draftId);
  }, [addManualDraftRange, canvasPointer, computeManualDraftBin, cubeTimeDomain, sceneYToEpoch, setActiveRailTab]);

  const handleCanvasPointerDown = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }) => {
    setCanvasPointer({ x: clientX, y: clientY });
  }, []);

  const activateCommandSlice = useCallback((sourceSliceId: string | null, sourceSliceIndex: number | null) => {
    if (!sourceSliceId) return;
    const nextGlobalIndex = countedSlices.findIndex((slice) => slice.sourceSliceId === sourceSliceId);
    setActiveSlice(sourceSliceId);
    setActiveSliceIndex(nextGlobalIndex >= 0 ? nextGlobalIndex : sourceSliceIndex ?? -1);
  }, [countedSlices, setActiveSlice, setActiveSliceIndex]);

  const handleBurstSelect = useCallback((payload: Stkde3DBurstInteractionPayload) => {
    const command = deriveDemo3dInteractionCommand({
      kind: 'burst',
      payload,
      existingBurstWindow: selectedBurstWindows[0] ?? null,
      resolveEpochY: sceneEpochToY,
    });
    activateCommandSlice(command.sourceSliceId, command.sourceSliceIndex);
    if (command.selectedBurstWindow) {
      setSelectedBurstWindow(command.selectedBurstWindow);
      setDetailsOpen(true);
    }
    commitTemporalRange(command.epochRange);
    setActiveRailTab('inspect');
  }, [activateCommandSlice, commitTemporalRange, sceneEpochToY, selectedBurstWindows, setActiveRailTab, setDetailsOpen, setSelectedBurstWindow]);

  const handleTrajectorySelect = useCallback((payload: Stkde3DClusterInteractionPayload) => {
    const command = deriveDemo3dInteractionCommand({
      kind: 'trajectory',
      payload,
      topLevelHotspotIds: stkdeResponse?.hotspots.map((hotspot) => hotspot.id) ?? [],
      resolveEpochY: sceneEpochToY,
    });
    activateCommandSlice(command.sourceSliceId, command.sourceSliceIndex);
    setSelectedHotspot(command.selectedHotspotId);
    if (command.mapFocus) {
      const bounds = buildSpatialBoundsFromCentroid(command.mapFocus);
      if (bounds) setSpatialBounds(bounds);
    } else {
      clearSpatialBounds();
    }
    commitTemporalRange(command.epochRange);
    setActiveRailTab('inspect');
  }, [activateCommandSlice, clearSpatialBounds, commitTemporalRange, sceneEpochToY, setActiveRailTab, setSelectedHotspot, setSpatialBounds, stkdeResponse]);

  const sceneRuntime = useMemo(
    () => createStkde3DSceneRuntime({
      displayDomain: cubeTimeDomain,
      warpDomain: activeWarpDomain,
      timeScaleMode: effectiveTimeScaleMode,
      warpBlend: effectiveWarpBlend,
      densityMap: scopedDensityMap ?? densityMap,
      warpMap: activeWarpMap,
      isPlaying,
      // Sparse server cells do not have positional correspondence. Keep the
      // runtime hard-gated so the shared stack cannot interpolate by index.
      isInterpolated: false,
      sourceSliceIds: cubeSlices.map((slice) => slice.sourceSliceId),
      yToEpoch: sceneYToEpoch,
      onActiveIndexChange: (nextIndex) => {
        const nextSlice = cubeSlices[nextIndex];
        const nextGlobalIndex = nextSlice
          ? countedSlices.findIndex((slice) => slice.sourceSliceId === nextSlice.sourceSliceId)
          : -1;
        setActiveSliceIndex(nextGlobalIndex);
      },
      onSliceSelect: ({ index, sourceSliceId }) => {
        const selectedSlice = sourceSliceId
          ? cubeSlices.find((slice) => slice.sourceSliceId === sourceSliceId)
          : cubeSlices[index];
        if (!selectedSlice) return;
        setActiveSlice(selectedSlice.sourceSliceId);
        const nextGlobalIndex = countedSlices.findIndex((slice) => slice.sourceSliceId === selectedSlice.sourceSliceId);
        setActiveSliceIndex(nextGlobalIndex >= 0 ? nextGlobalIndex : index);
      },
      onBurstHover: () => undefined,
      onBurstSelect: handleBurstSelect,
      onClusterHover: () => undefined,
      onClusterSelect: handleTrajectorySelect,
      onCameraFocus: () => undefined,
      onTemporalWindowPropose: setScanProposal,
      onTemporalWindowCommit: (proposal) => commitTemporalRange([proposal.startEpoch, proposal.endEpoch]),
      onSliceResize: ({ index, sourceSliceId, startEpoch, endEpoch }) => {
        const start = Math.min(startEpoch, endEpoch);
        const end = Math.max(startEpoch, endEpoch);
        const normalizedStart = epochSecondsToNormalized(start, fullTimeDomain[0], fullTimeDomain[1]);
        const normalizedEnd = epochSecondsToNormalized(end, fullTimeDomain[0], fullTimeDomain[1]);
        updateSlice(sourceSliceId, {
          startDateTimeMs: start * 1000,
          endDateTimeMs: end * 1000,
          time: (normalizedStart + normalizedEnd) / 2,
          range: [normalizedStart, normalizedEnd],
        });
        setActiveSlice(sourceSliceId);
        const nextGlobalIndex = countedSlices.findIndex((slice) => slice.sourceSliceId === sourceSliceId);
        setActiveSliceIndex(nextGlobalIndex >= 0 ? nextGlobalIndex : index);
      },
      onCreateDraftAtPoint: handleCreateDraftAtPoint,
      onCanvasPointerDown: handleCanvasPointerDown,
      onCanvasPointerMissed: () => {
        setActiveSliceIndex(-1);
        setActiveSlice(null);
      },
    }),
    [activeWarpDomain, activeWarpMap, commitTemporalRange, countedSlices, cubeSlices, cubeTimeDomain, densityMap, effectiveTimeScaleMode, effectiveWarpBlend, fullTimeDomain, handleBurstSelect, handleCanvasPointerDown, handleCreateDraftAtPoint, handleTrajectorySelect, isPlaying, sceneYToEpoch, scopedDensityMap, setActiveSlice, setActiveSliceIndex, updateSlice],
  );

  const detailChip = useMemo(() => {
    if (cubeScopeMode !== 'brushed') return null;
    const [dStart, dEnd] = cubeTimeDomain;
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const domainLabel = `${fmt.format(new Date(dStart * 1000))} – ${fmt.format(new Date(dEnd * 1000))}`;
    const domainDurationDays = (dEnd - dStart) / 86400;

    const active = cubeSlices[cubeActiveIndex];
    if (!active) return { domainLabel, domainDurationDays, sliceLabel: null, sliceDurationDays: 0, percentage: 0 };
    const sliceDurationDays = (active.endEpoch - active.startEpoch) / 86400;
    const percentage = ((active.endEpoch - active.startEpoch) / (dEnd - dStart)) * 100;
    const sliceLabel = `${fmt.format(new Date(active.startEpoch * 1000))} – ${fmt.format(new Date(active.endEpoch * 1000))}`;
    return { domainLabel, domainDurationDays, sliceLabel, sliceDurationDays, percentage };
  }, [cubeScopeMode, cubeTimeDomain, cubeSlices, cubeActiveIndex]);

  const hotspotMatchingOptions = useMemo(
    () => ({
      mode: hotspotMatchingMode,
      cellWidthMeters: stkdeParams.gridCellMeters,
      smoothingMeters: stkdeParams.spatialBandwidthMeters,
    }),
    [hotspotMatchingMode, stkdeParams.gridCellMeters, stkdeParams.spatialBandwidthMeters],
  );

  useEffect(() => {
    if (countedSlices.length === 0) return;
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    } else if (activeIndex >= countedSlices.length) {
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    }
  }, [countedSlices.length, activeIndex, setActiveSliceIndex]);


  if (orderedSlices.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Apply range slices to inspect STKDE evolution
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      {stkdeIsLoading || stkdeError || stkdeIsStale || (stkdeResponse && cubeSliceKdes.every((cells) => cells.length === 0)) ? (
        <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-sm rounded-md border border-border/70 bg-background/90 px-3 py-2 text-[11px] shadow-md backdrop-blur-sm" role={stkdeError ? 'alert' : 'status'}>
          {stkdeIsLoading ? <p>{stkdeResponse ? 'Updating STKDE surfaces…' : 'STKDE surfaces loading…'}</p> : null}
          {!stkdeIsLoading && stkdeError ? <p className="text-destructive">{stkdeError} — retry from the STKDE panel.</p> : null}
          {!stkdeIsLoading && !stkdeError && stkdeIsStale ? <p className="text-amber-700">Showing the last valid STKDE response while updating.</p> : null}
          {!stkdeIsLoading && !stkdeError && stkdeResponse && cubeSliceKdes.every((cells) => cells.length === 0) ? <p>No STKDE cells for this interval.</p> : null}
        </div>
      ) : null}

      {detailChip && (
        <div className="absolute bottom-3 left-3 z-20 rounded-md border border-border/50 bg-background/90 px-3 py-2 text-[11px] leading-relaxed shadow-md backdrop-blur-sm">
          <div className="font-medium text-foreground/80">Detail domain: {detailChip.domainLabel}</div>
          <div className="text-muted-foreground">{detailChip.domainDurationDays.toFixed(0)} days</div>
          {detailChip.sliceLabel && (
            <>
              <div className="mt-1 font-medium text-foreground/80">Active slice: {detailChip.sliceLabel}</div>
              <div className="text-muted-foreground">{detailChip.sliceDurationDays.toFixed(0)} days ({detailChip.percentage.toFixed(1)}%)</div>
            </>
          )}
        </div>
      )}

      {scanProposal ? (
        <div className="absolute right-3 top-3 z-20 rounded-md border border-cyan-400/30 bg-slate-950/90 px-3 py-2 text-[10px] text-cyan-100 shadow-md backdrop-blur">
          <div className="uppercase tracking-[0.16em] text-cyan-300/80">Clock scan preview</div>
          <div className="mt-1 tabular-nums">
            {new Date(scanProposal.startEpoch * 1000).toLocaleString()} – {new Date(scanProposal.endEpoch * 1000).toLocaleString()}
          </div>
        </div>
      ) : null}

      <Stkde3DScene
        slices={cubeSlices}
        sliceKdes={cubeSliceKdes}
        volumeProfile={cubeVolumeProfile}
        sliceEvents={[]}
        hotspotSliceResults={cubeHotspotSliceResults}
        hotspotMatchingOptions={hotspotMatchingOptions}
        activeIndex={cubeActiveIndex}
        viewMode={viewMode}
        showRawEvents={showRawEvents}
        showHotspotTrajectories={showHotspotTrajectories}
        sliceOpacity={sliceOpacity}
        activeSliceOpacity={activeSliceOpacity}
        nonActiveSliceOpacity={nonActiveSliceOpacity}
        heatmapRenderer={heatmapRenderer}
        timeDomain={cubeTimeDomain}
        overrideWarpMap={scopedWarpMap}
        overrideWarpDomain={cubeScopeMode === 'brushed' ? cubeTimeDomain : undefined}
        burstVolumeModel={burstVolumeModel}
        runtime={sceneRuntime}
        selectedSourceEvents={showRawEvents ? activeEvents : null}
        selectedSourceIndex={activeSourceSlice?.sourceSliceIndex}
      />
      <div className="absolute right-3 top-16 z-20 w-[18rem] max-w-[calc(100%-1.5rem)]">
        <StkdeIntensityLegend mode={heatmapRenderer} domain={[0, 1]} />
      </div>
      {showRawEvents && activeEventsError ? (
        <div className="absolute bottom-3 right-3 z-20 rounded-md border border-destructive/30 bg-background/90 px-3 py-2 text-[11px] text-destructive" role="alert">
          Active events unavailable: {activeEventsError}
        </div>
      ) : null}
      {stkdeMetadata?.sourceLabel !== 'live' ? (
        <div className="absolute bottom-3 right-3 z-20 rounded-md border border-amber-500/30 bg-background/90 px-3 py-2 text-[10px] text-amber-800" role="status">
          {stkdeMetadata?.sourceLabel === 'configured-mock' ? 'Configured mock STKDE data' : 'STKDE fallback warning'}
        </div>
      ) : null}
    </div>
  );
}

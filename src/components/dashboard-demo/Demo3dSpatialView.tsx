'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { normalizeTimeRange } from '@/lib/time-range';
import { Stkde3DScene } from '@/app/stkde-3d/components/Stkde3DScene';
import { createStkde3DSceneRuntime } from '@/app/stkde-3d/components/Stkde3DSceneProvider';
import { buildDurationVolumeProfile } from '@/app/stkde-3d/lib/volume-encoding';
import { resolveEpochFromWarpedY } from '@/app/stkde-3d/lib/timeline-axis';
import { computeDensityMap } from '@/components/timeline/hooks/useDensityStripDerivation';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { buildBurstVolumeModel } from '@/lib/stkde/burst-volume';
import { buildDemoSliceAuthoredWarpMap } from '@/components/dashboard-demo/lib/demo-warp-map';
import { useDashboardDemo3d } from '@/components/dashboard-demo/DashboardDemo3dProvider';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { START_Y } from '@/app/stkde-3d/lib/timeline-axis';
import type { KdeCell } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';
import type { TimeSlice } from '@/store/useSliceDomainStore';

interface SceneSlice {
  sourceSliceId: string;
  index: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
  crimeCount: number;
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

export function Demo3dSpatialView() {
  const { response: stkdeResponse } = useDashboardDemo3d();
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const overviewTimestampSec = useTimelineDataStore((state) => state.overviewTimestampSec);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const isInterpolated = useDashboardDemoCoordinationStore((state) => state.inspectInterpolation);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const isScrubbing = useDashboardDemoCoordinationStore((state) => state.inspectIsScrubbing);
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
  // The cube intentionally renders only the active selected burst. The hook
  // returns a neutral model when the timeline has no selected burst window.
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((state) => state.setSliceCrimeCounts);
  const setCrimeFetchStatus = useDashboardDemoCoordinationStore((state) => state.setCrimeFetchStatus);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const [crimesBySlice, setCrimesBySlice] = useState<CrimeRecord[][]>([]);
  const [crimesError, setCrimesError] = useState<string | null>(null);
  const [sliceKdes, setSliceKdes] = useState<KdeCell[][]>([]);
  const hasLoadedRef = useRef(false);
  const kdeWorkerRef = useRef<Worker | null>(null);
  const kdeRequestIdRef = useRef(0);
  const playbackTimeoutRef = useRef<number | null>(null);
  const [canvasPointer, setCanvasPointer] = useState<{ x: number; y: number } | null>(null);

  const orderedSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice, originalIndex) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return {
          sourceSliceId: slice.id,
          index: originalIndex,
          label: slice.name ?? '',
          startEpoch,
          endEpoch,
          burstScore: normalizeBurstScore(slice.burstScore ?? 0),
          crimeCount: 0,
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
        index,
        label: slice.label || `Slice ${index + 1}`,
      }));
  }, [slices, minTimestampSec, maxTimestampSec]);

  useEffect(() => {
    if (orderedSlices.length === 0) {
      return;
    }

    let cancelled = false;

    setCrimeFetchStatus('loading');

    (async () => {
      const results: CrimeRecord[][] = [];

      for (const slice of orderedSlices) {
        if (cancelled) return;

        const params = new URLSearchParams({
          startEpoch: Math.floor(slice.startEpoch).toString(),
          endEpoch: Math.ceil(slice.endEpoch).toString(),
          bufferDays: '0',
          pageSize: '50000',
        });

        try {
          const res = await fetch(`/api/crimes/range?${params.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const result = (await res.json()) as { data?: CrimeRecord[] };
          const crimeBatch = result.data ?? [];
          // console.debug(`[3DFetch] slice ${slice.label}: fetched ${crimeBatch.length} crimes`);
          if (crimeBatch.length > 0) {
            // console.debug(`[3DFetch]  first crime x=${crimeBatch[0]!.x.toFixed(2)} z=${crimeBatch[0]!.z.toFixed(2)}`);
          }
          results.push(crimeBatch);

          if (!cancelled) {
            setSliceCrimeCounts(
              orderedSlices.reduce((acc, s, i) => {
                acc[s.sourceSliceId] = (results[i] ?? []).length;
                return acc;
              }, {} as Record<string, number>),
            );
          }
        } catch (err) {
          if (!cancelled) {
            setCrimesError(err instanceof Error ? err.message : 'Fetch failed');
            results.push([]);
          }
        }
      }

      if (!cancelled) {
        setCrimesBySlice(results);
        setCrimesError(null);
        setCrimeFetchStatus('success');
      }
    })();

    return () => { cancelled = true; };
  }, [orderedSlices, setCrimeFetchStatus, setSliceCrimeCounts]);

  const countedSlices = useMemo(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      return orderedSlices;
    }
    return orderedSlices.map((slice, i) => ({
      ...slice,
      crimeCount: (crimesBySlice[i] ?? []).length,
    }));
  }, [crimesBySlice, orderedSlices]);

  const sliceEvents = useMemo(
    () => crimesBySlice.map((events) => events.map((event) => ({ x: event.x, z: event.z, type: event.type }))),
    [crimesBySlice],
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
      sliceResults: stkdeResponse?.sliceResults,
    });
  }, [selectedBurstWindows, stkdeResponse]);

  const fullTimeDomain = useMemo<[number, number]>(() => (
    minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec
      ? [minTimestampSec, maxTimestampSec]
      : [0, 1]
  ), [maxTimestampSec, minTimestampSec]);

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
    () => buildDemoSliceAuthoredWarpMap(slices, fullTimeDomain, Math.max(96, slices.length * 8 || 0)),
    [fullTimeDomain, slices],
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
    return countedSlices.filter((slice) => slice.endEpoch >= scopeStart && slice.startEpoch <= scopeEnd);
  }, [countedSlices, cubeScopeMode, cubeTimeDomain]);

  const cubeSliceKdes = useMemo(() => {
    if (cubeScopeMode !== 'brushed') {
      return sliceKdes;
    }

    const visibleIndexes = new Set(
      cubeSlices.map((slice) => countedSlices.findIndex((candidate) => candidate.sourceSliceId === slice.sourceSliceId)),
    );

    return sliceKdes.filter((_, index) => visibleIndexes.has(index));
  }, [countedSlices, cubeScopeMode, cubeSlices, sliceKdes]);

  const cubeVolumeProfile = useMemo(() => {
    if (cubeScopeMode !== 'brushed') return volumeProfile;

    const [domainStart, domainEnd] = cubeTimeDomain;
    const domainDuration = Math.max(1, domainEnd - domainStart);

    return cubeSlices.map((slice) => {
      const sliceDuration = Math.max(0, slice.endEpoch - slice.startEpoch);
      const percentage = sliceDuration / domainDuration;
      const thickness = Math.max(0.6, percentage * 100);
      return {
        index: slice.index,
        durationSeconds: sliceDuration,
        normalizedDuration: Math.min(1, percentage),
        thickness,
        opacity: 0.2,
        falloff: 0.15,
      };
    });
  }, [cubeSlices, cubeScopeMode, cubeTimeDomain, volumeProfile]);

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

  const sceneRuntime = useMemo(
    () => createStkde3DSceneRuntime({
      displayDomain: cubeTimeDomain,
      warpDomain: activeWarpDomain,
      timeScaleMode: effectiveTimeScaleMode,
      warpBlend: effectiveWarpBlend,
      densityMap: scopedDensityMap ?? densityMap,
      warpMap: activeWarpMap,
      isPlaying,
      isInterpolated,
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
    [activeWarpDomain, activeWarpMap, countedSlices, cubeSlices, cubeTimeDomain, densityMap, effectiveTimeScaleMode, effectiveWarpBlend, fullTimeDomain, handleCanvasPointerDown, handleCreateDraftAtPoint, isInterpolated, isPlaying, sceneYToEpoch, scopedDensityMap, setActiveSlice, setActiveSliceIndex, updateSlice],
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

  useEffect(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      return;
    }

    let cancelled = false;
    const requestId = ++kdeRequestIdRef.current;

    if (!kdeWorkerRef.current) {
      kdeWorkerRef.current = new Worker(
        new URL('../../workers/kdeSlice.worker.ts', import.meta.url),
      );
    }

    const worker = kdeWorkerRef.current;

    const handler = (event: MessageEvent) => {
      const response = event.data as { requestId: number; results: Array<{ cells: Float32Array; maxIntensity: number; meanIntensity: number; cellCount: number }> };
      if (response.requestId !== requestId) return;

      const kdes: KdeCell[][] = response.results.map((r) => {
        const cells: KdeCell[] = [];
        const flat = r.cells;
        for (let i = 0; i < r.cellCount; i++) {
          cells.push({
            x: flat[i * 4],
            z: flat[i * 4 + 1],
            intensity: flat[i * 4 + 2],
            support: flat[i * 4 + 3],
          });
        }
        return cells;
      });

      if (!cancelled) {
        setSliceKdes(kdes);
      }
    };

    worker.addEventListener('message', handler);

    worker.postMessage({
      requestId,
      sliceGroups: crimesBySlice.map((sliceCrimes) => ({
        points: sliceCrimes.map((c) => ({ x: c.x, z: c.z })),
      })),
    });

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handler);
    };
  }, [crimesBySlice, orderedSlices]);

  useEffect(() => {
    return () => {
      kdeWorkerRef.current?.terminate();
      kdeWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (countedSlices.length === 0) return;
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    } else if (activeIndex >= countedSlices.length) {
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    }
  }, [countedSlices.length, activeIndex, setActiveSliceIndex]);

  useEffect(() => {
    if (playbackTimeoutRef.current !== null) {
      window.clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }

    if (!isPlaying || isScrubbing || countedSlices.length === 0) return undefined;

    const lastIndex = countedSlices.length - 1;
    const stepDelay = Math.max(180, Math.round(1000 / Math.max(0.25, playbackSpeed)));
    const loopPauseMs = 260;
    const delay = activeIndex >= lastIndex ? loopPauseMs : stepDelay;

    playbackTimeoutRef.current = window.setTimeout(() => {
      playbackTimeoutRef.current = null;

      if (countedSlices.length === 0) return;
      if (activeIndex >= countedSlices.length - 1) {
        setActiveSliceIndex(0);
        return;
      }

      setActiveSliceIndex(activeIndex + 1);
    }, delay);

    return () => {
      if (playbackTimeoutRef.current !== null) {
        window.clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
      }
    };
  }, [activeIndex, countedSlices.length, isPlaying, isScrubbing, playbackSpeed, setActiveSliceIndex]);

  if (orderedSlices.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Apply generated slices to view 3D spatial distribution
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      {crimesError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
          <p className="text-xs text-destructive">Error: {crimesError}</p>
        </div>
      )}

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

      <Stkde3DScene
        slices={cubeSlices}
        sliceKdes={cubeSliceKdes}
        volumeProfile={cubeVolumeProfile}
        sliceEvents={sliceEvents}
        hotspotSliceResults={stkdeResponse?.sliceResults ?? null}
        activeIndex={cubeActiveIndex}
        viewMode={viewMode}
        sliceOpacity={sliceOpacity}
        timeDomain={cubeTimeDomain}
        overrideWarpMap={scopedWarpMap}
        overrideWarpDomain={cubeScopeMode === 'brushed' ? cubeTimeDomain : undefined}
        burstVolumeModel={burstVolumeModel}
        runtime={sceneRuntime}
      />
    </div>
  );
}

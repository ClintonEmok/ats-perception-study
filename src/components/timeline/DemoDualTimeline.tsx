"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { bin, max } from 'd3-array';
import { useMeasure } from '@/hooks/useMeasure';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { CrimeOverviewBin } from '@/types/crime';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import {
  select,
  selectActiveSliceId,
  selectActiveSliceUpdatedAt,
  selectSlices,
  useSliceDomainStore,
} from '@/store/useSliceDomainStore';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import type { DemoDetailPeriodSelection } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { resolvePointByIndex } from '@/lib/selection';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { buildDemoSliceAuthoredWarpMap } from '@/components/dashboard-demo/lib/demo-warp-map';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { sampleTimelinePoints, selectTimelinePointsInRange } from '@/lib/timeline-series';
import {
  computeDensityMap,
  useDensityStripDerivation,
  DETAIL_DENSITY_RECOMPUTE_MAX_DAYS,
} from './hooks/useDensityStripDerivation';
import { useScaleTransforms } from './hooks/useScaleTransforms';
import { useBrushZoomSync } from './hooks/useBrushZoomSync';
import { usePointSelection } from './hooks/usePointSelection';
import { normalizeTimeRange, timeRangeOverlapsDomain } from '@/lib/time-range';
import { resolveAdaptiveDetailBinCount } from '@/components/timeline/lib/detail-bin-count';
import {
  clampToRange,
  computeRangeUpdate,
  resolveSelectionX,
} from './lib/interaction-guards';
import { type TickLabelStrategy } from './lib/tick-ux';
import { DualTimelineSurface, type SurfaceBurstWindow } from '@/components/timeline/DualTimelineSurface';
import { useDualTimelineViewModel } from './hooks/useDualTimelineViewModel';
import { classifyBurstWindow } from '@/lib/binning/burst-taxonomy';
import { useDemoBurstWindows } from '@/components/dashboard-demo/lib/useDemoBurstWindows';
import { dashboardWarpFactorToBlend } from '@/components/dashboard-demo/lib/warp-contract';

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const clamp = clampToRange;

/**
 * Resolves a slice's canonical epoch range using the same precedence as the
 * cube's scene slices: explicit start/end timestamps first, then the
 * normalized `range`, then the point time.
 */
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

interface ApplyRangeToStoresContractParams {
  interactive: boolean;
  startSec: number;
  endSec: number;
  domainStart: number;
  domainEnd: number;
  currentTime: number;
  setTimeRange: (range: [number, number]) => void;
  setRange: (range: [number, number]) => void;
  setBrushRange: (range: [number, number] | null) => void;
  setTime: (time: number) => void;
}

export const applyRangeToStoresContract = ({
  interactive,
  startSec,
  endSec,
  domainStart,
  domainEnd,
  currentTime,
  setTimeRange,
  setRange,
  setBrushRange,
  setTime,
}: ApplyRangeToStoresContractParams): void => {
  if (!interactive) {
    return;
  }

  const {
    safeStartSec: safeStart,
    safeEndSec: safeEnd,
    normalizedRange: nextRange,
  } = computeRangeUpdate(startSec, endSec, domainStart, domainEnd);

  setTimeRange([safeStart, safeEnd]);
  setRange(nextRange);
  setBrushRange(nextRange);

  const clampedCurrentTime = clamp(currentTime, nextRange[0], nextRange[1]);
  if (clampedCurrentTime !== currentTime) {
    setTime(clampedCurrentTime);
  }
};

interface TimelineSliceGeometry {
  id: string;
  left: number;
  width: number;
  rawLeft: number;
  rawWidth: number;
  isActive: boolean;
  isBurst: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  color: string | undefined;
  warpEnabled: boolean;
  warpWeight: number;
}

interface DemoDualTimelineProps {
  domainOverride?: [number, number];
  detailRangeOverride?: [number, number];
  interactive?: boolean;
  timestampSecondsOverride?: number[];
  detailPointsOverride?: number[];
  detailRenderMode?: 'auto' | 'points' | 'bins';
  detailBinCount?: number;
  tickLabelStrategy?: TickLabelStrategy;
}

export const DemoDualTimeline: React.FC<DemoDualTimelineProps> = ({
  domainOverride,
  detailRangeOverride,
  interactive = true,
  timestampSecondsOverride,
  detailPointsOverride,
  detailRenderMode = 'auto',
  detailBinCount,
  tickLabelStrategy = 'legacy',
}) => {
  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const overviewBinsFromStore = useTimelineDataStore((state) => state.overviewBins);
  const overviewTimestampSec = useTimelineDataStore((state) => state.overviewTimestampSec);
  const isDataLoading = useTimelineDataStore((state) => state.isLoading);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useStore(useDashboardDemoFilterStore, (state) => state.selectedTimeRange);
  const setTimeRange = useStore(useDashboardDemoFilterStore, (state) => state.setTimeRange);
  const currentTime = useStore(useDashboardDemoTimeStore, (state) => state.currentTime);
  const setTime = useStore(useDashboardDemoTimeStore, (state) => state.setTime);
  const setRange = useStore(useDashboardDemoTimeStore, (state) => state.setRange);
  const timeResolution = useStore(useDashboardDemoTimeStore, (state) => state.timeResolution);
  const selectedIndex = useStore(useDashboardDemoCoordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(useDashboardDemoCoordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(useDashboardDemoCoordinationStore, (state) => state.clearSelection);
  const setBrushRange = useStore(useDashboardDemoCoordinationStore, (state) => state.setBrushRange);
  const selectedBurstWindows = useStore(useDashboardDemoCoordinationStore, (state) => state.selectedBurstWindows);
  const setSelectedBurstWindow = useStore(useDashboardDemoCoordinationStore, (state) => state.toggleBurstWindow);
  const selectedDetailPeriod = useStore(useDashboardDemoCoordinationStore, (state) => state.selectedDetailPeriod);
  const setSelectedDetailPeriod = useStore(useDashboardDemoCoordinationStore, (state) => state.setSelectedDetailPeriod);
  const setDetailsOpen = useStore(useDashboardDemoCoordinationStore, (state) => state.setDetailsOpen);
  const timeScaleMode = useStore(useDashboardDemoCoordinationStore, (state) => state.timeScaleMode);
  const warpSource = useStore(useDashboardDemoCoordinationStore, (state) => state.warpSource);
  const warpFactor = useStore(useDashboardDemoCoordinationStore, (state) => state.warpFactor);
  const warpExaggeration = useStore(useDashboardDemoCoordinationStore, (state) => state.warpExaggeration);
  const densityMap = useStore(useDashboardDemoCoordinationStore, (state) => state.densityMap);
  const precomputedWarpMap = useStore(useDashboardDemoCoordinationStore, (state) => state.warpMap);
  const precomputedMapDomain = useStore(useDashboardDemoCoordinationStore, (state) => state.mapDomain);
  const isComputing = useStore(useDashboardDemoCoordinationStore, (state) => state.isComputing);
  const setPrecomputedMaps = useStore(useDashboardDemoCoordinationStore, (state) => state.setPrecomputedMaps);
  const setIsComputing = useStore(useDashboardDemoCoordinationStore, (state) => state.setIsComputing);
  const slices = useStore(useSliceDomainStore, selectSlices);
  const activeSliceId = useStore(useSliceDomainStore, selectActiveSliceId);
  const activeSliceUpdatedAt = useStore(useSliceDomainStore, selectActiveSliceUpdatedAt);
  const setActiveSlice = useStore(useSliceDomainStore, (state) => state.setActiveSlice);
  const setActiveSliceIndex = useStore(useDashboardDemoCoordinationStore, (state) => state.setActiveSliceIndex);
  const getSliceOverlapCounts = useStore(useSliceDomainStore, select((state) => state.getOverlapCounts));
  const pendingGeneratedBins = useStore(useDashboardDemoTimeslicingModeStore, (state) => state.pendingGeneratedBins);

  const warpDomain = useMemo<[number, number]>(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [maxTimestampSec, minTimestampSec]);

  const authoredWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, densityMap, warpDomain, Math.max(96, slices.length * 8 || 0), warpDomain, warpExaggeration),
    [densityMap, slices, warpDomain, warpExaggeration]
  );

  // Get viewport store for brush/zoom sync
  const setViewport = useViewportStore((state) => state.setViewport);

  // NOTE: Viewport stays at initial default (2001-2002) until user zooms/brushes
  // This keeps the initial load bounded while the shared timeline store initializes.

  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const overviewSvgRef = useRef<SVGSVGElement | null>(null);
  const detailSvgRef = useRef<SVGSVGElement | null>(null);
  const brushRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<SVGRectElement | null>(null);
  const isSyncingRef = useRef(false);
  const isScrubbingRef = useRef(false);

  const width = Math.max(0, bounds.width ?? 0);
  const overviewInnerWidth = Math.max(0, width - OVERVIEW_MARGIN.left - OVERVIEW_MARGIN.right);
  const detailInnerWidth = Math.max(0, width - DETAIL_MARGIN.left - DETAIL_MARGIN.right);

  // Full data range for timeline scale
  const [domainStart, domainEnd] = useMemo<[number, number]>(() => {
    if (domainOverride && Number.isFinite(domainOverride[0]) && Number.isFinite(domainOverride[1])) {
      const start = Math.min(domainOverride[0], domainOverride[1]);
      const end = Math.max(domainOverride[0], domainOverride[1]);
      if (end > start) {
        return [start, end];
      }
    }
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [domainOverride, minTimestampSec, maxTimestampSec]);
  // Active window range: override > selectedTimeRange > full dataset domain
  const detailRangeSec = useMemo<[number, number]>(() => {
    if (detailRangeOverride && Number.isFinite(detailRangeOverride[0]) && Number.isFinite(detailRangeOverride[1])) {
      const start = Math.min(detailRangeOverride[0], detailRangeOverride[1]);
      const end = Math.max(detailRangeOverride[0], detailRangeOverride[1]);
      if (end > start) {
        return [start, end];
      }
    }
    const normalizedSelectedTimeRange = normalizeTimeRange(selectedTimeRange);
    if (normalizedSelectedTimeRange && timeRangeOverlapsDomain(normalizedSelectedTimeRange, domainStart, domainEnd)) {
      return normalizedSelectedTimeRange;
    }
    return [domainStart, domainEnd];
  }, [detailRangeOverride, selectedTimeRange, domainStart, domainEnd]);

  const timestampSeconds = useMemo<number[]>(() => {
    if (columns && columns.length > 0) {
      return Array.from(columns.timestampSec);
    }
    if (data && data.length > 0) {
      return data.map((point) => point.timestamp as number);
    }
    if (overviewTimestampSec.length > 0) {
      return overviewTimestampSec;
    }
    return [];
  }, [columns, data, overviewTimestampSec]);

  const overviewSeries = useMemo<number[]>(() => {
    if (overviewBinsFromStore.length > 0) {
      return overviewBinsFromStore.map((bucket) => {
        const midpoint = Math.round(((bucket.x0 ?? 0) + (bucket.x1 ?? 0)) / 2);
        return midpoint;
      });
    }
    if (overviewTimestampSec.length > 0) {
      return overviewTimestampSec;
    }
    if (timestampSeconds.length > 0) {
      return sampleTimelinePoints(timestampSeconds);
    }
    return [];
  }, [overviewBinsFromStore, overviewTimestampSec, timestampSeconds]);

  const nextDensityMap = useMemo(() => {
    if (!timestampSeconds.length || warpDomain[1] <= warpDomain[0]) {
      return null;
    }

    return computeDensityMap(timestampSeconds, warpDomain, ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH);
  }, [timestampSeconds, warpDomain]);

  const nextDensityWarpMap = useMemo(
    () => buildDensityWarpMap(nextDensityMap, warpDomain, warpExaggeration),
    [nextDensityMap, warpDomain, warpExaggeration]
  );

  useEffect(() => {
    setIsComputing(true);
    setPrecomputedMaps(nextDensityMap, nextDensityWarpMap, warpDomain);
  }, [nextDensityMap, nextDensityWarpMap, setIsComputing, setPrecomputedMaps, warpDomain]);

  const overviewBins = useMemo<CrimeOverviewBin[]>(() => {
    if (overviewBinsFromStore.length > 0) {
      return overviewBinsFromStore;
    }
    const values = timestampSecondsOverride ?? overviewSeries;
    if (!values.length) return [];
    const binner = bin<number, number>()
      .value((d) => d)
      .domain([domainStart, domainEnd])
      .thresholds(50);
    return binner(values).map((bucket) => ({
      x0: bucket.x0 ?? domainStart,
      x1: bucket.x1 ?? domainEnd,
      length: bucket.length,
    }));
  }, [overviewBinsFromStore, timestampSecondsOverride, overviewSeries, domainStart, domainEnd]);

  const overviewMax = useMemo(
    () => Number(max(overviewBins as CrimeOverviewBin[], (d) => d.length)) || 1,
    [overviewBins]
  );

  const detailPoints = useMemo(() => {
    if (detailPointsOverride) {
      return detailPointsOverride;
    }
    const detailSource = timestampSeconds.length > 0 ? timestampSeconds : overviewSeries;
    if (!detailSource.length) return [];
    return selectTimelinePointsInRange(detailSource, detailRangeSec);
  }, [detailPointsOverride, timestampSeconds, overviewSeries, detailRangeSec]);

  const { detailSpanDays, detailDensityMap } = useDensityStripDerivation({
    detailPoints,
    detailRangeSec,
    densityMap,
    domainStart,
    domainEnd,
  });

  const authoredScopedWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, detailDensityMap, warpDomain, Math.max(96, slices.length * 8 || 0), detailRangeSec, warpExaggeration),
    [detailDensityMap, detailRangeSec, slices, warpDomain, warpExaggeration],
  );

  const scopedDensityWarpMap = useMemo(
    () => detailDensityMap && detailRangeSec[1] > detailRangeSec[0]
      ? buildDensityWarpMap(detailDensityMap, detailRangeSec, warpExaggeration)
      : null,
    [detailDensityMap, detailRangeSec, warpExaggeration],
  );

  const usingDensitySource = warpSource === 'density';
  const effectiveWarpMap = usingDensitySource
    ? (scopedDensityWarpMap ?? precomputedWarpMap)
    : (authoredScopedWarpMap ?? authoredWarpMap);
  const effectiveWarpDomain = usingDensitySource
    ? (scopedDensityWarpMap ? detailRangeSec : precomputedMapDomain)
    : (authoredScopedWarpMap ? detailRangeSec : warpDomain);
  const effectiveWarpBlend = useMemo(() => dashboardWarpFactorToBlend(warpFactor), [warpFactor]);
  const effectiveTimeScaleMode = timeScaleMode;

  const resolvedDetailRenderMode = useMemo(() => {
    if (detailRenderMode === 'auto') {
      return detailSpanDays > DETAIL_DENSITY_RECOMPUTE_MAX_DAYS ? 'bins' : 'points';
    }
    return detailRenderMode;
  }, [detailRenderMode, detailSpanDays]);

  const effectiveDetailBinCount = useMemo(
    () => resolveAdaptiveDetailBinCount(detailRangeSec[1] - detailRangeSec[0], detailBinCount),
    [detailBinCount, detailRangeSec]
  );

  const detailBins = useMemo(() => {
    if (resolvedDetailRenderMode !== 'bins') return [];
    if (!detailPoints.length) return [];
    const binner = bin<number, number>()
      .value((d) => d)
      .domain([detailRangeSec[0] + 0.001, detailRangeSec[1] - 0.001])
      .thresholds(effectiveDetailBinCount);
    return binner(detailPoints);
  }, [detailPoints, detailRangeSec, effectiveDetailBinCount, resolvedDetailRenderMode]);

  const detailMax = useMemo(
    () => (detailBins.length ? max(detailBins, (d) => d.length) || 1 : 1),
    [detailBins]
  );

  const { detailInteractionScale } = useScaleTransforms({
    domainStart,
    domainEnd,
    detailRangeSec,
    overviewInnerWidth,
    detailInnerWidth,
    timeScaleMode: effectiveTimeScaleMode,
    warpFactor: effectiveWarpBlend,
    warpMap: effectiveWarpMap,
    warpDomain: effectiveWarpDomain,
  });

  const {
    overviewInteractionScale,
    overviewScale,
    detailScale,
    overviewTicks,
    detailTicks,
    overviewTickFormat,
    detailTickFormat,
  } = useDualTimelineViewModel({
    domainStart,
    domainEnd,
    detailRangeSec,
    overviewInnerWidth,
    detailInnerWidth,
    timeScaleMode: effectiveTimeScaleMode,
    warpFactor: effectiveWarpBlend,
    warpMap: effectiveWarpMap,
    warpDomain: effectiveWarpDomain,
    tickLabelStrategy,
    timeResolution,
  });

  const applyRangeToStores = useCallback(
    (startSec: number, endSec: number) => {
      applyRangeToStoresContract({
        interactive,
        startSec,
        endSec,
        domainStart,
        domainEnd,
        currentTime,
      setTimeRange,
      setRange,
      setBrushRange,
      setTime,
    });
  },
    [currentTime, domainEnd, domainStart, interactive, setRange, setTime, setTimeRange, setBrushRange]
  );

  useEffect(() => {
    if (!interactive) return;
    const normalizedSelectedTimeRange = normalizeTimeRange(selectedTimeRange);
    if (!normalizedSelectedTimeRange) return;
    if (!timeRangeOverlapsDomain(normalizedSelectedTimeRange, domainStart, domainEnd)) {
      isSyncingRef.current = true;
      applyRangeToStores(domainStart, domainEnd);
      isSyncingRef.current = false;
    }
  }, [applyRangeToStores, domainEnd, domainStart, interactive, selectedTimeRange]);

  useBrushZoomSync({
    interactive,
    detailInnerWidth,
    domainStart,
    domainEnd,
    selectedTimeRange,
    overviewInnerWidth,
    overviewInteractionScale,
    isSyncingRef,
    brushRef,
    overviewSvgRef,
    detailSvgRef,
    zoomRef,
    setViewport,
    setBrushRange,
    applyRangeToStores,
  });

  const {
    hoveredDetail,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
  } = usePointSelection({
    interactive,
    detailInnerWidth,
    detailScale,
    detailRangeSec,
    domainStart,
    domainEnd,
    minTimestampSec,
    maxTimestampSec,
    resolvedDetailRenderMode,
    isScrubbingRef,
    setTime,
    setSelectedIndex,
    clearSelection,
  });

  const cursorEpochSeconds = useMemo(() => {
    if (!Number.isFinite(currentTime) || !Number.isFinite(domainStart) || !Number.isFinite(domainEnd)) {
      return null;
    }
    return normalizedToEpochSeconds(clamp(currentTime, 0, 100), domainStart, domainEnd);
  }, [currentTime, domainStart, domainEnd]);

  const cursorX = useMemo(() => {
    return resolveSelectionX(cursorEpochSeconds, (date) => detailScale(date), detailInnerWidth);
  }, [cursorEpochSeconds, detailInnerWidth, detailScale]);

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex]);

  const selectionX = useMemo(() => {
    return resolveSelectionX(selectionPoint?.timestampSec, (date) => detailScale(date), detailInnerWidth);
  }, [detailInnerWidth, detailScale, selectionPoint]);

  const burstWindows = useDemoBurstWindows();
  const burstWindowsWithTaxonomy = useMemo(() => {
    return burstWindows.map((window, index, windows) => {
      const taxonomy = classifyBurstWindow({
        value: window.peak,
        count: window.count,
        durationSec: window.duration,
        neighborhood: [windows[index - 1], windows[index + 1]]
          .filter((neighbor): neighbor is typeof window => neighbor !== undefined)
          .map((neighbor) => ({ value: neighbor.peak, count: neighbor.count, durationSec: neighbor.duration })),
      });

      return {
        ...window,
        metric: 'density' as const,
        burstClass: taxonomy.burstClass,
        burstConfidence: taxonomy.burstConfidence,
        burstScore: taxonomy.burstScore,
        burstRationale: taxonomy.rationale,
        burstRuleVersion: taxonomy.burstRuleVersion,
        burstProvenance: taxonomy.burstProvenance,
        tieBreakReason: taxonomy.tieBreakReason,
        thresholdSource: taxonomy.thresholdSource,
        neighborhoodSummary: taxonomy.neighborhoodSummary,
      };
    });
  }, [burstWindows]);

  const activeBurstWindowId = selectedBurstWindows[0]?.id ?? null;

  const handleBurstWindowClick = useCallback(
    (window: SurfaceBurstWindow) => {
      setSelectedBurstWindow({ ...window, metric: window.metric ?? 'density' });
      setDetailsOpen(true);
    },
    [setDetailsOpen, setSelectedBurstWindow]
  );

  const handleDetailPeriodClick = useCallback(
    (period: DemoDetailPeriodSelection) => {
      setSelectedDetailPeriod(period);
    },
    [setSelectedDetailPeriod]
  );

  // Canonical visible, range-slice ordering used by the cube (chronological
  // start/end with stable id tie-breaking). The coordination index for a
  // clicked slice must resolve against this ordering — NOT the visual
  // `orderedSliceGeometries`, which are re-sorted for stacking.
  const canonicalRangeSliceIds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return [] as string[];
    }

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return { id: slice.id, startEpoch, endEpoch };
      })
      .sort((left, right) => {
        const startDelta = left.startEpoch - right.startEpoch;
        if (startDelta !== 0) return startDelta;
        const endDelta = left.endEpoch - right.endEpoch;
        if (endDelta !== 0) return endDelta;
        return left.id.localeCompare(right.id);
      })
      .map((slice) => slice.id);
  }, [maxTimestampSec, minTimestampSec, slices]);

  const handleSliceClick = useCallback(
    (sliceId: string) => {
      const slice = slices.find((candidate) => candidate.id === sliceId);
      if (!slice) return;
      setActiveSlice(sliceId);
      if (slice.type === 'range') {
        const coordinationIndex = canonicalRangeSliceIds.indexOf(sliceId);
        setActiveSliceIndex(coordinationIndex >= 0 ? coordinationIndex : -1);
      } else {
        // Point slices are not cube-compatible — clear the cube index
        // instead of assigning an unrelated cube slice.
        setActiveSliceIndex(-1);
      }
    },
    [canonicalRangeSliceIds, setActiveSlice, setActiveSliceIndex, slices]
  );


  const stripSelection = useMemo(() => {
    if (!overviewInnerWidth) return null;
    if (!Number.isFinite(detailRangeSec[0]) || !Number.isFinite(detailRangeSec[1])) {
      return null;
    }
    const x0 = overviewScale(new Date(detailRangeSec[0] * 1000));
    const x1 = overviewScale(new Date(detailRangeSec[1] * 1000));
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
      return null;
    }
    const left = Math.min(x0, x1);
    const widthSpan = Math.max(2, Math.abs(x1 - x0));
    if (!Number.isFinite(left) || !Number.isFinite(widthSpan)) {
      return null;
    }
    return { left, width: widthSpan };
  }, [detailRangeSec, overviewInnerWidth, overviewScale]);

  const overviewSliceBoxes = useMemo(
    () => {
      const boxes = slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          const [normalizedStart, normalizedEnd] =
            slice.type === 'range' && slice.range
              ? [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])]
              : [Math.max(0, slice.time - 1.5), Math.min(100, slice.time + 1.5)];

          const startSec = normalizedToEpochSeconds(normalizedStart, domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(normalizedEnd, domainStart, domainEnd);

          return {
            id: slice.id,
            startSec: Math.min(startSec, endSec),
            endSec: Math.max(startSec, endSec),
            color: slice.color,
            isActive: activeSliceId === slice.id,
            warpEnabled: slice.warpEnabled ?? true,
            warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec);
      // console.log('[Timeline] overviewSliceBoxes:', boxes.length, 'domainStart:', domainStart, 'domainEnd:', domainEnd);
      return boxes;
    },
    [activeSliceId, domainEnd, domainStart, slices]
  );

  const sliceOverlapCounts = getSliceOverlapCounts();

  const sliceGeometries = useMemo<TimelineSliceGeometry[]>(() => {
    if (!slices.length || detailInnerWidth <= 0) {
      return [];
    }

    const spanSec = Math.max(1, domainEnd - domainStart);
    const toX = (normalized: number): number | null => {
      if (!Number.isFinite(normalized)) {
        return null;
      }
      const clampedNorm = clamp(normalized, 0, 100);
      const sec = domainStart + (clampedNorm / 100) * spanSec;
      if (!Number.isFinite(sec)) {
        return null;
      }
      const x = detailScale(new Date(sec * 1000));
      return Number.isFinite(x) ? x : null;
    };

    const toRawX = (normalized: number): number | null => {
      if (!Number.isFinite(normalized)) {
        return null;
      }
      const clampedNorm = clamp(normalized, 0, 100);
      const sec = domainStart + (clampedNorm / 100) * spanSec;
      if (!Number.isFinite(sec)) {
        return null;
      }
      const x = detailInteractionScale(new Date(sec * 1000));
      return Number.isFinite(x) ? x : null;
    };

    const geometries = slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          if (!Number.isFinite(slice.range[0]) || !Number.isFinite(slice.range[1])) {
            return null;
          }
          const startX = toX(Math.min(slice.range[0], slice.range[1]));
          const endX = toX(Math.max(slice.range[0], slice.range[1]));
          const rawStartX = toRawX(Math.min(slice.range[0], slice.range[1]));
          const rawEndX = toRawX(Math.max(slice.range[0], slice.range[1]));
          if (startX === null || endX === null || rawStartX === null || rawEndX === null) {
            return null;
          }
          const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
          const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
          const rawLeft = Math.max(0, Math.min(detailInnerWidth, Math.min(rawStartX, rawEndX)));
          const rawRight = Math.max(0, Math.min(detailInnerWidth, Math.max(rawStartX, rawEndX)));
          if (right <= 0 || left >= detailInnerWidth) {
            return null;
          }

          return {
            id: slice.id,
            left,
            width: Math.max(2, right - left),
            rawLeft,
            rawWidth: Math.max(2, rawRight - rawLeft),
            isActive: activeSliceId === slice.id,
            isBurst: !!slice.isBurst,
            isSuggestion: (slice as { source?: string }).source === 'suggestion',
            isGeneratedDraft: false,
            isGeneratedApplied: slice.source === 'generated-applied',
            overlapCount: sliceOverlapCounts[slice.id] ?? 1,
            color: slice.color,
            warpEnabled: slice.warpEnabled ?? true,
            warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
          };
        }

        if (!Number.isFinite(slice.time)) {
          return null;
        }
        const x = toX(slice.time);
        const rawX = toRawX(slice.time);
        if (x === null || rawX === null || x < 0 || x > detailInnerWidth) {
          return null;
        }

        return {
          id: slice.id,
          left: Math.max(0, Math.min(detailInnerWidth, x - 1)),
          width: 2,
          rawLeft: Math.max(0, Math.min(detailInnerWidth, rawX - 1)),
          rawWidth: 2,
          isActive: activeSliceId === slice.id,
          isBurst: !!slice.isBurst,
          isSuggestion: (slice as { source?: string }).source === 'suggestion',
          isGeneratedDraft: false,
          isGeneratedApplied: slice.source === 'generated-applied',
          overlapCount: 1,
          color: slice.color,
          warpEnabled: slice.warpEnabled ?? true,
          warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);

    return geometries;
  }, [activeSliceId, detailInnerWidth, detailInteractionScale, detailScale, domainEnd, domainStart, sliceOverlapCounts, slices]);

  // console.log('[Timeline] sliceGeometries:', sliceGeometries.length, 'sliceGeometries:', sliceGeometries.map(g => ({ id: g.id?.slice(0, 8), left: g.left, width: g.width, source: g.isGeneratedApplied ? 'applied' : g.isGeneratedDraft ? 'draft' : 'other' })));

  const maxSliceOverlap = useMemo(
    () =>
      sliceGeometries.reduce((maxOverlap, geometry) => Math.max(maxOverlap, geometry.overlapCount), 1),
    [sliceGeometries]
  );

  const orderedSliceGeometries = useMemo(() => {
    const stackWeight = (geometry: TimelineSliceGeometry) => {
      let weight = 0;
      if (geometry.overlapCount >= 2) {
        weight += 1;
      }
      if (geometry.isBurst) {
        weight += 1;
      }
      if (geometry.isActive) {
        weight += 3;
      }
      return weight;
    };

    return [...sliceGeometries].sort((a, b) => stackWeight(a) - stackWeight(b));
  }, [sliceGeometries]);

  const pendingGeneratedGeometries = useMemo<TimelineSliceGeometry[]>(() => {
    if (!pendingGeneratedBins.length || detailInnerWidth <= 0) {
      return [];
    }

    return pendingGeneratedBins
      .map<TimelineSliceGeometry | null>((bin) => {
        const startX = detailScale(new Date(bin.startTime));
        const endX = detailScale(new Date(bin.endTime));
        if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
          return null;
        }

        const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
        const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
        if (right <= 0 || left >= detailInnerWidth || right <= left) {
          return null;
        }

        return {
          id: `pending-${bin.id}`,
          left,
          width: Math.max(2, right - left),
          rawLeft: left,
          rawWidth: Math.max(2, right - left),
          isActive: false,
          isBurst: false,
          isSuggestion: false,
          isGeneratedDraft: true,
          isGeneratedApplied: false,
          overlapCount: 1,
          burstClass: bin.burstClass,
          isNeutralPartition: bin.isNeutralPartition,
          color: 'purple',
          warpEnabled: true,
          warpWeight: 1,
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);
  }, [detailInnerWidth, detailScale, pendingGeneratedBins]);

  // console.log('[Timeline] pendingGeneratedGeometries:', pendingGeneratedGeometries.length, 'pendingGeneratedBins:', pendingGeneratedBins.length);


  const isTimelineLoading = isDataLoading;
  const isDetailEmpty = !isTimelineLoading && detailPoints.length === 0;
  const surfaceProps = {
    containerRef,
    isTimelineLoading,
    width,
    overviewInnerWidth,
    detailInnerWidth,
    isComputing,
    densityMap,
    showAdaptiveDensityStrip: effectiveTimeScaleMode === 'adaptive',
    overviewInteractionScale,
    overviewScale,
    detailScale,
    overviewSvgRef,
    detailSvgRef,
    overviewBins,
    overviewMax,
    stripSelection,
    userWarpOverlayBands: overviewSliceBoxes.map((slice) => ({
      id: slice.id,
      startSec: slice.startSec,
      endSec: slice.endSec,
      isDebugPreview: !slice.warpEnabled,
    })),
    timeScaleMode: effectiveTimeScaleMode,
    brushRef,
    overviewTicks,
    overviewTickFormat,
    burstWindows: burstWindowsWithTaxonomy,
    activeBurstWindowId,
    onBurstWindowClick: handleBurstWindowClick,
    detailDensityMap,
    detailMax,
    resolvedDetailRenderMode,
    detailPoints,
    detailBins,
    selectedDetailPeriodId: selectedDetailPeriod?.id ?? null,
    onDetailPeriodClick: handleDetailPeriodClick,
    onSliceClick: handleSliceClick,
    orderedSliceGeometries,
    activeSliceUpdatedAt,
    pendingGeneratedGeometries,
    maxSliceOverlap,
    cursorX,
    selectionX,
    zoomRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
    detailTicks,
    detailTickFormat,
    hoveredDetail,
    isDetailEmpty,
  };

  return <DualTimelineSurface {...surfaceProps} />;
};

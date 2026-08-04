"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { bin, max } from 'd3-array';
import { useMeasure } from '@/hooks/useMeasure';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { CrimeOverviewBin } from '@/types/crime';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import {
  select,
  selectActiveSliceId,
  selectActiveSliceUpdatedAt,
  selectSlices,
  useSliceDomainStore,
} from '@/store/useSliceDomainStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { resolvePointByIndex } from '@/lib/selection';
import { useBurstWindows } from '@/components/viz/BurstList';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useAutoBurstSlices } from '@/store/useSliceStore';
import { DualTimelineSurface } from '@/components/timeline/DualTimelineSurface';
import { buildDensityWarpMap } from '@/lib/adaptive-warp-utils';
import { classifyBurstWindow } from '@/lib/binning/burst-taxonomy';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useDensityStripDerivation, DETAIL_DENSITY_RECOMPUTE_MAX_DAYS } from './hooks/useDensityStripDerivation';
import { useBrushZoomSync } from './hooks/useBrushZoomSync';
import { usePointSelection } from './hooks/usePointSelection';
import { normalizeTimeRange, timeRangeOverlapsDomain } from '@/lib/time-range';
import { sampleTimelinePoints, selectTimelinePointsInRange } from '@/lib/timeline-series';
import { resolveAdaptiveDetailBinCount } from '@/components/timeline/lib/detail-bin-count';
import {
  clampToRange,
  computeRangeUpdate,
  resolveSelectionX,
} from './lib/interaction-guards';
import { type TickLabelStrategy } from './lib/tick-ux';
import { useDualTimelineViewModel } from './hooks/useDualTimelineViewModel';

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };
const DEBUG_PREVIEW_WARP_PROFILE_ID = '__debug-full-auto-preview__';

const clamp = clampToRange;

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
  isActive: boolean;
  isBurst: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  color: string | undefined;
}

interface DualTimelineProps {
  adaptiveWarpMapOverride?: Float32Array | null;
  adaptiveWarpDomainOverride?: [number, number];
  warpFactorOverride?: number;
  timeScaleModeOverride?: 'linear' | 'adaptive';
  timeStoreOverride?: unknown;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  sliceDomainStoreOverride?: unknown;
  timeslicingModeStoreOverride?: unknown;
  warpOverlayBandsOverride?: Array<{
    id: string;
    startSec: number;
    endSec: number;
    isDebugPreview: boolean;
  }>;
  domainOverride?: [number, number];
  detailRangeOverride?: [number, number];
  interactive?: boolean;
  timestampSecondsOverride?: number[];
  detailPointsOverride?: number[];
  detailRenderMode?: 'auto' | 'points' | 'bins';
  detailBinCount?: number;
  disableAutoBurstSlices?: boolean;
  tickLabelStrategy?: TickLabelStrategy;
}

export const DualTimeline: React.FC<DualTimelineProps> = ({
  adaptiveWarpMapOverride,
  adaptiveWarpDomainOverride,
  warpFactorOverride,
  timeScaleModeOverride,
  timeStoreOverride,
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  sliceDomainStoreOverride,
  timeslicingModeStoreOverride,
  warpOverlayBandsOverride,
  domainOverride,
  detailRangeOverride,
  interactive = true,
  timestampSecondsOverride,
  detailPointsOverride,
  detailRenderMode = 'auto',
  detailBinCount,
  disableAutoBurstSlices = false,
  tickLabelStrategy = 'legacy',
}) => {
  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const overviewBinsFromStore = useTimelineDataStore((state) => state.overviewBins);
  const overviewTimestampSec = useTimelineDataStore((state) => state.overviewTimestampSec);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const sliceDomainStore = (sliceDomainStoreOverride ?? useSliceDomainStore) as typeof useSliceDomainStore;
  const timeslicingModeStore = (timeslicingModeStoreOverride ?? useTimeslicingModeStore) as typeof useTimeslicingModeStore;

  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const setTimeRange = useStore(filterStore, (state) => state.setTimeRange);
  const currentTime = useStore(timeStore, (state) => state.currentTime);
  const setTime = useStore(timeStore, (state) => state.setTime);
  const setRange = useStore(timeStore, (state) => state.setRange);
  const timeResolution = useStore(timeStore, (state) => state.timeResolution);
  const timeScaleMode = useStore(timeStore, (state) => state.timeScaleMode);
  const selectedIndex = useStore(coordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(coordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(coordinationStore, (state) => state.clearSelection);
  const setBrushRange = useStore(coordinationStore, (state) => state.setBrushRange);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpMap = useStore(adaptiveStore, (state) => state.warpMap);
  const mapDomain = useStore(adaptiveStore, (state) => state.mapDomain);
  const densityMap = useStore(adaptiveStore, (state) => state.densityMap);
  const isComputing = useStore(adaptiveStore, (state) => state.isComputing);
  const slices = useStore(sliceDomainStore, selectSlices);
  const activeSliceId = useStore(sliceDomainStore, selectActiveSliceId);
  const activeSliceUpdatedAt = useStore(sliceDomainStore, selectActiveSliceUpdatedAt);
  const getSliceOverlapCounts = useStore(sliceDomainStore, select((state) => state.getOverlapCounts));
  const pendingGeneratedBins = useStore(timeslicingModeStore, (state) => state.pendingGeneratedBins);
  const warpSlices = useStore(useWarpSliceStore, (state) => state.slices);
  const effectiveWarpMap = adaptiveWarpMapOverride !== undefined ? adaptiveWarpMapOverride : warpMap;
  const effectiveWarpDomain = adaptiveWarpDomainOverride ?? mapDomain;
  const effectiveWarpFactor = warpFactorOverride ?? warpFactor;
  const effectiveTimeScaleMode = timeScaleModeOverride ?? timeScaleMode;

  // Get viewport-based crime data
  const { data: viewportCrimes, isLoading: isViewportLoading } = useViewportCrimeData({
    bufferDays: 30,
  });

  // Get viewport store for brush/zoom sync
  const setViewport = useViewportStore((state) => state.setViewport);
  
  // NOTE: Viewport stays at initial default (2001-2002) until user zooms/brushes
  // This enables fast initial load - only fetching first year of data
  // The useViewportCrimeData hook fetches data for the current viewport range

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
  
  // Use viewport crime data when available, fallback to computed timestampSeconds
  const detailPoints = useMemo(() => {
    if (detailPointsOverride) {
      return detailPointsOverride;
    }
    // If we have viewport crime data, use it directly
    if (viewportCrimes && viewportCrimes.length > 0) {
      const [start, end] = detailRangeSec;
      const points = viewportCrimes.map((crime) => crime.timestamp);
      return selectTimelinePointsInRange(points, [start, end]);
    }
    
    // Fallback to computed timestampSeconds
    const detailSource = timestampSeconds.length > 0 ? timestampSeconds : overviewSeries;
    if (!detailSource.length) return [];
    return selectTimelinePointsInRange(detailSource, detailRangeSec);
  }, [detailPointsOverride, viewportCrimes, timestampSeconds, overviewSeries, detailRangeSec]);

  const { detailSpanDays, detailDensityMap } = useDensityStripDerivation({
    detailPoints,
    detailRangeSec,
    densityMap,
    domainStart,
    domainEnd,
  });

  const scopedDensityWarpMap = useMemo(
    () => detailDensityMap && detailRangeSec[1] > detailRangeSec[0]
      ? buildDensityWarpMap(detailDensityMap, detailRangeSec)
      : null,
    [detailDensityMap, detailRangeSec],
  );

  const scopedWarpMap = scopedDensityWarpMap ?? effectiveWarpMap;
  const scopedWarpDomain = scopedDensityWarpMap ? detailRangeSec : effectiveWarpDomain;

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
    warpFactor: effectiveWarpFactor,
    warpMap: scopedWarpMap,
    warpDomain: scopedWarpDomain,
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

  const burstWindows = useBurstWindows();
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

  const burstWindowsForAutoSlices = disableAutoBurstSlices ? [] : burstWindowsWithTaxonomy;
  const burstTaxonomySummary = useMemo(() => {
    const counts: Record<'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral', number> = {
      'prolonged-peak': 0,
      'isolated-spike': 0,
      valley: 0,
      neutral: 0,
    };

    for (const window of burstWindowsWithTaxonomy) {
      counts[window.burstClass] += 1;
    }

    return counts;
  }, [burstWindowsWithTaxonomy]);

  // Auto-create burst slices when burst data becomes available (unless disabled)
  useAutoBurstSlices(burstWindowsForAutoSlices);

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

  const userWarpOverlayBands = useMemo(
    () =>
      warpOverlayBandsOverride ?? warpSlices
        .filter((slice) => slice.enabled)
        .map((slice) => {
          const startSec = normalizedToEpochSeconds(clamp(slice.range[0], 0, 100), domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(clamp(slice.range[1], 0, 100), domainStart, domainEnd);
          const rangeStart = Math.max(domainStart, Math.min(startSec, endSec));
          const rangeEnd = Math.min(domainEnd, Math.max(startSec, endSec));
          return {
            id: slice.id,
            startSec: rangeStart,
            endSec: rangeEnd,
            isDebugPreview: slice.warpProfileId === DEBUG_PREVIEW_WARP_PROFILE_ID,
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [domainEnd, domainStart, warpOverlayBandsOverride, warpSlices]
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

    const geometries = slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          if (!Number.isFinite(slice.range[0]) || !Number.isFinite(slice.range[1])) {
            return null;
          }
          const startX = toX(Math.min(slice.range[0], slice.range[1]));
          const endX = toX(Math.max(slice.range[0], slice.range[1]));
          if (startX === null || endX === null) {
            return null;
          }
          const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
          const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
          if (right <= 0 || left >= detailInnerWidth) {
            return null;
          }

          return {
            id: slice.id,
            left,
            width: Math.max(2, right - left),
            isActive: activeSliceId === slice.id,
            isBurst: !!slice.isBurst,
            isSuggestion: (slice as { source?: string }).source === 'suggestion',
            isGeneratedDraft: false,
            isGeneratedApplied: slice.source === 'generated-applied',
            overlapCount: sliceOverlapCounts[slice.id] ?? 1,
            color: slice.color,
          };
        }

        if (!Number.isFinite(slice.time)) {
          return null;
        }
        const x = toX(slice.time);
        if (x === null || x < 0 || x > detailInnerWidth) {
          return null;
        }

        return {
          id: slice.id,
          left: Math.max(0, Math.min(detailInnerWidth, x - 1)),
          width: 2,
          isActive: activeSliceId === slice.id,
          isBurst: !!slice.isBurst,
          isSuggestion: (slice as { source?: string }).source === 'suggestion',
          isGeneratedDraft: false,
          isGeneratedApplied: slice.source === 'generated-applied',
          overlapCount: 1,
          color: slice.color,
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);

    return geometries;
  }, [activeSliceId, detailInnerWidth, detailScale, domainEnd, domainStart, sliceOverlapCounts, slices]);

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
          isActive: false,
          isBurst: false,
          isSuggestion: false,
          isGeneratedDraft: true,
          isGeneratedApplied: false,
          overlapCount: 1,
          color: 'purple',
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);
  }, [detailInnerWidth, detailScale, pendingGeneratedBins]);


  const isTimelineLoading = isViewportLoading;
  const isDetailEmpty = !isTimelineLoading && detailPoints.length === 0;

  const surfaceProps = {
    containerRef,
    isTimelineLoading,
    width,
    overviewInnerWidth,
    detailInnerWidth,
    isComputing,
    densityMap,
    overviewInteractionScale,
    overviewScale,
    detailScale,
    overviewSvgRef,
    detailSvgRef,
    overviewBins,
    overviewMax,
    stripSelection,
    userWarpOverlayBands,
    timeScaleMode,
    brushRef,
    overviewTicks,
    overviewTickFormat,
    burstWindows: burstWindowsWithTaxonomy,
    burstTaxonomySummary,
    showAdaptiveDensityStrip: Boolean(densityMap || detailDensityMap),
    activeBurstWindowId: null,
    onBurstWindowClick: undefined,
    detailDensityMap,
    detailMax,
    resolvedDetailRenderMode,
    detailPoints,
    detailBins,
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

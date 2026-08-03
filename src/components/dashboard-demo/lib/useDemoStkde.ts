import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildStkdeViewModel, type StkdeHotspotRowModel } from '@/app/stkde/lib/stkde-view-model';
import { DEFAULT_STKDE_BBOX, type StkdeQueryState } from '@/app/stkde/lib/stkde-query-state';
import type { StkdeResponse } from '@/lib/stkde/contracts';
import { padDistrict } from '@/lib/stats/aggregation';
import { getDistrictDisplayName } from '@/app/stats/lib/stats-view-model';
import type { StkdeParams } from '@/store/useStkdeStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import type { TimeSlice } from '@/store/useSliceDomainStore';

export type DemoStkdeSourceLabel = 'live' | 'configured-mock' | 'fallback-warning';
export type DemoStkdeLifecycleStatus = 'idle' | 'loading' | 'updating' | 'ready' | 'error';

export interface DemoStkdeResponseMetadata {
  eventCount: number;
  cellCount: number;
  hotspotCount: number;
  truncated: boolean;
  fallbackApplied: string | null;
  requestedComputeMode: StkdeResponse['meta']['requestedComputeMode'] | null;
  effectiveComputeMode: StkdeResponse['meta']['effectiveComputeMode'] | null;
  clampsApplied: string[];
  sourceLabel: DemoStkdeSourceLabel;
}

interface DemoStkdeResult {
  rows: StkdeHotspotRowModel[];
  summaryLabel: string;
  heatmapCellCount: number;
  response: StkdeResponse | null;
  lastValidResponse: StkdeResponse | null;
  isLoading: boolean;
  isStale: boolean;
  hasValidResponse: boolean;
  status: DemoStkdeLifecycleStatus;
  error: string | null;
  responseMetadata: DemoStkdeResponseMetadata | null;
  refresh: () => void;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHoveredHotspot: (hotspotId: string | null) => void;
  setStkdeParams: (patch: Partial<StkdeParams>) => void;
  setScopeMode: (mode: 'applied-slices' | 'full-viewport') => void;
}

function toQueryState(scopeMode: 'applied-slices' | 'full-viewport', startEpochSec: number, endEpochSec: number, params: StkdeParams): StkdeQueryState {
  return {
    ...params,
    computeMode: scopeMode === 'full-viewport' ? 'full-population' : 'sampled',
    startEpochSec,
    endEpochSec,
  };
}

function normalizeSliceValue(value: number, startEpoch: number, endEpoch: number): number {
  const clamped = Math.min(100, Math.max(0, value));
  const span = Math.max(1, endEpoch - startEpoch);
  return startEpoch + (clamped / 100) * span;
}

function toStkdeSliceDescriptor(slice: TimeSlice, startEpoch: number, endEpoch: number) {
  if (typeof slice.startDateTimeMs === 'number' && typeof slice.endDateTimeMs === 'number') {
    const descriptorStart = Math.floor(slice.startDateTimeMs / 1000);
    const descriptorEnd = Math.max(descriptorStart + 1, Math.ceil(slice.endDateTimeMs / 1000));
    return {
      id: slice.id,
      startEpochSec: descriptorStart,
      endEpochSec: descriptorEnd,
    };
  }

  if (slice.type === 'range' && slice.range) {
    const descriptorStart = Math.floor(normalizeSliceValue(Math.min(slice.range[0], slice.range[1]), startEpoch, endEpoch));
    const descriptorEnd = Math.max(descriptorStart + 1, Math.ceil(normalizeSliceValue(Math.max(slice.range[0], slice.range[1]), startEpoch, endEpoch)));
    return {
      id: slice.id,
      startEpochSec: descriptorStart,
      endEpochSec: descriptorEnd,
    };
  }

  const descriptorStart = Math.floor(normalizeSliceValue(slice.time, startEpoch, endEpoch));
  return {
    id: slice.id,
    startEpochSec: descriptorStart,
    endEpochSec: Math.max(descriptorStart + 1, descriptorStart + 60),
  };
}

function buildSliceSignature(slices: TimeSlice[]): string {
  return slices
    .map((slice) => {
      const range = slice.range ? slice.range.join(':') : '';
      return [
        slice.id,
        slice.type,
        slice.time,
        range,
        slice.isLocked ? 1 : 0,
        slice.isVisible ? 1 : 0,
        slice.startDateTimeMs ?? '',
        slice.endDateTimeMs ?? '',
      ].join('|');
    })
    .join('~');
}

function resolveSourceLabel(response: StkdeResponse | null): DemoStkdeSourceLabel {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || process.env.USE_MOCK_DATA === 'true') {
    return 'configured-mock';
  }
  return response?.meta.fallbackApplied ? 'fallback-warning' : 'live';
}

function buildResponseMetadata(response: StkdeResponse | null): DemoStkdeResponseMetadata | null {
  if (!response) return null;
  return {
    eventCount: response.meta.eventCount,
    cellCount: response.heatmap.cells.length,
    hotspotCount: response.hotspots.length,
    truncated: response.meta.truncated,
    fallbackApplied: response.meta.fallbackApplied ?? null,
    requestedComputeMode: response.meta.requestedComputeMode,
    effectiveComputeMode: response.meta.effectiveComputeMode,
    clampsApplied: response.meta.clampsApplied ?? [],
    sourceLabel: resolveSourceLabel(response),
  };
}

export function useDemoStkde(): DemoStkdeResult {
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [response, setResponse] = useState<StkdeResponse | null>(null);
  const lastValidResponseRef = useRef<StkdeResponse | null>(null);
  const [lastValidResponse, setLastValidResponse] = useState<StkdeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const slices = useSliceDomainStore((state) => state.slices);
  const timeRange = useDashboardDemoCoordinationStore((state) => state.timeRange);
  const stkdeScopeMode = useDashboardDemoCoordinationStore((state) => state.stkdeScopeMode);
  const stkdeParams = useDashboardDemoCoordinationStore((state) => state.stkdeParams);
  const selectedDistricts = useDashboardDemoCoordinationStore((state) => state.selectedDistricts);
  const selectedDistrictLabels = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map((district) => getDistrictDisplayName(district)) : ['all districts']),
    [selectedDistricts]
  );
  const paddedDistricts = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map(padDistrict) : undefined),
    [selectedDistricts]
  );
  const setSelectedHotspot = useDashboardDemoCoordinationStore((state) => state.setSelectedHotspot);
  const setHoveredHotspot = useDashboardDemoCoordinationStore((state) => state.setHoveredHotspot);
  const setStkdeParams = useDashboardDemoCoordinationStore((state) => state.setStkdeParams);
  const setScopeMode = useDashboardDemoCoordinationStore((state) => state.setStkdeScopeMode);
  const setStkdeResponse = useDashboardDemoCoordinationStore((state) => state.setStkdeResponse);
  const visibleSlices = useMemo(
    () => slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .sort((left, right) => {
        const leftDescriptor = toStkdeSliceDescriptor(left, timeRange.startEpoch, timeRange.endEpoch);
        const rightDescriptor = toStkdeSliceDescriptor(right, timeRange.startEpoch, timeRange.endEpoch);
        const startDelta = leftDescriptor.startEpochSec - rightDescriptor.startEpochSec;
        if (startDelta !== 0) return startDelta;
        const endDelta = leftDescriptor.endEpochSec - rightDescriptor.endEpochSec;
        if (endDelta !== 0) return endDelta;
        return leftDescriptor.id.localeCompare(rightDescriptor.id);
      }),
    [slices, timeRange.endEpoch, timeRange.startEpoch],
  );
  const sliceSignature = useMemo(() => buildSliceSignature(visibleSlices), [visibleSlices]);
  const sliceDescriptors = useMemo(
    () => visibleSlices.map((slice) => toStkdeSliceDescriptor(slice, timeRange.startEpoch, timeRange.endEpoch)),
    [visibleSlices, timeRange.endEpoch, timeRange.startEpoch]
  );

  const queryState = useMemo<StkdeQueryState>(
    () =>
      toQueryState(stkdeScopeMode, timeRange.startEpoch, timeRange.endEpoch, stkdeParams),
    [stkdeParams, stkdeScopeMode, timeRange.endEpoch, timeRange.startEpoch]
  );

  const refresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const timerId = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = controller;

       const requestId = ++requestIdRef.current;
       setIsLoading(true);
       setIsStale(lastValidResponseRef.current !== null);
       setError(null);

      void (async () => {
        try {
          const result = await fetch('/api/stkde/hotspots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              callerIntent: 'dashboard-demo',
              computeMode: queryState.computeMode,
              domain: {
                startEpochSec: queryState.startEpochSec,
                endEpochSec: queryState.endEpochSec,
              },
              filters: {
                bbox: DEFAULT_STKDE_BBOX,
                ...(paddedDistricts ? { districts: paddedDistricts } : {}),
                ...(sliceDescriptors.length > 0 ? { slices: sliceDescriptors } : {}),
              },
              params: {
                spatialBandwidthMeters: queryState.spatialBandwidthMeters,
                temporalBandwidthHours: queryState.temporalBandwidthHours,
                gridCellMeters: queryState.gridCellMeters,
                topK: queryState.topK,
                minSupport: queryState.minSupport,
                timeWindowHours: queryState.timeWindowHours,
              },
              limits: {
                maxEvents: 50000,
                maxGridCells: 12000,
              },
              guardrails: {
                fullPopulationMaxSpanDays: 12000,
                fullPopulationTimeoutMs: 20000,
              },
              context: {
                selectedDistrictCount: selectedDistricts.length,
                sliceSignature,
              },
            }),
          });

          if (!result.ok) {
            const body = await result.json().catch(() => ({ error: `HTTP ${result.status}` }));
            throw new Error(body.error ?? `STKDE request failed (${result.status})`);
          }

          const data = (await result.json()) as StkdeResponse;
          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }

           setResponse(data);
           lastValidResponseRef.current = data;
           setLastValidResponse(data);
           setIsStale(false);
           setStkdeResponse(data);
         } catch (requestError) {
           if (controller.signal.aborted) return;
           setError(requestError instanceof Error ? requestError.message : 'Failed to run STKDE');
           setResponse(lastValidResponseRef.current);
           setIsStale(lastValidResponseRef.current !== null);
           setStkdeResponse(lastValidResponseRef.current);
        } finally {
          if (requestId === requestIdRef.current) {
            setIsLoading(false);
          }
        }
      })();
    }, 150);
    debounceTimerRef.current = timerId;

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [paddedDistricts, queryState, refreshTick, selectedDistricts.length, sliceDescriptors, sliceSignature, setStkdeResponse]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const viewModel = useMemo(
    () =>
      buildStkdeViewModel(
        {
          computeMode: queryState.computeMode,
          startEpochSec: queryState.startEpochSec,
          endEpochSec: queryState.endEpochSec,
          spatialBandwidthMeters: queryState.spatialBandwidthMeters,
          temporalBandwidthHours: queryState.temporalBandwidthHours,
          gridCellMeters: queryState.gridCellMeters,
          topK: queryState.topK,
          minSupport: queryState.minSupport,
          timeWindowHours: queryState.timeWindowHours,
        },
        response
      ),
    [queryState, response]
  );

  const responseMetadata = useMemo(() => buildResponseMetadata(response), [response]);
  const status: DemoStkdeLifecycleStatus = isLoading
    ? (response ? 'updating' : 'loading')
    : error
      ? 'error'
      : response
        ? 'ready'
        : 'idle';

  return {
    rows: viewModel.rows,
    summaryLabel: `${viewModel.summaryLabel} • ${selectedDistrictLabels.join(', ')}`,
    heatmapCellCount: viewModel.heatmapCellCount,
    response,
    lastValidResponse,
    isLoading,
    isStale,
    hasValidResponse: response !== null,
    status,
    error,
    responseMetadata,
    refresh,
    setSelectedHotspot,
    setHoveredHotspot,
    setStkdeParams,
    setScopeMode,
  };
}

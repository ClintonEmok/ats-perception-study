'use client';

import { useCallback, useMemo } from 'react';
import { useSliceDomainStore, type TimeSlice } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { KdeCell } from '@/lib/kde';
import type { StkdeResponse } from '@/lib/stkde/contracts';
import { useDashboardDemo3d } from '../DashboardDemo3dProvider';
import { adaptStkdeSurfaceToKdeCells } from './adaptStkdeSurfaceToKdeCells';
import { computeSparseKdeDifference } from './compare-sparse-surfaces';

export interface DemoComparableSlice {
  id: string;
  sourceSliceIndex: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  crimeCount: number;
  burstScore: number;
}

export interface DemoCompareData {
  comparableSlices: DemoComparableSlice[];
  leftId: string | null;
  rightId: string | null;
  leftSlice: DemoComparableSlice | null;
  rightSlice: DemoComparableSlice | null;
  leftKde: KdeCell[] | undefined;
  rightKde: KdeCell[] | undefined;
  signedDifference: KdeCell[] | undefined;
  leftIsLoading: boolean;
  rightIsLoading: boolean;
  responseStatus: ReturnType<typeof useDashboardDemo3d>['status'];
  responseError: string | null;
  responseIsStale: boolean;
  signedDifferenceAvailable: boolean;
  signedDifferenceReason: string;
  leftDuration: number;
  rightDuration: number;
  leftBurstPercent: number;
  rightBurstPercent: number;
  leftCellCount: number;
  rightCellCount: number;
  setLeft: (id: string | null) => void;
  setRight: (id: string | null) => void;
  swap: () => void;
  clear: () => void;
}

function resolveSliceEpochRange(slice: TimeSlice, minTimestampSec: number, maxTimestampSec: number): [number, number] {
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

function normalizeBurstPercent(score: number): number {
  return score > 1 ? score : score * 100;
}

/** Pure ID-safe comparison source model used by the dashboard hook and tests. */
export function buildDemoComparableSlices(
  slices: readonly TimeSlice[],
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
  response: StkdeResponse | null,
  scope?: readonly [number, number] | null,
): DemoComparableSlice[] {
  if (minTimestampSec === null || maxTimestampSec === null) return [];

  return slices
    .filter((slice) => slice.isVisible && slice.type === 'range')
    .map((slice) => {
      const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
      return {
        id: slice.id,
        sourceSliceIndex: 0,
        label: slice.name || 'Slice',
        startEpoch,
        endEpoch,
        crimeCount: response?.sliceResults[slice.id]?.meta.eventCount ?? 0,
        burstScore: slice.burstScore ?? 0,
      };
    })
    .sort((left, right) => left.startEpoch - right.startEpoch || left.endEpoch - right.endEpoch || left.id.localeCompare(right.id))
    .map((slice, sourceSliceIndex) => ({ ...slice, sourceSliceIndex }))
    .filter((slice) => !scope || (slice.endEpoch >= scope[0] && slice.startEpoch <= scope[1]));
}

export function useDemoCompareData(): DemoCompareData {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const comparisonSliceIds = useDashboardDemoCoordinationStore((state) => state.comparisonSliceIds);
  const cubeScopeMode = useDashboardDemoCoordinationStore((state) => state.cubeScopeMode);
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const setComparisonSliceId = useDashboardDemoCoordinationStore((state) => state.setComparisonSliceId);
  const swapComparisonSlices = useDashboardDemoCoordinationStore((state) => state.swapComparisonSlices);
  const clearComparisonSlices = useDashboardDemoCoordinationStore((state) => state.clearComparisonSlices);
  const { response, isLoading, error, isStale, status } = useDashboardDemo3d();

  const scope = useMemo<readonly [number, number] | null>(() => {
    if (cubeScopeMode !== 'brushed' || !brushRange || minTimestampSec === null || maxTimestampSec === null) return null;
    const start = normalizedToEpochSeconds(brushRange[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(brushRange[1], minTimestampSec, maxTimestampSec);
    return start <= end ? [start, end] : [end, start];
  }, [brushRange, cubeScopeMode, maxTimestampSec, minTimestampSec]);

  const comparableSlices = useMemo(
    () => buildDemoComparableSlices(slices, minTimestampSec, maxTimestampSec, response, scope),
    [maxTimestampSec, minTimestampSec, response, scope, slices],
  );
  const comparisonById = useMemo(() => new Map(comparableSlices.map((slice) => [slice.id, slice])), [comparableSlices]);
  const leftId = comparisonSliceIds.left;
  const rightId = comparisonSliceIds.right;
  const leftSlice = leftId ? comparisonById.get(leftId) ?? null : null;
  const rightSlice = rightId ? comparisonById.get(rightId) ?? null : null;
  const leftKde = leftId && response?.sliceResults[leftId] ? adaptStkdeSurfaceToKdeCells(response.sliceResults[leftId]) : undefined;
  const rightKde = rightId && response?.sliceResults[rightId] ? adaptStkdeSurfaceToKdeCells(response.sliceResults[rightId]) : undefined;
  const signedDifference = useMemo(
    () => leftKde && rightKde ? computeSparseKdeDifference(leftKde, rightKde) : null,
    [leftKde, rightKde],
  );

  const signedDifferenceReason = error
    ? 'Signed KDE difference is waiting for the server surfaces to recover.'
    : !leftId || !rightId
      ? 'Select two slices to compute normalized KDE(A) − KDE(B).'
      : isLoading && (!leftKde || !rightKde)
        ? 'Computing normalized signed KDE difference…'
        : !leftKde || !rightKde
          ? 'Both selected slices need a server STKDE surface before comparison.'
          : signedDifference && signedDifference.activeCellCount > 0
            ? 'Normalized KDE(A) − KDE(B); absent sparse cells are treated as zero.'
            : 'No active STKDE cells are available in either selected interval.';

  const setLeft = useCallback((id: string | null) => setComparisonSliceId('left', id), [setComparisonSliceId]);
  const setRight = useCallback((id: string | null) => setComparisonSliceId('right', id), [setComparisonSliceId]);
  const leftDuration = leftSlice ? Math.max(0, leftSlice.endEpoch - leftSlice.startEpoch) : 0;
  const rightDuration = rightSlice ? Math.max(0, rightSlice.endEpoch - rightSlice.startEpoch) : 0;

  return {
    comparableSlices,
    leftId,
    rightId,
    leftSlice,
    rightSlice,
    leftKde,
    rightKde,
    signedDifference: signedDifference?.cells,
    leftIsLoading: isLoading,
    rightIsLoading: isLoading,
    responseStatus: status,
    responseError: error,
    responseIsStale: isStale,
    signedDifferenceAvailable: Boolean(leftKde && rightKde),
    signedDifferenceReason,
    leftDuration,
    rightDuration,
    leftBurstPercent: leftSlice ? normalizeBurstPercent(leftSlice.burstScore) : 0,
    rightBurstPercent: rightSlice ? normalizeBurstPercent(rightSlice.burstScore) : 0,
    leftCellCount: leftKde?.length ?? 0,
    rightCellCount: rightKde?.length ?? 0,
    setLeft,
    setRight,
    swap: swapComparisonSlices,
    clear: clearComparisonSlices,
  };
}

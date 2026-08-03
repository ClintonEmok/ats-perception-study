'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useDemoStkde } from './lib/useDemoStkde';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

type DashboardDemo3dValue = ReturnType<typeof useDemoStkde>;

const DashboardDemo3dContext = createContext<DashboardDemo3dValue | null>(null);

export function DashboardDemo3dProvider({ children }: { children: ReactNode }) {
  const stkde = useDemoStkde();
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const isScrubbing = useDashboardDemoCoordinationStore((state) => state.inspectIsScrubbing);
  const activeSliceIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const visibleSliceCount = useSliceDomainStore(
    (state) => state.slices.filter((slice) => slice.isVisible && slice.type === 'range').length,
  );
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const slices = useSliceDomainStore((state) => state.slices);
  const timeRange = useDashboardDemoCoordinationStore((state) => state.timeRange);
  const visibleSliceIds = useMemo(
    () => slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice) => {
        const start = typeof slice.startDateTimeMs === 'number'
          ? slice.startDateTimeMs / 1000
          : slice.range
            ? normalizedToEpochSeconds(Math.min(slice.range[0], slice.range[1]), timeRange.startEpoch, timeRange.endEpoch)
            : normalizedToEpochSeconds(slice.time, timeRange.startEpoch, timeRange.endEpoch);
        const end = typeof slice.endDateTimeMs === 'number'
          ? slice.endDateTimeMs / 1000
          : slice.range
            ? normalizedToEpochSeconds(Math.max(slice.range[0], slice.range[1]), timeRange.startEpoch, timeRange.endEpoch)
            : start;
        return { id: slice.id, start, end };
      })
      .sort((left, right) => left.start - right.start || left.end - right.end || left.id.localeCompare(right.id))
      .map((slice) => slice.id),
    [slices, timeRange.endEpoch, timeRange.startEpoch],
  );

  useEffect(() => {
    if (!isPlaying || isScrubbing || visibleSliceCount === 0) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveSliceIndex((activeSliceIndex + 1) % visibleSliceCount);
    }, Math.max(180, Math.round(1000 / Math.max(0.25, playbackSpeed))));

    return () => window.clearTimeout(timeout);
  }, [activeSliceIndex, isPlaying, isScrubbing, playbackSpeed, setActiveSliceIndex, visibleSliceCount]);

  useEffect(() => {
    const sourceSliceId = visibleSliceIds[activeSliceIndex];
    if (sourceSliceId) setActiveSlice(sourceSliceId);
  }, [activeSliceIndex, setActiveSlice, visibleSliceIds]);

  return (
    <DashboardDemo3dContext.Provider value={stkde}>
      {children}
    </DashboardDemo3dContext.Provider>
  );
}

export function useDashboardDemo3d(): DashboardDemo3dValue {
  const value = useContext(DashboardDemo3dContext);
  if (!value) {
    throw new Error('useDashboardDemo3d must be used within DashboardDemo3dProvider');
  }
  return value;
}

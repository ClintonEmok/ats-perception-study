"use client";

import { useMemo } from 'react';
import MapVisualization from '@/components/map/MapVisualization';
import { DemoStatsMapOverlay } from '@/components/dashboard-demo/DemoStatsMapOverlay';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

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

interface DemoMapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
  stkdeVisible?: boolean;
}

export function DemoMapVisualization({
  stkdeResponse = null,
  stkdeSelectedHotspotId = null,
  stkdeVisible = true,
}: DemoMapVisualizationProps) {
  const storeStkdeResponse = useDashboardDemoCoordinationStore((state) => state.stkdeResponse);
  const storeSelectedHotspotId = useDashboardDemoCoordinationStore((state) => state.selectedHotspotId);

  const activeSliceIndex = useDashboardDemoCoordinationStore((s) => s.activeSliceIndex);
  const activeSliceId = useSliceDomainStore((s) => s.activeSliceId);
  const slices = useSliceDomainStore((s) => s.slices);
  const minTimestampSec = useTimelineDataStore((s) => s.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((s) => s.maxTimestampSec);

  const { sliceTimeRange, activeSliceLabel } = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return { sliceTimeRange: null, activeSliceLabel: null };
    }
    const visible = slices
      .filter((s) => s.isVisible && s.type === 'range')
      .sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0));
    const active = activeSliceId
      ? visible.find((slice) => slice.id === activeSliceId)
      : visible[activeSliceIndex];
    if (!active) return { sliceTimeRange: null, activeSliceLabel: null };

    const range = resolveSliceEpochRange(active, minTimestampSec, maxTimestampSec);
    const label = active.name || `Slice ${activeSliceIndex + 1}`;
    return { sliceTimeRange: range, activeSliceLabel: label };
  }, [activeSliceId, activeSliceIndex, slices, minTimestampSec, maxTimestampSec]);

  return (
    <div className="relative h-full w-full">
      <MapVisualization
        stkdeResponse={stkdeResponse ?? storeStkdeResponse}
        stkdeSelectedHotspotId={stkdeSelectedHotspotId ?? storeSelectedHotspotId}
        stkdeVisibleOverride={stkdeVisible}
        disableHeatmapOverlay
        statsOverlay={<DemoStatsMapOverlay />}
        filterStoreOverride={useDashboardDemoFilterStore}
        coordinationStoreOverride={useDashboardDemoCoordinationStore}
        mapLayerStoreOverride={useDashboardDemoMapLayerStore}
        sliceHighlightRange={sliceTimeRange}
        activeSliceLabel={activeSliceLabel}
      />
    </div>
  );
}

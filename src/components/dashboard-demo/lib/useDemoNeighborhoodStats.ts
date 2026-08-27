import { useMemo } from 'react';
import { useCrimeData } from '@/hooks/useCrimeData';
import { aggregateStats, padDistrict, type NeighborhoodStats } from '@/lib/stats/aggregation';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { transformStatsSummary, type StatsSummary } from '@/lib/stats/stats-view-model';

export interface UseDemoNeighborhoodStatsResult {
  stats: NeighborhoodStats | null;
  summary: StatsSummary | null;
  crimes: ReturnType<typeof useCrimeData>['data'];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

export function useDemoNeighborhoodStats(): UseDemoNeighborhoodStatsResult {
  const selectedDistricts = useDashboardDemoCoordinationStore((state) => state.selectedDistricts);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const timeRange = useMemo(
    () => ({ startEpoch: viewportStart, endEpoch: viewportEnd }),
    [viewportEnd, viewportStart]
  );

  const paddedDistricts = useMemo(() => {
    if (selectedDistricts.length === 0) return undefined;
    return selectedDistricts.map(padDistrict);
  }, [selectedDistricts]);

  const { data: crimes, isLoading, isFetching, error } = useCrimeData({
    startEpoch: timeRange.startEpoch,
    endEpoch: timeRange.endEpoch,
    districts: paddedDistricts,
    bufferDays: 0,
    limit: 1_000_000,
  });

  const stats = useMemo(() => {
    if (!crimes || crimes.length === 0) return null;
    return aggregateStats(crimes);
  }, [crimes]);

  const summary = useMemo<StatsSummary | null>(() => {
    if (!stats) return null;

    return transformStatsSummary(stats, selectedDistricts.length || 25, timeRange);
  }, [selectedDistricts.length, stats, timeRange]);

  return {
    stats,
    summary,
    crimes,
    isLoading,
    isFetching,
    error,
  };
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { getDistrictDisplayName, transformStatsSummary, type StatsSummary } from '@/lib/stats/stats-view-model';
import { normalizeTimeRange } from '@/lib/time-range';
import { buildTemporalPulseSeries, type TemporalPulseSeries } from '@/lib/stats/temporal-pulses';
import { useDemoTimelineSummary } from '@/components/timeline/hooks/useDemoTimelineSummary';
import type { NeighborhoodStats } from '@/lib/stats/aggregation';

interface DemoStatsSummaryResponse {
  stats: NeighborhoodStats;
  summary: StatsSummary;
  temporalPulses?: TemporalPulseSeries;
}

function buildQueryParams(startEpoch: number, endEpoch: number, districts: string[]) {
  const params = new URLSearchParams({
    startEpoch: String(startEpoch),
    endEpoch: String(endEpoch),
  });

  if (districts.length > 0) {
    params.set('districts', districts.join(','));
  }

  return params.toString();
}

export function useDemoStatsSummary() {
  const timelineSummary = useDemoTimelineSummary();
  const selectedDistricts = useDashboardDemoCoordinationStore((state) => state.selectedDistricts);
  const fallbackTimeRange = useDashboardDemoCoordinationStore((state) => state.timeRange);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const toggleDistrict = useDashboardDemoCoordinationStore((state) => state.toggleDistrict);
  const setSelectedDistricts = useDashboardDemoCoordinationStore((state) => state.setSelectedDistricts);
  const setTimeRange = useDashboardDemoFilterStore((state) => state.setTimeRange);

  const committedTimeRange = useMemo(
    () => [viewportStart, viewportEnd] as [number, number],
    [viewportEnd, viewportStart]
  );
  const timeRange = useMemo(
    () => normalizeTimeRange(selectedTimeRange) ?? [fallbackTimeRange.startEpoch, fallbackTimeRange.endEpoch],
    [fallbackTimeRange.endEpoch, fallbackTimeRange.startEpoch, selectedTimeRange]
  );

  const selectedDistrictLabels = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map((district) => getDistrictDisplayName(district)) : ['All districts']),
    [selectedDistricts]
  );

  const queryKey = useMemo(
    () => ['demo-stats-summary', committedTimeRange[0], committedTimeRange[1], selectedDistricts.join('|')],
    [committedTimeRange, selectedDistricts]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/crime/stats-summary?${buildQueryParams(committedTimeRange[0], committedTimeRange[1], selectedDistricts)}`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return (await response.json()) as DemoStatsSummaryResponse;
    },
    enabled: Number.isFinite(committedTimeRange[0]) && Number.isFinite(committedTimeRange[1]),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const stats = query.data?.stats ?? null;
  const temporalPulses = useMemo<TemporalPulseSeries>(
    () => query.data?.temporalPulses ?? buildTemporalPulseSeries(stats),
    [query.data?.temporalPulses, stats]
  );
  const summary = useMemo<StatsSummary | null>(() => {
    if (!stats) return null;
    return query.data?.summary ?? transformStatsSummary(stats, selectedDistricts.length || 25, { startEpoch: committedTimeRange[0], endEpoch: committedTimeRange[1] });
  }, [committedTimeRange, query.data?.summary, selectedDistricts.length, stats]);

  return {
    stats,
    summary,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    selectedDistricts,
    selectedDistrictLabels,
    timeRange,
    temporalPulses,
    timelineSummary,
    toggleDistrict,
    setSelectedDistricts,
    setTimeRange,
  };
}

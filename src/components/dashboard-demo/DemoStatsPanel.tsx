"use client";

import { useMemo } from 'react';
import { ChevronUp, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_DEMO_DISTRICTS } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { useDemoStatsSummary } from '@/components/dashboard-demo/lib/useDemoStatsSummary';
import { formatHour, getDistrictDisplayName } from '@/app/stats/lib/stats-view-model';
import { useCrimeData } from '@/hooks/useCrimeData';
import type { CrimeRecord } from '@/types/crime';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="gap-2 border-border/70 bg-muted/20 p-0 shadow-none">
      <CardContent className="px-3 py-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </CardContent>
    </Card>
  );
}

interface PulseChartProps {
  title: string;
  readout: string;
  points: Array<{ label: string; count: number }>;
  accentClassName: string;
  labelStep?: number;
}

function PulseChart({ title, readout, points, accentClassName, labelStep = 1 }: PulseChartProps) {
  const { minCount, range } = useMemo(() => {
    if (points.length === 0) {
      return { minCount: 0, range: 1 };
    }

    const counts = points.map((point) => point.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    return {
      minCount: min,
      range: Math.max(max - min, 1),
    };
  }, [points]);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{readout}</span>
      </div>

      <div className="mt-3 flex h-32 items-end justify-between gap-1">
        {points.map((point, index) => (
          <div key={`${title}-${point.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="relative w-full overflow-hidden rounded-t bg-slate-800" style={{ height: '80px' }}>
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t ${accentClassName}`}
                style={{
                  height: `${Math.max(8, ((point.count - minCount) / range) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-1 min-h-[0.75rem] text-center text-[10px] text-muted-foreground">
              {index % labelStep === 0 || index === points.length - 1 ? point.label : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistributionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(4)].map((_, index) => (
        <div key={`distribution-skeleton-${index}`} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

function PulseChartSkeleton({ title, readout }: { title: string; readout: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{readout}</span>
      </div>

      <div className="mt-3 flex h-32 items-end justify-between gap-1">
        {[...Array(12)].map((_, index) => (
          <div key={`pulse-skeleton-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <Skeleton className="w-full rounded-t" style={{ height: `${48 + (index % 4) * 8}px` }} />
            <Skeleton className="mt-1 h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDetailPeriodDuration(startSec: number, endSec: number) {
  const durationSec = Math.max(0, endSec - startSec);
  if (durationSec < 60) return `${Math.max(1, Math.round(durationSec))}s`;
  if (durationSec < 3600) return `${Math.max(1, Math.round(durationSec / 60))}m`;
  if (durationSec < 86400) return `${Math.max(1, Math.round(durationSec / 3600))}h`;
  return `${Math.max(1, Math.round(durationSec / 86400))}d`;
}

type RankedCount = {
  label: string;
  count: number;
};

function rankCounts<T>(records: T[], getLabel: (record: T) => string, limit: number): RankedCount[] {
  const counts = new Map<string, number>();

  for (const record of records) {
    const label = getLabel(record).trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function formatPeriodDate(epochSec: number) {
  return new Date(epochSec * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function buildFlowShapeSummary(counts: number[]) {
  if (counts.length === 0) {
    return 'No crimes in this window yet.';
  }

  const midpoint = Math.ceil(counts.length / 2);
  const firstHalf = counts.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const secondHalf = counts.slice(midpoint).reduce((sum, value) => sum + value, 0);
  const max = Math.max(...counts);
  const average = counts.reduce((sum, value) => sum + value, 0) / Math.max(counts.length, 1);

  if (firstHalf > secondHalf * 1.25) {
    return max > average * 1.7 ? 'Front-loaded with a sharp early cluster.' : 'Front-loaded activity that tapers into the second half.';
  }

  if (secondHalf > firstHalf * 1.25) {
    return max > average * 1.7 ? 'Late build-up with a sharp closing cluster.' : 'Activity grows toward the end of the window.';
  }

  if (max > average * 1.8) {
    return 'Mostly balanced, but one period spikes well above the rest.';
  }

  return 'Balanced activity across the selected period.';
}

function buildPeriodFlow(records: CrimeRecord[], startSec: number, endSec: number) {
  const normalizedStart = Math.min(startSec, endSec);
  const normalizedEnd = Math.max(startSec, endSec);
  const durationSec = Math.max(1, normalizedEnd - normalizedStart);
  const bucketCount = durationSec <= 14 * 86400 ? 12 : durationSec <= 90 * 86400 ? 14 : 16;
  const bucketCounts = new Array(bucketCount).fill(0);
  const hourCounts = new Array(24).fill(0);

  if (records.length === 0) {
    return {
      bucketCounts,
      hourCounts,
      peakBucketLabel: '--',
      peakHourLabel: '--',
      flowSummary: 'No crimes in this window yet.',
      topTypes: [],
      topDistricts: [],
    };
  }

  for (const crime of records) {
    const timestamp = crime.timestamp;
    if (timestamp < normalizedStart || timestamp > normalizedEnd) continue;

    const progress = (timestamp - normalizedStart) / durationSec;
    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(progress * bucketCount)));
    bucketCounts[bucketIndex] += 1;
    hourCounts[new Date(timestamp * 1000).getHours()] += 1;
  }

  const peakBucketIndex = bucketCounts.reduce(
    (bestIndex, currentCount, index, source) => (currentCount > source[bestIndex] ? index : bestIndex),
    0
  );
  const peakBucketStart = normalizedStart + Math.floor((durationSec * peakBucketIndex) / bucketCount);
  const peakBucketEnd = Math.min(normalizedEnd, normalizedStart + Math.ceil((durationSec * (peakBucketIndex + 1)) / bucketCount));
  const peakBucketLabel = `${formatPeriodDate(peakBucketStart)} → ${formatPeriodDate(peakBucketEnd)}`;

  const peakHourIndex = hourCounts.reduce(
    (bestIndex, currentCount, index, source) => (currentCount > source[bestIndex] ? index : bestIndex),
    0
  );

  const topTypes = rankCounts(records, (record) => record.type, 4);
  const topDistricts = rankCounts(records, (record) => getDistrictDisplayName(record.district), 4);

  return {
    bucketCounts,
    hourCounts,
    peakBucketLabel,
    peakHourLabel: formatHour(peakHourIndex),
    flowSummary: buildFlowShapeSummary(bucketCounts),
    topTypes,
    topDistricts,
  };
}

function SelectedDetailPeriodCard() {
  const selectedDetailPeriod = useDashboardDemoCoordinationStore((state) => state.selectedDetailPeriod);
  const clearSelectedDetailPeriod = useDashboardDemoCoordinationStore((state) => state.clearSelectedDetailPeriod);
  const setBrushRange = useDashboardDemoCoordinationStore((state) => state.setBrushRange);
  const setTimeRange = useDashboardDemoFilterStore((state) => state.setTimeRange);
  const setRange = useDashboardDemoTimeStore((state) => state.setRange);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const handleFocusRange = () => {
    if (!selectedDetailPeriod) return;
    const start = Math.min(selectedDetailPeriod.startSec, selectedDetailPeriod.endSec);
    const end = Math.max(selectedDetailPeriod.startSec, selectedDetailPeriod.endSec);
    setTimeRange([start, end]);
    if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
      const normalizedStart = epochSecondsToNormalized(start, minTimestampSec, maxTimestampSec);
      const normalizedEnd = epochSecondsToNormalized(end, minTimestampSec, maxTimestampSec);
      setRange([normalizedStart, normalizedEnd]);
      setBrushRange([normalizedStart, normalizedEnd]);
    }
  };

  return (
    <Card className="border-border/70 bg-card/70 p-0 shadow-none">
      <CardHeader className="gap-2 px-3 pb-2 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="rounded-sm">Selected period</Badge>
          {selectedDetailPeriod ? <div className="text-[11px] text-muted-foreground">{selectedDetailPeriod.label}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-3 pb-3">
        {selectedDetailPeriod ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="text-sm font-semibold text-foreground">{selectedDetailPeriod.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{selectedDetailPeriod.summary}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Count</div>
                <div className="mt-1 font-medium text-foreground">{selectedDetailPeriod.count.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Duration</div>
                <div className="mt-1 font-medium text-foreground">
                  {formatDetailPeriodDuration(selectedDetailPeriod.startSec, selectedDetailPeriod.endSec)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={handleFocusRange} className="gap-2">
                Focus range
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearSelectedDetailPeriod}>
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
            Click a detail bar to inspect a time period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailDrilldownCard({ selectedDistricts }: { selectedDistricts: string[] }) {
  const selectedDetailPeriod = useDashboardDemoCoordinationStore((state) => state.selectedDetailPeriod);
  const selectedDistrictFilter = selectedDistricts.length > 0 ? selectedDistricts : undefined;
  const detailStartSec = selectedDetailPeriod ? Math.min(selectedDetailPeriod.startSec, selectedDetailPeriod.endSec) : 0;
  const detailEndSec = selectedDetailPeriod ? Math.max(selectedDetailPeriod.startSec, selectedDetailPeriod.endSec) : 0;
  const {
    data: periodCrimes,
    meta: periodMeta,
    isLoading: isPeriodLoading,
    isFetching: isPeriodFetching,
  } = useCrimeData({
    startEpoch: detailStartSec,
    endEpoch: detailEndSec,
    districts: selectedDistrictFilter,
    bufferDays: 0,
    limit: 15000,
  });

  const periodAnalysis = useMemo(() => {
    if (!selectedDetailPeriod) return null;
    return buildPeriodFlow(periodCrimes, detailStartSec, detailEndSec);
  }, [detailEndSec, detailStartSec, periodCrimes, selectedDetailPeriod]);

  return (
    <Card className="border-border/70 bg-card/70 p-0 shadow-none">
      <CardHeader className="gap-2 px-3 pb-2 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="rounded-sm">Period analysis</Badge>
          {selectedDetailPeriod ? <div className="text-[11px] text-muted-foreground">{selectedDetailPeriod.label}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-3 pb-3">
        {selectedDetailPeriod ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Crimes loaded</div>
                <div className="mt-1 font-medium text-foreground">
                  {isPeriodLoading || isPeriodFetching ? 'Loading…' : periodCrimes.length.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Buffered range</div>
                <div className="mt-1 font-medium text-foreground">
                  {periodMeta?.buffer?.applied
                    ? `${new Date(periodMeta.buffer.applied.start * 1000).toLocaleDateString()} → ${new Date(periodMeta.buffer.applied.end * 1000).toLocaleDateString()}`
                    : 'Exact selection'}
                </div>
              </div>
            </div>

            {periodAnalysis ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Crime flow</div>
                      <div className="mt-1 text-xs text-muted-foreground">{periodAnalysis.flowSummary}</div>
                    </div>
                    <Badge variant="outline" className="rounded-sm">{periodAnalysis.peakBucketLabel}</Badge>
                  </div>

                  <div className="mt-3 grid h-24 grid-cols-12 items-end gap-1">
                    {periodAnalysis.bucketCounts.map((count, index) => {
                      const max = Math.max(...periodAnalysis.bucketCounts, 1);
                      const height = Math.max(8, (count / max) * 100);
                      return (
                        <div key={`period-bucket-${index}`} className="flex h-full items-end">
                          <div
                            className={`w-full rounded-t-sm ${count > 0 ? 'bg-primary/80' : 'bg-muted'}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {periodAnalysis.flowSummary}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Card className="rounded-lg border border-border/60 p-0 shadow-none">
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Top crimes</div>
                      <div className="mt-2 space-y-2">
                        {periodAnalysis.topTypes.map((entry) => (
                          <div key={entry.label} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="truncate pr-2">{entry.label}</span>
                              <span>{entry.count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${Math.max(8, Math.min(100, (entry.count / Math.max(periodCrimes.length, 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border border-border/60 p-0 shadow-none">
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">District context</div>
                      <div className="mt-2 space-y-2">
                        {periodAnalysis.topDistricts.map((entry) => (
                          <div key={entry.label} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="truncate pr-2">{entry.label}</span>
                              <span>{entry.count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-secondary"
                                style={{ width: `${Math.max(8, Math.min(100, (entry.count / Math.max(periodCrimes.length, 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Peak hour</div>
                    <div className="mt-1 font-medium text-foreground">{periodAnalysis.peakHourLabel}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dominant type</div>
                    <div className="mt-1 font-medium text-foreground">{periodAnalysis.topTypes[0]?.label ?? '--'}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dominant district</div>
                    <div className="mt-1 font-medium text-foreground">{periodAnalysis.topDistricts[0]?.label ?? '--'}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                  {periodCrimes.length > 0
                    ? `${periodAnalysis.flowSummary} Start with the peak period and dominant crime type.`
                    : 'No crime records were returned for this window yet.'}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                No crime records loaded for this period yet.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
            Click a detail bar to inspect a time period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const formatReadOnlyDate = (epochSec: number) =>
  new Date(epochSec * 1000).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

export function DemoStatsPanel() {
  const {
    summary,
    stats,
    temporalPulses,
    isLoading,
    selectedDistricts,
    selectedDistrictLabels,
    timeRange,
    toggleDistrict,
    setSelectedDistricts,
  } = useDemoStatsSummary();

  const topTypes = useMemo(() => stats?.byType.slice(0, 4) ?? [], [stats]);
  const showDistrictSelection = selectedDistricts.length > 0 && selectedDistricts.length < ALL_DEMO_DISTRICTS.length;
  const showDistributionSkeleton = isLoading && topTypes.length === 0;
  const showHourlyPulseSkeleton = isLoading && temporalPulses.hourly.length === 0;

  return (
    <Card className="rounded-lg border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardHeader className="gap-1.5 px-2.5 pb-1.5 pt-2.5">
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {showDistrictSelection ? <Badge variant="outline">{selectedDistrictLabels.join(', ')}</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 px-2 pb-2">
        <Card className="rounded-lg p-0 shadow-none">
          <CardContent className="grid grid-cols-2 gap-2 p-2.5 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Start</span>
              <div className="rounded-sm border border-border bg-background px-2.5 py-2 font-mono text-foreground">
                {formatReadOnlyDate(timeRange[0])}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">End</span>
              <div className="rounded-sm border border-border bg-background px-2.5 py-2 font-mono text-foreground">
                {formatReadOnlyDate(timeRange[1])}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total Crimes" value={summary?.totalCrimes ?? 0} />
          <MetricCard label="Avg / Day" value={summary?.avgPerDay ?? 0} />
          <MetricCard label="Peak Hour" value={summary?.peakHourLabel ?? '--'} />
          <MetricCard label="Top Crime" value={summary?.mostCommonCrime ?? '--'} />
        </div>

        <Card className="rounded-lg p-0 shadow-none">
          <CardContent className="flex flex-col gap-2.5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Districts</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="xs" onClick={() => setSelectedDistricts([])} className="gap-1 rounded-sm px-2">
                  <Minus className="h-3 w-3" />
                  Clear
                </Button>
                <Button type="button" variant="outline" size="xs" onClick={() => setSelectedDistricts(ALL_DEMO_DISTRICTS)} className="gap-1 rounded-sm px-2">
                  <ChevronUp className="h-3 w-3" />
                  All
                </Button>
              </div>
            </div>

            <div className="max-h-28 overflow-hidden">
              <div className="grid max-h-28 grid-cols-5 gap-1 overflow-y-auto pr-1 text-[11px]">
                {ALL_DEMO_DISTRICTS.map((district) => {
                  const active = selectedDistricts.includes(district);
                  return (
                    <Button
                      key={district}
                      type="button"
                      variant={active ? 'secondary' : 'outline'}
                      size="xs"
                      onClick={() => toggleDistrict(district)}
                      className="justify-center rounded-sm px-2"
                    >
                      {district}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg p-0 shadow-none">
          <CardContent className="flex flex-col gap-2.5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Distribution</h3>
            </div>
            {showDistributionSkeleton ? (
              <DistributionSkeleton />
            ) : (
              <div className="flex flex-col gap-2">
                {topTypes.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate pr-2">{item.name}</span>
                      <span>{item.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(6, Math.min(100, item.percentage))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="hourly" className="space-y-2">
          <div className="max-w-full overflow-x-auto">
            <TabsList className="h-9 w-max rounded-md bg-muted p-0.5">
              <TabsTrigger value="hourly" className="shrink-0 rounded-sm px-2.5 py-1 text-[11px]">Hourly</TabsTrigger>
              <TabsTrigger value="daily" className="shrink-0 rounded-sm px-2.5 py-1 text-[11px]">Daily</TabsTrigger>
              <TabsTrigger value="monthly" className="shrink-0 rounded-sm px-2.5 py-1 text-[11px]">Monthly</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hourly" className="mt-3">
            {showHourlyPulseSkeleton ? (
              <PulseChartSkeleton title="Hourly pulse" readout="24h read" />
            ) : (
              <PulseChart title="Hourly pulse" readout="24h read" points={temporalPulses.hourly} accentClassName="bg-violet-500" labelStep={6} />
            )}
          </TabsContent>

          <TabsContent value="daily" className="mt-3">
            <PulseChart title="Daily trend" readout="7d read" points={temporalPulses.daily} accentClassName="bg-sky-500" labelStep={1} />
          </TabsContent>

          <TabsContent value="monthly" className="mt-3">
            <PulseChart title="Monthly trend" readout="12mo read" points={temporalPulses.monthly} accentClassName="bg-emerald-500" labelStep={1} />
          </TabsContent>
        </Tabs>

        <SelectedDetailPeriodCard />
        <DetailDrilldownCard selectedDistricts={selectedDistricts} />
      </CardContent>
    </Card>
  );
}

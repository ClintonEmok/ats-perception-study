'use client';

import type { EvolvingSlice } from '../lib/types';
import type { computeSliceKde } from '@/lib/kde';
import type { BurstVolumeModel } from '@/lib/stkde/burst-volume';
import type { AllocationMetrics } from '../lib/volume-encoding';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatSliceDate(epochSeconds: number): string {
  return DATE_FORMATTER.format(new Date(epochSeconds * 1000));
}

interface SliceInspectorProps {
  slice: EvolvingSlice | undefined;
  serverEventCount?: number | null;
  sliceKde?: ReturnType<typeof computeSliceKde> | undefined;
  burstiness?: number | null;
  allocationMetrics?: AllocationMetrics | null;
  burstVolumeModel?: BurstVolumeModel | null;
}

function burstinessColor(value: number): string {
  if (value > 0.3) return 'bg-amber-500';
  if (value > 0.1) return 'bg-amber-400/70';
  if (value < -0.3) return 'bg-sky-500/70';
  if (value < -0.1) return 'bg-sky-400/60';
  return 'bg-slate-500';
}

function formatMetric(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : '';
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return `${formatMetric(seconds, 0)}s`;
  if (seconds < 3_600) return `${formatMetric(seconds / 60, 1)}m`;
  if (seconds < 86_400) return `${formatMetric(seconds / 3_600, 1)}h`;
  return `${formatMetric(seconds / 86_400, 1)}d`;
}

function MetricRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="text-right tabular-nums text-slate-100">{value}</span>
    </div>
  );
}

export function SliceInspector({
  slice,
  serverEventCount,
  burstiness,
  allocationMetrics,
  burstVolumeModel,
}: SliceInspectorProps) {
  const hasBurstModel = Boolean(burstVolumeModel && !burstVolumeModel.isNeutral);
  if (!slice && !hasBurstModel) return null;

  const burstinessValue = burstiness ?? 0;
  const burstinessDisplay = Number.isFinite(burstinessValue) ? burstinessValue.toFixed(2) : '0.00';
  const burstinessWidth = Math.max(0, Math.min(1, Math.abs(burstinessValue)));
  const burstSamples = burstVolumeModel?.samples ?? [];
  const maxSampleIntensity = burstSamples.reduce<number | null>((maximum, sample) => {
    if (!Number.isFinite(sample.intensityScore)) return maximum;
    return maximum === null ? sample.intensityScore : Math.max(maximum, sample.intensityScore);
  }, null);

  return (
    <section className="rounded-md border border-border/70 bg-background/60 p-2 text-xs text-slate-300">
      <div className="space-y-1.5">
        {slice ? (
          <>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Clock range</span>
              <span className="text-right tabular-nums text-slate-100">
                {formatSliceDate(slice.startEpoch)} - {formatSliceDate(slice.endEpoch)}
              </span>
            </div>
            <MetricRow label="Clock duration" value={formatDuration(allocationMetrics?.clockDurationSeconds ?? (slice.endEpoch - slice.startEpoch))} />
            <MetricRow
              label="Events"
              value={serverEventCount === undefined
                ? slice.crimeCount.toLocaleString()
                : serverEventCount === null
                  ? '—'
                  : serverEventCount.toLocaleString()}
            />
          </>
        ) : null}

        {allocationMetrics ? (
          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Allocation</div>
            <MetricRow label="Density" value={allocationMetrics.eventDensityPerDay === null ? null : `${formatMetric(allocationMetrics.eventDensityPerDay, 2)} events/day`} />
            <MetricRow label="Adaptive weight" value={allocationMetrics.adaptiveWeight === null ? null : formatMetric(allocationMetrics.adaptiveWeight, 3)} />
            <MetricRow label="Signal" value={allocationMetrics.signal === null ? null : formatMetric(allocationMetrics.signal, 3)} />
            <MetricRow label="Visual duration" value={allocationMetrics.displayDurationSeconds === null ? null : formatDuration(allocationMetrics.displayDurationSeconds)} />
            <MetricRow label="Linear share" value={allocationMetrics.linearShare === null ? null : `${formatMetric(allocationMetrics.linearShare * 100, 1)}%`} />
            <MetricRow label="Visual share" value={allocationMetrics.visualShare === null ? null : `${formatMetric(allocationMetrics.visualShare * 100, 1)}%`} />
            <MetricRow label="Expansion / compression" value={allocationMetrics.expansionCompressionPercent === null ? null : `${allocationMetrics.expansionCompressionPercent >= 0 ? '+' : ''}${formatMetric(allocationMetrics.expansionCompressionPercent, 1)}%`} />
            <MetricRow label="Visual thickness" value={allocationMetrics.visualThickness === null ? null : formatMetric(allocationMetrics.visualThickness, 2)} />
          </div>
        ) : null}

        {hasBurstModel && burstVolumeModel ? (
          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Burst volume</div>
            <MetricRow label="Clock duration" value={formatDuration(burstVolumeModel.durationSec)} />
            <MetricRow label="Support" value={formatMetric(burstVolumeModel.spatialFootprint.supportCount, 0)} />
            <MetricRow label="Peak intensity" value={maxSampleIntensity === null ? null : formatMetric(maxSampleIntensity, 3)} />
            <MetricRow label="Spread" value={formatMetric(burstVolumeModel.spatialFootprint.spreadMeters, 1) ? `${formatMetric(burstVolumeModel.spatialFootprint.spreadMeters, 1)}m avg / ${formatMetric(burstVolumeModel.spatialFootprint.maxSpreadMeters, 1)}m max` : null} />
            <MetricRow label="Adaptive height" value={formatMetric(burstVolumeModel.adaptiveHeight, 2)} />
          </div>
        ) : null}
      </div>

      {slice ? (
        <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-slate-400">
          <span>Burstiness</span>
          <span className="tabular-nums text-slate-100">{burstinessDisplay}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${burstinessColor(burstinessValue)}`}
            style={{ width: `${burstinessWidth * 100}%` }}
          />
        </div>
        </div>
      ) : null}
    </section>
  );
}

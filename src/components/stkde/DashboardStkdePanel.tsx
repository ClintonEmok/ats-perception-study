"use client";

import { useMemo } from 'react';
import { useDashboardStkde } from '@/app/dashboard-v2/hooks/useDashboardStkde';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { STKDE_PARAM_LIMITS, useStkdeStore } from '@/store/useStkdeStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';

const formatTimeWindow = (startEpochSec: number, endEpochSec: number) => {
  const start = new Date(startEpochSec * 1000).toLocaleString();
  const end = new Date(endEpochSec * 1000).toLocaleString();
  return `${start} → ${end}`;
};

export function DashboardStkdePanel() {
  const { runStkde, cancelStkde, setScopeMode, setParams, scopeLabel, scopeMode, runStatus } = useDashboardStkde();

  const params = useStkdeStore((state) => state.params);
  const response = useStkdeStore((state) => state.response);
  const runMeta = useStkdeStore((state) => state.runMeta);
  const isStale = useStkdeStore((state) => state.isStale);
  const staleReason = useStkdeStore((state) => state.staleReason);
  const errorMessage = useStkdeStore((state) => state.errorMessage);
  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const hoveredHotspotId = useStkdeStore((state) => state.hoveredHotspotId);
  const setHotspotSelection = useStkdeStore((state) => state.setHotspotSelection);
  const lastAppliedAt = useTimeslicingModeStore((state) => state.lastAppliedAt);

  const appliedSliceCount = useSliceDomainStore(
    (state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible).length
  );

  const hotspots = response?.hotspots ?? [];

  const parseNumericInput = (rawValue: string): number | undefined => {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const statusText = useMemo(() => {
    if (runStatus === 'running') return 'computing…';
    if (runStatus === 'error') return errorMessage ?? 'Failed to compute STKDE';
    if (runStatus === 'cancelled') return 'STKDE run cancelled';
    if (runStatus === 'success') return `Computed ${hotspots.length} hotspots`;
    return 'Ready';
  }, [errorMessage, hotspots.length, runStatus]);

  return (
    <section className="rounded-xl border border-border/70 bg-card/80 p-3 text-card-foreground shadow-sm">
      <header className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-foreground">STKDE Investigation</h2>
        <div className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200">
          {scopeLabel}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {lastAppliedAt ? `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}` : 'No applied state yet'}
        </p>
      </header>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => setScopeMode('applied-slices')}
            className={`rounded border px-2 py-1 transition-colors ${
              scopeMode === 'applied-slices'
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Applied Slices
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('full-viewport')}
            className={`rounded border px-2 py-1 transition-colors ${
              scopeMode === 'full-viewport'
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Full Viewport
          </button>
        </div>

        {scopeMode === 'applied-slices' && appliedSliceCount === 0 ? (
          <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
            No applied slices detected. STKDE will use full viewport scope until slices are applied.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground">
          <label>
            spatialBandwidthMeters
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.spatialBandwidthMeters.min}
              max={STKDE_PARAM_LIMITS.spatialBandwidthMeters.max}
              step={50}
              value={params.spatialBandwidthMeters}
              onChange={(event) =>
                setParams({ spatialBandwidthMeters: parseNumericInput(event.target.value) })
              }
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label>
            temporalBandwidthHours
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.temporalBandwidthHours.min}
              max={STKDE_PARAM_LIMITS.temporalBandwidthHours.max}
              value={params.temporalBandwidthHours}
              onChange={(event) =>
                setParams({ temporalBandwidthHours: parseNumericInput(event.target.value) })
              }
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label>
            gridCellMeters
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.gridCellMeters.min}
              max={STKDE_PARAM_LIMITS.gridCellMeters.max}
              step={50}
              value={params.gridCellMeters}
              onChange={(event) => setParams({ gridCellMeters: parseNumericInput(event.target.value) })}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label>
            topK
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.topK.min}
              max={STKDE_PARAM_LIMITS.topK.max}
              value={params.topK}
              onChange={(event) => setParams({ topK: parseNumericInput(event.target.value) })}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label>
            minSupport
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.minSupport.min}
              max={STKDE_PARAM_LIMITS.minSupport.max}
              value={params.minSupport}
              onChange={(event) => setParams({ minSupport: parseNumericInput(event.target.value) })}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label>
            timeWindowHours
            <input
              type="number"
              min={STKDE_PARAM_LIMITS.timeWindowHours.min}
              max={STKDE_PARAM_LIMITS.timeWindowHours.max}
              value={params.timeWindowHours}
              onChange={(event) => setParams({ timeWindowHours: parseNumericInput(event.target.value) })}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => void runStkde()}
            disabled={runStatus === 'running'}
            className="rounded border border-indigo-500/70 bg-indigo-500/10 px-3 py-1 text-indigo-700 hover:bg-indigo-500/15 disabled:opacity-60 dark:text-indigo-100"
          >
            Run STKDE
          </button>
          {runStatus === 'running' ? (
            <button
              type="button"
              onClick={cancelStkde}
              className="rounded border border-border bg-background px-3 py-1 text-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] text-foreground">
          <div>{statusText}</div>
          {runMeta ? (
            <div className="mt-1 text-muted-foreground">
              requested={runMeta.requestedComputeMode} effective={runMeta.effectiveComputeMode}
              {runMeta.truncated ? ' • truncated' : ''}
              {runMeta.fallbackApplied ? ` • fallback=${runMeta.fallbackApplied}` : ''}
              {runMeta.clampsApplied.length > 0 ? ` • clamps=${runMeta.clampsApplied.join('|')}` : ''}
            </div>
          ) : null}
        </div>

        {isStale && staleReason === 'applied-slices-updated' ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
            applied slices changed — rerun STKDE
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">Hotspots</h3>
          {hotspots.length === 0 ? (
            <div className="rounded border border-dashed border-border px-2 py-3 text-[11px] text-muted-foreground">
              No hotspots yet. Run STKDE to generate hotspot candidates.
            </div>
          ) : (
            hotspots.map((hotspot, index) => {
              const isSelected = selectedHotspotId === hotspot.id;
              const isHovered = hoveredHotspotId === hotspot.id;
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  className={`w-full rounded border px-2 py-2 text-left text-[11px] transition-colors ${
                    isSelected
                      ? 'border-rose-400/70 bg-rose-50 text-foreground dark:bg-rose-500/10'
                      : isHovered
                        ? 'border-border bg-muted/60 text-foreground'
                        : 'border-border bg-background/70 text-foreground'
                  }`}
                  onClick={() => setHotspotSelection(hotspot.id, hotspot.id)}
                  onMouseEnter={() => setHotspotSelection(selectedHotspotId, hotspot.id)}
                  onMouseLeave={() => setHotspotSelection(selectedHotspotId, null)}
                >
                  <div className="font-medium text-foreground">Hotspot {index + 1}</div>
                  <div className="mt-1 text-muted-foreground">Location: {hotspot.centroidLat.toFixed(4)}, {hotspot.centroidLng.toFixed(4)}</div>
                  <div className="mt-1 text-muted-foreground">Intensity: {hotspot.intensityScore.toFixed(3)}</div>
                  <div className="mt-1 text-muted-foreground">Support: {hotspot.supportCount}</div>
                  <div className="mt-1 text-muted-foreground">
                    Time window: {formatTimeWindow(hotspot.peakStartEpochSec, hotspot.peakEndEpochSec)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { STKDE_PARAM_LIMITS, type StkdeParams } from '@/store/useStkdeStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemo3d } from './DashboardDemo3dProvider';

const PARAM_FIELDS: Array<{
  key: keyof StkdeParams;
  label: string;
  suffix: string;
}> = [
  { key: 'spatialBandwidthMeters', label: 'Spatial bandwidth', suffix: 'm' },
  { key: 'temporalBandwidthHours', label: 'Temporal bandwidth', suffix: 'h' },
  { key: 'gridCellMeters', label: 'Grid cell', suffix: 'm' },
  { key: 'topK', label: 'Top K hotspots', suffix: '' },
  { key: 'minSupport', label: 'Minimum support', suffix: '' },
  { key: 'timeWindowHours', label: 'Time window', suffix: 'h' },
];

export function StkdeAnalysisPanel() {
  const params = useDashboardDemoCoordinationStore((state) => state.stkdeParams);
  const scopeMode = useDashboardDemoCoordinationStore((state) => state.stkdeScopeMode);
  const setParams = useDashboardDemoCoordinationStore((state) => state.setStkdeParams);
  const setScopeMode = useDashboardDemoCoordinationStore((state) => state.setStkdeScopeMode);
  const selectedDistricts = useDashboardDemoCoordinationStore((state) => state.selectedDistricts);
  const { response, error, isLoading, isStale, status, responseMetadata, refresh } = useDashboardDemo3d();

  const updateParam = (key: keyof StkdeParams, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setParams({ [key]: parsed } as Partial<StkdeParams>);
  };

  return (
    <section className="space-y-2" aria-label="STKDE analysis controls">
      <header className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">STKDE</div>
            <h2 className="mt-1 text-sm font-medium text-foreground">Server-authoritative surfaces</h2>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              One debounced server response drives the map, cube, hotspots, trajectories, and compare surfaces.
            </p>
          </div>
          <Button type="button" variant="outline" size="icon-sm" onClick={refresh} aria-label="Retry STKDE request">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-2 py-1.5 text-[10px]">
          <span className="text-muted-foreground">Scope</span>
          <button
            type="button"
            aria-pressed={scopeMode === 'applied-slices'}
            onClick={() => setScopeMode('applied-slices')}
            className="rounded-md bg-foreground px-2 py-1 text-background transition"
          >
            Applied slices only
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-3" aria-label="STKDE server tuning">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Server tuning</div>
        <div className="space-y-2">
          {PARAM_FIELDS.map(({ key, label, suffix }) => {
            const limits = STKDE_PARAM_LIMITS[key];
            return (
              <label key={key} className="block space-y-1">
                <span className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <Label htmlFor={`dashboard-stkde-${key}`} className="text-[10px] text-muted-foreground">{label}</Label>
                  <span className="font-mono tabular-nums text-foreground">{params[key]}{suffix}</span>
                </span>
                <input
                  id={`dashboard-stkde-${key}`}
                  type="range"
                  min={limits.min}
                  max={limits.max}
                  step={1}
                  value={params[key]}
                  onChange={(event) => updateParam(key, event.target.value)}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3 text-[10px] text-muted-foreground" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold uppercase tracking-[0.18em] text-foreground">Request status</span>
          <span className={isStale ? 'text-amber-700' : 'text-muted-foreground'}>{status}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
          <span>Districts</span><strong className="text-right font-normal text-foreground">{selectedDistricts.length || 'All'}</strong>
          <span>Events</span><strong className="text-right font-normal text-foreground">{responseMetadata?.eventCount ?? '—'}</strong>
          <span>Sparse cells</span><strong className="text-right font-normal text-foreground">{responseMetadata?.cellCount ?? '—'}</strong>
          <span>Hotspots</span><strong className="text-right font-normal text-foreground">{responseMetadata?.hotspotCount ?? '—'}</strong>
          <span>Compute</span><strong className="text-right font-normal text-foreground">{responseMetadata?.effectiveComputeMode ?? '—'}</strong>
        </div>
        {isLoading ? <p className="mt-2 text-foreground">{response ? 'Updating; last valid surfaces remain visible.' : 'Loading server STKDE…'}</p> : null}
        {error ? <p className="mt-2 text-destructive">{error} <button type="button" className="underline" onClick={refresh}>Retry</button></p> : null}
        {!isLoading && !error && responseMetadata?.truncated ? <p className="mt-2 text-amber-700">Response was truncated by server limits.</p> : null}
        {!isLoading && !error && responseMetadata?.clampsApplied.length ? <p className="mt-2 text-amber-700">Server clamps: {responseMetadata.clampsApplied.join(', ')}</p> : null}
        {responseMetadata?.fallbackApplied ? <p className="mt-2 text-amber-700">Fallback applied: {responseMetadata.fallbackApplied}</p> : null}
        {responseMetadata?.sourceLabel === 'configured-mock' ? <p className="mt-2 text-amber-700">Configured mock data; not live analysis.</p> : null}
        {responseMetadata?.sourceLabel === 'fallback-warning' ? <p className="mt-2 text-amber-700">Fallback data; interpret as a warning state.</p> : null}
        {!isLoading && !error && response && responseMetadata?.cellCount === 0 ? <p className="mt-2">No STKDE cells for this interval.</p> : null}
      </section>

    </section>
  );
}

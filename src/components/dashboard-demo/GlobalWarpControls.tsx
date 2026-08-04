"use client";

import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_WARP_FACTOR_MAX,
  dashboardWarpFactorToBlend,
  dashboardWarpPercentToFactor,
} from '@/components/dashboard-demo/lib/warp-contract';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';

const SECONDS_PER_DAY = 24 * 60 * 60;
const TEMPORAL_RES_MIN_DAYS = 0.25;
const TEMPORAL_RES_MAX_DAYS = 7;
const TEMPORAL_RES_STEP_DAYS = 0.25;
const WARP_FACTOR_PERCENT_MAX = 100;

function clampDays(days: number): number {
  return Math.min(TEMPORAL_RES_MAX_DAYS, Math.max(TEMPORAL_RES_MIN_DAYS, days));
}

function formatDaysLabel(days: number): string {
  if (days >= 1) {
    const wholeOrHalf = days % 1 === 0 ? days.toFixed(0) : days.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${wholeOrHalf} day${days === 1 ? '' : 's'}`;
  }
  const hours = days * 24;
  return `${hours} hr`;
}

export function GlobalWarpControls() {
  const isEvaluationLocked = useIsEvaluationLocked();

  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const setDemoTimeScaleMode = useDashboardDemoTimeStore((state) => state.setTimeScaleMode);
  const warpSource = useDashboardDemoCoordinationStore((state) => state.warpSource);
  const setWarpSource = useDashboardDemoCoordinationStore((state) => state.setWarpSource);

  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);

  const cubeScopeMode = useDashboardDemoCoordinationStore((state) => state.cubeScopeMode);
  const setCubeScopeMode = useDashboardDemoCoordinationStore((state) => state.setCubeScopeMode);
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const hasAppliedSlices = useSliceDomainStore((state) =>
    state.slices.some((s) => s.source === 'generated-applied'),
  );
  const slices = useSliceDomainStore((state) => state.slices);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);

  const volumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.volumeScaleSeconds);
  const setVolumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.setVolumeScaleSeconds);



  const temporalDays = useMemo(() => volumeScaleSeconds / SECONDS_PER_DAY, [volumeScaleSeconds]);

  const handleTemporalSliderChange = useCallback(
    (value: number[]) => {
      const next = clampDays(value[0] ?? temporalDays);
      setVolumeScaleSeconds(next * SECONDS_PER_DAY);
    },
    [setVolumeScaleSeconds, temporalDays],
  );

  const handleTemporalStep = useCallback(
    (direction: number) => {
      const next = clampDays(temporalDays + direction * TEMPORAL_RES_STEP_DAYS);
      setVolumeScaleSeconds(next * SECONDS_PER_DAY);
    },
    [setVolumeScaleSeconds, temporalDays],
  );

  const handleWarpSliderChange = useCallback(
    (value: number[]) => {
      setWarpFactor(dashboardWarpPercentToFactor(value[0] ?? dashboardWarpFactorToBlend(warpFactor) * 100));
    },
    [setWarpFactor, warpFactor],
  );

  const handleTimeScaleToggle = useCallback(() => {
    const nextMode = timeScaleMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    setDemoTimeScaleMode(nextMode);
  }, [setDemoTimeScaleMode, setTimeScaleMode, timeScaleMode]);

  const handleWarpSourceToggle = useCallback((nextSource: 'density' | 'slice-authored') => {
    if (nextSource === 'slice-authored') {
      slices
        .filter((slice) => slice.isVisible && slice.type === 'range')
        .forEach((slice) => updateSlice(slice.id, { warpWeight: 1 }));
    }

    setWarpSource(nextSource);
  }, [setWarpSource, slices, updateSlice]);

  const warpPercent = Math.round((warpFactor / DASHBOARD_WARP_FACTOR_MAX) * WARP_FACTOR_PERCENT_MAX);

  return (
    <section
      className={cn(
        'mx-2 mt-2 space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs text-muted-foreground',
        isEvaluationLocked && 'pointer-events-none opacity-60',
      )}
      aria-label="global adaptive warp controls"
    >
      <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground">Temporal resolution</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatDaysLabel(temporalDays)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Slider
            min={TEMPORAL_RES_MIN_DAYS}
            max={TEMPORAL_RES_MAX_DAYS}
            step={TEMPORAL_RES_STEP_DAYS}
            value={[clampDays(temporalDays)]}
            onValueChange={handleTemporalSliderChange}
            aria-label="Temporal resolution in days"
            disabled={isEvaluationLocked}
          />
          <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => handleTemporalStep(-1)}
              aria-label="Decrease temporal resolution"
              disabled={isEvaluationLocked}
            >
              <ChevronLeft className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => handleTemporalStep(1)}
              aria-label="Increase temporal resolution"
              disabled={isEvaluationLocked}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground">Time scale</span>
          <Button
            type="button"
            onClick={handleTimeScaleToggle}
            variant={timeScaleMode === 'adaptive' ? 'secondary' : 'outline'}
            size="sm"
            className="h-6 rounded-sm px-2.5 text-[11px] font-medium"
            disabled={isEvaluationLocked}
            aria-label={`Time scale: ${timeScaleMode === 'adaptive' ? 'Adaptive' : 'Linear'}. Click to toggle.`}
          >
            {timeScaleMode === 'adaptive' ? 'Adaptive' : 'Linear'}
          </Button>
        </div>
        {timeScaleMode === 'adaptive' ? (
          <>
            <div className="flex items-center gap-2 pt-1">
              <span className="shrink-0 text-foreground">Warp factor</span>
              <Slider
                min={0}
                max={WARP_FACTOR_PERCENT_MAX}
                step={1}
                value={[warpPercent]}
                onValueChange={handleWarpSliderChange}
                aria-label="Warp factor"
                disabled={isEvaluationLocked}
              />
              <span className="w-10 shrink-0 text-right font-mono tabular-nums text-foreground">
                {warpPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="text-foreground">Warp source</span>
              <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 p-0.5">
                <Button
                  type="button"
                  variant={warpSource === 'density' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 rounded-sm px-2 text-[11px]"
                  onClick={() => handleWarpSourceToggle('density')}
                  disabled={isEvaluationLocked}
                >
                  Density
                </Button>
                <Button
                  type="button"
                  variant={warpSource === 'slice-authored' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 rounded-sm px-2 text-[11px]"
                  onClick={() => handleWarpSourceToggle('slice-authored')}
                  disabled={isEvaluationLocked}
                >
                  Slice-authored
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {brushRange !== null || hasAppliedSlices ? (
        <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-foreground">Cube scope</span>
            <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 p-0.5">
              <Button
                type="button"
                variant={cubeScopeMode === 'full' ? 'secondary' : 'ghost'}
                size="icon-xs"
                className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
                onClick={() => setCubeScopeMode('full')}
                aria-label="Overview mode — show full time range"
                disabled={isEvaluationLocked}
              >
                <Maximize2 className="size-3" />
              </Button>
              <Button
                type="button"
                variant={cubeScopeMode === 'brushed' ? 'secondary' : 'ghost'}
                size="icon-xs"
                className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
                onClick={() => setCubeScopeMode('brushed')}
                aria-label="Detail mode — zoom to brushed range"
                disabled={isEvaluationLocked}
              >
                <ZoomIn className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

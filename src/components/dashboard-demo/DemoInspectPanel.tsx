"use client";

import { Focus, Pause, Play, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { SliceScrubber } from '@/app/stkde-3d/components/SliceScrubber';
import { useDashboardDemo3d } from './DashboardDemo3dProvider';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import { resolveSliceEventCount } from '@/components/dashboard-demo/lib/stkde-slice-accounting';

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

export function DemoInspectPanel() {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackDirection = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackDirection);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const sliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectSliceOpacity);
  const activeSliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectActiveSliceOpacity);
  const nonActiveSliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectNonActiveSliceOpacity);
  const showRawEvents = useDashboardDemoCoordinationStore((state) => state.showRawEvents);
  const showHotspotTrajectories = useDashboardDemoCoordinationStore((state) => state.showHotspotTrajectories);
  const hotspotMatchingMode = useDashboardDemoCoordinationStore((state) => state.hotspotMatchingMode);
  const inspectInterpolation = useDashboardDemoCoordinationStore((state) => state.inspectInterpolation);
  const crimeFetchStatus = useDashboardDemoCoordinationStore((state) => state.crimeFetchStatus);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setViewMode = useDashboardDemoCoordinationStore((state) => state.setViewMode);
  const togglePlayback = useDashboardDemoCoordinationStore((state) => state.toggleInspectPlayback);
  const setPlaybackDirection = useDashboardDemoCoordinationStore((state) => state.setInspectPlaybackDirection);
  const setPlaybackSpeed = useDashboardDemoCoordinationStore((state) => state.setInspectPlaybackSpeed);
  const setSliceOpacity = useDashboardDemoCoordinationStore((state) => state.setInspectSliceOpacity);
  const setActiveSliceOpacity = useDashboardDemoCoordinationStore((state) => state.setInspectActiveSliceOpacity);
  const setNonActiveSliceOpacity = useDashboardDemoCoordinationStore((state) => state.setInspectNonActiveSliceOpacity);
  const toggleRawEvents = useDashboardDemoCoordinationStore((state) => state.toggleShowRawEvents);
  const toggleTrajectories = useDashboardDemoCoordinationStore((state) => state.toggleShowHotspotTrajectories);
  const setMatchingMode = useDashboardDemoCoordinationStore((state) => state.setHotspotMatchingMode);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const { response, isLoading, error, isStale, responseMetadata } = useDashboardDemo3d();

  const visibleSlices = slices
    .filter((slice) => slice.isVisible && slice.type === 'range')
    .map((slice) => {
      const [startEpoch, endEpoch] = minTimestampSec !== null && maxTimestampSec !== null
        ? resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec)
        : [0, 1];
      const serverEventCount = resolveSliceEventCount(response, slice.id);
      return {
        sourceSliceId: slice.id,
        index: 0,
        label: slice.name || 'Slice',
        startEpoch,
        endEpoch,
        burstScore: slice.burstScore ?? 0,
        burstiness: slice.burstinessCoefficient ?? null,
        crimeCount: serverEventCount ?? 0,
        serverEventCount,
      };
    })
    .sort((left, right) => left.startEpoch - right.startEpoch)
    .map((slice, index) => ({ ...slice, index, label: slice.label || `Slice ${index + 1}` }));

  const activeSlice = visibleSlices[activeIndex] ?? visibleSlices[0] ?? null;
  const isFocusedView = viewMode === 'focus';

  const setIndex = (index: number) => {
    const next = Math.max(0, Math.min(visibleSlices.length - 1, index));
    setActiveSliceIndex(next);
    const slice = visibleSlices[next];
    if (slice) setActiveSlice(slice.sourceSliceId);
  };

  if (visibleSlices.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inspect 3D</CardTitle>
          <CardDescription className="text-xs">No applied slices yet</CardDescription>
        </CardHeader>
        <CardContent><p className="py-4 text-center text-xs text-muted-foreground">Apply range slices to inspect STKDE evolution.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm">{activeSlice?.label ?? 'Inspect 3D'}</CardTitle>
              <CardDescription className="text-xs">
                {isLoading ? 'STKDE surfaces loading…' : isStale ? 'Showing last valid STKDE response while updating.' : error ? `STKDE error: ${error}` : `${responseMetadata?.eventCount ?? 0} server events across the response`}
              </CardDescription>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{crimeFetchStatus === 'loading' ? 'events loading' : 'server STKDE'}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={togglePlayback} className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              aria-pressed={playbackDirection === 'reverse'}
              onClick={() => setPlaybackDirection(playbackDirection === 'forward' ? 'reverse' : 'forward')}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${playbackDirection === 'reverse' ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-border bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <RotateCcw className="size-3.5" />
              {playbackDirection === 'reverse' ? 'Reverse' : 'Forward'}
            </button>
            <button type="button" aria-pressed={isFocusedView} onClick={() => setViewMode(isFocusedView ? 'stack' : 'focus')} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${isFocusedView ? 'border-sky-400/60 bg-sky-400/10 text-sky-100' : 'border-border bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Focus className="size-3.5" />{isFocusedView ? 'Single' : 'Stack'}
            </button>
            <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} className="ml-auto rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground" aria-label="Playback speed">
              {[0.5, 1, 1.5, 2, 3].map((speed) => <option key={speed} value={speed}>{speed.toFixed(1)}x</option>)}
            </select>
          </div>

          <SliceScrubber slices={visibleSlices} activeIndex={activeIndex} onActiveIndexChange={setIndex} />

          <ControlToggle label="Active events" pressed={showRawEvents} onChange={toggleRawEvents} />
          <ControlToggle label="Trajectories" pressed={showHotspotTrajectories} onChange={toggleTrajectories} />
          <div className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1">
            <button type="button" aria-pressed={hotspotMatchingMode === 'adaptive'} onClick={() => setMatchingMode('adaptive')} className={`rounded-md px-2 py-1.5 text-[10px] ${hotspotMatchingMode === 'adaptive' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background'}`}>Adaptive server cell</button>
          </div>

          <OpacityControl label="Overall slice opacity" value={sliceOpacity} onChange={setSliceOpacity} max={1.5} />
          <OpacityControl label="Active emphasis" value={activeSliceOpacity} onChange={setActiveSliceOpacity} />
          <OpacityControl label="Non-active emphasis" value={nonActiveSliceOpacity} onChange={setNonActiveSliceOpacity} />

          <div className="rounded-md border border-border/70 bg-muted/40 p-2 text-[10px] text-muted-foreground" role="note">
            <div className="flex items-center justify-between gap-2"><span>Interpolation</span><span>Unavailable</span></div>
            <p className="mt-1">Sparse server surfaces have no positional correspondence, so interpolation is disabled (saved setting: {inspectInterpolation ? 'on' : 'off'}).</p>
          </div>

         </CardContent>
      </Card>
    </div>
  );
}

function ControlToggle({ label, pressed, onChange }: { label: string; pressed: boolean; onChange: () => void }) {
  return <button type="button" aria-pressed={pressed} onClick={onChange} className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-[11px] ${pressed ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground' : 'border-border bg-muted text-muted-foreground'}`}><span>{label}</span><span>{pressed ? 'On' : 'Off'}</span></button>;
}

function OpacityControl({ label, value, onChange, max = 1 }: { label: string; value: number; onChange: (value: number) => void; max?: number }) {
  return (
    <label className="block rounded-md border border-border/70 bg-muted/40 p-2 text-[10px] text-muted-foreground">
      <span className="mb-1 flex items-center justify-between gap-2"><span>{label}</span><span className="font-mono tabular-nums text-foreground">{Math.round(value * 100)}%</span></span>
      <Slider min={0} max={max} step={0.05} value={[value]} onValueChange={([next]) => onChange(next ?? value)} aria-label={label} />
    </label>
  );
}

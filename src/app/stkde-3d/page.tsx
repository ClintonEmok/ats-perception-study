'use client';

import { useEffect, useMemo, useState } from 'react';
import { Focus, Pause, Play } from 'lucide-react';
import { generateStkde3dMockData, generateStkde3dRealData } from './lib/mock-data';
import { computeSliceKde, KDE_SCENE_SPAN_METERS } from '@/lib/kde';
import { Stkde3DScene } from './components/Stkde3DScene';
import { createStkde3DSceneRuntime } from './components/Stkde3DSceneProvider';
import { SliceInspector } from './components/SliceInspector';
import type { StkdeHeatmapRenderer } from './components/StkdeSliceStack';
import { KdeTuningPanel } from './components/KdeTuningPanel';
import { buildKdeHotspotSliceResults } from './lib/kde-hotspots';
import { buildStandaloneAdaptiveTimeMaps } from './lib/standalone-adaptive-time';
import { buildAllocationMetrics, buildDurationVolumeProfile } from './lib/volume-encoding';
import type { Stkde3DTemporalWindowPayload } from './components/Stkde3DSceneProvider';
import { buildHotspotEvolution, getAdaptiveMatchToleranceMeters, type HotspotMatchingMode, type HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { KdeParams } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';
import type { EvolvingSlice } from './lib/types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const REAL_DATA_RANGE = {
  startEpoch: 978307200,
  endEpoch: 1767225599,
  limit: 1200,
};

const EXPERIMENTAL_KDE_PARAMS: KdeParams = {
  gridSize: 48,
  sigmaCells: 1.35,
  smoothingMeters: 150,
  kernelRadiusCells: 4,
  threshold: 0.2,
};

type DatasetState = {
  slices: ReturnType<typeof generateStkde3dMockData>['slices'];
  sliceEvents: ReturnType<typeof generateStkde3dMockData>['sliceEvents'];
  source: 'real' | 'mock';
};

function StandaloneSliceScrubber({
  slices,
  activeIndex,
  isPlaying,
  playbackSpeed,
  onActiveIndexChange,
  onPlayingChange,
  onPlaybackSpeedChange,
  onScrubbingChange,
}: {
  slices: EvolvingSlice[];
  activeIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onActiveIndexChange: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onPlaybackSpeedChange: (speed: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
}) {
  const clampIndex = (index: number) => Math.max(0, Math.min(slices.length - 1, index));
  const stepTo = (index: number) => {
    onPlayingChange(false);
    onScrubbingChange(false);
    onActiveIndexChange(clampIndex(index));
  };

  return (
    <div className="rounded-md border border-border/70 bg-background/60 p-2 text-xs text-slate-300">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Scrub slices</span>
        <span className="font-mono text-muted-foreground/80 tabular-nums">{activeIndex + 1} / {slices.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stepTo(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-sky-400/60 hover:text-sky-100"
        >
          Prev
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, slices.length - 1)}
          step={1}
          value={Math.max(0, activeIndex)}
          onPointerDown={() => {
            onPlayingChange(false);
            onScrubbingChange(true);
          }}
          onPointerUp={() => onScrubbingChange(false)}
          onPointerCancel={() => onScrubbingChange(false)}
          onChange={(event) => stepTo(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
          aria-label="Slice scrubber"
        />
        <button
          type="button"
          onClick={() => stepTo(activeIndex + 1)}
          disabled={activeIndex >= slices.length - 1}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-sky-400/60 hover:text-sky-100"
        >
          Next
        </button>
      </div>
      <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Speed</span>
          <span className="tabular-nums text-slate-100">{playbackSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={playbackSpeed}
          onChange={(event) => onPlaybackSpeedChange(Number(event.target.value))}
          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
          aria-label="Playback speed"
        />
      </div>
      <div className="sr-only" aria-live="polite">{isPlaying ? 'Playing' : 'Paused'}</div>
    </div>
  );
}

export default function Stkde3DPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFocusedView, setIsFocusedView] = useState(false);
  const [showRawEvents, setShowRawEvents] = useState(false);
  const [showHotspotTrajectories, setShowHotspotTrajectories] = useState(true);
  const [adaptiveTimeEnabled, setAdaptiveTimeEnabled] = useState(true);
  const [heatmapRenderer, setHeatmapRenderer] = useState<StkdeHeatmapRenderer>('field');
  const [hotspotMatchingMode, setHotspotMatchingMode] = useState<HotspotMatchingMode>('fixed');
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);
  const [scanProposal, setScanProposal] = useState<Stkde3DTemporalWindowPayload | null>(null);
  const [kdeParams, setKdeParams] = useState<KdeParams>(EXPERIMENTAL_KDE_PARAMS);
  const [dataset, setDataset] = useState<DatasetState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDataset() {
      try {
        const params = new URLSearchParams({
          startEpoch: REAL_DATA_RANGE.startEpoch.toString(),
          endEpoch: REAL_DATA_RANGE.endEpoch.toString(),
          bufferDays: '0',
          limit: REAL_DATA_RANGE.limit.toString(),
        });

        const response = await fetch(`/api/crimes/range?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as { data?: CrimeRecord[] };
        const realDataset = generateStkde3dRealData(result.data ?? []);

        if (realDataset.slices.length === 0) {
          throw new Error('No real crime subset returned');
        }

        if (!cancelled) {
          setDataset({ ...realDataset, source: 'real' });
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          const fallback = generateStkde3dMockData();
          setDataset({ ...fallback, source: 'mock' });
          setActiveIndex(0);
        }
      }
    }

    loadDataset();

    return () => {
      cancelled = true;
    };
  }, []);

  const slices = useMemo(() => dataset?.slices ?? [], [dataset]);
  const sliceEvents = useMemo(() => dataset?.sliceEvents ?? [], [dataset]);
  const sceneSlices = useMemo(
    () => slices.map((slice, index) => ({
      ...slice,
      index,
      sourceSliceId: `standalone-${index}-${slice.startEpoch}-${slice.endEpoch}`,
    })),
    [slices],
  );
  const timeDomain = useMemo<[number, number]>(() => {
    if (sceneSlices.length === 0) {
      return [REAL_DATA_RANGE.startEpoch, REAL_DATA_RANGE.endEpoch];
    }

    const start = Math.min(...sceneSlices.map((slice) => slice.startEpoch));
    const end = Math.max(...sceneSlices.map((slice) => slice.endEpoch));
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return [REAL_DATA_RANGE.startEpoch, REAL_DATA_RANGE.endEpoch];
    }
    return end > start ? [start, end] : [start, start + 1];
  }, [sceneSlices]);
  const isRealData = dataset?.source === 'real';

  const sliceKdeResults = useMemo(
    () => sliceEvents.map((events) => computeSliceKde(events, kdeParams)),
    [kdeParams, sliceEvents],
  );

  const sliceKdes = useMemo(
    () => sliceKdeResults.map((result) => result.cells),
    [sliceKdeResults],
  );

  const hotspotSliceResults = useMemo(
    () => buildKdeHotspotSliceResults(sceneSlices, sliceKdes, kdeParams.gridSize),
    [kdeParams.gridSize, sceneSlices, sliceKdes],
  );

  const standaloneAdaptiveTimeMaps = useMemo(
    () => buildStandaloneAdaptiveTimeMaps(sliceEvents, timeDomain),
    [sliceEvents, timeDomain],
  );

  const effectiveSmoothingMeters = useMemo(() => {
    const safeGridSize = Number.isFinite(kdeParams.gridSize) ? Math.max(4, Math.round(kdeParams.gridSize)) : 4;
    return Number.isFinite(kdeParams.smoothingMeters)
      ? Math.max(1, kdeParams.smoothingMeters as number)
      : Math.max(1, (kdeParams.sigmaCells * KDE_SCENE_SPAN_METERS) / safeGridSize);
  }, [kdeParams.gridSize, kdeParams.sigmaCells, kdeParams.smoothingMeters]);

  const hotspotMatchingOptions = useMemo<HotspotMatchingOptions>(
    () => ({
      mode: hotspotMatchingMode,
      gridSize: kdeParams.gridSize,
      smoothingMeters: effectiveSmoothingMeters,
    }),
    [effectiveSmoothingMeters, hotspotMatchingMode, kdeParams.gridSize],
  );

  const adaptiveToleranceKm = getAdaptiveMatchToleranceMeters(
    kdeParams.gridSize,
    effectiveSmoothingMeters,
  ) / 1000;

  const qualifiedTrackCount = useMemo(
    () => buildHotspotEvolution(hotspotSliceResults, hotspotMatchingOptions).tracks
      .filter((track) => track.snapshots.length >= 2)
      .length,
    [hotspotMatchingOptions, hotspotSliceResults],
  );

  const volumeProfile = useMemo(
    () => buildDurationVolumeProfile(sceneSlices, {
      timeScaleMode: adaptiveTimeEnabled ? 'adaptive' : 'linear',
      warpBlend: adaptiveTimeEnabled ? 1 : 0,
      warpMap: standaloneAdaptiveTimeMaps.warpMap,
      warpDomain: timeDomain,
    }),
    [adaptiveTimeEnabled, sceneSlices, standaloneAdaptiveTimeMaps.warpMap, timeDomain],
  );

  const totalEvents = useMemo(
    () => slices.reduce((sum, s) => sum + s.crimeCount, 0),
    [slices],
  );

  const activeSlice = slices[activeIndex];
  const inspectedSlice = sceneSlices.find((slice) => slice.sourceSliceId === hoveredSliceId) ?? sceneSlices[activeIndex];
  const inspectedSliceKde = inspectedSlice ? sliceKdeResults[inspectedSlice.index] : undefined;
  const allocationMetrics = inspectedSlice
    ? buildAllocationMetrics({ slice: inspectedSlice, slices: sceneSlices, profile: volumeProfile })
    : null;
  const activeSliceTitle = activeSlice?.label ?? 'No slice selected';
  const activeSliceRange = activeSlice
    ? `${DATE_FORMATTER.format(new Date(activeSlice.startEpoch * 1000))} - ${DATE_FORMATTER.format(new Date(activeSlice.endEpoch * 1000))}`
    : 'No active range';

  const sceneRuntime = useMemo(
    () => createStkde3DSceneRuntime({
      displayDomain: timeDomain,
      warpDomain: timeDomain,
      timeScaleMode: adaptiveTimeEnabled ? 'adaptive' : 'linear',
      warpBlend: adaptiveTimeEnabled ? 1 : 0,
      densityMap: standaloneAdaptiveTimeMaps.densityMap,
      warpMap: standaloneAdaptiveTimeMaps.warpMap,
      sourceSliceIds: sceneSlices.map((slice) => slice.sourceSliceId),
      isPlaying,
      isInterpolated: true,
      onActiveIndexChange: setActiveIndex,
      onSliceSelect: ({ index, sourceSliceId }) => {
        const selectedIndex = sourceSliceId
          ? sceneSlices.findIndex((slice) => slice.sourceSliceId === sourceSliceId)
          : index;
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : index);
      },
      onSliceHover: (payload) => setHoveredSliceId(payload?.sourceSliceId ?? null),
      onSliceResize: () => undefined,
      onBurstHover: () => undefined,
      onBurstSelect: () => undefined,
      onClusterHover: () => undefined,
      onClusterSelect: () => undefined,
      onCameraFocus: () => undefined,
      onTemporalWindowPropose: setScanProposal,
      onTemporalWindowCommit: (proposal) => {
        setScanProposal(proposal);
        const midpoint = (proposal.startEpoch + proposal.endEpoch) / 2;
        const nextIndex = sceneSlices.reduce((closestIndex, slice, index) => {
          const closest = sceneSlices[closestIndex];
          if (!closest) return index;
          const currentDistance = Math.abs((slice.startEpoch + slice.endEpoch) / 2 - midpoint);
          const closestDistance = Math.abs((closest.startEpoch + closest.endEpoch) / 2 - midpoint);
          return currentDistance < closestDistance ? index : closestIndex;
        }, 0);
        setActiveIndex(nextIndex);
      },
      onCreateDraftAtPoint: () => undefined,
      onCanvasPointerDown: () => undefined,
      onCanvasPointerMissed: () => {
        setHoveredSliceId(null);
        setActiveIndex(-1);
      },
    }),
    [adaptiveTimeEnabled, isPlaying, sceneSlices, standaloneAdaptiveTimeMaps.densityMap, standaloneAdaptiveTimeMaps.warpMap, timeDomain],
  );

  useEffect(() => {
    if (!isPlaying || isScrubbing || slices.length === 0) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slices.length);
    }, Math.max(180, 1000 / playbackSpeed));

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isPlaying, isScrubbing, playbackSpeed, slices.length]);

  useEffect(() => {
    if (isFocusedView && isPlaying) {
      setIsPlaying(false);
    }
  }, [isFocusedView, isPlaying]);

  if (!dataset) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_34%),linear-gradient(180deg,#020617_0%,#020817_60%,#020617_100%)] text-slate-100">
        <div className="rounded-2xl border border-sky-500/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 shadow-[0_24px_80px_-36px_rgba(14,165,233,0.45)] backdrop-blur">
          Loading real crime subset...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,#020617_0%,#020817_55%,#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-[1920px] flex-col px-4 py-4 lg:px-5 lg:py-5">
        <header className="mb-4 flex flex-col gap-4 rounded-3xl border border-sky-500/15 bg-slate-950/55 px-5 py-4 shadow-[0_30px_100px_-44px_rgba(14,165,233,0.45)] backdrop-blur-md lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-200">
                stkde 3d
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                {isRealData ? 'real subset' : 'mock fallback'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-slate-50 lg:text-3xl">
                STKDE 3D evolution
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                KDE heatmaps stacked through time with live scrubbing, focus mode, and a shared 3D scene.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Slices</div>
              <div className="mt-1 font-medium text-slate-100 tabular-nums">{slices.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Events</div>
              <div className="mt-1 font-medium text-slate-100 tabular-nums">{totalEvents.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Active</div>
              <div className="mt-1 max-w-[14rem] truncate font-medium text-slate-100">
                {activeSliceTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 backdrop-blur">
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="flex items-center gap-1.5 rounded-full border border-slate-600/70 bg-slate-800 px-3 py-1.5 text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              type="button"
              aria-pressed={isFocusedView}
              onClick={() => {
                const nextFocusedView = !isFocusedView;
                setIsFocusedView(nextFocusedView);
                if (nextFocusedView) {
                  setIsPlaying(false);
                }
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
                isFocusedView
                  ? 'border-sky-400/60 bg-sky-400/10 text-sky-100'
                  : 'border-slate-600/70 bg-slate-800 text-slate-100 hover:border-sky-400/60 hover:text-sky-100'
              }`}
            >
              <Focus className="size-3.5" />
              {isFocusedView ? 'Single slice' : 'Stack view'}
            </button>

            <button
              type="button"
              aria-pressed={showRawEvents}
              onClick={() => setShowRawEvents((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
                showRawEvents
                  ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                  : 'border-slate-600/70 bg-slate-800 text-slate-100 hover:border-emerald-400/60 hover:text-emerald-100'
              }`}
            >
              Active events
            </button>

            <button
              type="button"
              aria-pressed={showHotspotTrajectories}
              onClick={() => setShowHotspotTrajectories((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
                showHotspotTrajectories
                  ? 'border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-100'
                  : 'border-slate-600/70 bg-slate-800 text-slate-100 hover:border-fuchsia-400/60 hover:text-fuchsia-100'
              }`}
            >
              Trajectories
            </button>

            <button
              type="button"
              aria-pressed={adaptiveTimeEnabled}
              onClick={() => setAdaptiveTimeEnabled((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
                adaptiveTimeEnabled
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                  : 'border-slate-600/70 bg-slate-800 text-slate-100 hover:border-cyan-400/60 hover:text-cyan-100'
              }`}
            >
              Adaptive time
            </button>

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-[0.18em] text-slate-500">Speed</span>
              <select
                value={playbackSpeed}
                onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 outline-none transition focus:border-sky-400/60"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
                <option value={3}>3.0x</option>
              </select>
            </label>

            <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sky-200">
              {activeSliceRange}
            </span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-h-0 rounded-3xl border border-sky-500/15 bg-slate-950/40 p-2 shadow-[0_30px_100px_-44px_rgba(14,165,233,0.35)] backdrop-blur-sm">
            <Stkde3DScene
              slices={sceneSlices}
              sliceKdes={sliceKdes}
              sliceEvents={sliceEvents}
              hotspotSliceResults={hotspotSliceResults}
              hotspotMatchingOptions={hotspotMatchingOptions}
              volumeProfile={volumeProfile}
              heatmapRenderer={heatmapRenderer}
              kdeGridSize={kdeParams.gridSize}
              activeIndex={activeIndex}
              viewMode={isFocusedView ? 'focus' : 'stack'}
              showRawEvents={showRawEvents}
              showHotspotTrajectories={showHotspotTrajectories}
              timeDomain={timeDomain}
              runtime={sceneRuntime}
            />
          </div>

          <aside className="min-h-0 space-y-4 overflow-y-auto rounded-3xl border border-slate-700/60 bg-slate-950/55 p-4 shadow-[0_30px_100px_-44px_rgba(14,165,233,0.35)] backdrop-blur-md">
            <KdeTuningPanel value={kdeParams} onChange={setKdeParams} />

            <section className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 text-xs text-slate-300">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Track matching</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  {qualifiedTrackCount} qualified tracks
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-900/70 p-1">
                {([
                  ['adaptive', 'Adaptive'],
                  ['fixed', 'Fixed 3 km'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={hotspotMatchingMode === mode}
                    onClick={() => setHotspotMatchingMode(mode)}
                    className={`rounded-md px-2 py-1.5 text-[10px] transition ${
                      hotspotMatchingMode === mode
                        ? 'bg-sky-400/15 text-sky-100 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                {hotspotMatchingMode === 'adaptive'
                  ? `Adaptive uses the active grid and smoothing (about ${adaptiveToleranceKm.toFixed(2)} km here).`
                  : 'Fixed uses the legacy nearest-hotspot rule with a strict 3 km limit.'}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 text-xs text-slate-300">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Heatmap renderer</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">experiment</span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-900/70 p-1">
                {([
                  ['field', 'Grid field'],
                  ['legacy', 'Legacy blobs'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={heatmapRenderer === mode}
                    onClick={() => setHeatmapRenderer(mode)}
                    className={`rounded-md px-2 py-1.5 text-[10px] transition ${
                      heatmapRenderer === mode
                        ? 'bg-sky-400/15 text-sky-100 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <div className="space-y-1 border-b border-slate-700/60 pb-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                inspect rail
              </div>
              <p className="max-w-[24ch] text-sm leading-6 text-slate-300">
                Scrub slices, switch focus mode, and inspect burst detail without leaving the route.
              </p>
            </div>

            {scanProposal ? (
              <div className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-2 py-1.5 text-[10px] text-cyan-100">
                Scan preview: {new Date(scanProposal.startEpoch * 1000).toLocaleDateString()} – {new Date(scanProposal.endEpoch * 1000).toLocaleDateString()}
              </div>
            ) : null}

            {inspectedSlice && (
              <SliceInspector
                slice={inspectedSlice}
                sliceKde={inspectedSliceKde}
                burstiness={inspectedSlice.burstScore}
                allocationMetrics={allocationMetrics}
              />
            )}

            <StandaloneSliceScrubber
              slices={slices}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayingChange={setIsPlaying}
              onPlaybackSpeedChange={setPlaybackSpeed}
              onScrubbingChange={setIsScrubbing}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

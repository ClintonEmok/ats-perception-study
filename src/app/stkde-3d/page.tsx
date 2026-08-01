'use client';

import { useEffect, useMemo, useState } from 'react';
import { Focus, Pause, Play } from 'lucide-react';
import { generateStkde3dMockData, generateStkde3dRealData } from './lib/mock-data';
import { computeSliceKde, KDE_SCENE_SPAN_METERS } from '@/lib/kde';
import { Stkde3DScene } from './components/Stkde3DScene';
import { createStkde3DSceneRuntime } from './components/Stkde3DSceneProvider';
import type { Stkde3DSceneSlice } from './components/Stkde3DSceneProvider';
import { SliceInspector } from './components/SliceInspector';
import type { StkdeHeatmapRenderer } from './components/StkdeSliceStack';
import { KdeTuningPanel } from './components/KdeTuningPanel';
import { StkdeComparisonControls } from './components/StkdeComparisonControls';
import {
  enterComparison,
  exitComparison,
  invalidateComparison,
  resetComparison,
  selectComparisonSlice,
  type ComparisonSelectionInput,
  type Stkde3DComparisonState,
} from './lib/comparison';
import { buildKdeHotspotSliceResults } from './lib/kde-hotspots';
import { buildStandaloneAdaptiveTimeMaps } from './lib/standalone-adaptive-time';
import { buildAllocationMetrics, buildDurationVolumeProfile } from './lib/volume-encoding';
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

const MAX_DATA_PAGES = 100;

type CaseStudyPresetId = 'full' | 'fourth-of-july' | 'spring-break' | 'new-years';

type CaseStudyPreset = {
  id: CaseStudyPresetId;
  label: string;
  rangeLabel: string;
  startEpoch: number;
  endEpoch: number;
  limit: number;
};

const toUtcEpoch = (date: string, endOfDay = false): number => Math.floor(
  Date.parse(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z`) / 1000,
);

const CASE_STUDY_PRESETS: readonly CaseStudyPreset[] = [
  {
    id: 'full',
    label: 'Full data range',
    rangeLabel: '2001–2025 · sampled overview',
    ...REAL_DATA_RANGE,
  },
  {
    id: 'fourth-of-july',
    label: 'Fourth of July',
    rangeLabel: 'Jun 30–Jul 7, 2024',
    startEpoch: toUtcEpoch('2024-06-30'),
    endEpoch: toUtcEpoch('2024-07-07', true),
    limit: 5000,
  },
  {
    id: 'spring-break',
    label: 'Spring Break',
    rangeLabel: 'Mar 25–Apr 1, 2024',
    startEpoch: toUtcEpoch('2024-03-25'),
    endEpoch: toUtcEpoch('2024-04-01', true),
    limit: 5000,
  },
  {
    id: 'new-years',
    label: "New Year's",
    rangeLabel: 'Dec 28, 2023–Jan 4, 2024',
    startEpoch: toUtcEpoch('2023-12-28'),
    endEpoch: toUtcEpoch('2024-01-04', true),
    limit: 5000,
  },
];

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

type CrimeRangeResponse = {
  data?: CrimeRecord[];
  meta?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
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
    <div className="rounded-md border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Scrub slices</span>
        <span className="font-mono text-muted-foreground/80 tabular-nums">{activeIndex + 1} / {slices.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stepTo(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-foreground/40 hover:text-foreground"
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
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
          aria-label="Slice scrubber"
        />
        <button
          type="button"
          onClick={() => stepTo(activeIndex + 1)}
          disabled={activeIndex >= slices.length - 1}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-foreground/40 hover:text-foreground"
        >
          Next
        </button>
      </div>
      <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Speed</span>
          <span className="tabular-nums text-foreground">{playbackSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={playbackSpeed}
          onChange={(event) => onPlaybackSpeedChange(Number(event.target.value))}
          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
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
  const [kdeParams, setKdeParams] = useState<KdeParams>(EXPERIMENTAL_KDE_PARAMS);
  const [activeSliceOpacity, setActiveSliceOpacity] = useState(1);
  const [nonActiveSliceOpacity, setNonActiveSliceOpacity] = useState(0.35);
  const [caseStudyPresetId, setCaseStudyPresetId] = useState<CaseStudyPresetId>('full');
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [comparison, setComparison] = useState<Stkde3DComparisonState | null>(null);
  const selectedCaseStudy = CASE_STUDY_PRESETS.find((preset) => preset.id === caseStudyPresetId) ?? CASE_STUDY_PRESETS[0]!;

  useEffect(() => {
    let cancelled = false;
    const preset = CASE_STUDY_PRESETS.find((candidate) => candidate.id === caseStudyPresetId) ?? CASE_STUDY_PRESETS[0]!;

    setDataset(null);
    setActiveIndex(0);
    setComparison((current) => (current ? invalidateComparison() : null));

    async function loadDataset() {
      try {
        const records: CrimeRecord[] = [];
        let cursor: string | null = null;
        let hasMore = true;

        for (let page = 0; page < MAX_DATA_PAGES && hasMore; page += 1) {
          const params = new URLSearchParams({
            startEpoch: preset.startEpoch.toString(),
            endEpoch: preset.endEpoch.toString(),
            bufferDays: '0',
            limit: preset.limit.toString(),
          });
          if (cursor) {
            params.set('cursor', cursor);
          }

          const response = await fetch(`/api/crimes/range?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const result = (await response.json()) as CrimeRangeResponse;
          records.push(...(result.data ?? []));
          hasMore = result.meta?.hasMore === true;
          const nextCursor = result.meta?.nextCursor ?? null;
          if (!hasMore || !nextCursor || nextCursor === cursor) {
            hasMore = false;
            break;
          }
          cursor = nextCursor;
        }

        if (hasMore) {
          throw new Error(`Crime range exceeded the ${MAX_DATA_PAGES}-page limit`);
        }

        const realDataset = generateStkde3dRealData(records);

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
  }, [caseStudyPresetId]);

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
      return [selectedCaseStudy.startEpoch, selectedCaseStudy.endEpoch];
    }

    const start = Math.min(...sceneSlices.map((slice) => slice.startEpoch));
    const end = Math.max(...sceneSlices.map((slice) => slice.endEpoch));
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
       return [selectedCaseStudy.startEpoch, selectedCaseStudy.endEpoch];
    }
    return end > start ? [start, end] : [start, start + 1];
  }, [sceneSlices, selectedCaseStudy.endEpoch, selectedCaseStudy.startEpoch]);
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

  const activeSlice = slices[activeIndex];
  const inspectedSlice = sceneSlices.find((slice) => slice.sourceSliceId === hoveredSliceId) ?? sceneSlices[activeIndex];
  const inspectedSliceKde = inspectedSlice ? sliceKdeResults[inspectedSlice.index] : undefined;
  const allocationMetrics = inspectedSlice
    ? buildAllocationMetrics({ slice: inspectedSlice, slices: sceneSlices, profile: volumeProfile })
    : null;
  const activeSliceRange = activeSlice
    ? `${DATE_FORMATTER.format(new Date(activeSlice.startEpoch * 1000))} - ${DATE_FORMATTER.format(new Date(activeSlice.endEpoch * 1000))}`
    : 'No active range';

  const toComparisonSelection = (slice: Stkde3DSceneSlice): ComparisonSelectionInput => ({
    index: slice.index,
    sourceSliceId: slice.sourceSliceId ?? null,
    sourceSliceIndex: slice.index,
    startEpoch: slice.startEpoch,
    endEpoch: slice.endEpoch,
    label: slice.label,
    eventCount: slice.crimeCount,
  });

  const handleEnterComparison = () => {
    setIsFocusedView(false);
    setIsPlaying(false);
    setComparison(enterComparison());
  };

  const handleResetComparison = () => {
    setComparison(resetComparison());
  };

  const handleBackToStack = () => {
    setIsFocusedView(false);
    setComparison(exitComparison());
  };

  const handleComparisonSliceSelect = (slice: Stkde3DSceneSlice) => {
    setComparison((current) => (current ? selectComparisonSlice(current, toComparisonSelection(slice)) : current));
  };

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
      <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
           Loading {selectedCaseStudy.label.toLowerCase()} data...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-[1920px] flex-col px-4 py-4 lg:px-5 lg:py-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur-md">
          <h1 className="sr-only">STKDE 3D evolution</h1>
          <div className="flex min-w-0 items-center gap-3 text-[11px] text-muted-foreground">
            <span className="shrink-0 font-semibold uppercase tracking-[0.2em] text-foreground">STKDE 3D</span>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 border-border text-[11px] text-muted-foreground sm:border-l sm:pl-3">
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40"
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
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                isFocusedView
                  ? 'border-foreground/60 bg-foreground text-background'
                  : 'border-border bg-background text-foreground hover:border-foreground/40'
              }`}
            >
              <Focus className="size-3.5" />
              {isFocusedView ? 'Single slice' : 'Stack view'}
            </button>

            <button
              type="button"
              aria-pressed={showRawEvents}
              onClick={() => setShowRawEvents((value) => !value)}
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                showRawEvents
                  ? 'border-amber-600/60 bg-amber-100 text-amber-900'
                  : 'border-border bg-background text-foreground hover:border-amber-600/50'
              }`}
            >
              Active events
            </button>

            <button
              type="button"
              aria-pressed={showHotspotTrajectories}
              onClick={() => setShowHotspotTrajectories((value) => !value)}
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                showHotspotTrajectories
                  ? 'border-amber-600/60 bg-amber-100 text-amber-900'
                  : 'border-border bg-background text-foreground hover:border-amber-600/50'
              }`}
            >
              Trajectories
            </button>

            <button
              type="button"
              aria-pressed={adaptiveTimeEnabled}
              onClick={() => setAdaptiveTimeEnabled((value) => !value)}
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                adaptiveTimeEnabled
                  ? 'border-amber-600/60 bg-amber-100 text-amber-900'
                  : 'border-border bg-background text-foreground hover:border-amber-600/50'
              }`}
            >
              Adaptive time
            </button>

            <span className="hidden max-w-[14rem] truncate px-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground xl:inline">
              {activeSliceRange}
            </span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-h-0 rounded-3xl border border-border bg-card p-2 shadow-sm backdrop-blur-sm">
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
              activeSliceOpacity={activeSliceOpacity}
              nonActiveSliceOpacity={nonActiveSliceOpacity}
              timeDomain={timeDomain}
              runtime={sceneRuntime}
            />
          </div>

          <aside className="min-h-0 space-y-4 overflow-y-auto rounded-3xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur-md">
           <section className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <label htmlFor="case-study-preset" className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Case study
              </label>
              <select
                id="case-study-preset"
                value={caseStudyPresetId}
                onChange={(event) => {
                  setIsPlaying(false);
                  setCaseStudyPresetId(event.target.value as CaseStudyPresetId);
                }}
                className="w-full rounded-[var(--radius)] border border-border bg-background px-2.5 py-2 text-foreground outline-none transition focus:border-foreground/40"
              >
                {CASE_STUDY_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {selectedCaseStudy.rangeLabel}
              </div>
             </section>

            <StkdeComparisonControls
              slices={sceneSlices}
              comparison={comparison}
              onEnterComparison={handleEnterComparison}
              onSelectSlice={handleComparisonSliceSelect}
              onResetComparison={handleResetComparison}
              onBackToStack={handleBackToStack}
            />

            <section className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Slice opacity</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(activeSliceOpacity * 100)} / {Math.round(nonActiveSliceOpacity * 100)}%
                </span>
              </div>
              <label className="block text-[10px] text-muted-foreground">
                <span className="flex items-center justify-between gap-2">
                  <span>Active slice</span>
                  <span className="font-mono tabular-nums text-foreground">{Math.round(activeSliceOpacity * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={activeSliceOpacity}
                  onChange={(event) => setActiveSliceOpacity(Number(event.target.value))}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
                  aria-label="Active slice opacity"
                />
              </label>
              <label className="mt-2 block text-[10px] text-muted-foreground">
                <span className="flex items-center justify-between gap-2">
                  <span>Other slices</span>
                  <span className="font-mono tabular-nums text-foreground">{Math.round(nonActiveSliceOpacity * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={nonActiveSliceOpacity}
                  onChange={(event) => setNonActiveSliceOpacity(Number(event.target.value))}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
                  aria-label="Other slices opacity"
                />
              </label>
            </section>

            <KdeTuningPanel value={kdeParams} onChange={setKdeParams} />

            <section className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Track matching</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {qualifiedTrackCount} qualified tracks
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
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
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                {hotspotMatchingMode === 'adaptive'
                  ? `Adaptive uses the active grid and smoothing (about ${adaptiveToleranceKm.toFixed(2)} km here).`
                  : 'Fixed uses the legacy nearest-hotspot rule with a strict 3 km limit.'}
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Heatmap renderer</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">experiment</span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
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
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

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

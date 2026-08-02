'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Focus, Pause, Play } from 'lucide-react';
import {
  loadConfiguredMockStkde3dDataset,
  loadStkde3dDataset,
  type Stkde3dDataset,
  type Stkde3dDatasetPreset,
} from './lib/dataset-loader';
import { computeSliceKde, KDE_SCENE_SPAN_METERS } from '@/lib/kde';
import { Stkde3DScene } from './components/Stkde3DScene';
import { createStkde3DSceneRuntime } from './components/Stkde3DSceneProvider';
import type { Stkde3DSceneSlice, Stkde3DSliceInteractionPayload } from './components/Stkde3DSceneProvider';
import { SliceInspector } from './components/SliceInspector';
import type { StkdeHeatmapRenderer } from './components/StkdeSliceStack';
import { KdeTuningPanel } from './components/KdeTuningPanel';
import { StkdeComparisonControls } from './components/StkdeComparisonControls';
import { StkdeComparisonStage } from './components/StkdeComparisonStage';
import {
  COMPARISON_MESSAGES,
  activateComparisonSlot,
  enterComparison,
  exitComparison,
  invalidateComparison,
  resetComparison,
  selectComparisonSlice,
  setComparisonMode,
  type ComparisonSelectionInput,
  type Stkde3DComparisonState,
} from './lib/comparison';
import {
  COMPARISON_PRESETS,
  getComparisonPreset,
  resolveComparisonPreset,
  type ComparisonDatasetPresetId,
} from './lib/comparison-presets';
import { buildKdeHotspotSliceResults } from './lib/kde-hotspots';
import { buildStandaloneAdaptiveTimeMaps } from './lib/standalone-adaptive-time';
import { buildAllocationMetrics, buildDurationVolumeProfile } from './lib/volume-encoding';
import { buildHotspotEvolution, getAdaptiveMatchToleranceMeters, type HotspotMatchingMode, type HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { KdeParams } from '@/lib/kde';
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

type CaseStudyPresetId = ComparisonDatasetPresetId;

type CaseStudyPreset = Stkde3dDatasetPreset & {
  id: CaseStudyPresetId;
  label: string;
  rangeLabel: string;
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

type DatasetState = Stkde3dDataset;

type DatasetRenderStatus = 'loading' | 'ready' | 'empty' | 'error';

const USE_CONFIGURED_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  || process.env.USE_MOCK_DATA === 'true';

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
  const [datasetLoadStatus, setDatasetLoadStatus] = useState<DatasetRenderStatus>('loading');
  const [retryToken, setRetryToken] = useState(0);
  const [comparison, setComparison] = useState<Stkde3DComparisonState | null>(null);
  const [comparisonAnnouncement, setComparisonAnnouncement] = useState<string | null>(null);
  const [selectedComparisonPresetId, setSelectedComparisonPresetId] = useState('');
  const [pendingComparisonPresetId, setPendingComparisonPresetId] = useState<string | null>(null);
  const [activeComparisonPresetId, setActiveComparisonPresetId] = useState<string | null>(null);
  const [comparisonPresetError, setComparisonPresetError] = useState<string | null>(null);
  const pendingPresetDatasetRef = useRef<ComparisonDatasetPresetId | null>(null);
  const selectedCaseStudy = CASE_STUDY_PRESETS.find((preset) => preset.id === caseStudyPresetId) ?? CASE_STUDY_PRESETS[0]!;
  const isDifferenceComparison = comparison?.mode === 'difference';

  useEffect(() => {
    let cancelled = false;
    const preset = CASE_STUDY_PRESETS.find((candidate) => candidate.id === caseStudyPresetId) ?? CASE_STUDY_PRESETS[0]!;

    setDataset(null);
    setDatasetLoadStatus('loading');
    setActiveIndex(0);
    setComparison((current) => (current ? invalidateComparison() : null));
    setActiveComparisonPresetId(null);
    if (pendingPresetDatasetRef.current !== caseStudyPresetId) {
      setSelectedComparisonPresetId('');
      setPendingComparisonPresetId(null);
      setComparisonPresetError(null);
    }
    pendingPresetDatasetRef.current = null;

    async function loadDataset() {
      try {
        const loadedDataset = USE_CONFIGURED_MOCK_DATA
          ? loadConfiguredMockStkde3dDataset()
          : await loadStkde3dDataset(preset);

        if (!cancelled) {
          setDataset(loadedDataset);
          setDatasetLoadStatus(loadedDataset.slices.length === 0 ? 'empty' : 'ready');
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setDataset(null);
          setDatasetLoadStatus('error');
        }
      }
    }

    loadDataset();

    return () => {
      cancelled = true;
    };
  }, [caseStudyPresetId, retryToken]);

  const slices = useMemo(() => dataset?.slices ?? [], [dataset]);
  const sliceEvents = useMemo(() => dataset?.sliceEvents ?? [], [dataset]);
  const sceneSlices = useMemo(
    () => slices.map((slice, index) => ({
      ...slice,
      index,
      sourceSliceId: `standalone-${index}-${slice.startEpoch}-${slice.endEpoch}`,
      sourceSliceIndex: index,
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
    setComparisonAnnouncement(null);
    setComparison(enterComparison());
  };

  const handleResetComparison = () => {
    setComparisonAnnouncement(null);
    setPendingComparisonPresetId(null);
    setSelectedComparisonPresetId('');
    setActiveComparisonPresetId(null);
    setComparisonPresetError(null);
    setComparison(resetComparison());
  };

  const handleBackToStack = () => {
    setIsFocusedView(false);
    setComparisonAnnouncement(COMPARISON_MESSAGES.exited);
    setPendingComparisonPresetId(null);
    setSelectedComparisonPresetId('');
    setActiveComparisonPresetId(null);
    setComparisonPresetError(null);
    setComparison(exitComparison());
  };

  const handleCaseStudyChange = (nextCaseStudyPresetId: CaseStudyPresetId) => {
    setIsPlaying(false);
    pendingPresetDatasetRef.current = null;
    setPendingComparisonPresetId(null);
    setSelectedComparisonPresetId('');
    setActiveComparisonPresetId(null);
    setComparisonPresetError(null);
    setComparison((current) => (current ? invalidateComparison() : null));
    setCaseStudyPresetId(nextCaseStudyPresetId);
  };

  const handleRetryLoading = () => {
    setComparisonAnnouncement(null);
    setRetryToken((value) => value + 1);
  };

  const handleComparisonPresetSelect = (presetId: string) => {
    const preset = getComparisonPreset(presetId);
    setSelectedComparisonPresetId(presetId);
    setComparisonPresetError(null);
    setActiveComparisonPresetId(null);
    setIsPlaying(false);
    setIsFocusedView(false);

    if (!preset) {
      setPendingComparisonPresetId(null);
      setComparison(null);
      return;
    }

    setPendingComparisonPresetId(preset.id);
    setKdeParams({ ...preset.parameters.kde });
    setAdaptiveTimeEnabled(preset.parameters.adaptiveTime);
    setHeatmapRenderer(preset.parameters.renderer);
    setShowRawEvents(preset.layer === 'heatmap-with-events');
    setShowHotspotTrajectories(preset.layer === 'heatmap-with-trajectories');
    setComparison(null);

    if (caseStudyPresetId !== preset.datasetPresetId) {
      pendingPresetDatasetRef.current = preset.datasetPresetId;
      setCaseStudyPresetId(preset.datasetPresetId);
    }
  };

  const handleComparisonSliceSelect = (slice: Stkde3DSceneSlice) => {
    setComparisonAnnouncement(null);
    setComparison((current) => (current ? selectComparisonSlice(current, toComparisonSelection(slice)) : current));
  };

  const handleComparisonSlotActivate = (slot: 'A' | 'B') => {
    setComparison((current) => (current ? activateComparisonSlot(current, slot) : current));
  };

  const handleComparisonModeChange = (mode: 'absolute' | 'difference') => {
    setComparison((current) => (current ? setComparisonMode(current, mode) : current));
  };

  const handleComparisonSurfaceSelect = useCallback((payload: Stkde3DSliceInteractionPayload) => {
    const sourceSlice = sceneSlices.find((slice) => (
      (payload.sourceSliceId && slice.sourceSliceId === payload.sourceSliceId)
      || slice.sourceSliceIndex === payload.sourceSliceIndex
    ));
    setComparisonAnnouncement(null);
    setComparison((current) => (current
      ? selectComparisonSlice(current, {
        index: payload.sourceSliceIndex,
        sourceSliceId: payload.sourceSliceId,
        sourceSliceIndex: payload.sourceSliceIndex,
        startEpoch: payload.startEpoch,
        endEpoch: payload.endEpoch,
        label: sourceSlice?.label,
        eventCount: payload.eventCount ?? sourceSlice?.crimeCount,
      })
      : current));
  }, [sceneSlices]);

  useEffect(() => {
    if (!pendingComparisonPresetId || !dataset || sceneSlices.length === 0 || sliceKdeResults.length !== sceneSlices.length) {
      return;
    }

    const preset = getComparisonPreset(pendingComparisonPresetId);
    if (!preset || preset.datasetPresetId !== caseStudyPresetId) {
      return;
    }

    try {
      const resolved = resolveComparisonPreset(preset, caseStudyPresetId, sceneSlices);
      setComparison({
        mode: preset.view,
        activeSlot: null,
        a: {
          ...resolved.selectionA,
          eventCount: sceneSlices[resolved.selectionA.sourceSliceIndex]?.crimeCount,
        },
        b: {
          ...resolved.selectionB,
          eventCount: sceneSlices[resolved.selectionB.sourceSliceIndex]?.crimeCount,
        },
        linkedCameras: true,
        status: preset.view === 'difference' ? 'difference' : 'ready',
      });
      setActiveComparisonPresetId(preset.id);
      setPendingComparisonPresetId(null);
      setComparisonPresetError(null);
    } catch {
      setComparison(null);
      setPendingComparisonPresetId(null);
      setActiveComparisonPresetId(null);
      setComparisonPresetError('This comparison could not be resolved. Reset comparison and select two distinct intervals.');
    }
  }, [caseStudyPresetId, dataset, pendingComparisonPresetId, sceneSlices, sliceKdeResults.length]);

  const sceneRuntime = useMemo(
    () => createStkde3DSceneRuntime({
      displayDomain: timeDomain,
      warpDomain: timeDomain,
      timeScaleMode: adaptiveTimeEnabled ? 'adaptive' : 'linear',
      warpBlend: adaptiveTimeEnabled ? 1 : 0,
      densityMap: standaloneAdaptiveTimeMaps.densityMap,
      warpMap: standaloneAdaptiveTimeMaps.warpMap,
      sourceSliceIds: sceneSlices.map((slice) => slice.sourceSliceId),
      comparisonSelectionEnabled: comparison?.mode === 'selecting',
      isPlaying,
      isInterpolated: true,
      onActiveIndexChange: setActiveIndex,
      onSliceSelect: ({ index, sourceSliceId }) => {
        const selectedIndex = sourceSliceId
          ? sceneSlices.findIndex((slice) => slice.sourceSliceId === sourceSliceId)
          : index;
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : index);
      },
      onComparisonSliceSelect: handleComparisonSurfaceSelect,
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
        if (comparison?.mode === 'selecting') return;
        setHoveredSliceId(null);
        setActiveIndex(-1);
      },
    }),
    [adaptiveTimeEnabled, comparison, handleComparisonSurfaceSelect, isPlaying, sceneSlices, standaloneAdaptiveTimeMaps.densityMap, standaloneAdaptiveTimeMaps.warpMap, timeDomain],
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

  const loadingLabel = `Loading ${selectedCaseStudy.label.toLowerCase()} data…`;
  const errorLabel = `Unable to load ${selectedCaseStudy.label.toLowerCase()} data. Retry loading or choose another case study.`;
  const emptyLabel = 'No intervals available';
  const emptyDescription = 'This case study returned no rendered intervals. Choose another case study or retry loading.';
  const stageMode = comparison?.mode ?? 'stack';
  const stageIsReady = datasetLoadStatus === 'ready' && Boolean(dataset);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
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
              disabled={comparison?.mode === 'selecting'}
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

             {!comparison ? <button
               type="button"
               aria-pressed={showRawEvents}
              aria-disabled={isDifferenceComparison}
              disabled={isDifferenceComparison}
              onClick={() => setShowRawEvents((value) => !value)}
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                showRawEvents
                  ? 'border-amber-600/60 bg-amber-100 text-amber-900'
                  : 'border-border bg-background text-foreground hover:border-amber-600/50'
              }`}
             >
               Active events
             </button> : null}

             {!comparison ? <button
               type="button"
              aria-pressed={showHotspotTrajectories}
              aria-disabled={isDifferenceComparison}
              disabled={isDifferenceComparison}
              onClick={() => setShowHotspotTrajectories((value) => !value)}
              className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 transition ${
                showHotspotTrajectories
                  ? 'border-amber-600/60 bg-amber-100 text-amber-900'
                  : 'border-border bg-background text-foreground hover:border-amber-600/50'
              }`}
             >
               Trajectories
             </button> : null}

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
            {isDifferenceComparison ? (
              <span className="basis-full text-right text-[10px] text-muted-foreground">
                Unavailable in A − B difference view: signed heatmap only.
              </span>
            ) : null}
          </div>
        </header>

         <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
           <div className="min-h-0 min-w-0 rounded-3xl border border-border bg-card p-2 shadow-sm backdrop-blur-sm">
             {datasetLoadStatus === 'loading' ? (
               <section
                 className="relative flex min-h-[41rem] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#f4f1eb] p-6"
                 data-comparison-stage
                 data-comparison-mode={stageMode}
                 data-render-status="loading"
                 aria-busy="true"
                 aria-live="polite"
               >
                 <div className="absolute inset-2 rounded-xl border border-border bg-card/35 motion-safe:animate-pulse motion-reduce:animate-none" />
                 <div className="relative z-10 rounded-xl border border-border bg-card/95 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
                   {loadingLabel}
                 </div>
               </section>
             ) : datasetLoadStatus === 'error' ? (
               <section
                 className="flex min-h-[41rem] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-card px-6 text-center"
                 data-comparison-stage
                 data-comparison-mode={stageMode}
                 data-render-status="error"
                 role="alert"
               >
                 <h2 className="max-w-xl text-base font-semibold text-foreground">{errorLabel}</h2>
                 <button
                   type="button"
                   onClick={handleRetryLoading}
                   className="min-h-10 rounded-[var(--radius)] border border-destructive/40 bg-background px-3 py-2 text-sm text-foreground transition hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                 >
                   Retry loading
                 </button>
               </section>
             ) : datasetLoadStatus === 'empty' ? (
               <section
                 className="flex min-h-[41rem] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-[#f4f1eb] px-6 text-center"
                 data-comparison-stage
                 data-comparison-mode={stageMode}
                 data-render-status="empty"
               >
                 <h2 className="text-base font-semibold text-foreground">{emptyLabel}</h2>
                 <p className="max-w-md text-sm leading-5 text-muted-foreground">{emptyDescription}</p>
               </section>
             ) : comparison
               && (comparison.mode === 'absolute' || comparison.mode === 'difference')
               && comparison.a
               && comparison.b ? (
                <StkdeComparisonStage
                  selectionA={comparison.a}
                  selectionB={comparison.b}
                  sourceSlices={sceneSlices}
                  sliceKdeResults={sliceKdeResults}
                  heatmapRenderer={heatmapRenderer}
                  mode={comparison.mode}
                  comparisonPresetId={activeComparisonPresetId}
                />
             ) : (
               <section
                 className="relative min-h-[41rem] min-w-0 overflow-hidden rounded-2xl border border-border bg-[#f4f1eb]"
                 data-comparison-stage
                 data-comparison-mode={comparison?.mode ?? 'stack'}
                 data-render-status={stageIsReady ? 'ready' : datasetLoadStatus}
                 data-selection-slot={comparison?.mode === 'selecting' ? comparison.activeSlot : undefined}
               >
                 <div className="absolute inset-0 z-10">
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
                     comparisonSelectedSourceSliceIds={[
                       comparison?.a?.sourceSliceId,
                       comparison?.b?.sourceSliceId,
                     ].filter((sourceSliceId): sourceSliceId is string => Boolean(sourceSliceId))}
                     comparisonSelectedSourceIndices={[
                       comparison?.a?.sourceSliceIndex,
                       comparison?.b?.sourceSliceIndex,
                     ].filter((sourceSliceIndex): sourceSliceIndex is number => typeof sourceSliceIndex === 'number')}
                   />
                 </div>
                 {dataset?.source === 'mock' ? (
                   <div className="absolute left-3 top-3 z-20 rounded-md border border-amber-600/30 bg-amber-50/95 px-2 py-1 text-[10px] font-medium text-amber-950" role="status">
                     Using mock data
                   </div>
                 ) : null}
                 {pendingComparisonPresetId ? (
                   <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/45 p-4 backdrop-blur-[1px]" role="status" aria-live="polite">
                     <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                       Loading comparison preset…
                     </div>
                   </div>
                 ) : null}
               </section>
             )}
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
                   handleCaseStudyChange(event.target.value as CaseStudyPresetId);
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
               activateComparisonSlot={handleComparisonSlotActivate}
               onResetComparison={handleResetComparison}
               onBackToStack={handleBackToStack}
               announcement={comparisonAnnouncement}
               presets={COMPARISON_PRESETS}
               selectedPresetId={selectedComparisonPresetId}
               pendingPresetId={pendingComparisonPresetId}
               activePresetId={activeComparisonPresetId}
               presetError={comparisonPresetError}
               onPresetSelect={handleComparisonPresetSelect}
                onModeChange={handleComparisonModeChange}
                renderStatus={datasetLoadStatus}
                caseStudyLabel={selectedCaseStudy.label.toLowerCase()}
                onRetryLoading={handleRetryLoading}
                usingMockData={dataset?.source === 'mock'}
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

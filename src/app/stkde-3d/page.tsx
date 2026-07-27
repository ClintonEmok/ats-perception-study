'use client';

import { useEffect, useMemo, useState } from 'react';
import { Focus, Pause, Play } from 'lucide-react';
import { generateStkde3dMockData, generateStkde3dRealData } from './lib/mock-data';
import { computeSliceKde } from '@/lib/kde';
import { Stkde3DScene } from './components/Stkde3DScene';
import { createStkde3DSceneRuntime } from './components/Stkde3DSceneProvider';
import { SliceScrubber } from './components/SliceScrubber';
import { SliceInspector } from './components/SliceInspector';
import { KdeTuningPanel } from './components/KdeTuningPanel';
import type { KdeParams } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';

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
  kernelRadiusCells: 4,
  threshold: 0.02,
};

type DatasetState = {
  slices: ReturnType<typeof generateStkde3dMockData>['slices'];
  sliceEvents: ReturnType<typeof generateStkde3dMockData>['sliceEvents'];
  source: 'real' | 'mock';
};

export default function Stkde3DPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFocusedView, setIsFocusedView] = useState(false);
  const [showRawEvents, setShowRawEvents] = useState(false);
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

  const totalEvents = useMemo(
    () => slices.reduce((sum, s) => sum + s.crimeCount, 0),
    [slices],
  );

  const activeSlice = slices[activeIndex];
  const activeSliceKde = sliceKdeResults[activeIndex];
  const activeSliceTitle = activeSlice?.label ?? 'No slice selected';
  const activeSliceRange = activeSlice
    ? `${DATE_FORMATTER.format(new Date(activeSlice.startEpoch * 1000))} - ${DATE_FORMATTER.format(new Date(activeSlice.endEpoch * 1000))}`
    : 'No active range';

  const sceneRuntime = useMemo(
    () => createStkde3DSceneRuntime({
      displayDomain: timeDomain,
      warpDomain: timeDomain,
      timeScaleMode: 'linear',
      warpBlend: 0,
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
      onSliceResize: () => undefined,
      onCreateDraftAtPoint: () => undefined,
      onCanvasPointerDown: () => undefined,
      onCanvasPointerMissed: () => setActiveIndex(-1),
    }),
    [isPlaying, sceneSlices, timeDomain],
  );

  useEffect(() => {
    if (!isPlaying || slices.length === 0) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slices.length);
    }, Math.max(180, 1000 / playbackSpeed));

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isPlaying, playbackSpeed, slices.length]);

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
              Raw points
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
              activeIndex={activeIndex}
              viewMode={isFocusedView ? 'focus' : 'stack'}
              showRawEvents={showRawEvents}
              timeDomain={timeDomain}
              runtime={sceneRuntime}
            />
          </div>

          <aside className="min-h-0 space-y-4 overflow-y-auto rounded-3xl border border-slate-700/60 bg-slate-950/55 p-4 shadow-[0_30px_100px_-44px_rgba(14,165,233,0.35)] backdrop-blur-md">
            <KdeTuningPanel value={kdeParams} onChange={setKdeParams} />

            <div className="space-y-1 border-b border-slate-700/60 pb-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                inspect rail
              </div>
              <p className="max-w-[24ch] text-sm leading-6 text-slate-300">
                Scrub slices, switch focus mode, and inspect burst detail without leaving the route.
              </p>
            </div>

            {isFocusedView && (
              <SliceInspector
                slice={activeSlice}
                sliceKde={activeSliceKde}
              />
            )}

            <SliceScrubber
              slices={slices}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "@visx/scale";
import Link from "next/link";
import { exp2WindowSlug } from "@/lib/ats-study/exp2-route";

type Strategy = "uniform" | "raw_density" | "density_mild" | "density_firm";
type WarpStrategy = "warp_100" | "warp_150" | "warp_200" | "warp_300";

type WindowData = {
  key: string;
  windowDays: number;
  rank: number;
  start: string;
  end: string;
  totalEvents: number;
  counts: number[];
  timestamps: number[];
  strategyA: Strategy;
  strategyB: Strategy;
};

type Exp2Data = {
  seed: number;
  generatedAt: string;
  orderings: Record<string, "AB" | "BA">[];
  windows: WindowData[];
};

type WarpWindowData = {
  key: string;
  windowDays: number;
  rank: number;
  start: string;
  end: string;
  totalEvents: number;
  counts: number[];
  timestamps: number[];
  strategyA: WarpStrategy;
  strategyB: WarpStrategy;
};

type WarpExp2Data = {
  seed: number;
  generatedAt: string;
  orderings: Record<string, "AB" | "BA">[];
  windows: WarpWindowData[];
};

type DataState =
  | { status: "loading" }
  | { status: "loaded"; baseline: Exp2Data; warp: WarpExp2Data }
  | { status: "error"; error: string };

const STRATEGY_LABELS: Record<Strategy, string> = {
  uniform: "Uniform",
  raw_density: "Raw density",
  density_mild: "Raw density (mild)",
  density_firm: "Raw density (firm)",
};

const WARP_STRATEGY_LABELS: Record<WarpStrategy, string> = {
  warp_100: "Warp 100%",
  warp_150: "Warp 150%",
  warp_200: "Warp 200%",
  warp_300: "Warp 300%",
};

const WARP_STRATEGY_GAIN: Record<WarpStrategy, number> = {
  warp_100: 5,
  warp_150: 7.5,
  warp_200: 10,
  warp_300: 15,
};

function dateStrToMs(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

function weightDensity(counts: number[]): number[] {
  if (counts.length === 0) return [];
  const peak = counts.reduce((m, c) => (c > m ? c : m), 0);
  if (peak <= 0) return counts.map(() => 0);
  return counts.map((c) => c / peak);
}

function uniformEdges(bins: number, totalSeconds: number): number[] {
  const out = new Array<number>(bins + 1);
  const step = totalSeconds / bins;
  for (let i = 0; i <= bins; i += 1) out[i] = i * step;
  return out;
}

function densityEdges(counts: number[], totalSeconds: number, weightGain: number, weightFloor = 1): number[] {
  const norm = weightDensity(counts);
  const visual = norm.map((n) => weightFloor + n * weightGain);
  const total = visual.reduce((a, b) => a + b, 0);
  if (total <= 0) return uniformEdges(counts.length, totalSeconds);
  let acc = 0;
  const edges = new Array<number>(visual.length + 1);
  edges[0] = 0;
  for (let i = 0; i < visual.length; i += 1) {
    acc += visual[i];
    edges[i + 1] = (acc / total) * totalSeconds;
  }
  return edges;
}

function buildEdges(strategy: Strategy, counts: number[], totalSeconds: number): number[] {
  if (strategy === "uniform") return uniformEdges(counts.length, totalSeconds);
  const gain = strategy === "raw_density" ? 5 : strategy === "density_mild" ? 2 : 10;
  return densityEdges(counts, totalSeconds, gain);
}

function buildWarpEdges(strategy: WarpStrategy, counts: number[], totalSeconds: number): number[] {
  return densityEdges(counts, totalSeconds, WARP_STRATEGY_GAIN[strategy]);
}

function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatBinLabel(startSec: number, endSec: number, startMs: number, windowDays: number): string {
  const sMs = startMs + startSec * 1000;
  const eMs = startMs + endSec * 1000;
  const s = new Date(sMs);
  const e = new Date(eMs);
  if (windowDays > 1) {
    return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(s)} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(e)}`;
  }
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

function subsampleRug(timestamps: number[], startMs: number, totalSeconds: number, target: number): number[] {
  if (timestamps.length === 0) return [];
  const startSec = Math.floor(startMs / 1000);
  const valid: number[] = [];
  for (const ts of timestamps) {
    const sec = Math.floor(ts / 1000) - startSec;
    if (sec >= 0 && sec < totalSeconds) valid.push(sec);
  }
  if (valid.length === 0) return [];
  if (valid.length <= target) return valid.slice();
  const out = new Array<number>(target);
  for (let i = 0; i < target; i += 1) {
    const f = (i * (valid.length - 1)) / (target - 1);
    out[i] = valid[Math.min(valid.length - 1, Math.floor(f))]!;
  }
  return out;
}

export default function Exp2GalleryPage() {
  const [dataState, setDataState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [baselineRes, warpRes] = await Promise.all([
          fetch("/api/exp2-data", { cache: "no-store" }),
          fetch("/api/exp2-warp-data", { cache: "no-store" }),
        ]);
        if (!baselineRes.ok) {
          throw new Error(`Failed to load baseline stimuli (HTTP ${baselineRes.status})`);
        }
        if (!warpRes.ok) {
          throw new Error(`Failed to load warp stimuli (HTTP ${warpRes.status})`);
        }
        const [baseline, warp] = (await Promise.all([baselineRes.json(), warpRes.json()])) as [Exp2Data, WarpExp2Data];
        if (!cancelled) setDataState({ status: "loaded", baseline, warp });
      } catch (err) {
        if (!cancelled) {
          setDataState({
            status: "error",
            error: err instanceof Error ? err.message : "Failed to load stimuli.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => {
    if (dataState.status !== "loaded") return null;
    return dataState.baseline.windows;
  }, [dataState]);

  const warpContent = useMemo(() => {
    if (dataState.status !== "loaded") return null;
    return dataState.warp.windows;
  }, [dataState]);

  if (dataState.status === "error") {
    return <div className="p-6 text-sm text-red-700">{dataState.error}</div>;
  }

  return (
    <main className="mx-auto flex w-full max-w-none flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">ATS visualization gallery</h1>
        <p className="text-sm text-slate-600">
          Baseline combos and warp-factor variants in one place. Uniform timelines show the event rug; adaptive timelines do not.
        </p>
        {dataState.status === "loaded" ? (
          <p className="text-xs text-slate-500">
            Baseline seed {dataState.baseline.seed} · baseline generated {new Date(dataState.baseline.generatedAt).toLocaleString()} · warp seed {dataState.warp.seed}
          </p>
        ) : null}
      </header>

      {dataState.status === "loading" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading gallery…</div>
      ) : null}

      {content && warpContent ? (
        <section className="space-y-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Baseline gallery</h2>
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {content.map((window) => {
                const totalSeconds = window.counts.length * (window.windowDays > 1 ? 24 : 1) * 3600;
                const xScale = scaleLinear({ domain: [0, Math.max(totalSeconds, 1)], range: [56, 960] });
                const edgesA = buildEdges(window.strategyA, window.counts, totalSeconds).map((s) => xScale(s));
                const edgesB = buildEdges(window.strategyB, window.counts, totalSeconds).map((s) => xScale(s));
                const rugPx = subsampleRug(window.timestamps, dateStrToMs(window.start), totalSeconds, 300).map((s) => xScale(s));
                const rugA = window.strategyA === "uniform";
                const rugB = window.strategyB === "uniform";
                return (
                  <Link key={window.key} href={`/study/exp2-gallery/${exp2WindowSlug(window)}`} className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {window.windowDays}d #{window.rank}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {formatShort(window.start)} → {formatShort(window.end)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>A: {STRATEGY_LABELS[window.strategyA]}</div>
                        <div>B: {STRATEGY_LABELS[window.strategyB]}</div>
                        <div className="pt-1 text-[10px] uppercase tracking-wide text-slate-400">Preview only</div>
                      </div>
                    </div>

                    <svg viewBox="0 0 980 320" width="100%" className="block">
                      <rect x={0} y={0} width={980} height={320} fill="#fff" />
                      <Row label="A" y={90} h={48} totalSeconds={totalSeconds} counts={window.counts} edgesPx={edgesA} showRug={rugA} rugPx={rugPx} totalEvents={window.totalEvents} windowDays={window.windowDays} startMs={dateStrToMs(window.start)} />
                      <Row label="B" y={214} h={48} totalSeconds={totalSeconds} counts={window.counts} edgesPx={edgesB} showRug={rugB} rugPx={rugPx} totalEvents={window.totalEvents} windowDays={window.windowDays} startMs={dateStrToMs(window.start)} />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Warp-factor variants</h2>
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {warpContent.map((window) => {
                const totalSeconds = window.counts.length * (window.windowDays > 1 ? 24 : 1) * 3600;
                const xScale = scaleLinear({ domain: [0, Math.max(totalSeconds, 1)], range: [56, 960] });
                const edgesA = buildWarpEdges(window.strategyA, window.counts, totalSeconds).map((s) => xScale(s));
                const edgesB = buildWarpEdges(window.strategyB, window.counts, totalSeconds).map((s) => xScale(s));
                const rugPx = subsampleRug(window.timestamps, dateStrToMs(window.start), totalSeconds, 300).map((s) => xScale(s));
                return (
                  <Link key={window.key} href={`/study/exp2-gallery/${exp2WindowSlug(window)}?variant=warp`} className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {window.windowDays}d #{window.rank}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {formatShort(window.start)} → {formatShort(window.end)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>A: {WARP_STRATEGY_LABELS[window.strategyA]}</div>
                        <div>B: {WARP_STRATEGY_LABELS[window.strategyB]}</div>
                        <div className="pt-1 text-[10px] uppercase tracking-wide text-slate-400">Preview only</div>
                      </div>
                    </div>

                    <svg viewBox="0 0 980 320" width="100%" className="block">
                      <rect x={0} y={0} width={980} height={320} fill="#fff" />
                      <Row label="A" y={90} h={48} totalSeconds={totalSeconds} counts={window.counts} edgesPx={edgesA} showRug={true} rugPx={rugPx} totalEvents={window.totalEvents} windowDays={window.windowDays} startMs={dateStrToMs(window.start)} />
                      <Row label="B" y={214} h={48} totalSeconds={totalSeconds} counts={window.counts} edgesPx={edgesB} showRug={true} rugPx={rugPx} totalEvents={window.totalEvents} windowDays={window.windowDays} startMs={dateStrToMs(window.start)} />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

type RowProps = {
  label: string;
  y: number;
  h: number;
  totalSeconds: number;
  counts: number[];
  edgesPx: number[];
  showRug: boolean;
  rugPx: number[];
  totalEvents: number;
  windowDays: number;
  startMs: number;
};

function Row({ label, y, h, totalSeconds, counts, edgesPx, showRug, rugPx, totalEvents, windowDays, startMs }: RowProps) {
  const plotX0 = 56;
  const plotX1 = 960;
  const axisY = y + h;
  const rugTop = y - 48;
  const rugBottom = y - 18;
  return (
    <g>
      {showRug ? (
        <>
          <g>
            {rugPx.map((x, idx) => (
              <line key={idx} x1={x} x2={x} y1={rugTop} y2={rugBottom} stroke="#475569" strokeOpacity={0.55} strokeWidth={0.55} />
            ))}
          </g>
          <text x={968} y={rugTop + 14} fontSize={10} fontWeight={600} fill="#0f172a">
            Event rug
          </text>
          <text x={968} y={rugTop + 28} fontSize={9} fontStyle="italic" fill="#64748b">
            {totalEvents.toLocaleString("en-US")} events
          </text>
        </>
      ) : null}
      <text x={8} y={y + h / 2} fontSize={10} fontWeight={700} fill="#0f172a" dominantBaseline="middle">
        {label}
      </text>
      <line x1={plotX0} y1={axisY} x2={plotX1} y2={axisY} stroke="#1f1f1f" strokeWidth={1} />
      {edgesPx.slice(0, -1).map((xLeft, i) => {
        const xRight = edgesPx[i + 1];
        const w = Math.max(0, xRight - xLeft);
        const startSec = (edgesPx[i] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        const endSec = (edgesPx[i + 1] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        return (
          <g key={i}>
            <rect x={xLeft} y={y} width={w} height={h} fill="#d8d8d8" stroke="#1f1f1f" strokeWidth={0.6}>
              <title>
                {formatBinLabel(startSec, endSec, startMs, windowDays)} · {counts[i] ?? 0} events
              </title>
            </rect>
          </g>
        );
      })}
    </g>
  );
}

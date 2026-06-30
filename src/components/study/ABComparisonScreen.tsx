"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "@visx/scale";
import { CONFIDENCE_ANCHORS } from "@/lib/ats-study/questionnaire";
import { TASK_LABELS, type TaskType } from "@/lib/ats-study/protocol";
import { useExperimentStore } from "@/store/useExperimentStore";

type Strategy = "uniform" | "raw_density" | "density_mild" | "density_firm";

type WindowData = {
  key: string;
  windowDays: number;
  rank: number;
  start: string;
  end: string;
  cv: number;
  peakRatio: number;
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

type DataState =
  | { status: "loading" }
  | { status: "loaded"; data: Exp2Data }
  | { status: "error"; error: string };

const STRATEGY_LABELS: Record<Strategy, string> = {
  uniform: "Uniform",
  raw_density: "Raw density",
  density_mild: "Raw density (mild)",
  density_firm: "Raw density (firm)",
};

function dateStrToMs(iso: string): number {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  );
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

function densityEdges(
  counts: number[],
  totalSeconds: number,
  weightGain: number,
  weightFloor = 1,
): number[] {
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

function linspaceIndices(n: number, target: number): number[] {
  if (n <= target) return Array.from({ length: n }, (_, i) => i);
  const out = new Array<number>(target);
  for (let i = 0; i < target; i += 1) {
    const f = (i * (n - 1)) / (target - 1);
    out[i] = Math.min(n - 1, Math.floor(f));
  }
  return out;
}

function subsampleRug(
  timestamps: number[],
  startMs: number,
  totalSeconds: number,
  target: number,
): number[] {
  if (timestamps.length === 0) return [];
  const startSec = Math.floor(startMs / 1000);
  const valid: number[] = [];
  for (const ts of timestamps) {
    const sec = Math.floor(ts / 1000) - startSec;
    if (sec >= 0 && sec < totalSeconds) valid.push(sec);
  }
  if (valid.length === 0) return [];
  if (valid.length <= target) return valid.slice();
  const indices = linspaceIndices(valid.length, target);
  return indices.map((i) => valid[i]);
}

function isAdaptive(edges: number[], totalSeconds: number): boolean {
  const n = edges.length - 1;
  if (n <= 0) return false;
  const step = totalSeconds / n;
  for (let i = 0; i <= n; i += 1) {
    if (Math.abs(edges[i] - i * step) > 1e-3) return true;
  }
  return false;
}

function dailyTickDays(windowDays: number): number[] {
  const step = Math.max(1, Math.ceil(windowDays / 10));
  const days: number[] = [];
  for (let d = 0; d <= windowDays; d += step) days.push(d);
  if (days[days.length - 1] !== windowDays) days.push(windowDays);
  return days;
}

function subDailyTickHours(totalHours: number): number[] {
  const nTicks = Math.max(2, Math.round(totalHours / 4) + 1);
  const step = totalHours / (nTicks - 1);
  const out: number[] = [];
  for (let i = 0; i < nTicks; i += 1) out.push(Math.round(i * step));
  if (out[out.length - 1] !== Math.round(totalHours)) out.push(Math.round(totalHours));
  return out;
}

type TickSet = { values: number[]; labels: string[] };

function computeTicks(edges: number[], windowDays: number, totalSeconds: number): TickSet {
  const totalHours = totalSeconds / 3600;
  const isDailyAxis = windowDays > 1;
  const adaptive = isAdaptive(edges, totalSeconds);
  if (adaptive) {
    const n = edges.length - 1;
    if (isDailyAxis) {
      const days = dailyTickDays(windowDays);
      return {
        values: days.map((d) => {
          const idx = Math.min(n, Math.round(d * (n / windowDays)));
          return edges[idx];
        }),
        labels: days.map((d) => `${d}d`),
      };
    }
    const hours = subDailyTickHours(totalHours);
    return {
      values: hours.map((h) => {
        const idx = Math.min(n, Math.round(h * (n / totalHours)));
        return edges[idx];
      }),
      labels: hours.map((h) => `${h}h`),
    };
  }
  if (isDailyAxis) {
    const days = dailyTickDays(windowDays);
    return {
      values: days.map((d) => d * 24 * 3600),
      labels: days.map((d) => `${d}d`),
    };
  }
  const hours = subDailyTickHours(totalHours);
  return {
    values: hours.map((h) => h * 3600),
    labels: hours.map((h) => `${h}h`),
  };
}

function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatBinLabel(
  startSec: number,
  endSec: number,
  startMs: number,
  windowDays: number,
): string {
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

function promptForTask(taskType: TaskType): string {
  if (taskType === "peak") return "Which visualization would help you spot the peak most quickly?";
  if (taskType === "comparison") return "Which visualization would you use to compare periods of increased activity?";
  return "Which visualization makes the pattern easiest to read?";
}

export interface ABComparisonScreenProps {
  windowKey: string;
  windowDays: number;
  windowIndex: number;
  taskType: TaskType;
  onAdvance: () => void;
  isLast: boolean;
}

export function ABComparisonScreen({
  windowKey,
  windowDays,
  windowIndex,
  taskType,
  onAdvance,
  isLast,
}: ABComparisonScreenProps) {
  const participantIndex = useExperimentStore((state) => state.participantIndex);
  const recordAbResponse = useExperimentStore((state) => state.recordAbResponse);
  const [dataState, setDataState] = useState<DataState>({ status: "loading" });
  const [choice, setChoice] = useState<"A" | "B" | null>(null);
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState(3);
  const onsetAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exp2-data", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load stimuli (HTTP ${res.status})`);
        }
        const json = (await res.json()) as Exp2Data;
        if (cancelled) return;
        setDataState({ status: "loaded", data: json });
      } catch (err) {
        if (cancelled) return;
        setDataState({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to load stimuli.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const windowData = dataState.status === "loaded" ? dataState.data.windows.find((w) => w.key === windowKey) ?? null : null;
  const ordering =
    dataState.status === "loaded"
      ? dataState.data.orderings[participantIndex % dataState.data.orderings.length]?.[windowKey] ?? "AB"
      : "AB";

  const shownA = windowData && ordering === "AB" ? windowData.strategyA : windowData?.strategyB ?? "uniform";
  const shownB = windowData && ordering === "AB" ? windowData.strategyB : windowData?.strategyA ?? "uniform";

  useEffect(() => {
    if (!windowData) return;
    onsetAtRef.current = performance.now();
    setChoice(null);
    setRationale("");
    setConfidence(3);
  }, [windowData, windowKey]);

  const totalSeconds = windowData ? windowData.counts.length * (windowDays > 1 ? 24 : 1) * 3600 : 0;
  const xScale = useMemo(
    () => scaleLinear({ domain: [0, Math.max(totalSeconds, 1)], range: [8, 1090] }),
    [totalSeconds],
  );

  if (dataState.status === "error") {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{dataState.error}</div>;
  }

  if (dataState.status === "loading" || !windowData) {
    return <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading comparison stimulus…</div>;
  }

  const edgesA = buildEdges(shownA, windowData.counts, totalSeconds);
  const edgesB = buildEdges(shownB, windowData.counts, totalSeconds);
  const rug = subsampleRug(windowData.timestamps, dateStrToMs(windowData.start), totalSeconds, 500);
  const ticksA = computeTicks(edgesA, windowDays, totalSeconds);
  const ticksB = computeTicks(edgesB, windowDays, totalSeconds);
  const edgesAPx = edgesA.map((s) => xScale(s));
  const edgesBPx = edgesB.map((s) => xScale(s));
  const ticksAPx = ticksA.values.map((s) => xScale(s));
  const ticksBPx = ticksB.values.map((s) => xScale(s));
  const rugPx = rug.map((s) => xScale(s));

  const commit = async () => {
    if (!choice) return;
    const onsetAt = onsetAtRef.current ?? performance.now();
    const responseTimeMs = Math.max(0, performance.now() - onsetAt);
    await recordAbResponse({
      windowKey,
      taskType,
      choice,
      rationale,
      responseTimeMs,
      confidence,
    });
    onAdvance();
  };

  const totalWindows = 12;

  return (
    <section className="flex flex-col gap-4" data-testid={`ab-screen-${windowKey}`}>
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Window {windowIndex + 1} of {totalWindows} · {windowDays}d #{windowData.rank}
          <span className="ml-2 text-sm font-normal text-slate-600">
            {formatShort(windowData.start)} → {formatShort(windowData.end)}
          </span>
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[taskType]}</p>
        <p className="text-sm text-slate-700">{promptForTask(taskType)}</p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <svg viewBox="0 0 1100 320" width="100%" className="block select-none" role="img" aria-label="A/B comparison stimulus">
          <rect x={0} y={0} width={1100} height={320} fill="#ffffff" pointerEvents="none" />
          <line x1={8} y1={68} x2={990} y2={68} stroke="#1f1f1f" strokeWidth={1} />

          <g>
            {rugPx.map((x, idx) => (
              <line
                key={idx}
                x1={x}
                x2={x}
                y1={14}
                y2={60}
                stroke="#475569"
                strokeOpacity={0.55}
                strokeWidth={0.6}
              />
            ))}
          </g>
          <text x={996} y={32} fontSize={11} fontWeight={600} fill="#0f172a">
            Shared event rug
          </text>
          <text x={996} y={48} fontSize={10} fontStyle="italic" fill="#64748b">
            {windowData.totalEvents.toLocaleString("en-US")} events
          </text>

          <ComparisonRow
            edgesPx={edgesAPx}
            y={86}
            h={70}
            counts={windowData.counts}
            startMs={dateStrToMs(windowData.start)}
            windowDays={windowDays}
            totalSeconds={totalSeconds}
            ticksPx={ticksAPx}
            tickLabels={ticksA.labels}
            label="Visualization A"
          />

          <ComparisonRow
            edgesPx={edgesBPx}
            y={174}
            h={70}
            counts={windowData.counts}
            startMs={dateStrToMs(windowData.start)}
            windowDays={windowDays}
            totalSeconds={totalSeconds}
            ticksPx={ticksBPx}
            tickLabels={ticksB.labels}
            label="Visualization B"
          />
        </svg>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate-800">Which would you choose?</legend>
        <div className="flex gap-2">
          {(["A", "B"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChoice(c)}
              aria-pressed={choice === c}
              data-testid={`ab-choice-${c}`}
              className={
                choice === c
                  ? "rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-800">
          Why? <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          placeholder="A few words on what makes this easier or harder to read."
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
          data-testid="ab-rationale"
        />
      </label>

      <div className="flex items-center gap-3 text-sm text-slate-700" data-testid="confidence-scale">
        <span>Confidence:</span>
        {CONFIDENCE_ANCHORS.map((anchor, index) => {
          const value = index + 1;
          return (
            <button
              key={anchor}
              type="button"
              onClick={() => setConfidence(value)}
              aria-pressed={confidence === value}
              aria-label={anchor}
              title={anchor}
              data-anchor={anchor}
              className={`h-9 rounded-md border px-3 text-xs font-semibold ${
                confidence === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              {anchor}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {isLast ? "This is the last window." : "Pick one, then go to the next window."}
        </p>
        <button
          type="button"
          onClick={() => void commit()}
          disabled={!choice}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="ab-next"
        >
          Next
        </button>
      </div>
    </section>
  );
}

type ComparisonRowProps = {
  edgesPx: number[];
  y: number;
  h: number;
  counts: number[];
  startMs: number;
  windowDays: number;
  totalSeconds: number;
  ticksPx: number[];
  tickLabels: string[];
  label: string;
};

function ComparisonRow({
  edgesPx,
  y,
  h,
  counts,
  startMs,
  windowDays,
  totalSeconds,
  ticksPx,
  tickLabels,
  label,
}: ComparisonRowProps) {
  const plotX0 = 8;
  const plotX1 = 990;
  const axisY = y + h;
  return (
    <g data-testid={`row-${label}`}>
      <line x1={plotX0} y1={axisY} x2={plotX1} y2={axisY} stroke="#1f1f1f" strokeWidth={1} />
      {edgesPx.slice(0, -1).map((xLeft, i) => {
        const xRight = edgesPx[i + 1];
        const w = Math.max(0, xRight - xLeft);
        const startSec = (edgesPx[i] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        const endSec = (edgesPx[i + 1] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        return (
          <g key={i}>
            <rect
              x={xLeft}
              y={y}
              width={w}
              height={h}
              fill="#d8d8d8"
              stroke="#1f1f1f"
              strokeWidth={0.7}
            >
              <title>
                {formatBinLabel(startSec, endSec, startMs, windowDays)} · {counts[i] ?? 0} events
              </title>
            </rect>
          </g>
        );
      })}
      {ticksPx.map((x, i) => (
        <g key={`tick-${i}`}>
          <line x1={x} y1={axisY - 4} x2={x} y2={axisY} stroke="#1f1f1f" strokeWidth={0.8} />
          <text x={x} y={axisY + 14} fontSize={9} fill="#475569" textAnchor="middle">
            {tickLabels[i]}
          </text>
        </g>
      ))}
      <text x={996} y={y + h / 2} fontSize={12} fontWeight={600} fill="#475569" dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
}

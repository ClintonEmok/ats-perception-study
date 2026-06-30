"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "@visx/scale";

type Strategy =
  | "uniform"
  | "raw_density"
  | "density_mild"
  | "density_firm";

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
  windows: WindowData[];
};

type Choice = "A" | "B" | null;
type WindowResponse = { choice: Choice; rationale: string };
type Responses = Record<string, WindowResponse>;

const STRATEGY_LABELS: Record<Strategy, string> = {
  uniform: "Uniform",
  raw_density: "Raw density",
  density_mild: "Raw density (mild)",
  density_firm: "Raw density (firm)",
};

const STORAGE_KEY = "exp2-interactive-responses-v1";
const RUG_TARGET_TICKS = 500;

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function startMsFor(start: string): number {
  return Date.UTC(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  );
}

function endMsFor(end: string): number {
  return Date.UTC(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    Number(end.slice(8, 10)),
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
  const gain =
    strategy === "raw_density"
      ? 5
      : strategy === "density_mild"
        ? 2
        : 10;
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
  if (out[out.length - 1] !== Math.round(totalHours))
    out.push(Math.round(totalHours));
  return out;
}

type TickSet = { values: number[]; labels: string[] };

function computeTicks(
  edges: number[],
  windowDays: number,
  totalSeconds: number,
): TickSet {
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
  return DATE_FMT.format(new Date(iso + "T00:00:00Z"));
}

function formatBinLabel(
  startSec: number,
  endSec: number,
  startMs: number,
  showDate: boolean,
  windowDays: number,
): string {
  const sMs = startMs + startSec * 1000;
  const eMs = startMs + endSec * 1000;
  const s = new Date(sMs);
  const e = new Date(eMs);
  if (windowDays > 1) {
    if (!showDate) {
      const sd = Math.round(startSec / 86400);
      const ed = Math.round(endSec / 86400);
      return `${sd}d – ${ed}d`;
    }
    return `${SHORT_DATE_FMT.format(s)} – ${SHORT_DATE_FMT.format(e)}`;
  }
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

type Hover = {
  windowKey: string;
  x: number;
  y: number;
  label: string;
  count: number;
};

export default function Exp2InteractivePage() {
  const [data, setData] = useState<Exp2Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [revealed, setRevealed] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exp2-data", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            body.message ?? `Failed to load stimuli (HTTP ${res.status})`,
          );
        }
        const json = (await res.json()) as Exp2Data;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load stimuli.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Responses;
      if (parsed && typeof parsed === "object") setResponses(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
  }, [responses]);

  const totalAnswered = useMemo(
    () => Object.values(responses).filter((r) => r.choice !== null).length,
    [responses],
  );

  function setResponse(windowKey: string, patch: Partial<WindowResponse>) {
    setResponses((prev) => {
      const existing: WindowResponse = prev[windowKey] ?? {
        choice: null,
        rationale: "",
      };
      return { ...prev, [windowKey]: { ...existing, ...patch } };
    });
  }

  function exportResponses() {
    if (!data) return;
    const payload = {
      sessionId: `exp2-${Date.now()}`,
      exportedAt: new Date().toISOString(),
      dataGeneratedAt: data.generatedAt,
      seed: data.seed,
      responses,
      reveal: revealed
        ? Object.fromEntries(
            data.windows.map((w) => [
              w.key,
              {
                A: STRATEGY_LABELS[w.strategyA],
                B: STRATEGY_LABELS[w.strategyB],
              },
            ]),
          )
        : undefined,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exp2-responses-${payload.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearResponses() {
    if (!window.confirm("Clear all saved responses on this device?")) return;
    setResponses({});
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Stimuli data unavailable</h1>
        <p className="mt-3 text-sm text-slate-700">{loadError}</p>
        <pre className="mt-4 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          pnpm stimuli:exp2
        </pre>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-slate-600">Loading stimuli…</p>
      </main>
    );
  }

  return (
    <main
      className="mx-auto max-w-5xl px-6 py-10"
      onMouseLeave={() => setHover(null)}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Expert evaluation — adaptive vs uniform time allocation
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Six windows. Each shows the same events under two time allocations
            (anonymous <strong>A</strong> and <strong>B</strong>). Pick the one
            you&apos;d choose, then briefly say why. Responses stay on this
            device until you export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={revealed}
              onChange={(e) => setRevealed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
              data-testid="reveal-toggle"
            />
            Reveal strategy names
          </label>
          <button
            type="button"
            onClick={exportResponses}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            data-testid="export-button"
          >
            Export responses
          </button>
          <button
            type="button"
            onClick={clearResponses}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            data-testid="clear-button"
          >
            Clear
          </button>
        </div>
      </header>

      <p className="mb-6 text-xs text-slate-500" data-testid="progress">
        {totalAnswered} / {data.windows.length} answered
      </p>

      <div className="flex flex-col gap-8">
        {data.windows.map((w, i) => (
          <WindowCard
            key={w.key}
            index={i}
            window={w}
            response={responses[w.key] ?? { choice: null, rationale: "" }}
            revealed={revealed}
            onChoice={(choice) => setResponse(w.key, { choice })}
            onRationale={(rationale) => setResponse(w.key, { rationale })}
            onHover={setHover}
          />
        ))}
      </div>

      {hover ? (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 280),
            top: Math.max(hover.y - 8, 8),
          }}
          data-testid="hover-tooltip"
        >
          <div className="font-medium text-slate-900">{hover.label}</div>
          <div className="mt-0.5 text-slate-600">
            <span className="tabular-nums">
              {hover.count.toLocaleString("en-US")}
            </span>{" "}
            events
          </div>
        </div>
      ) : null}
    </main>
  );
}

type WindowCardProps = {
  index: number;
  window: WindowData;
  response: WindowResponse;
  revealed: boolean;
  onChoice: (choice: Choice) => void;
  onRationale: (rationale: string) => void;
  onHover: React.Dispatch<React.SetStateAction<Hover | null>>;
};

function WindowCard({
  index,
  window: w,
  response,
  revealed,
  onChoice,
  onRationale,
  onHover,
}: WindowCardProps) {
  const [, binHours] = ((): [number, number] => {
    if (w.windowDays <= 1) return [24, 1];
    return [w.windowDays, 24];
  })();
  const totalSeconds = w.counts.length * binHours * 3600;
  const startMs = startMsFor(w.start);
  const endMs = endMsFor(w.end);

  const edgesA = useMemo(
    () => buildEdges(w.strategyA, w.counts, totalSeconds),
    [w.strategyA, w.counts, totalSeconds],
  );
  const edgesB = useMemo(
    () => buildEdges(w.strategyB, w.counts, totalSeconds),
    [w.strategyB, w.counts, totalSeconds],
  );

  const rug = useMemo(
    () => subsampleRug(w.timestamps, startMs, totalSeconds, RUG_TARGET_TICKS),
    [w.timestamps, startMs, totalSeconds],
  );

  const W = 1100;
  const H = 320;
  const padTop = 8;
  const padBottom = 28;
  const padLeft = 8;
  const padRight = 110;
  const plotX0 = padLeft;
  const plotX1 = W - padRight;
  const plotW = plotX1 - plotX0;

  const rugTop = padTop;
  const rugH = 60;
  const rowTop = rugTop + rugH + 18;
  const rowH = 70;
  const rowGap = 18;
  const rowAY = rowTop;
  const rowBY = rowTop + rowH + rowGap;

  const xScale = useMemo(
    () => scaleLinear({ domain: [0, totalSeconds], range: [plotX0, plotX1] }),
    [totalSeconds, plotX0, plotX1],
  );

  const ticksA = useMemo(
    () => computeTicks(edgesA, w.windowDays, totalSeconds),
    [edgesA, w.windowDays, totalSeconds],
  );
  const ticksB = useMemo(
    () => computeTicks(edgesB, w.windowDays, totalSeconds),
    [edgesB, w.windowDays, totalSeconds],
  );

  const edgesAPx = useMemo(() => edgesA.map((s) => xScale(s)), [edgesA, xScale]);
  const edgesBPx = useMemo(() => edgesB.map((s) => xScale(s)), [edgesB, xScale]);
  const ticksAPx = useMemo(
    () => ticksA.values.map((s) => xScale(s)),
    [ticksA, xScale],
  );
  const ticksBPx = useMemo(
    () => ticksB.values.map((s) => xScale(s)),
    [ticksB, xScale],
  );
  const rugPx = useMemo(() => rug.map((s) => xScale(s)), [rug, xScale]);

  const titleSuffix = revealed
    ? ` · A = ${STRATEGY_LABELS[w.strategyA]}, B = ${STRATEGY_LABELS[w.strategyB]}`
    : "";

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      data-testid={`window-card-${w.key}`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Window {index + 1} · {w.windowDays}d #{w.rank}
            <span className="ml-2 text-sm font-normal text-slate-600">
              {formatShort(w.start)} → {formatShort(w.end)}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="tabular-nums">
              {w.totalEvents.toLocaleString("en-US")}
            </span>{" "}
            events · CV <span className="tabular-nums">{w.cv.toFixed(2)}</span>{" "}
            · peak/mean{" "}
            <span className="tabular-nums">{w.peakRatio.toFixed(1)}</span>×
            {titleSuffix}
          </p>
        </div>
      </header>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block select-none"
        role="img"
        aria-label={`Comparison of two time allocations for window ${w.key}`}
      >
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="#ffffff"
          pointerEvents="none"
        />

        <line
          x1={plotX0}
          y1={rugTop + rugH}
          x2={plotX1}
          y2={rugTop + rugH}
          stroke="#1f1f1f"
          strokeWidth={1}
        />

        <g
          onMouseLeave={() => onHover(null)}
          data-testid={`rug-${w.key}`}
        >
          {rugPx.map((x, idx) => (
            <line
              key={idx}
              x1={x}
              x2={x}
              y1={rugTop + 6}
              y2={rugTop + rugH - 4}
              stroke="#475569"
              strokeOpacity={0.55}
              strokeWidth={0.6}
            />
          ))}
        </g>

        <text
          x={plotX1 + 6}
          y={rugTop + rugH / 2 - 8}
          fontSize={11}
          fontWeight={600}
          fill="#0f172a"
        >
          Shared event rug
        </text>
        <text
          x={plotX1 + 6}
          y={rugTop + rugH / 2 + 8}
          fontSize={10}
          fontStyle="italic"
          fill="#64748b"
        >
          {w.totalEvents.toLocaleString("en-US")} events
        </text>

        <AllocationRow
          edgesPx={edgesAPx}
          y={rowAY}
          h={rowH}
          plotX0={plotX0}
          plotX1={plotX1}
          counts={w.counts}
          startMs={startMs}
          totalSeconds={totalSeconds}
          windowDays={w.windowDays}
          ticksPx={ticksAPx}
          tickLabels={ticksA.labels}
          label="Visualization A"
          labelColor={response.choice === "A" ? "#0f172a" : "#475569"}
          onHover={onHover}
          windowKey={w.key}
        />

        <AllocationRow
          edgesPx={edgesBPx}
          y={rowBY}
          h={rowH}
          plotX0={plotX0}
          plotX1={plotX1}
          counts={w.counts}
          startMs={startMs}
          totalSeconds={totalSeconds}
          windowDays={w.windowDays}
          ticksPx={ticksBPx}
          tickLabels={ticksB.labels}
          label="Visualization B"
          labelColor={response.choice === "B" ? "#0f172a" : "#475569"}
          onHover={onHover}
          windowKey={w.key}
        />
      </svg>

      <div className="mt-4 flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-800">
            Which would you choose?
          </legend>
          <div className="flex gap-2">
            {(["A", "B"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChoice(c)}
                className={
                  response.choice === c
                    ? "rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                    : "rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
                data-testid={`choice-${w.key}-${c}`}
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
            value={response.rationale}
            onChange={(e) => onRationale(e.target.value)}
            rows={2}
            placeholder="A few words on what makes this one easier or harder to read."
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            data-testid={`rationale-${w.key}`}
          />
        </label>
      </div>
    </article>
  );
}

type AllocationRowProps = {
  edgesPx: number[];
  y: number;
  h: number;
  plotX0: number;
  plotX1: number;
  counts: number[];
  startMs: number;
  totalSeconds: number;
  windowDays: number;
  ticksPx: number[];
  tickLabels: string[];
  label: string;
  labelColor: string;
  onHover: React.Dispatch<React.SetStateAction<Hover | null>>;
  windowKey: string;
};

function AllocationRow({
  edgesPx,
  y,
  h,
  plotX0,
  plotX1,
  counts,
  startMs,
  totalSeconds,
  windowDays,
  ticksPx,
  tickLabels,
  label,
  labelColor,
  onHover,
  windowKey,
}: AllocationRowProps) {
  const axisY = y + h;
  return (
    <g data-testid={`row-${windowKey}-${label}`}>
      <line
        x1={plotX0}
        y1={axisY}
        x2={plotX1}
        y2={axisY}
        stroke="#1f1f1f"
        strokeWidth={1}
      />
      {edgesPx.slice(0, -1).map((xLeft, i) => {
        const xRight = edgesPx[i + 1];
        const w = Math.max(0, xRight - xLeft);
        const startSec = (edgesPx[i] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        const endSec = (edgesPx[i + 1] - plotX0) * (totalSeconds / (plotX1 - plotX0));
        return (
          <rect
            key={i}
            x={xLeft}
            y={y}
            width={w}
            height={h}
            fill="#d8d8d8"
            stroke="#1f1f1f"
            strokeWidth={0.7}
            onMouseEnter={(e) => {
              const count = counts[i] ?? 0;
              const binLabel = formatBinLabel(
                startSec,
                endSec,
                startMs,
                true,
                windowDays,
              );
              onHover({
                windowKey,
                x: e.clientX,
                y: e.clientY,
                label: binLabel,
                count,
              });
            }}
            onMouseMove={(e) => {
              onHover((prev) =>
                prev && prev.windowKey === windowKey
                  ? { ...prev, x: e.clientX, y: e.clientY }
                  : prev,
              );
            }}
            onMouseLeave={() => onHover(null)}
            className="cursor-pointer"
          />
        );
      })}
      {ticksPx.map((x, i) => (
        <g key={`tick-${i}`}>
          <line
            x1={x}
            y1={axisY - 4}
            x2={x}
            y2={axisY}
            stroke="#1f1f1f"
            strokeWidth={0.8}
          />
          <text
            x={x}
            y={axisY + 14}
            fontSize={9}
            fill="#475569"
            textAnchor="middle"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      <text
        x={plotX1 + 6}
        y={y + h / 2}
        fontSize={12}
        fontWeight={600}
        fill={labelColor}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

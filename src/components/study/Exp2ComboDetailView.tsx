import { scaleLinear } from "@visx/scale";
import type { Exp2WindowData } from "@/lib/ats-study/exp2-data";

type StrategyLabels = Record<string, string>;

type Props = {
  windowData: Exp2WindowData;
  title: string;
  backHref: string;
  strategyLabels: StrategyLabels;
  rugMode: "uniform-only" | "always";
};

export function Exp2ComboDetailView({ windowData, title, backHref, strategyLabels, rugMode }: Props) {
  const totalSeconds = windowData.counts.length * (windowData.windowDays > 1 ? 24 : 1) * 3600;
  const xScale = scaleLinear({ domain: [0, Math.max(totalSeconds, 1)], range: [56, 1160] });
  const edgesA = buildEdges(windowData.strategyA, windowData.counts, totalSeconds).map((s) => xScale(s));
  const edgesB = buildEdges(windowData.strategyB, windowData.counts, totalSeconds).map((s) => xScale(s));
  const rugPx = subsampleRug(windowData.timestamps, dateStrToMs(windowData.start), totalSeconds, 500).map((s) => xScale(s));
  const showRugForA = rugMode === "always" || windowData.strategyA === "uniform";
  const showRugForB = rugMode === "always" || windowData.strategyB === "uniform";

  return (
    <main className="mx-auto flex w-full max-w-none flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-slate-600">
              {windowData.windowDays}d #{windowData.rank} · {formatShort(windowData.start)} → {formatShort(windowData.end)}
            </p>
          </div>
          <a className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50" href={backHref}>
            Back to gallery
          </a>
        </div>
        <p className="text-sm text-slate-600">
          A: {strategyLabels[windowData.strategyA] ?? windowData.strategyA} · B: {strategyLabels[windowData.strategyB] ?? windowData.strategyB}
        </p>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <svg viewBox="0 0 1180 580" width="100%" className="block">
          <rect x={0} y={0} width={1180} height={580} fill="#fff" />
          <Row label="A" y={108} h={92} totalSeconds={totalSeconds} counts={windowData.counts} edgesPx={edgesA} rugPx={rugPx} windowDays={windowData.windowDays} startMs={dateStrToMs(windowData.start)} showRug={showRugForA} />
          <Row label="B" y={378} h={92} totalSeconds={totalSeconds} counts={windowData.counts} edgesPx={edgesB} rugPx={rugPx} windowDays={windowData.windowDays} startMs={dateStrToMs(windowData.start)} showRug={showRugForB} />
        </svg>
      </article>
    </main>
  );
}

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

function buildEdges(strategy: string, counts: number[], totalSeconds: number): number[] {
  if (strategy === "uniform") return uniformEdges(counts.length, totalSeconds);
  if (strategy === "raw_density") return densityEdges(counts, totalSeconds, 5);
  if (strategy === "density_mild") return densityEdges(counts, totalSeconds, 2);
  if (strategy === "density_firm") return densityEdges(counts, totalSeconds, 10);
  if (strategy === "warp_100") return densityEdges(counts, totalSeconds, 5);
  if (strategy === "warp_150") return densityEdges(counts, totalSeconds, 7.5);
  if (strategy === "warp_200") return densityEdges(counts, totalSeconds, 10);
  return densityEdges(counts, totalSeconds, 15);
}

function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
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

type RowProps = {
  label: string;
  y: number;
  h: number;
  totalSeconds: number;
  counts: number[];
  edgesPx: number[];
  rugPx: number[];
  windowDays: number;
  startMs: number;
  showRug: boolean;
};

function Row({ label, y, h, totalSeconds, counts, edgesPx, rugPx, windowDays, startMs, showRug }: RowProps) {
  const plotX0 = 56;
  const plotX1 = 1160;
  const axisY = y + h;
  const rugTop = y - 78;
  const rugBottom = y - 32;
  return (
    <g>
      {showRug ? (
        <>
          <g>
            {rugPx.map((x, idx) => (
              <line key={idx} x1={x} x2={x} y1={rugTop} y2={rugBottom} stroke="#475569" strokeOpacity={0.55} strokeWidth={0.55} />
            ))}
          </g>
        </>
      ) : null}
      <text x={8} y={y + h / 2} fontSize={12} fontWeight={700} fill="#0f172a" dominantBaseline="middle">
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

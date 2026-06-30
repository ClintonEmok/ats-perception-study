#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { parse } = require('csv-parse');
const { parse: parseSync } = require('csv-parse/sync');
const { scaleLinear } = require('d3-scale');

const SCRIPT_DIR = __dirname;
const DEFAULT_OUTPUT_DIR = path.join(SCRIPT_DIR, 'output', 'experiment2_expert_stimuli');
const DEFAULT_CSV_PATH = path.join(
  SCRIPT_DIR,
  '..',
  'data',
  'sources',
  'Crimes_-_2001_to_Present_20260114.csv',
);
const DEFAULT_WINDOWS_PATH = path.join(SCRIPT_DIR, 'output', 'showcase_windows.csv');

const DPI = 200;
const RANDOM_SEED = 42;
const RUG_TARGET_TICKS = 500;

const TEXT_COLOR = '#0f172a';
const EDGE_COLOR = '#1f1f1f';
const FILL_COLOR = '#d8d8d8';
const RUG_COLOR = '#475569';
const MUTED_COLOR = '#64748b';

const SELECTED_WINDOWS = [
  [14, 1],
  [30, 1],
  [30, 5],
  [1, 5],
  [90, 3],
  [90, 2],
];

const STRATEGY_SPECS = {
  uniform: { label: 'Uniform', weightGain: null },
  raw_density: { label: 'Raw density', weightGain: 5.0 },
  density_mild: { label: 'Raw density (mild)', weightGain: 2.0 },
  density_firm: { label: 'Raw density (firm)', weightGain: 10.0 },
};

const STRATEGY_LABELS = Object.fromEntries(
  Object.entries(STRATEGY_SPECS).map(([k, v]) => [k, v.label]),
);

const WINDOW_STRATEGIES = {
  '14,1': ['uniform', 'raw_density'],
  '30,1': ['uniform', 'density_mild'],
  '30,5': ['density_mild', 'raw_density'],
  '1,5': ['uniform', 'density_firm'],
  '90,3': ['density_mild', 'density_firm'],
  '90,2': ['raw_density', 'density_firm'],
};

const SESSION_PROTOCOL = `# Expert Interview — Session Protocol

## Stimuli

Six figures, each comparing two visualizations of the same time window:

- **Visualization A** and **Visualization B** are anonymous. They are
  randomization-keyed (see \`REVEAL_KEY.md\` for the mapping).
- The vertical ticks above each bar are the underlying events.
- The bar below is the time allocation: how much horizontal space each
  bin gets under that visualization.

Show one figure at a time. Do not name the visualizations or hint at
which is more or less warped.

## Per-figure questions

1. **Identification.** *Which visualization would allow you to most
   quickly identify the period with the highest operational activity?*
2. **Comparison.** *Which visualization would you use to compare
   periods of increased activity?*
3. **Attention.** *What attracts your attention first when you look at
   this figure?*
4. **Confusion.** *Is anything confusing or hard to read?*
5. **Choice.** *Which representation would you choose? Which would you
   avoid? What becomes easier or harder to see?*
6. **Decision-making.** *Would this representation change the way you
   make a decision about this data?*

For each answer, ask **"why?"** and encourage the expert to think aloud.

## Think-aloud prompts

While the expert is looking at the figure:

- *What are you looking at first?*
- *What attracts your attention?*
- *What makes this easier or harder?*
- *Is anything confusing?*

## Closing bridge to the prototype

After all six figures have been discussed:

> "Now that you've seen the underlying visualization concept, here's
>  how it is integrated into the interactive prototype."

Show the prototype demo (\`/dashboard-demo\`) and discuss:

- the **timeline**,
- the **2D map**,
- the **space-time cube**,
- the **linked interaction** between them.

Then ask:

- *How does the prototype change your evaluation of the static figures?*
- *What did the static figures fail to capture?*
- *What would you add to the prototype to make the temporal
  allocation more legible?*
`;

function parseArgs(argv) {
  const args = {
    csvPath: DEFAULT_CSV_PATH,
    windowsPath: DEFAULT_WINDOWS_PATH,
    outputDir: DEFAULT_OUTPUT_DIR,
    seed: RANDOM_SEED,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--csv-path') {
      args.csvPath = path.resolve(next);
      i += 1;
    } else if (flag === '--windows-path') {
      args.windowsPath = path.resolve(next);
      i += 1;
    } else if (flag === '--output-dir') {
      args.outputDir = path.resolve(next);
      i += 1;
    } else if (flag === '--seed') {
      args.seed = Number(next);
      i += 1;
    } else if (flag === '--help' || flag === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/experiment2_expert_stimuli.js [options]',
      '',
      'Options:',
      '  --csv-path <path>      Input CSV (default: data/sources/Crimes_*.csv)',
      '  --windows-path <path>  Showcase windows CSV',
      '                        (default: scripts/output/showcase_windows.csv)',
      '  --output-dir <path>    Output directory',
      '                        (default: scripts/output/experiment2_expert_stimuli)',
      '  --seed <int>           RNG seed for A/B ordering (default: 42)',
      '  -h, --help             Show this help',
      '',
    ].join('\n'),
  );
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseRawDateMs(s) {
  if (!s) return NaN;
  const m = String(s)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
  if (!m) return NaN;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]) % 12;
  if (/PM/i.test(m[7])) hour += 12;
  return Date.UTC(year, month - 1, day, hour, Number(m[5]), Number(m[6]));
}

function loadShowcaseWindows(windowsPath) {
  const raw = fs.readFileSync(windowsPath, 'utf8');
  const records = parseSync(raw, { columns: true, skip_empty_lines: true, trim: true });
  return records.map((row) => ({
    windowDays: Number(row.window_days),
    rank: Number(row.rank),
    start: row.start,
    end: row.end,
    cv: Number(row.cv),
    peakRatio: Number(row.peak_ratio),
    totalEvents: Number(row.total_events),
  }));
}

function dateStrToMs(iso) {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  );
}

function inferWindowBinSpec(window) {
  if (window.windowDays <= 1) return [24, 1];
  return [window.windowDays, 24];
}

function prepareWindowStates(windows) {
  return windows.map((window) => {
    const [binCount, binHours] = inferWindowBinSpec(window);
    const startMs = dateStrToMs(window.start);
    return {
      window,
      binCount,
      binHours,
      startMs,
      hoursNeeded: binCount * binHours,
      hourMs: 3600 * 1000,
      hourlyCounts: new Int32Array(binCount * binHours),
      timestamps: [],
    };
  });
}

function finalizeWindowState(state) {
  const { binCount, binHours, hourlyCounts } = state;
  const counts = new Array(binCount);
  if (binHours === 1) {
    for (let i = 0; i < binCount; i += 1) counts[i] = hourlyCounts[i];
  } else {
    for (let i = 0; i < binCount; i += 1) {
      let sum = 0;
      const base = i * binHours;
      for (let j = 0; j < binHours; j += 1) sum += hourlyCounts[base + j];
      counts[i] = sum;
    }
  }
  state.timestamps.sort((a, b) => a - b);
  return { window: state.window, counts, timestamps: state.timestamps };
}

async function streamAllWindows(csvPath, states) {
  const totalSize = fs.statSync(csvPath).size;
  const t0 = Date.now();
  let rows = 0;
  let bytes = 0;
  let lastReport = t0;

  const stream = fs.createReadStream(csvPath);
  stream.on('data', (chunk) => {
    bytes += chunk.length;
  });
  const parser = stream.pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }),
  );

  for await (const row of parser) {
    rows += 1;
    const ts = parseRawDateMs(row.Date);
    if (!Number.isFinite(ts)) continue;
    for (const s of states) {
      if (ts < s.startMs) continue;
      const hourIdx = Math.floor((ts - s.startMs) / s.hourMs);
      if (hourIdx < 0 || hourIdx >= s.hoursNeeded) continue;
      s.hourlyCounts[hourIdx] += 1;
      s.timestamps.push(ts);
    }
    const now = Date.now();
    if (now - lastReport > 2000) {
      const elapsed = (now - t0) / 1000;
      const pct = (bytes / totalSize) * 100;
      process.stderr.write(
        `[stream] ${rows.toLocaleString('en-US')} rows  ${pct.toFixed(1)}%  ${elapsed.toFixed(0)}s\n`,
      );
      lastReport = now;
    }
  }

  const elapsed = (Date.now() - t0) / 1000;
  process.stderr.write(`[stream] done — ${rows.toLocaleString('en-US')} rows in ${elapsed.toFixed(0)}s\n`);
  return states.map(finalizeWindowState);
}

function weightDensity(counts) {
  if (counts.length === 0) return [];
  let peak = 0;
  for (const c of counts) if (c > peak) peak = c;
  if (peak <= 0) return counts.map(() => 0);
  return counts.map((c) => c / peak);
}

function uniformEdges(bins, totalSeconds) {
  const out = new Array(bins + 1);
  const step = totalSeconds / bins;
  for (let i = 0; i <= bins; i += 1) out[i] = i * step;
  return out;
}

function densityEdges(counts, totalSeconds, weightGain, weightFloor = 1.0) {
  const norm = weightDensity(counts);
  const visual = norm.map((n) => weightFloor + n * weightGain);
  const total = visual.reduce((a, b) => a + b, 0);
  if (total <= 0) return uniformEdges(counts.length, totalSeconds);
  let acc = 0;
  const edges = new Array(visual.length + 1);
  edges[0] = 0;
  for (let i = 0; i < visual.length; i += 1) {
    acc += visual[i];
    edges[i + 1] = (acc / total) * totalSeconds;
  }
  return edges;
}

function buildEdgesForStrategy(strategyName, counts, totalSeconds) {
  if (strategyName === 'uniform') return uniformEdges(counts.length, totalSeconds);
  const gain = STRATEGY_SPECS[strategyName].weightGain;
  return densityEdges(counts, totalSeconds, gain);
}

function linspaceIndices(n, target) {
  if (n <= target) return Array.from({ length: n }, (_, i) => i);
  const out = new Array(target);
  for (let i = 0; i < target; i += 1) {
    const f = (i * (n - 1)) / (target - 1);
    out[i] = Math.min(n - 1, Math.floor(f));
  }
  return out;
}

function subsampleRugSeconds(timestamps, startMs, totalSeconds, targetTicks) {
  if (timestamps.length === 0) return [];
  const startSec = Math.floor(startMs / 1000);
  const valid = [];
  for (const ts of timestamps) {
    const sec = Math.floor(ts / 1000) - startSec;
    if (sec >= 0 && sec < totalSeconds) valid.push(sec);
  }
  if (valid.length === 0) return [];
  if (valid.length <= targetTicks) return valid.slice();
  const indices = linspaceIndices(valid.length, targetTicks);
  return indices.map((i) => valid[i]);
}

function makeXScale(domainMin, domainMax, rangeMin, rangeMax) {
  return scaleLinear().domain([domainMin, domainMax]).range([rangeMin, rangeMax]);
}

function isAdaptiveEdges(edges, totalSeconds) {
  const n = edges.length - 1;
  if (n <= 0) return false;
  const step = totalSeconds / n;
  for (let i = 0; i <= n; i += 1) {
    if (Math.abs(edges[i] - i * step) > 1e-3) return true;
  }
  return false;
}

function dailyTickDays(windowDays) {
  const step = Math.max(1, Math.ceil(windowDays / 10));
  const days = [];
  for (let d = 0; d <= windowDays; d += step) days.push(d);
  if (days[days.length - 1] !== windowDays) days.push(windowDays);
  return days;
}

function subDailyTickHours(totalHours) {
  const nTicks = Math.max(2, Math.round(totalHours / 4) + 1);
  const step = totalHours / (nTicks - 1);
  const out = [];
  for (let i = 0; i < nTicks; i += 1) out.push(Math.round(i * step));
  if (out[out.length - 1] !== Math.round(totalHours)) out.push(Math.round(totalHours));
  return out;
}

function computeRowTicks(edges, window, totalSeconds) {
  const totalHours = totalSeconds / 3600;
  const isDailyAxis = window.windowDays > 1;
  const adaptive = isAdaptiveEdges(edges, totalSeconds);
  if (adaptive) {
    const n = edges.length - 1;
    if (isDailyAxis) {
      const days = dailyTickDays(window.windowDays);
      const xticks = days.map((d) => {
        const idx = Math.min(n, Math.round(d * (n / window.windowDays)));
        return edges[idx];
      });
      return [xticks, days.map((d) => `${d}d`)];
    }
    const hours = subDailyTickHours(totalHours);
    const xticks = hours.map((h) => {
      const idx = Math.min(n, Math.round(h * (n / totalHours)));
      return edges[idx];
    });
    return [xticks, hours.map((h) => `${h}h`)];
  }
  if (isDailyAxis) {
    const days = dailyTickDays(window.windowDays);
    return [days.map((d) => d * 24 * 3600), days.map((d) => `${d}d`)];
  }
  const hours = subDailyTickHours(totalHours);
  return [hours.map((h) => h * 3600), hours.map((h) => `${h}h`)];
}

function drawRugPx(ctx, xPx, yBaseline, height) {
  if (xPx.length === 0) return;
  ctx.save();
  ctx.strokeStyle = RUG_COLOR;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (const x of xPx) {
    ctx.moveTo(x, yBaseline);
    ctx.lineTo(x, yBaseline + height);
  }
  ctx.stroke();
  ctx.restore();
}

function drawAllocationBarsPx(ctx, edgesPx, yBaseline, height) {
  const n = edgesPx.length - 1;
  if (n <= 0) return;
  ctx.save();
  ctx.fillStyle = FILL_COLOR;
  ctx.strokeStyle = EDGE_COLOR;
  ctx.lineWidth = 0.7;
  for (let i = 0; i < n; i += 1) {
    const w = edgesPx[i + 1] - edgesPx[i];
    if (w <= 0) continue;
    ctx.fillRect(edgesPx[i], yBaseline, w, height);
    ctx.strokeRect(edgesPx[i], yBaseline, w, height);
  }
  ctx.restore();
}

function drawAxisTicksPx(ctx, x0, width, yBaseline, rowTop, rowH, xticksPx, xtickLabels) {
  ctx.save();
  ctx.fillStyle = TEXT_COLOR;
  ctx.strokeStyle = EDGE_COLOR;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = '17px sans-serif';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, rowTop);
  ctx.lineTo(x0, yBaseline);
  ctx.lineTo(x0 + width, yBaseline);
  ctx.lineTo(x0 + width, rowTop);
  ctx.stroke();
  for (let i = 0; i < xticksPx.length; i += 1) {
    ctx.fillText(xtickLabels[i], xticksPx[i], yBaseline + 6);
  }
  ctx.restore();
}

function renderStimulus(outPath, window, edgesA, edgesB, totalSeconds, rugSeconds, nEvents) {
  const W = Math.round(13.0 * DPI);
  const H = Math.round(4.4 * DPI);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const leftPad = Math.round(0.03 * W);
  const rightPad = Math.round(0.08 * W);
  const plotX0 = leftPad;
  const plotX1 = W - rightPad;
  const xScale = makeXScale(0, totalSeconds, plotX0, plotX1);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(
    `Window: ${window.start} → ${window.end}  (${window.windowDays}d, rank ${window.rank})`,
    W / 2,
    28,
  );

  ctx.fillStyle = MUTED_COLOR;
  ctx.font = 'italic 17px sans-serif';
  ctx.fillText(
    'Both visualizations represent the same event sequence. Only the temporal allocation differs.',
    W / 2,
    70,
  );

  const rugTop = 120;
  const rugH = 110;
  const rugPx = rugSeconds.map(xScale);
  drawRugPx(ctx, rugPx, rugTop, rugH);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 21px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Shared event rug', plotX1 + 16, rugTop + rugH * 0.55);
  ctx.fillStyle = MUTED_COLOR;
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText(
    `${nEvents.toLocaleString('en-US')} events`,
    plotX1 + 16,
    rugTop + rugH * 0.85,
  );

  const rows = [
    { edges: edgesA, label: 'Visualization A', top: 280, h: 170 },
    { edges: edgesB, label: 'Visualization B', top: 530, h: 170 },
  ];

  for (const row of rows) {
    const edgesPx = row.edges.map(xScale);
    drawAllocationBarsPx(ctx, edgesPx, row.top, row.h);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 25px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.label, plotX1 + 16, row.top + row.h / 2);

    const [xticksSec, xtickLabels] = computeRowTicks(row.edges, window, totalSeconds);
    const xticksPx = xticksSec.map(xScale);
    drawAxisTicksPx(ctx, plotX0, plotX1 - plotX0, row.top + row.h, row.top, row.h, xticksPx, xtickLabels);
  }

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

function renderRugOnly(outPath, window, rugSeconds, nEvents, totalSeconds) {
  const W = Math.round(13.0 * DPI);
  const H = Math.round(1.6 * DPI);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const leftPad = Math.round(0.03 * W);
  const rightPad = Math.round(0.05 * W);
  const plotX0 = leftPad;
  const plotX1 = W - rightPad;
  const xScale = makeXScale(0, totalSeconds, plotX0, plotX1);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    `Underlying events (linear time) — ${nEvents.toLocaleString('en-US')} events, ` +
      `${rugSeconds.length.toLocaleString('en-US')} ticks shown`,
    16,
    14,
  );
  ctx.fillText(
    `Window: ${window.start} → ${window.end}  (${window.windowDays}d, rank ${window.rank})`,
    16,
    40,
  );

  const rugTop = 90;
  const rugH = 140;
  const rugPx = rugSeconds.map(xScale);
  drawRugPx(ctx, rugPx, rugTop, rugH);

  const dummyEdges = uniformEdges(window.windowDays * 24, totalSeconds);
  const [xticksSec, xtickLabels] = computeRowTicks(dummyEdges, window, totalSeconds);
  const xticksPx = xticksSec.map(xScale);
  drawAxisTicksPx(ctx, plotX0, plotX1 - plotX0, rugTop + rugH, rugTop, rugH, xticksPx, xtickLabels);

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

async function renderIndexSheet(outPath, windowDirs) {
  const nCols = 3;
  const nRows = Math.ceil(windowDirs.length / nCols);
  const cellW = Math.round(4.5 * DPI);
  const cellH = Math.round(2.6 * DPI);
  const padX = 24;
  const padYTop = 70;
  const padYBottom = 24;
  const W = padX + (cellW + padX) * nCols;
  const H = padYTop + (cellH + padYBottom) * nRows;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Index sheet — all six stimuli (moderator reference)', W / 2, 22);

  for (let i = 0; i < windowDirs.length; i += 1) {
    const row = Math.floor(i / nCols);
    const col = i % nCols;
    const img = await loadImage(path.join(windowDirs[i], 'test_figure.png'));
    const x = padX + col * (cellW + padX);
    const y = padYTop + row * (cellH + padYBottom);
    ctx.drawImage(img, x, y, cellW, cellH);
  }

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

function writeRevealKey(outPath, results) {
  const lines = [
    '# Reveal key — A/B mapping per window',
    '',
    '| Window | Start → End | Visualization A | Visualization B |',
    '|---|---|---|---|',
  ];
  for (const r of results) {
    const w = r.window;
    const m = r.mapping;
    lines.push(
      `| ${w.windowDays}d #${w.rank} | ${w.start} → ${w.end} | ` +
        `${STRATEGY_LABELS[m['Visualization A']]} | ${STRATEGY_LABELS[m['Visualization B']]} |`,
    );
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`);
}

async function runForWindow(data, outDir, rng) {
  const { window, counts, timestamps } = data;
  const [, binHours] = inferWindowBinSpec(window);
  const binSeconds = binHours * 3600;
  const totalSeconds = counts.length * binSeconds;

  const key = `${window.windowDays},${window.rank}`;
  const [s0, s1] = WINDOW_STRATEGIES[key];
  const [strategyA, strategyB] = shuffleSeeded([s0, s1], rng);

  const edgesA = buildEdgesForStrategy(strategyA, counts, totalSeconds);
  const edgesB = buildEdgesForStrategy(strategyB, counts, totalSeconds);

  const startMs = dateStrToMs(window.start);
  const rug = subsampleRugSeconds(timestamps, startMs, totalSeconds, RUG_TARGET_TICKS);

  fs.mkdirSync(outDir, { recursive: true });

  renderStimulus(
    path.join(outDir, 'test_figure.png'),
    window,
    edgesA,
    edgesB,
    totalSeconds,
    rug,
    timestamps.length,
  );

  renderRugOnly(
    path.join(outDir, 'events_rug.png'),
    window,
    rug,
    timestamps.length,
    totalSeconds,
  );

  const mapping = {
    'Visualization A': strategyA,
    'Visualization B': strategyB,
  };
  fs.writeFileSync(
    path.join(outDir, 'mapping.txt'),
    `Visualization A = ${STRATEGY_LABELS[strategyA]}\n` +
      `Visualization B = ${STRATEGY_LABELS[strategyB]}\n`,
  );

  fs.writeFileSync(
    path.join(outDir, 'metadata.txt'),
    [
      `Window:       ${window.windowDays}d #${window.rank}`,
      `Start:        ${window.start}`,
      `End:          ${window.end}`,
      `CV:           ${window.cv.toFixed(3)}`,
      `Peak/mean:    ${window.peakRatio.toFixed(2)}x`,
      `Total events: ${timestamps.length.toLocaleString('en-US')}`,
      `Bins:         ${counts.length} x ${binHours}h`,
      `Rug ticks shown: ${rug.length.toLocaleString('en-US')} (of ${timestamps.length.toLocaleString('en-US')} events)`,
    ].join('\n') + '\n',
  );

  return { window, mapping, nEvents: timestamps.length };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    printHelp();
    process.exit(2);
  }

  if (!fs.existsSync(args.csvPath)) {
    process.stderr.write(`CSV not found: ${args.csvPath}\n`);
    process.exit(2);
  }
  if (!fs.existsSync(args.windowsPath)) {
    process.stderr.write(`Showcase windows CSV not found: ${args.windowsPath}\n`);
    process.exit(2);
  }

  fs.mkdirSync(args.outputDir, { recursive: true });
  const rng = mulberry32(args.seed);

  const allWindows = loadShowcaseWindows(args.windowsPath);
  const byKey = new Map(allWindows.map((w) => [`${w.windowDays},${w.rank}`, w]));

  const selectedWindowMetas = [];
  for (const [size, rank] of SELECTED_WINDOWS) {
    const window = byKey.get(`${size},${rank}`);
    if (!window) {
      process.stderr.write(`Missing window ${size}d #${rank} in ${args.windowsPath}\n`);
      process.exit(2);
    }
    selectedWindowMetas.push(window);
  }

  process.stdout.write(`[setup] output = ${args.outputDir}\n`);
  process.stdout.write(`[setup] seed   = ${args.seed}\n`);
  process.stdout.write(`[setup] ${SELECTED_WINDOWS.length} windows selected\n`);
  process.stdout.write(`[setup] streaming ${args.csvPath} once for all windows\n`);

  const states = prepareWindowStates(selectedWindowMetas);
  const datasets = await streamAllWindows(args.csvPath, states);

  const results = [];
  const windowDirs = [];
  for (let i = 0; i < datasets.length; i += 1) {
    const data = datasets[i];
    const [size, rank] = SELECTED_WINDOWS[i];
    const outDir = path.join(
      args.outputDir,
      `window_${String(i + 1).padStart(2, '0')}_${size}d_rank${rank}`,
    );
    process.stdout.write(
      `\n[window ${i + 1}/6] ${size}d #${rank}  ${data.window.start} → ${data.window.end}  ` +
        `(${data.timestamps.length.toLocaleString('en-US')} events)\n`,
    );
    const result = await runForWindow(data, outDir, rng);
    results.push(result);
    windowDirs.push(outDir);
    process.stdout.write(`  [write] ${outDir}/test_figure.png\n`);
    process.stdout.write(`  [write] ${outDir}/events_rug.png\n`);
    process.stdout.write(`  [write] ${outDir}/mapping.txt\n`);
    process.stdout.write(`  [write] ${outDir}/metadata.txt\n`);
    process.stdout.write(
      `  A = ${STRATEGY_LABELS[result.mapping['Visualization A']]}, ` +
        `B = ${STRATEGY_LABELS[result.mapping['Visualization B']]}\n`,
    );
  }

  const indexPath = path.join(args.outputDir, 'index_sheet.png');
  await renderIndexSheet(indexPath, windowDirs);
  process.stdout.write(`\n[write] ${indexPath}\n`);

  const protocolPath = path.join(args.outputDir, 'session_protocol.md');
  fs.writeFileSync(protocolPath, SESSION_PROTOCOL);
  process.stdout.write(`[write] ${protocolPath}\n`);

  const revealPath = path.join(args.outputDir, 'REVEAL_KEY.md');
  writeRevealKey(revealPath, results);
  process.stdout.write(`[write] ${revealPath}\n`);

  process.stdout.write('\nDone.\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

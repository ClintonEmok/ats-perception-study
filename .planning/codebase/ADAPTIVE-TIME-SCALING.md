# Adaptive Time Scaling — Deep-Dive Analysis

**Analysis Date:** 2026-06-29
**Focus:** Adaptive vs. uniform time scaling for the 3D space-time cube prototype.

---

## Overview

The adaptive time scaling system replaces uniform chronological time with a **non-uniform vertical (Y-axis) mapping** inside the 3D space-time cube. Dense/bursty periods expand to occupy more vertical space, while sparse periods compress. A single `warpFactor` slider (0–1) blends between linear and fully-adaptive positioning, interpolated per-frame on the GPU.

---

## 1. What "Adaptive" vs "Uniform" Does to the Cube Layers

### Uniform (Linear) Mode — `warpFactor = 0`

Points use their raw chronological time as their Y coordinate. Equal time spans = equal vertical space. A month with 10,000 crimes occupies the same screen height as a month with 12 crimes. This produces visually "wasted" blank regions and makes it hard to inspect dense clusters.

### Adaptive Mode — `warpFactor = 1`

Points are repositioned according to a **warp map** — a `Float32Array[1024]` that defines where each normalized time bin maps to in warped coordinates. Dense/bursty bins **expand** (get more vertical space). Sparse bins **compress** (get less). The result: bursty crime periods visually dominate the cube, sparse periods are minimized.

### Blending — `0 < warpFactor < 1`

The GPU vertex shader (`src/components/viz/shaders/ghosting.ts`, line 105) linearly interpolates:

```glsl
float adaptiveY = texture2D(uWarpTexture, vec2(normalizedTime, 0.5)).r;
float currentY = mix(linearY, adaptiveY, uWarpFactor);
```

The `uWarpFactor` uniform is animated with `MathUtils.damp()` (smoothing factor 5) in the render loop, producing a smooth visual transition when the slider changes.

---

## 2. How the Warp Map Is Calculated

The core algorithm lives in `src/workers/adaptiveTime.worker.ts` → `computeAdaptiveMaps()`. It produces **four parallel Float32Arrays** (`binCount = 1024` by default):

### Step 1: Binning → `countMap[]` + `densityInput[]`

Two binning strategies, controlled by `binningMode`:

| Mode | `'uniform-time'` (default) | `'uniform-events'` |
|------|---------------------------|---------------------|
| **Bins** | Equal-width temporal intervals | Equal-count (quantile-based) |
| **Width** | `(tEnd - tStart) / binCount` (fixed) | Varies — narrow in dense regions |
| **Mapping** | `idx = floor(norm * binCount)` | Binary search into quantile boundaries |
| **densityInput** | `countMap[i]` (raw count) | `countMap[i] / binWidth[i]` (events/sec) |
| **Fallback** | Direct histogram | Boundary array must be strictly monotonic |

- `uniform-time` is used by `/timeslicing`, `/stats` fallback coverage, and dashboard-demo timeline workflows that preserve the same normalized brush-range contract.
- `uniform-events` is used by `/timeslicing-algos`.

The binning mode is resolved per-route in `src/lib/adaptive/route-binning-mode.ts`.

### Step 2: Kernel Smoothing → `densityMap[]`

A moving-average kernel of width `ADAPTIVE_KERNEL_WIDTH = 3` bins (configurable, 0–25) smooths the raw density:

```
smoothedDensity[i] = average of densityInput[i-kernelWidth .. i+kernelWidth]
```

Then normalized to [0, 1]:
```
densityMap[i] = smoothedDensity[i] / maxDensity
```

### Step 3: Burstiness Computation → `burstinessMap[]`

The **Goh-Barabasi inter-event burstiness coefficient** `B` (formula from `Goh & Barabasi, 2008`) is computed per bin:

```
For each bin i:
  For each consecutive event pair (j, j+1) mapped to bin i:
    delta = sorted[j+1] - sorted[j]
    burstCounts[i]++, burstSum[i] += delta, burstSumSq[i] += delta²

  μ = burstSum[i] / burstCounts[i]          // mean gap
  σ² = burstSumSq[i] / burstCounts[i] - μ²   // gap variance
  σ  = sqrt(σ²)
  B  = (σ - μ) / (σ + μ)                     // B ∈ [-1, 1]
  burstinessMap[i] = clamp01((B + 1) / 2)    // remap to [0, 1]
```

**Interpretation:**
- `B = −1` → perfectly regular spacing (all gaps identical) → `burstinessMap ≈ 0`
- `B = 0` → Poisson-like random timing → `burstinessMap ≈ 0.5`
- `B = +1` → extreme clustering (all events in one burst, then long empty gap) → `burstinessMap ≈ 1.0`

### Step 4: Weight Blending → `warpMap[]`

Each bin gets a stretch weight:

```
blendedSignal[i] = (1 - λ) * densityMap[i] + λ * burstinessMap[i]
weight[i]       = 1 + blendedSignal[i] * 5        // range: [1.0, 6.0]
```

The **burst influence** λ is controlled by `ADAPTIVE_BURST_INFLUENCE` in `src/lib/adaptive-utils.ts`:

```typescript
// Current value at time of analysis:
export const ADAPTIVE_BURST_INFLUENCE = 1.0;  // purely burstiness-driven
```

At `λ = 1.0`: density contributes 0%, burstiness contributes 100%. At `λ = 0`: pure density-based warping.

The `warpMap` is then built as a cumulative-weighted remapping:

```
totalWeight = Σ weights[i]
accumulated = 0
for i in 0..binCount-1:
  warpMap[i] = tStart + (accumulated / totalWeight) * tSpan
  accumulated += weights[i]
```

**Critical insight:** `warpMap[i]` tells you: "if a point falls in bin `i`, its warped Y position should be `warpMap[i]`." The gaps between consecutive `warpMap[i]` values are proportional to each bin's weight — high-weight bins get wider gaps (more space allocated).

### Server-side Variant

The server-side `computeWarpMap()` in `src/lib/queries/aggregations.ts` (used by `getOrCreateGlobalAdaptiveMaps`) uses a simpler density-only formula:

```typescript
weight[i] = 1 + normalizedDensity[i] * 5;  // no burstiness term
```

No burstiness blending occurs server-side.

---

## 3. Signal Sources for Time Slice Warp Weights (Phase 84)

Beyond the warp map for point positioning, each **TimeSlice** carries a `warpWeight` property used when bins are converted to slices. Three runtime-mutable signal sources (selected via `activeSignalSource` in `useAdaptiveStore`) compute this weight.

Dispatched in `src/store/slice-domain/createSliceCoreSlice.ts` (lines 396–406) via `dispatchWarpWeight()` from `src/lib/signal-sources/index.ts`:

### `burstiness` (default)
- **File:** `src/lib/signal-sources/burstiness.ts`
- **Formula:** If the bin has burst taxonomy metadata → `bin.warpWeight ?? (isNeutralPartition ? 1 : 1.25)`. Otherwise → `1.0`.
- **Range:** `[1.0, 1.25]`
- **Logic:** Reproduces pre-Phase-84 behavior exactly.

### `density`
- **File:** `src/lib/signal-sources/density.ts`
- **Formula:** `warpWeight = 1 + clamp01((O - E) / max(E, 1)) * 1.5`
  - `O` = observed events in the bin
  - `E` = expected events = `cell.mu * 3600 * totalWeeks` (from 168-cell baseline)
- **Range:** `[1.0, 2.5]`
- **Logic:** Bins with more events than baseline-expected get higher warp weight. Only above-baseline deviation increases weight (negative deviation clamped to 0).

### `contextual`
- **File:** `src/lib/signal-sources/contextual.ts`
- **Formula:** Winsorized Pearson residual:
  ```
  z = (count - μW * windowSec) / max(σW * sqrt(windowSec), ε)
  z_clamped = clamp(z, -2, 5)
  warpWeight = 0.2 + t * (3.0 - 0.2)       // where t = (z_clamped_Z_CLAMP_MIN)/(Z_CLAMP_MAX-Z_CLAMP_MIN)
  ```
- **Range:** `[0.2, 3.0]`
- **Logic:** Z-score against a **winsorized** (5th/95th percentile clipped) 168-cell baseline. `z = 0` → warpWeight = 1.0 (neutral). `z = 5` → 3.0 (max expansion). `z = −2` → 0.2 (max compression).

### Baseline Data Source

The 168-cell baseline (`hour-of-day × day-of-week` = 24×7 cells) is loaded from:
- **Static:** `public/baselines/baseline_168.json` (via `src/lib/signal-sources/baseline-loader.ts`)
- **DuckDB API:** `GET /api/adaptive/contextual-baseline` (computes live from DuckDB, cached by DB path)

Each cell contains `{ h, d, c, mu, sig }` — hour, day-of-week, raw count, mean events/sec, sigma events/sec.

---

## 4. Data Flow: End-to-End Paths

### Path A: Client-side Viewport Warp Map (Dashboard)

```
┌─────────────────────────────────────────────────────────────────────┐
│ useViewportCrimeData (hook)                                          │
│   → useCrimeData                                                     │
│     → GET /api/crimes/range?startEpoch=&endEpoch=&bufferDays=        │
│       → DuckDB: SELECT * FROM sorted_crimes WHERE epoch BETWEEN      │
│       → Response: { data: CrimeRecord[], meta }                      │
│     → Returns CrimeRecord[] with .timestamp, .x, .y, .z             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ useAdaptiveStore.computeMaps(timestampsCopy, domain, { binningMode })│
│   → Web Worker (adaptiveTime.worker.ts)                              │
│     → computeAdaptiveMaps(timestamps, domain, config)                │
│     → Returns: { densityMap, burstinessMap, warpMap, countMap }      │
│   → Sets store state via worker.onmessage                            │
│     store.densityMap, store.burstinessMap, store.warpMap             │
│     store.isComputing = false                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ DataPoints.tsx (React component)                                     │
│   • Reads warpMap, densityMap, burstinessMap, warpFactor, mapDomain  │
│   • createTexture(warpMap) → DataTexture (1D, RGBA, Float)           │
│   • createTexture(selectedAdaptiveMap) → DataTexture                  │
│   • Passes to GPU uniforms: uWarpTexture, uDensityTexture,            │
│     uWarpFactor, uWarpDomainMin/Max, uTimeMin/Max                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GPU Vertex Shader (ghosting.ts)                                      │
│   • normalizedTime = clamp((linearY - uWarpDomainMin) / warpSpan,    │
│                            0.0, 1.0)                                 │
│   • adaptiveY = texture2D(uWarpTexture, vec2(normalizedTime, 0.5)).r │
│   • currentY = mix(linearY, adaptiveY, uWarpFactor)                  │
│   • worldPos.y = currentY                                            │
│                                                                      │
│ GPU Fragment Shader:                                                 │
│   • burstGlow = smoothstep(0.15, 0.95, burstDensity)                │
│   • FragColor = mix(base, orange, burstGlow * 0.6) ← density heat    │
└─────────────────────────────────────────────────────────────────────┘
```

### Path B: Server-side Global Adaptive Maps

```
GET /api/adaptive/global?binCount=1024&kernelWidth=3&binningMode=uniform-time
  → getOrCreateGlobalAdaptiveMaps(binCount, kernelWidth, binningMode)
    → Check DuckDB adaptive_global_cache table (keyed by params hash)
    → Cache HIT: Deserialize JSON → Float32Array → return immediately
    → Cache MISS:
      1. Query DuckDB for domain: MIN(Date), MAX(Date), COUNT(*)
      2. uniform-time: SQL aggregation per bin (binned BY index)
         uniform-events: Load all timestamps, build quantiles, bin in JS
      3. Smooth densitySeries with kernel width
      4. Compute burstinessMap via SQL (per-bin gap statistics)
      5. computeWarpMap(normalizedDensity, domain) → warpMap
      6. Cache to DuckDB: JSON-encode all maps, insert into cache table
    → Response: JSON { binCount, kernelWidth, binningMode, domain,
        rowCount, generatedAt, densityMap, countMap, burstinessMap, warpMap }
    → Cache-Control: public, s-maxage=60, stale-while-revalidate=30

MainScene.tsx consumes JSON:
  → Float32Array.from(payload.warpMap) → setPrecomputedMaps()
  → Same GPU pipeline as Path A
```

### Path C: Signal Source Dispatch (Time Slice Creation)

```
Binning engine generates TimeBin[]
   → addSliceFromBin(bin, domain) / replaceSlicesFromBins(bins, domain)
     → Reads activeSignalSource from useAdaptiveStore.getState()
     → dispatchWarpWeight(source, bin, baseline, baselineW):
       'burstiness' → burstinessWarpWeight(bin)
       'density'    → densityWarpWeight(bin, baseline168, h, d)
       'contextual' → contextualWarpWeight(bin, baselineWinsorized, h, d)
     → Creates TimeSlice { ..., warpWeight, isBurst, burstClass, ... }
```

### Path D: Burst Detection API (Auto-Slice Creation)

```
POST /api/adaptive/bursts { partitions, crimeTypes, spatialFormula }
  → For each partition:
    queryCrimeCount() + queryCrimePoints() from DuckDB
    computeTemporalBFromTimestamps(timestamps) → Goh-Barabasi B
    computeSpatialBBinned(points, baselinePoints) → 32×32 grid analysis
    combinedB = 0.5 * temporalB + 0.5 * spatialB
  → Response: { bins: BurstBin[], targetSliceCount, totalB }

useAutoBurstSlices(burstWindows) hook (src/store/useSliceStore.ts)
  → Deduplicates by window signature (start-end to 3 decimal places)
  → addBurstSlice({ start, end }) → TimeSlice with isBurst=true, warpWeight=1.25
  → Normalizes any out-of-range burst slices into [0, 100] range
```

---

## 5. Burstiness vs Density — When Each Matters

| Property | Density | Burstiness |
|----------|---------|------------|
| **Answers** | How many events? | How clumped are they? |
| **Formula** | `count[i] / maxCount` | `(σ − μ) / (σ + μ)` |
| **Range** | [0, 1] | [0, 1] (remapped from [-1, 1]) |
| **High value means** | Many events in this bin | Events arrive in tight bursts |
| **Example high** | A whole month with 10,000 evenly distributed crimes | 50 crimes in 1 hour then nothing for 3 days |
| **Low value means** | Few or no events | Regular/periodic timing |
| **Current blend** | 0% contribution (`λ=1.0`) | 100% contribution (`λ=1.0`) |

The current configuration (`ADAPTIVE_BURST_INFLUENCE = 1.0`) means the warp map is **purely burstiness-driven**. A bin could have 10,000 events and still get minimal warp if those events are evenly distributed. Conversely, a bin with 50 tightly clustered events followed by a long gap would get maximum warp.

The `burstInfluence` parameter (0–1) in `WorkerConfig` allows hybrid mode — `0.5` would blend density and burstiness equally.

---

## 6. Key Configuration Constants

**Defined in `src/lib/adaptive-utils.ts`:**

```typescript
export const ADAPTIVE_BIN_COUNT = 1024;        // Number of warp map entries
export const ADAPTIVE_KERNEL_WIDTH = 3;         // Smoothing window in bins
export const ADAPTIVE_BURST_INFLUENCE = 1.0;    // 1.0 = pure burstiness
```

**Warp weight clamping** (from `src/lib/binning/warp-scaling.ts`):
```typescript
const MIN_WARP_WEIGHT = 0.25;   // Minimum warp weight per bin
const MAX_WARP_WEIGHT = 4;      // Maximum warp weight per bin
```

---

## 7. Architecture Map

```
                  ┌──────────────────────────────────────┐
                  │         useAdaptiveStore.ts           │
                  │  (Zustand store + Web Worker manager) │
                  │  warpFactor, burstMetric, densityScope│
                  │  computeMaps(), setPrecomputedMaps()  │
                  └──────┬───────────────┬───────────────┘
                         │               │
               ┌─────────▼──┐   ┌────────▼──────────┐
               │  Web Worker │   │    API Routes      │
               │ adaptiveTime│   │ /api/adaptive/     │
               │ .worker.ts  │   │   global           │
               │             │   │   bursts           │
               │ computeAdap │   │   contextual-      │
               │ tiveMaps()  │   │   baseline         │
               └─────────────┘   └────────┬───────────┘
                                          │
                              ┌───────────▼────────────┐
                              │    queries.ts           │
                              │ getOrCreateGlobalAdaptive│
                              │ Maps()                  │
                              │ + aggregations.ts       │
                              │   computeWarpMap()       │
                              └────────────────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │       DuckDB             │
                              │ sorted_crimes table      │
                              │ adaptive_global_cache    │
                              │ table                    │
                              └────────────────────────┘

         ┌──────────────────────────────────────────────────┐
         │         Signal Sources (Phase 84)                 │
         │  signal-sources/index.ts → dispatchWarpWeight()   │
         │  ├─ burstiness.ts   → B coefficient from taxonomy │
         │  ├─ density.ts      → O/E ratio vs 168-cell       │
         │  └─ contextual.ts   → Winsorized Pearson residual  │
         │  + baseline-loader.ts → static JSON / DuckDB API  │
         │  + winsorize.ts       → %-clipping for robustness │
         └──────────────────────────────────────────────────┘

         ┌──────────────────────────────────────────────────┐
         │         Rendering Pipeline                        │
         │  DataPoints.tsx: useEffect → CPU matrix sync      │
         │    sampleWarp(t) = lerp(warpMap[low..high], frac) │
         │    y = linearY*(1-warpFactor) + adaptiveY*warpFact│
         │  ghosting.ts: vertex shader                       │
         │    texture2D(uWarpTexture, normalizedTime)        │
         │    mix(linearY, adaptiveY, uWarpFactor)           │
         │  ghosting.ts: fragment shader                     │
         │    texture2D(uDensityTexture, burstNorm) → glow   │
         └──────────────────────────────────────────────────┘
```

---

## 8. Key Files Reference

| File | Role |
|------|------|
| `src/workers/adaptiveTime.worker.ts` | Core algorithm: computeAdaptiveMaps() — produces densityMap, burstinessMap, warpMap, countMap |
| `src/store/useAdaptiveStore.ts` | Zustand store: warpFactor, maps storage, worker communication, signal source selection |
| `src/lib/adaptive-utils.ts` | Constants: ADAPTIVE_BIN_COUNT=1024, ADAPTIVE_KERNEL_WIDTH=3, ADAPTIVE_BURST_INFLUENCE=1.0 |
| `src/lib/adaptive-scale.ts` | CPU-side adaptive Y computation (getAdaptiveScaleConfig, computeAdaptiveY) |
| `src/lib/adaptive/route-binning-mode.ts` | Resolves binning mode from URL pathname |
| `src/lib/binning/warp-scaling.ts` | Comparable warp bin scoring: peer-relative weights, boundary construction |
| `src/lib/binning/engine.ts` | Dynamic binning engine: 15+ strategies including auto-adaptive, burstiness, uniform-time |
| `src/lib/binning/types.ts` | TimeBin type with burstClass, warpWeight, burstinessCoefficient, etc. |
| `src/lib/signal-sources/index.ts` | dispatchWarpWeight() — routes bin to burstiness/density/contextual mapper |
| `src/lib/signal-sources/burstiness.ts` | Burstiness warp weight: 1.0 (neutral) or 1.25 (non-neutral burst bin) |
| `src/lib/signal-sources/density.ts` | Density warp weight: O/E ratio vs 168-cell → [1.0, 2.5] |
| `src/lib/signal-sources/contextual.ts` | Contextual warp weight: winsorized Pearson z → [0.2, 3.0] |
| `src/lib/signal-sources/winsorize.ts` | Winsorize helper: clips values at [lowerPct, upperPct] percentiles |
| `src/lib/signal-sources/contract.ts` | Baseline168 type, AdaptiveSignalSource type, binToCellIndex() |
| `src/lib/burst-detection.ts` | Temporal + spatial burst detection, fetchBurstBins(), allocateSlices() |
| `src/lib/queries.ts` | getOrCreateGlobalAdaptiveMaps() — DuckDB-based global map computation |
| `src/lib/queries/aggregations.ts` | computeWarpMap() — server-side density-only warp map |
| `src/store/useSliceDomainStore.ts` | Slice store (persisted), exports TimeSlice type |
| `src/store/useSliceStore.ts` | Re-exports useSliceDomainStore + useAutoBurstSlices hook |
| `src/store/slice-domain/createSliceCoreSlice.ts` | addSliceFromBin(), replaceSlicesFromBins() — uses dispatchWarpWeight() |
| `src/store/slice-domain/types.ts` | TimeSlice type with warpWeight, isBurst, burstClass, burstScore, etc. |
| `src/components/viz/DataPoints.tsx` | 3D cube instanced mesh: CPU matrix sync with warpMap sampling, GPU uniform binding |
| `src/components/viz/shaders/ghosting.ts` | Vertex/fragment shader: adaptiveY from warp texture, burst glow from density texture |
| `src/app/api/adaptive/global/route.ts` | GET endpoint for global adaptive maps |
| `src/app/api/adaptive/bursts/route.ts` | GET/POST endpoint for burst bin detection |
| `src/app/api/adaptive/contextual-baseline/route.ts` | GET endpoint for 168-cell baseline from DuckDB |
| `src/hooks/useViewportCrimeData.ts` | Viewport-based crime data hook (wraps useCrimeData) |
| `src/hooks/useAdaptiveScale.ts` | Hook returning a d3 scaleLinear with adaptive domain/range |
| `src/types/adaptive.ts` | AdaptiveBinningMode type: 'uniform-time' | 'uniform-events' |

---

*Deep analysis: 2026-06-29*

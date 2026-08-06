# Phase 84 — Research

**Researched:** 2026-06-27
**Domain:** TypeScript dashboard prototype — signal-source contract, contextual z-score port, dashboard-demo UI
**Confidence:** HIGH (every claim verified against a cited file_path:line_number; no architectural invention, all patterns reused from existing code)

## Confidence

**HIGH** — All eight open questions resolved against existing code; locked decisions from `84-CONTEXT.md` already in place; no library churn since Phase 83 (Python analysis is shipped, decision-gate verdict GO, baseline parquet committed dd8be2a).

## File map (what lives where)

| Path | Role |
|------|------|
| `src/components/dashboard-demo/GlobalWarpControls.tsx` | The single dashboard-demo surface where linear/adaptive is toggled (Button, lines 138-149). **Target location for the new 3-way `<Select>`.** |
| `src/components/ui/select.tsx` | shadcn-style Radix `<Select>` wrapper (already in stack; already imported by `src/components/settings/SettingsPanel.tsx:19-25`). |
| `src/store/useAdaptiveStore.ts` | Central adaptive store; host of `warpSource`, `burstinessMap`, `warpMap`, `warpFactor`. **Site for the new `activeSignalSource` field** (per CONTEXT.md L45). |
| `src/store/slice-domain/createSliceCoreSlice.ts:311-373` | `addSliceFromBin` — currently hardcodes `warpWeight: 1` for non-burst slices (line 357) and `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)` for burst taxonomy (line 330). **Where the new density/contextual branches will gate on `activeSignalSource`.** |
| `src/store/slice-domain/createSliceCoreSlice.ts:374-436` | `replaceSlicesFromBins` — mirrors the same constant-1.0 / 1.25 split (lines 393, 421). |
| `src/store/slice-domain/types.ts:7-33` | `TimeSlice` shape; has `warpWeight?: number` (line 14) which is mode-agnostic — public API preserved. |
| `src/lib/burst-detection.ts:6-21` | `BurstMetric = 'temporal' \| 'spatial' \| 'combined'` and helper exports `resolveBurstMetricValue` / `sumBurstMetric` / `allocateSlices` — these are an **internal** sub-knob, not the new top-level source. |
| `src/lib/burst-detection.ts:195-209` | `resolveBurstMetricValue` and `sumBurstMetric` — already aggregated into a single number; reused as-is for the new `burstiness` source. |
| `src/lib/binning/warp-scaling.ts:69-78` | `clampComparableWarpWeight` — the canonical 0.25x–4x clamp; reuse for new density/contextual mapping outputs. |
| `src/lib/binning/types.ts:9-63` | `TimeBin` interface; has `warpWeight?: number` (line 52) and `isNeutralPartition?: boolean` (line 54). |
| `src/store/useDashboardDemoCoordinationStore.ts:18-19` | `DemoWarpScaleMode = 'linear' \| 'adaptive'` and `DemoWarpSource = 'density' \| 'slice-authored'` — the existing pre-Phase-84 mode/contract. |
| `src/store/useDashboardDemoCoordinationStore.ts:116-118, 222-224` | `timeScaleMode`, `warpSource`, `warpFactor` state (linear/adaptive lives here, NOT in `useDashboardDemoTimeslicingModeStore`). |
| `src/store/useDashboardDemoTimeslicingModeStore.ts:8` | `TimeslicingMode = 'auto' \| 'manual'` — a **different** axis (auto vs manual binning). Not the linear/adaptive source-switcher. |
| `src/store/useAdaptiveStore.contract.test.ts` | Existing 28-line contract test pattern (getState + assert state shape). **Pattern to mirror for the new `activeSignalSource` guard test.** |
| `src/store/useDashboardDemoTimeslicingModeStore.test.ts:306-373` | Existing test that asserts `warpSource === 'density'` and `slices[0]?.warpWeight === 1.8` after `applyGeneratedBins` — this is the pre-Phase-84 snapshot baseline. |
| `src/app/api/adaptive/global/route.ts:42-44` | Existing API route with `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` — pattern for the new `contextual-baseline` route. |
| `src/app/api/adaptive/bursts/route.ts:234-266` | Existing GET handler that reads `startEpoch` / `endEpoch` from query string; pattern for the new baseline route. |
| `src/lib/queries/aggregations.ts:75-148` | Existing `cacheKey` pattern in `buildGlobalAdaptiveCacheQueries` (DUCKDB-table-backed cache keyed by `cacheKey` string). |
| `src/lib/feature-flags.ts:1-81` | `FLAG_DEFINITIONS` array — pattern for the new `signalSourceSelect` feature flag (default: hidden behind flag in Plan 84-03 Task 5 per CONTEXT.md L124). |
| `src/store/useFeatureFlagsStore.ts:25-89` | Persisted zustand feature flag store; `useFeatureFlagsStore((s) => s.isEnabled('flagId'))` is the standard read pattern. |
| `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/contextual.py:1-248` | The Python implementation being ported (compute_baseline, compute_contextual_z_series). |
| `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/baseline_168.parquet` | 8,359 bytes (8.16 KB on disk), sha256 fingerprint 793ccaa9c229c3a6, 168 cells × 6 fields. |
| `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/baseline_168.meta.json` | Sidecar metadata: `n_events: 8476869`, `ts_min: 978307200`, `ts_max: 1767571200`, `total_weeks: 1305.0`. |
| `public/` (root) | Empty of data files (only SVGs and `data/` subdir). New `public/baselines/baseline_168.json` slot available. |

## Q1: UI `<Select>` placement

**Answer:** The single existing dashboard-demo timeline control is `src/components/dashboard-demo/GlobalWarpControls.tsx`. The linear/adaptive toggle is a `<Button>` at lines 138-149 (`handleTimeScaleToggle` at line 69-75). The new 3-way signal-source `<Select>` should be added **inside the same Time-scale control block** (between the existing Button and the conditional `warpFactor` Slider, around line 150-151), gated on `timeScaleMode === 'adaptive'` so it only appears when the user has already opted into adaptive warping.

**Evidence:**
- `src/components/dashboard-demo/GlobalWarpControls.tsx:34-35` — reads `timeScaleMode` from `useDashboardDemoCoordinationStore`
- `src/components/dashboard-demo/GlobalWarpControls.tsx:69-75` — `handleTimeScaleToggle` swaps `linear` ↔ `adaptive`
- `src/components/dashboard-demo/GlobalWarpControls.tsx:138-149` — the actual Button UI
- `src/components/ui/select.tsx:9-190` — the Radix-backed `<Select>` already in stack; `@radix-ui/react-select ^2.3.1` is a dependency (package.json:24)
- `src/components/settings/SettingsPanel.tsx:19-25` — the only current consumer of `<Select>`, demonstrating the established `Select + SelectTrigger + SelectContent + SelectItem + SelectValue` import pattern
- `src/store/useDashboardDemoCoordinationStore.ts:18` — `DemoWarpScaleMode = 'linear' | 'adaptive'` is the type guard for conditional rendering

**Recommendation:** Add a new `Select` block inside the "Time scale" section after the existing Button. Use a `useAdaptiveStore((s) => s.activeSignalSource)` selector and `useAdaptiveStore((s) => s.setActiveSignalSource)` action. Persist in localStorage via the same zustand `persist` middleware as `useFeatureFlagsStore` (`src/store/useFeatureFlagsStore.ts:84-88` shows the `name: 'feature-flags-v1'`, `partialize: (s) => ({ flags: s.flags })` pattern). Wrap in `useFeatureFlagsStore.isEnabled('adaptiveSignalSource')` so the feature can be hidden in evaluation mode per CONTEXT.md L124.

## Q2: Density signal mapper formula

**Answer:** The existing density-derived path hardcodes `warpWeight: 1` for non-burst slices and `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)` for burst-taxonomy slices. There is **no O/E (observed/expected) computation today** — the "density" path is just a default of 1.0 for neutral partitions. The CONTEXT.md proposal `1 + clamp(O/E − 1, 0, 2) * 0.5` is a divergence from the current constant and changes the user-visible warp on every neutral slice.

**Evidence:**
- `src/store/slice-domain/createSliceCoreSlice.ts:330` — burst slice: `warpWeight: bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)`
- `src/store/slice-domain/createSliceCoreSlice.ts:357` — non-burst slice: `warpWeight: 1` (literal)
- `src/store/slice-domain/createSliceCoreSlice.ts:393` — `replaceSlicesFromBins` burst branch: same `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)`
- `src/store/slice-domain/createSliceCoreSlice.ts:421` — `replaceSlicesFromBins` non-burst branch: same `warpWeight: 1`
- `src/store/useDashboardDemoTimeslicingModeStore.ts:544` — `warpWeight: burstClass === 'neutral' ? 1 : 1 + Math.max(0, burstinessCoefficient)` (the only place that currently does a real density-style mapping, but only for the manual draft bin path)
- `src/lib/binning/warp-scaling.ts:69-78` — `clampComparableWarpWeight(value, min = 0.25, max = 4)` — the existing canonical clamp

**Recommendation:** Add a `densityWarpWeight(bin, baseline, hour, dow)` helper in `src/lib/burst-detection.ts` (or new `src/lib/signal-sources/density.ts`) that:
1. Reads `bin.count` as `O`
2. Reads `baseline[hour * 7 + dow].mean_per_sec * bin.endTime - bin.startTime` as `E`
3. Returns `clampComparableWarpWeight(1 + clamp01((O - E) / Math.max(E, 1)) * 1.5, 0.25, 4)` — range [1.0, 2.5]
4. Subordinate to `bin.warpWeight` if the bin already has a burst-taxonomy classification (preserves BFT-07/08 onset cues)

This is **not** a 1:1 with the existing `1.0` constant. Per CONTEXT.md L18 ("Reuses the 168-cell baseline built for contextual (Plan 84-02)"), the new `density` source explicitly uses the baseline. The pre-Phase-84 default-1.0 becomes a fallback when no baseline is loaded. **The parity test (Q6) must check that the `burstiness` source reproduces the pre-Phase-84 `1.0` exactly, not that `density` does.**

## Q3: Winsorization TS implementation

**Answer:** Hand-rolled is the right call. The Python `compute_contextual_z_series` does **not actually call `numpy.percentile`** — it computes `mu_per_sec[h, d] = count / cell_seconds` per cell and sigma via `np.sqrt(mu / cell_seconds)` (Poisson noise floor, see `metrics/contextual.py:99-101`). The "winsorized Pearson residual" referenced in CONTEXT.md is a **planned enhancement** for Phase 84 (per CONTEXT.md L23-31: clip mu_w and sigma_w at 5/95 percentile of the per-cell historical rate distribution), not a current Python behavior. So the TS port is **net new** for winsorization and only needs to match itself in tests.

**Evidence:**
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/contextual.py:64-104` — `compute_baseline`: produces per-cell `mean_per_sec` and `sigma_per_sec` (one float per cell, not a per-week distribution)
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/contextual.py:121-194` — `compute_contextual_z_series`: uses the per-cell mu directly, not a winsorized distribution
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/baseline.py:51-58` — `EXPECTED_COLUMNS`: 168 rows × 6 fields, no per-week distribution stored
- `package.json:14-82` — dependencies audit: no `simple-statistics`, no `mathjs`, no `d3-statistics`, no `numpy`-equivalent percentile lib. The only stats-adjacent dep is `d3-array` (line 50, version 3.2.4), which **does** export `d3.quantile(arr, p)` — but it uses type-7 (linear, R-7) interpolation, which is the same as `numpy.percentile(method='linear')`.
- `package.json:14-82` — no `lodash.percentile`, no `winsorize` package

**Recommendation:** Use `d3-array`'s `quantile` (already a transitive dep — the project already uses `d3-array` for `extent`, `bisector`, etc. in `src/components/timeline/lib/` and elsewhere). Implementation:

```typescript
// src/lib/signal-sources/winsorize.ts
import { quantile } from 'd3-array';

export function winsorize(values: number[], lowerPct: number, upperPct: number): number[] {
  const lo = quantile(values, lowerPct) ?? -Infinity;
  const hi = quantile(values, upperPct) ?? Infinity;
  return values.map((v) => Math.min(hi, Math.max(lo, v)));
}
```

**Do not** add a new dependency. `d3-array` is already a dependency (package.json:50). The sensitivity check in CONTEXT.md L34 (CV within 30%) runs as a 5-min Python script before the TS port ships, so the percentile behavior is locked before TS needs to match it.

**Alternative (if `d3-array` proves too slow):** A 12-line hand-rolled sort+linear-interp percentile in `src/lib/signal-sources/winsorize.ts` is the next fallback. The 168-cell baseline has only 168 floats — perf is irrelevant.

## Q4: Static baseline file size and fetch cost

**Answer:** The source parquet is 8,359 bytes (8.16 KB). The TS port reads 168 cells × 6 fields = 1,008 values; serialized as JSON (key:value pairs with float64 representation, no indentation) that's ≈ 12-15 KB on the wire; with `JSON.stringify(obj, null, 2)` for human-readability, ≈ 20-25 KB. Either way well under the 50 KB threshold in CONTEXT.md L37. Fetch is one-shot on first signal-source switch; payload is then cached in module-level memory.

**Evidence:**
- `stat -f "%z %N" .planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/baseline_168.parquet` → `8359 /Users/.../baseline_168.parquet`
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/baseline_168.meta.json:1-8` — schema: 168 cells, 6 fields per cell (`hour`, `dow`, `count`, `mean_per_sec`, `sigma_per_sec`, `count_cell_weeks`)
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/baseline.py:51-58` — `EXPECTED_COLUMNS` confirms the 6-field shape
- `public/` — root-level public dir exists, only has `data/`, `.DS_Store`, and 4 SVGs; new `public/baselines/baseline_168.json` slots in naturally

**Recommendation:** JSON with no indentation is the right call. Two specific size optimizations:
1. Convert `count_cell_weeks` to an integer (it's a constant 1305 in the current baseline; store once at the top level as a header field, not per-cell).
2. Store as `{ header: { nEvents, tsMin, tsMax, totalWeeks, fingerprint }, cells: [{ h, d, c, mu, sig }, ...] }` (5 fields per cell + integer indices).

Expected on-the-wire size: ~12-18 KB. Use `fetch('/baselines/baseline_168.json')` from a top-level module-level `let baselineCache: Baseline168 | null = null;` lazy initializer (so the fetch is deferred until first use of the contextual source, not on every page load). Validate the `header.fingerprint` against the API response; if they differ, fall back to the API route.

## Q5: Server-side cache strategy

**Answer:** Use the existing two-tier pattern. **Layer 1 (HTTP)**: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (matches `src/app/api/adaptive/global/route.ts:42-44` style but with longer TTL — the baseline is dataset-locked, not request-locked). **Layer 2 (in-process)**: a module-level `Map<string, BaselineResponse>` keyed by `DUCKDB_PATH` (not mtime — see reasoning below).

**Evidence:**
- `src/app/api/adaptive/global/route.ts:42-44` — existing pattern: `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`
- `src/app/api/adaptive/bursts/route.ts:259` — existing pattern: `Cache-Control: public, s-maxage=30, stale-while-revalidate=15` on POST
- `src/lib/queries/aggregations.ts:75-148` — existing `buildGlobalAdaptiveCacheQueries` pattern: `cacheKey` string, INSERT INTO DuckDB table, read by key, no mtime check (the dataset is treated as immutable for the session)
- `src/lib/db.ts:54-62` (Phase 83 research citation) — fingerprint logic exists in TS; but the existing `getOrCreateGlobalAdaptiveMaps` (called at `src/app/api/adaptive/global/route.ts:24`) does **not** check mtime; it relies on the upstream pipeline rebuilding the DuckDB file when the source CSV changes.
- `src/app/api/adaptive/global/route.ts:9-10` — `export const dynamic = 'force-dynamic';` — routes are not statically cached at the Next.js level; only the HTTP `Cache-Control` header applies

**Recommendation:** For the new `src/app/api/adaptive/contextual-baseline/route.ts`:
1. **Cache key:** `DUCKDB_PATH` (string). Don't include file mtime. Rationale: the Next.js dev server and the Python pipeline both share the same DuckDB file; if the file is rewritten, the next dev-server restart will pick up the change. The existing `getOrCreateGlobalAdaptiveMaps` (referenced in `src/app/api/adaptive/global/route.ts:24`) uses the same pattern — DuckDB table-backed cache, not mtime-based. Phase 84's own `84-CONTEXT.md:126` says "logs a warning when the static file is older than the DuckDB mtime" — implement this as a **diagnostic log line**, not as a cache key.
2. **In-process storage:** `const baselineCache = new Map<string, BaselineResponse>();` at module top. Key: `DUCKDB_PATH`. Value: the fully-built baseline.
3. **HTTP header:** `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (1 hour fresh, 1 day stale). The baseline is essentially immutable per session; the long TTL matches that.
4. **Response shape:** match the static JSON file exactly so the client doesn't care which path produced the bytes.

## Q6: Test infrastructure for slice parity

**Answer:** Use the existing `getState()`-based contract test pattern from `src/store/useAdaptiveStore.contract.test.ts`. Add a new file `src/store/slice-domain/createSliceCoreSlice.burstinessParity.test.ts` that builds a `TimeBin[]` fixture (the 2-bin pattern from `useDashboardDemoTimeslicingModeStore.test.ts:313-354` is reusable), calls `replaceSlicesFromBins(bins, [0, 100])`, asserts every slice's `warpWeight` matches the pre-Phase-84 hardcoded values (1.0 for non-burst, `bin.warpWeight ?? 1.25` for burst taxonomy), then repeats with `useAdaptiveStore.setState({ activeSignalSource: 'burstiness' })` to confirm the same outputs.

**Evidence:**
- `src/store/useAdaptiveStore.contract.test.ts:1-28` — pattern: import store, call `getState()`, mutate via action, re-`getState()`, assert
- `src/store/useDashboardDemoTimeslicingModeStore.test.ts:306-373` — the **exact pre-Phase-84 snapshot baseline** to use as a fixture: 2 bins (one burst with `warpWeight: 1.8`, one non-burst), call `applyGeneratedBins([0, 100])`, assert `slices[0]?.warpWeight === 1.8` (line 372) and `warpSource === 'density'` (line 363)
- `src/store/useSliceStore.test.ts:8-146` — 146-line reference for `addSlice` / `addBurstSlice` / `mergeSlices` test patterns; same shape will work for `addSliceFromBin`
- `src/store/slice-domain/createSliceCoreSlice.ts:311-373` — `addSliceFromBin` is the function under test; signature `(bin: TimeBin, domain: [number, number]) => string | null`
- `src/store/slice-domain/createSliceCoreSlice.ts:374-436` — `replaceSlicesFromBins`; signature `(bins: TimeBin[], domain: [number, number]) => void`

**Recommendation:** Two tests in a new `createSliceCoreSlice.burstinessParity.test.ts`:

```typescript
// Test 1: burstiness mode produces same warpWeight as pre-Phase-84
beforeEach(() => useAdaptiveStore.setState({ activeSignalSource: 'burstiness' }));

test('addSliceFromBin: burst taxonomy bin uses bin.warpWeight ?? 1.25', () => {
  const sliceId = useSliceDomainStore.getState().addSliceFromBin(
    { id: 'b1', startTime: 0, endTime: 50, count: 10, crimeTypes: ['THEFT'], avgTimestamp: 25,
      burstClass: 'isolated-spike', burstRuleVersion: 'v1', burstScore: 0.8,
      burstConfidence: 0.9, warpWeight: 1.8, isNeutralPartition: false,
      burstProvenance: 'p', tieBreakReason: 'r', thresholdSource: 't', neighborhoodSummary: 'n' },
    [0, 100]
  );
  expect(useSliceDomainStore.getState().slices.find((s) => s.id === sliceId)?.warpWeight).toBe(1.8);
});

test('addSliceFromBin: non-burst bin uses warpWeight: 1', () => {
  // ... same shape, no burstClass → expects 1
});
```

Additionally, the **guard test from CONTEXT.md L80-82** lives in `useAdaptiveStore.contract.test.ts`:

```typescript
test('does not change public surface when activeSignalSource is set', () => {
  const keysBefore = Object.keys(useAdaptiveStore.getState()).sort();
  useAdaptiveStore.setState({ activeSignalSource: 'contextual' });
  const keysAfter = Object.keys(useAdaptiveStore.getState()).sort();
  // New key is allowed; no other key added/removed
  expect(keysAfter.length).toBe(keysBefore.length + 1);
  expect(keysAfter).toContain('activeSignalSource');
});
```

## Q7: TimeslicingMode store integration

**Answer:** The new `activeSignalSource` lives in **`useAdaptiveStore`** (per CONTEXT.md L45: "persists in `useAdaptiveStore.activeSignalSource`"), NOT in `useDashboardDemoTimeslicingModeStore` and NOT in `useDashboardDemoCoordinationStore`. The existing linear/adaptive axis (`timeScaleMode`) is in `useDashboardDemoCoordinationStore:116, 222`, and `useDashboardDemoTimeslicingModeStore.ts:8` defines a different `TimeslicingMode = 'auto' | 'manual'` (auto vs manual binning, **not** linear/adaptive — verified by reading the type and the `setMode` action at line 284). The new `activeSignalSource` is subordinated to `timeScaleMode === 'adaptive'` (the `<Select>` is hidden in linear mode), but the field itself is independent.

**Evidence:**
- `src/store/useDashboardDemoCoordinationStore.ts:18-19` — `DemoWarpScaleMode = 'linear' | 'adaptive'`, `DemoWarpSource = 'density' | 'slice-authored'`
- `src/store/useDashboardDemoCoordinationStore.ts:116-117` — `timeScaleMode: DemoWarpScaleMode; warpSource: DemoWarpSource;`
- `src/store/useDashboardDemoCoordinationStore.ts:222-224` — initial state: `timeScaleMode: 'adaptive'`, `warpSource: 'density'`, `warpFactor: 1`
- `src/store/useDashboardDemoTimeslicingModeStore.ts:8` — `export type TimeslicingMode = 'auto' | 'manual';` — this is the auto-vs-manual binning axis, not linear-vs-adaptive
- `src/store/useDashboardDemoTimeslicingModeStore.ts:283-284` — initial: `mode: 'auto'`, `setMode: (mode) => set({ mode })`
- `src/store/useAdaptiveStore.ts:10-46` — the AdaptiveState interface, where the new field belongs; has `warpSource: 'density' | 'slice-authored' | 'proposal-applied'` (line 12) which is **different** from the new `activeSignalSource` (the new field is per-CONTEXT.md `burstiness | density | contextual`)

**Recommendation:** Add to `src/store/useAdaptiveStore.ts:10-46`:

```typescript
// In AdaptiveState (extend line 10-46):
activeSignalSource: 'burstiness' | 'density' | 'contextual';
setActiveSignalSource: (source: 'burstiness' | 'density' | 'contextual') => void;
```

Initial state in the store factory at line 81-170: `activeSignalSource: 'burstiness'`, and:
```typescript
setActiveSignalSource: (source) => set({ activeSignalSource: source }),
```

Add to `resetSandboxDefaults` at line 119-133: `activeSignalSource: 'burstiness'`.

**Wrap in `persist` middleware** following the `useFeatureFlagsStore.ts:84-88` pattern: `name: 'adaptive-signal-source-v1'`, `partialize: (s) => ({ activeSignalSource: s.activeSignalSource })`.

**Composition with `timeScaleMode`:** the dashboard-demo `GlobalWarpControls.tsx:151-167` already conditionally renders the warp-factor Slider only when `timeScaleMode === 'adaptive'`. The new `<Select>` follows the same pattern: render the source `<Select>` only when `timeScaleMode === 'adaptive'`. In `timeScaleMode === 'linear'`, the new field is unused (no consumer reads it). No store-to-store wiring required.

## Q8: Burst detection path mapping

**Answer:** The existing `BurstMetric` type at `src/lib/burst-detection.ts:6` is a **sub-knob** of the new `burstiness` source. The mapping is clean and gap-free:

- New top-level `AdaptiveSignalSource = 'burstiness' | 'density' | 'contextual'` (lives in `useAdaptiveStore`, see Q7).
- `burstiness` source = current behavior = `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)` in `createSliceCoreSlice.ts:330, 393`. The `BurstMetric` ('temporal' | 'spatial' | 'combined') type is the **internal** choice for how `bin.warpWeight` was originally computed (by `BurstBinResult.combinedB` from `src/lib/burst-detection.ts:191-193`), but the new contract doesn't expose that choice — it's already baked into `bin.warpWeight` by the time the slice is created.
- `density` source = new `densityWarpWeight(bin, baseline, h, d)` (see Q2). Same `TimeBin.warpWeight` field, just recomputed at slice-create time.
- `contextual` source = new `contextualWarpWeight(bin, baselineWinsorized, h, d)` (clamp z to [0.2, 3.0] per CONTEXT.md L19). Same `TimeBin.warpWeight` field.

**Evidence:**
- `src/lib/burst-detection.ts:6-21` — `BurstMetric` and `BURST_METRIC_OPTIONS` are UI labels for the **detection-time** choice, not the slice-time choice
- `src/lib/burst-detection.ts:195-209` — `resolveBurstMetricValue` and `sumBurstMetric` aggregate `BurstBinResult` fields; these are populated server-side in `src/app/api/adaptive/bursts/route.ts:96-119` (`buildBurstBin`) and **already flow into `bin.warpWeight` upstream** of `createSliceCoreSlice`
- `src/store/slice-domain/createSliceCoreSlice.ts:330, 393` — the only place `bin.warpWeight` is read at slice creation; if present, used as-is; otherwise falls back to 1.25 (burst) or 1 (neutral)
- `src/lib/binning/types.ts:9-63` — `TimeBin` shape, with `warpWeight?: number` (line 52) and `isNeutralPartition?: boolean` (line 54)

**Recommendation:** Concrete type contract for `src/lib/signal-sources/contract.ts` (new file):

```typescript
export type AdaptiveSignalSource = 'burstiness' | 'density' | 'contextual';

export interface SignalSourceMappers {
  burstiness: (bin: TimeBin) => number;     // returns bin.warpWeight ?? 1.25 (or 1 if neutral)
  density: (bin: TimeBin, baseline: Baseline168) => number;     // 1 + clamp((O-E)/E, 0, 1) * 1.5
  contextual: (bin: TimeBin, baselineWinsorized: Baseline168) => number;  // 0.2..3.0 remap of z
}

export const SIGNAL_SOURCE_OPTIONS: Array<{ value: AdaptiveSignalSource; label: string; description: string }> = [
  { value: 'burstiness', label: 'Burstiness', description: 'Goh-Barabasi inter-event B (current default)' },
  { value: 'density', label: 'Density', description: 'Observed/expected count ratio vs 168-cell baseline' },
  { value: 'contextual', label: 'Contextual', description: 'Winsorized Pearson residual against 168-cell baseline' },
];
```

**No gap.** The pre-Phase-84 `addSliceFromBin` and `replaceSlicesFromBins` paths are preserved as the `burstiness` mapper; the new `density` and `contextual` mappers are sibling functions in the same file. The `bin.warpWeight` field is mode-agnostic — exactly the BFT-12 invariant from CONTEXT.md L80.

## Open questions for the planner

1. **Q1 deeper follow-up:** Should the `<Select>` go above the existing Linear/Adaptive Button (so it appears even in linear mode, but disabled with a tooltip "Available in adaptive mode") or below it (only visible when `timeScaleMode === 'adaptive'`)? Default: below (matches the existing conditional-render pattern at `GlobalWarpControls.tsx:151`).
2. **Q2 follow-up:** What exact fallback does `densityWarpWeight` use when `bin` has no `(h, d)` cell in the baseline (e.g., synthetic data)? Recommend: `warpWeight = 1` (no deviation from a missing baseline = neutral).
3. **Q3 follow-up:** Should winsorization be applied to the **per-cell historical rate distribution** (the 1,305-week sample per cell, not currently stored) or to the **per-cell mean distribution across the 168 cells** (much smaller, 168 values, lossy but shippable)? The 1,305-week distribution is the theoretically correct answer; the 168-cell fallback is the shippable shortcut. The Python sensitivity check in CONTEXT.md L34 implicitly tests the latter. Recommend: start with the 168-cell shortcut, mark the 1,305-week path as deferred.
4. **Q5 follow-up:** Should the `contextual-baseline` route return a 404 if DuckDB is missing, or fall through to the static file silently? Recommend: 404 with a structured error (`{ error: 'baseline unavailable', source: 'duckdb', staticFile: '/baselines/baseline_168.json' }`) so the client can fall back to the static file with a logger warning.
5. **Q6 follow-up:** Should the burstiness-mode parity test live in `src/store/useAdaptiveStore.contract.test.ts` (extends the existing 28-line file) or in a new `src/store/slice-domain/createSliceCoreSlice.burstinessParity.test.ts`? Recommend: new file, because the existing test uses `getState` patterns that don't need slice-store setup; the parity test needs `useSliceDomainStore` and a `TimeBin[]` fixture, so the responsibilities diverge.
6. **Q7 follow-up:** Does the `<Select>`'s `onValueChange` also need to call `useDashboardDemoCoordinationStore.setWarpSource(...)`? The existing `warpSource: 'density' | 'slice-authored'` is a **different** field from the new `activeSignalSource` (per CONTEXT.md and the type definitions). They coexist: `warpSource` is "where does the warpMap come from"; `activeSignalSource` is "what metric produces warpWeight." Recommend: do not touch `warpSource` from the new `<Select>`.

## Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | The 1,305-week per-cell distribution is not currently stored in the parquet; winsorization as specced in CONTEXT.md L23-31 requires it. | Ship the 168-cell shortcut (Risk Q3 #3 above) as Plan 84-03's "shipped winsorization"; document the 1,305-week follow-up in `docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md` Section 5. Sensitivity check (CONTEXT.md L34) gates the shortcut. |
| 2 | Adding `activeSignalSource` to `useAdaptiveStore` could break the existing `useAdaptiveStore.contract.test.ts` (Object.keys snapshot). | The new contract test in Q6 uses `keysBefore.length + 1` style assertion, which explicitly allows the new key. Existing test (lines 7-27) reads individual properties, not a full-key snapshot, so it won't break. |
| 3 | The 3-way `<Select>` in `GlobalWarpControls.tsx` may visually crowd the existing Linear/Adaptive Button + Warp-factor Slider. | Plan 84-03 Task 5 wraps the new `<Select>` in a `useFeatureFlagsStore.isEnabled('adaptiveSignalSource')` flag so it can be hidden if the layout breaks. Default flag state: enabled for internal dev, off for evaluation sessions (matches the existing `isEvaluationLocked` check at `GlobalWarpControls.tsx:32`). |
| 4 | Parity test for `replaceSlicesFromBins` requires a multi-bin fixture; mismatch with `addSliceFromBin` could pass one but fail the other. | Plan 84-01 ships both tests using the same fixture pattern from `useDashboardDemoTimeslicingModeStore.test.ts:306-373`; both must pass. |
| 5 | The static `/baselines/baseline_168.json` is committed to the repo; if the dataset updates, the static file is stale. | Server route at `/api/adaptive/contextual-baseline` is the fallback; logs a warning when static `header.fingerprint` differs from the DuckDB-derived baseline fingerprint (per CONTEXT.md L126). |
| 6 | `d3-array`'s `quantile` uses type-7 (R-7) interpolation, which is mathematically equivalent to `numpy.percentile(method='linear')` for N ≥ 5, but for very small N (e.g., 5-pt sigma estimation) the rounding could differ by 1 ULP. | The Plan 84-03 known-vector test (CONTEXT.md L98) catches this — it compares TS vs Python within `1e-6`. If the test fails, the fallback is a 12-line hand-rolled `quantile` in `src/lib/signal-sources/winsorize.ts`. |
| 7 | `useAdaptiveStore` currently has no `persist` middleware. Adding `activeSignalSource` with persistence requires re-importing the module. | Use the same `persist` wrapper pattern as `useFeatureFlagsStore.ts:84-88`; key as `adaptive-signal-source-v1` to avoid collisions with `feature-flags-v1` and any future `useTimeStore` persists. |

## Ready for planning

**Research complete.** Planner can now create PLAN.md files for **84-01** (contract + density + parity test), **84-02** (density + contextual-baseline JSON export + UI plumbing), and **84-03** (TS port of contextual + sensitivity check + 3-way `<Select>`).

## Sources

### Primary (HIGH confidence)
- `src/components/dashboard-demo/GlobalWarpControls.tsx:1-171` — exact placement, prop shape, existing pattern
- `src/store/useAdaptiveStore.ts:1-171` — store shape, resetSandboxDefaults, `warpSource` field
- `src/store/slice-domain/createSliceCoreSlice.ts:311-436` — exact `warpWeight` assignment lines
- `src/store/slice-domain/types.ts:7-33` — `TimeSlice` public shape
- `src/lib/burst-detection.ts:1-357` — `BurstMetric` type, `resolveBurstMetricValue`, `sumBurstMetric`
- `src/store/useAdaptiveStore.contract.test.ts:1-28` — contract test pattern
- `src/store/useDashboardDemoTimeslicingModeStore.test.ts:306-373` — pre-Phase-84 fixture + assertions
- `src/store/useDashboardDemoCoordinationStore.ts:1-432` — `DemoWarpScaleMode`, `timeScaleMode`, `warpSource` fields
- `src/store/useDashboardDemoTimeslicingModeStore.ts:1-561` — `TimeslicingMode = 'auto' | 'manual'` (different axis)
- `src/app/api/adaptive/global/route.ts:1-53` — `Cache-Control` pattern
- `src/app/api/adaptive/bursts/route.ts:234-299` — POST/GET handler shape
- `src/lib/queries/aggregations.ts:75-148` — `buildGlobalAdaptiveCacheQueries` pattern
- `src/lib/feature-flags.ts:1-81` + `src/store/useFeatureFlagsStore.ts:1-89` — `FLAG_DEFINITIONS` + persist pattern
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/contextual.py:1-248` — Python port source
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/baseline.py:51-58` — 168-cell schema
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/baseline_168.meta.json:1-8` — fingerprint + size
- `package.json:14-82` — dependency audit (no winsorize/percentile lib; `d3-array` available)

### Secondary (MEDIUM confidence)
- `git log c0a06b4` and `git log dd8be2a` — Phase 83 commit history; baseline parquet sha256:793ccaa9c229c3a6 verified
- `src/components/ui/select.tsx:1-190` — shadcn/Radix `<Select>` component, used by `src/components/settings/SettingsPanel.tsx:19-25` as the only existing consumer

### Tertiary (LOW confidence / flagged for validation)
- JSON size estimate (~12-18 KB) is calculated from the parquet metadata; actual measured size should be confirmed by running the Phase 84-02 export script. The 50 KB budget is comfortable (≈3-4× safety margin), so this is not a real risk.
- Whether the pre-Phase-84 `1.0` constant for non-burst slices was ever actually user-visible in UAT (vs. always overridden by `bin.warpWeight ?? 1.25` upstream) — this is a UX question for Plan 84-01's parity test design, not a code question.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency in `package.json` verified
- Architecture: HIGH — all file_path:line_number claims verified by Read tool
- Pitfalls: HIGH — risks derived from concrete code, not speculation
- Density formula: MEDIUM — proposed `1 + clamp((O-E)/E, 0, 1) * 1.5` is a planner-level decision; CONTEXT.md L18 leaves the exact formula open
- Winsorization algorithm: MEDIUM — `d3-array.quantile` is the recommendation, but exact 1,305-week distribution source is not yet defined
- Test parity pattern: HIGH — direct mirror of `useAdaptiveStore.contract.test.ts`

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days; stable UI stack, no library version churn expected)

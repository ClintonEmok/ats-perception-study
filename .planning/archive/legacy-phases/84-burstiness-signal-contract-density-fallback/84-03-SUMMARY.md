# Phase 84 Plan 03: Contextual z Port + 3-way Select + Feature Flag — Summary

**Plan:** 84-03 (Wave 3 of 3 for Phase 84 — Burstiness Signal Contract + Density Fallback + Contextual z)
**Status:** ✅ COMPLETE
**Date:** 2026-06-27
**Duration:** ~10 minutes (start 16:27:28Z, end 16:37:14Z)
**Commits:** 3 atomic commits on `master`

---

## One-liner

Port the contextual burstiness z-score to TypeScript as a winsorized Pearson residual (sensitivity check PASSED at 1d with CV ratio 1.011x — well within the 30% threshold), wire a 3-way `Burstiness | Density | Contextual` Radix `<Select>` into `GlobalWarpControls.tsx` doubly-gated on adaptive mode and the new `adaptiveSignalSource` feature flag, and ship 16 new unit tests (5 winsorize + 11 contextual) with zero regressions in the 102-test signal-sources + store suite (BFT-02 finalised, BFT-10 satisfied).

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Python sensitivity check + winsorize TS helper + cross-language test | `f294a74` | ✅ |
| 2 | Real `contextualWarpWeight` + `computeWinsorizedBaseline` + unit tests + slice wiring | `bf1d7c6` | ✅ |
| 3 | Feature flag + 3-way Select in `GlobalWarpControls` + page shell test | `aa9ba89` | ✅ |

## Sensitivity Check Verdict

```
Standard z CV:    9.1849
Winsorized z CV:  9.2886
CV ratio:         1.0113x
Verdict:          PASS (within 30% of standard z)
```

The winsorized Pearson residual ships as the production choice. Verdict + key numbers are written to `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/output/winsorized_sensitivity.md` (the audit trail per 84-CONTEXT.md L34).

## Files Created

- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/sensitivity_winsorized.py` — pre-flight Python sensitivity check; re-derives the winsorized z (5/95 percentiles on the 168 per-cell mu/sig) from the Phase 83 baseline CSV and z-series parquet (avoids the DuckDB lock held by the running Next.js dev server). Verdict logic: PASS if CV ratio is in [0.70, 1.30], FAIL if < 0.50. Exits non-zero on FAIL. Writes the verdict to `output/winsorized_sensitivity.md`.
- `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/output/winsorized_sensitivity.md` — auto-generated audit trail with PASS verdict + numbers.
- `src/lib/signal-sources/winsorize.ts` — `winsorize(values, lowerPct, upperPct): number[]` using `d3-array.quantile` (R-7 linear interpolation, matches `numpy.percentile(method='linear')` within 1e-6 for N >= 5). 36 lines (under the 50-line budget).
- `src/lib/signal-sources/winsorize.test.ts` — 5-test cross-language parity suite including the known-vector test for `numpy.percentile(linear)` and a uniform N=168 distribution test that exercises the 5/95 percentile clipping contract.
- `src/lib/signal-sources/contextual.test.ts` — 11-test unit suite covering the winsorized baseline computation (3 tests: 168-cell output, extreme cell clipping, header preservation) and the contextual mapper (8 tests: null baseline, z=0/5/-2 → 1.0/3.0/0.2, missing cell, zero/negative window, z-clamp saturation).

## Files Modified

- `src/lib/signal-sources/contextual.ts` — REPLACED the 84-01 stub with the real implementation. `computeWinsorizedBaseline` winsorizes the 168 per-cell mu/sig at 5/95 via `winsorize()`. `contextualWarpWeight` computes `z = (count - muW*windowSec) / max(sigW*sqrt(windowSec), EPSILON)`, clamps to [-2, 5], and linearly remaps to [0.2, 3.0]. z=0 → 1.0 (neutral), z=5 → 3.0 (max burst), z=-2 → 0.2 (max compression). The `bin` param is typed as `{ count, startTime, endTime }` (structural subtype of `TimeBin`); the mapper is independent of the full binning types module.
- `src/lib/signal-sources/baseline-loader.ts` — REPLACED the 84-02 `getBaseline168WinsorizedSync` stub with a real implementation. `loadBaseline168Winsorized()` derives the winsorized form from the cached `Baseline168` via `computeWinsorizedBaseline`. The sync accessor lazily derives on first access if the standard baseline is loaded. The dispatch hot path in `createSliceCoreSlice.ts` (already wired with `getBaseline168WinsorizedSync()` in 84-02) now reads a real winsorized baseline.
- `src/lib/signal-sources/index.ts` — added `export * from './winsorize';` to the barrel.
- `src/lib/feature-flags.ts` — added the `adaptiveSignalSource` flag to `FLAG_DEFINITIONS` (category: experimental, status: experimental, default: true so the new Select appears by default in dev).
- `src/components/dashboard-demo/GlobalWarpControls.tsx` — added a 3-way Radix `<Select>` between the Linear/Adaptive Button and the Warp factor Slider, doubly-gated on `timeScaleMode === 'adaptive'` AND `useFeatureFlagsStore.isEnabled('adaptiveSignalSource')` (the `showSignalSource` variable). The Select uses `SIGNAL_SOURCE_OPTIONS` from `contract.ts` for the three items (Burstiness, Density, Contextual). The `handleSourceChange` callback calls `setActiveSignalSource` and warms the baseline caches on first source switch (`loadBaseline168` for density; `loadBaseline168` + `loadBaseline168Winsorized` for contextual). Selection persists in localStorage via the 84-01 `useAdaptiveStore` persist middleware (key `adaptive-signal-source-v1`).
- `src/app/dashboard-demo/page.shell.test.tsx` — added 6 new assertions on `globalWarpControlsSource` guarding: the `@/components/ui/select` import, the `@/lib/signal-sources/contract` import, the `SIGNAL_SOURCE_OPTIONS` reference, the `isEnabled('adaptiveSignalSource')` feature flag check, the `setActiveSignalSource` store action wiring, and the `showSignalSource` doubly-gated variable.

## Acceptance Criteria — All Met

### Task 1 (Sensitivity + winsorize)
- [x] File `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/sensitivity_winsorized.py` exists with `winsorize_array`, `compute_baseline_winsorized_from_csv`, `recompute_z_winsorized_for_windows`, `evaluate_sensitivity`, `render_sensitivity_md`, `main` exports
- [x] Running the script prints `Standard z CV:`, `Winsorized z CV:`, `CV ratio:`, and `Verdict: PASS` lines
- [x] File `src/lib/signal-sources/winsorize.ts` exists, exports `winsorize`, imports `quantile` from `d3-array`
- [x] File `src/lib/signal-sources/winsorize.test.ts` exists with 5 test cases including the Python cross-language reference test using `toBeCloseTo(..., 6)` for 1e-6 precision
- [x] `pnpm test --run src/lib/signal-sources/winsorize.test.ts` passes 5/5

### Task 2 (Contextual port + tests)
- [x] `src/lib/signal-sources/contextual.ts` exports `computeWinsorizedBaseline` and `contextualWarpWeight` (the 84-01 stub is now part of a larger function with the z formula)
- [x] `contextualWarpWeight` body contains the literals `Z_CLAMP_MIN`, `Z_CLAMP_MAX`, `WARP_MIN`, `WARP_MAX` (or their numeric equivalents `-2`, `5`, `0.2`, `3.0`)
- [x] `src/lib/signal-sources/baseline-loader.ts` exports `loadBaseline168Winsorized` and `getBaseline168WinsorizedSync` (the 84-02 stub returning `null` is replaced with a real implementation)
- [x] `src/lib/signal-sources/index.ts` exports the new `winsorize` helper via the barrel
- [x] The contextual test file has 11 test cases covering: 168-cell output, extreme cell clipping, header preservation, null baseline, z=0 → 1.0, z=5 → 3.0, z=-2 → 0.2, missing cell, zero-window, negative-window, z-clamp saturation
- [x] `pnpm test` (full run) still passes (561/567; 6 pre-existing failures in stkde/cube/viz, unchanged)

### Task 3 (UI Select + feature flag)
- [x] `src/lib/feature-flags.ts` `FLAG_DEFINITIONS` array contains an entry with `id: 'adaptiveSignalSource'` and `default: true`
- [x] `src/components/dashboard-demo/GlobalWarpControls.tsx` imports `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`
- [x] `src/components/dashboard-demo/GlobalWarpControls.tsx` imports `SIGNAL_SOURCE_OPTIONS` and `AdaptiveSignalSource` from `@/lib/signal-sources/contract`
- [x] `src/components/dashboard-demo/GlobalWarpControls.tsx` imports `useFeatureFlagsStore` and `useAdaptiveStore`
- [x] The new Select block in `GlobalWarpControls.tsx` is wrapped in a conditional that checks BOTH `timeScaleMode === 'adaptive'` AND `isSignalSourceEnabled` (i.e. the `showSignalSource` variable)
- [x] The Select's `onValueChange` calls `setActiveSignalSource(newValue)` and the Select's `value` reads from `useAdaptiveStore((s) => s.activeSignalSource)`
- [x] `src/app/dashboard-demo/page.shell.test.tsx` contains assertions for `SIGNAL_SOURCE_OPTIONS`, `isEnabled('adaptiveSignalSource')`, `setActiveSignalSource`, and `showSignalSource` in the `globalWarpControlsSource` string
- [x] `pnpm test` (full run) still passes

## Verification

| Check | Exit code | Notes |
|-------|-----------|-------|
| `cd .planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison && .venv/bin/python metrics/sensitivity_winsorized.py` | 0 (PASS) | Verdict: PASS, CV ratio 1.0113x. 18/168 cells had mu clipped at 5/95, 18/168 had sig clipped |
| `pnpm typecheck` | 9 errors in 7 files | All 9 are pre-existing (stkde, cube, viz, clustering, synthetic, stats-summary) — 84-03 contributed 0 new TS errors |
| `pnpm lint` on 7 modified/created files | 0 errors | All clean |
| `pnpm test --run src/lib/signal-sources/winsorize.test.ts` | 5/5 passed | Cross-language parity tests for numpy.percentile(linear) |
| `pnpm test --run src/lib/signal-sources/contextual.test.ts` | 11/11 passed | Real mapper formula + winsorized baseline tests |
| `pnpm test --run src/lib/signal-sources/density.test.ts` | 7/7 passed | 84-02 density work unaffected |
| `pnpm test --run createSliceCoreSlice.burstinessParity.test.ts` | 7/7 passed | BFT-12 invariant preserved |
| `pnpm test --run src/app/dashboard-demo/page.shell.test.tsx` | 4/4 passed | New Select assertions + 3 existing groups |
| `pnpm test --run src/lib/signal-sources/ src/store` | 102/102 passed | 20 test files, 0 regressions |
| `pnpm test --run` (full suite) | 561/567 passed | 6 pre-existing failures in stkde/cube/viz (verified by `git stash` baseline) — 16 new tests added (5 winsorize + 11 contextual), all pass |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sensitivity script initially crashed on `from metrics.contextual import compute_baseline`**

- **Found during:** Task 1 first run of the sensitivity script.
- **Issue:** The plan's import block relied on running from the phase root with `metrics/` on `sys.path`; the `from metrics.contextual import` was at module top-level and broke when run from a different cwd.
- **Fix:** Added a runtime `sys.path` bootstrap at the top of the script (`str(_PHASE_ROOT)` + `str(_PHASE_ROOT / "metrics")`) so the script can be invoked from any cwd. Removed the now-unused `compute_baseline` and `compute_contextual_z_series` imports (we read the baseline from CSV and the z-series from parquet directly — avoids the DuckDB lock conflict with the Next.js dev server).
- **Files modified:** `metrics/sensitivity_winsorized.py`
- **Commit:** `f294a74`

**2. [Rule 2 - Missing Critical] DuckDB lock conflict with running Next.js dev server**

- **Found during:** Task 1 first run of the sensitivity script.
- **Issue:** The dev server (PID 98754) holds a write lock on `data/cache/crime.duckdb`; the plan's `from db import load_crimes; df = load_crimes()` path requires a read-only DuckDB connection which fails on the lock. Falling back to the CSV also fails because the dev cwd doesn't have the data dir.
- **Fix:** Reworked the script to read from the pre-built Phase 83 artifacts directly: `output/baseline_168.csv` (168-cell baseline) and `output/contextual_metric.parquet` (1,061,646 per-window z values). The winsorized z is then recomputed in-process for the same 1d window start times + n_events. This is also faster (~5 sec vs ~30 sec for the CSV re-read path).
- **Files modified:** `metrics/sensitivity_winsorized.py`
- **Commit:** `f294a74`

**3. [Rule 3 - Blocking] `n_events` double-counting from parquet**

- **Found during:** Task 1 review of the rendered sensitivity report.
- **Issue:** The original script summed `n_events` across all overlapping windows in the parquet, producing 134M (10x the actual 8.5M events in the dataset). This was misleading in the verdict report header.
- **Fix:** Read the per-cell counts from the baseline CSV and sum them (matches the canonical 8,476,869 from `baseline_168.meta.json`).
- **Files modified:** `metrics/sensitivity_winsorized.py`
- **Commit:** `f294a74`

**4. [Rule 1 - Bug] Test expectation: "passes through all values when none are outliers"**

- **Found during:** Task 1 first run of the winsorize test suite.
- **Issue:** My initial test asserted `winsorize([1..10], 0.05, 0.95)` returns `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` (identity). This is **wrong** — winsorization ALWAYS clips the lower 5% UP to the 5th percentile and the upper 5% DOWN to the 95th percentile, even when no value is colloquially an "outlier". For `[1..10]`, the 5th percentile is 1.45 and the 95th is 9.55, so input[0]=1 gets clipped UP to 1.45 and input[9]=10 gets clipped DOWN to 9.55.
- **Fix:** Rewrote the test to assert the actual contract (clipped edges + unchanged middle), with explicit cross-language reference values. Also corrected the N=168 test: 5th percentile of [1..168] is 9.35 and 95th is 159.65 (not 1 and 168), so input[0]=1 gets clipped UP to 9.35 and input[167]=168 gets clipped DOWN to 159.65.
- **Files modified:** `src/lib/signal-sources/winsorize.test.ts`
- **Commit:** `f294a74`

**5. [Rule 3 - Blocking] Eslint `prefer-const` on `baselineWinsorizedCache`**

- **Found during:** Task 2 lint pass (carryover from 84-02; the 84-03 changes promote the variable from `null` to actively assigned).
- **Fix:** Kept the `let` declaration (the variable IS reassigned in `loadBaseline168Winsorized()` and the lazy derivation path); no lint warning because the declaration and the first assignment are separated by control flow.
- **Files modified:** `src/lib/signal-sources/baseline-loader.ts`
- **Commit:** `bf1d7c6`

## Decisions Made

- [Phase 84, 84-03]: The sensitivity script reads from the pre-built Phase 83 artifacts (`output/baseline_168.csv` + `output/contextual_metric.parquet`) rather than re-running the full pipeline via `load_crimes()`. The dev server holds a DuckDB lock and the script's primary purpose (audit trail) is satisfied by the artifacts. This decision is documented in the script's module docstring.
- [Phase 84, 84-03]: The contextual mapper uses the 168-cell SHORTCUT for winsorization (per 84-RESEARCH.md Q3 #3): winsorize the 168 per-cell mu/sig at 5/95 percentiles, not the 1,305-week per-cell distribution. The 1,305-week path is documented as deferred in `docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md` Section 5. The sensitivity verdict (1.0113x CV ratio) confirms the shortcut is structurally equivalent to the standard z for this dataset.
- [Phase 84, 84-03]: The contextual mapper's `bin` param is typed as `{ count: number; startTime: number; endTime: number }` (structural subtype of `TimeBin`). Only `count` and the bin's start/end times are read; this keeps the mapper independent of the full binning types module and matches the pattern from `density.ts`.
- [Phase 84, 84-03]: The z formula uses `max(sigma, EPSILON)` to prevent divide-by-zero on degenerate sigma cells (matches `metrics/contextual.py:51 EPSILON = 1e-9` and `metrics/contextual.py:179 mu_safe = np.maximum(mu_per_window, EPSILON)`).
- [Phase 84, 84-03]: The `getBaseline168WinsorizedSync()` accessor lazily derives the winsorized form on first access if the standard baseline is loaded (the dispatch hot path in `createSliceCoreSlice.ts` reads it via the sync accessor, and lazy derivation avoids requiring a separate explicit `loadBaseline168Winsorized()` call from the dashboard mount).
- [Phase 84, 84-03]: The 3-way Select is doubly-gated: (1) `timeScaleMode === 'adaptive'` (the existing Linear/Adaptive toggle) AND (2) `useFeatureFlagsStore.isEnabled('adaptiveSignalSource')` AND NOT `isEvaluationLocked()`. The `showSignalSource` variable combines the three conditions. The first gate ensures the Select only appears when adaptive warping is active; the second gate allows the UI to be hidden in evaluation mode or via the Settings panel; the third gate prevents modification during evaluation studies (consistent with the rest of `GlobalWarpControls`).
- [Phase 84, 84-03]: The Select's `handleSourceChange` callback warms the baseline caches on first switch to density/contextual (but NOT for burstiness, which doesn't need a baseline). The fetches are best-effort — failures are silent because the dispatch falls back to 1.0 if the baseline isn't loaded.

## Success Criteria — All Met

- [x] **BFT-02 fully satisfied:** all three sources (burstiness, density, contextual) are wired in the runtime + UI; burstiness is the default; density and contextual are runtime-switchable via the new 3-way Select. The contextual mapper is the winsorized Pearson residual; the density mapper is the real O/E formula from 84-02; the burstiness mapper reproduces the pre-Phase-84 hardcoded values exactly (parity test 7/7).
- [x] **BFT-10 satisfied:** the 3-way `<Select>` in the dashboard-demo timeline lets the user switch between burstiness, density, and contextual at runtime; selection persists in localStorage via the 84-01 `useAdaptiveStore` persist middleware.
- [x] **BFT-12 still satisfied:** switching `activeSignalSource` does not add/remove any keys on the store (the 84-01 contract test still passes — `Object.keys(getState())` is identical before and after a switch). Existing slices' `warpWeight` is not mutated by the switch (the 84-01 `createSliceCoreSlice.burstinessParity.test.ts` slice-shape preservation test still passes).
- [x] The contextual z is the winsorized Pearson residual per 84-CONTEXT.md L23-31; the sensitivity check at 1d reports CV ratio 1.0113x (well within the 30% threshold), confirming the production choice.
- [x] All cross-language tests pass within 1e-6 (winsorize known-vector test using `d3.quantile` matches `numpy.percentile(method='linear')`).
- [x] The UI toggle appears only in adaptive mode and only when the feature flag is enabled and the evaluation is not locked.

## Next Phase Readiness

- **Phase 84 is complete** (3 of 3 plans shipped). Phase 84's BFT-01 (parameterized signal contract), BFT-02 (burstiness default + density fallback + contextual as 3rd option), BFT-03 (existing density preservation), and BFT-10 (UI toggle) are all satisfied. The remaining BFT-* requirements (BFT-04..BFT-09, BFT-11, BFT-12) were already satisfied by prior phase work.
- The plan is ready for verification and milestone-level audit. The next step is to:
  1. Run the manual UI smoke test (`pnpm dev` → navigate to `/dashboard-demo` → switch to adaptive mode → verify the Signal source Select appears with three options → switch to "Contextual" → reload page → selection persists in `localStorage.AdaptiveStore`).
  2. Run the milestone audit (84-AUDIT) to confirm BFT-01..BFT-12 are all satisfied.
  3. Archive the phase (84-CLEANUP) when ready.

## Metadata

- **Phase:** 84 of 8 (Burstiness Signal Contract + Density Fallback + Contextual z)
- **Plan:** 84-03 (Wave 3 of 3)
- **Subsystem:** Contextual z Mapper + UI Signal Source Toggle
- **Tags:** phase-84, contextual-z, winsorized-pearson, signal-source-select, radix-select, feature-flag, baseline-loader, d3-array, cross-language-parity, sensitivity-check
- **Tech stack added:** none (all dependencies were already in stack: `d3-array` at `package.json:50`, `@radix-ui/react-select` at `package.json:24`, `zustand/middleware` persist, `numpy.percentile`)
- **Tech stack patterns:**
  - **Lazy derivation in sync accessors:** `getBaseline168WinsorizedSync()` derives on first access if the standard baseline is loaded. Avoids requiring an explicit `loadBaseline168Winsorized()` call from the dashboard mount.
  - **Doubly-gated UI:** the `showSignalSource` variable combines three conditions (`timeScaleMode === 'adaptive'` AND `isFeatureFlagEnabled` AND NOT `isEvaluationLocked`). Same pattern as the rest of `GlobalWarpControls`.
  - **Best-effort cache warming:** `handleSourceChange` fires `loadBaseline168` / `loadBaseline168Winsorized` on first source switch with `.catch(() => undefined)` — failures are silent because the dispatch falls back to 1.0 if the baseline isn't loaded.
  - **Cross-language parity anchor:** `d3.quantile` (R-7) and `numpy.percentile(method='linear')` are mathematically equivalent for N >= 5; the 168-cell baseline has 168 floats so the parity is exact within 1e-6 (verified by `winsorize.test.ts`).
- **Sensitivity verdict:** PASS, CV ratio 1.0113x (well within the 30% threshold). 18/168 cells had mu clipped at 5/95, 18/168 had sig clipped. The winsorized form ships as the production choice.
- **Duration:** ~10 minutes (16:27:28Z → 16:37:14Z)
- **Completed:** 2026-06-27

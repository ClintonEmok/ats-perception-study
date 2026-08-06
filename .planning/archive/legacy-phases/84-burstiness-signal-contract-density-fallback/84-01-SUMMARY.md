# Phase 84 Plan 01: AdaptiveSignalSource Contract + Dispatch Refactor — Summary

**Plan:** 84-01 (Wave 1 of 3 for Phase 84 — Burstiness Signal Contract + Density Fallback)
**Status:** ✅ COMPLETE
**Date:** 2026-06-27
**Duration:** ~12 min (start 15:43Z, end 15:55Z)
**Commits:** 3 atomic commits on `master`

---

## One-liner

Introduce the `AdaptiveSignalSource` type union (`burstiness | density | contextual`), the matching `useAdaptiveStore.activeSignalSource` field with `persist` middleware, and a refactored `addSliceFromBin` / `replaceSlicesFromBins` dispatch hot path that reproduces pre-Phase-84 burstiness values exactly (parity test) while shipping density and contextual as 84-01 stubs.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create `src/lib/signal-sources/` contract + three mapper functions | `ff9fdea` | ✅ |
| 2 | Add `activeSignalSource` to `useAdaptiveStore` + refactor slice dispatch | `125c2ad` | ✅ |
| 3 | Parity + density stub + guard tests (BFT-12 public surface preservation) | `9db133f` | ✅ |

## Files Created

- `src/lib/signal-sources/contract.ts` — `AdaptiveSignalSource` type union, `Baseline168` / `Baseline168Winsorized` interfaces, `SignalSourceMappers` interface, `SIGNAL_SOURCE_OPTIONS` constant, `binToCellIndex` helper
- `src/lib/signal-sources/burstiness.ts` — `hasBurstTaxonomyBin` predicate + `burstinessWarpWeight(bin: TimeBin): number` reproducing the pre-Phase-84 hardcoded values exactly
- `src/lib/signal-sources/density.ts` — 84-01 stub returning `1.0` when no baseline is loaded (real formula lands in 84-02)
- `src/lib/signal-sources/contextual.ts` — 84-01 stub returning `1.0` when no baseline is loaded (winsorized z lands in 84-03)
- `src/lib/signal-sources/index.ts` — barrel export + `dispatchWarpWeight` helper (lives here to avoid circular import)
- `src/store/slice-domain/createSliceCoreSlice.burstinessParity.test.ts` — 7 parity + density stub + BFT-12 invariant tests

## Files Modified

- `src/store/useAdaptiveStore.ts` — added `activeSignalSource: AdaptiveSignalSource` (default `'burstiness'`), `setActiveSignalSource` action, wrapped `create()` in `persist` middleware keyed `adaptive-signal-source-v1` with `partialize` to only persist the new field; added a noop `localStorage` shim so the persist middleware works in node test environments; extended `resetSandboxDefaults` to reset the new field
- `src/store/slice-domain/createSliceCoreSlice.ts` — `addSliceFromBin` and `replaceSlicesFromBins` now read `useAdaptiveStore.getState().activeSignalSource` at function-call time and dispatch to either the inlined burstiness path (preserves the pre-Phase-84 `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)` literal exactly) or `dispatchWarpWeight(source, bin, null, null)` for density / contextual
- `src/store/useAdaptiveStore.contract.test.ts` — added `useAdaptiveStore public surface` describe block with 3 new tests: `keysAfter.toEqual(keysBefore)` guard, `setActiveSignalSource` is a function, default is `'burstiness'`

## Acceptance Criteria — All Met

- [x] Files `src/lib/signal-sources/{contract,burstiness,density,contextual,index}.ts` exist
- [x] `contract.ts` exports `AdaptiveSignalSource = 'burstiness' | 'density' | 'contextual'`
- [x] `contract.ts` exports `SIGNAL_SOURCE_OPTIONS` with exactly 3 entries
- [x] `burstiness.ts` exports `burstinessWarpWeight` containing the literal `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)`
- [x] `density.ts` exports `densityWarpWeight` whose body contains `if (!baseline) return 1;`
- [x] `contextual.ts` exports `contextualWarpWeight` whose body contains `if (!baselineWinsorized) return 1;`
- [x] `dispatchWarpWeight` in `index.ts` computes `h` and `d` from `bin.avgTimestamp` using the `+4` offset matching Python's `EPOCH_DOW_OFFSET`
- [x] `useAdaptiveStore.ts` imports `persist` from `zustand/middleware` and `AdaptiveSignalSource` from `@/lib/signal-sources/contract`
- [x] `useAdaptiveStore.getState().activeSignalSource` defaults to `'burstiness'`
- [x] `useAdaptiveStore.getState().setActiveSignalSource('density')` mutates the field to `'density'`
- [x] The `create` call is wrapped in `persist(... { name: 'adaptive-signal-source-v1', partialize: ... })`
- [x] `resetSandboxDefaults` resets `activeSignalSource` back to `'burstiness'`
- [x] `createSliceCoreSlice.ts` no longer contains the burst hardcode literal outside the new dispatch site (the non-burst `warpWeight: 1,` literals at L159 and L282 are inside `addSlice` and `mergeSlices`, which are manual slice creation paths — not the bin-creation dispatch sites — and correctly preserved)
- [x] `addSliceFromBin` and `replaceSlicesFromBins` both call `useAdaptiveStore.getState().activeSignalSource` (or `dispatchWarpWeight`)
- [x] `createSliceCoreSlice.burstinessParity.test.ts` contains at least 7 test cases (7 actual)
- [x] The test file contains the literal `expect(slices[0]?.warpWeight).toBe(1.8)` (parity assertion)
- [x] The test file contains the literal `expect(slices[1]?.warpWeight).toBe(1.0)` (parity assertion)
- [x] `useAdaptiveStore.contract.test.ts` contains `describe('useAdaptiveStore public surface', ...)` with the `keysAfter.toEqual(keysBefore)` guard assertion

## Verification

| Check | Exit code | Notes |
|-------|-----------|-------|
| `pnpm typecheck` on signal-sources / useAdaptiveStore / createSliceCoreSlice | 0 errors in modified files | 6 pre-existing TS errors elsewhere (stkde, stats-summary, synthetic, etc.) are unrelated to Phase 84 |
| `pnpm lint` on modified files | 0 errors in modified files | 84 pre-existing lint errors and 117 warnings across the codebase; 7 in `useAdaptiveStore.ts` are pre-existing (verified via `git stash` baseline) |
| `pnpm test --run useAdaptiveStore.contract.test.ts` | 4/4 passed (1 existing + 3 new) | |
| `pnpm test --run createSliceCoreSlice.burstinessParity.test.ts` | 7/7 passed | |
| `pnpm test --run src/store` | 79/79 tests across 17 files passed | 16 → 17 test files (added `burstinessParity.test.ts`); 69 → 79 tests (added 10: 3 contract + 7 parity) |
| `pnpm test --run` (full suite) | 538/544 passed | 6 pre-existing failures in stkde/cube/visualization tests, unrelated to Phase 84 (verified via `git stash` baseline) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] persist middleware requires a real Storage shim, not `null`**

- **Found during:** Task 2 verification (existing `useAdaptiveStore.test.ts` failed with `TypeError: Cannot read properties of undefined (reading 'setItem')` after wrapping `create()` in `persist`).
- **Issue:** zustand v5's `createJSONStorage(() => noopLocalStorage())` calls `getStorage()` once and stores the result. If the result is `null` (the pattern in `useEvaluationStudyStore.ts:476` which uses `createJSONStorage(() => noopSessionStorage() as Storage)` where `noopSessionStorage()` returns `null` to disable persistence), the inner `setItem` closure is defined but `null.setItem` is called. The check `if (!storage) return config(...)` only triggers if `getStorage()` *throws*, not if it returns `null` — and the result is a `setItem` that throws on the first call.
- **Fix:** Made `noopLocalStorage` return a real `Storage`-shaped object with noop `getItem` / `setItem` / `removeItem` methods. Also added a guard against `window.localStorage` being `undefined` (the test installs `window = {}` as a shim and the original code would return `undefined` from `window.localStorage` and crash). Pattern documented in the file comment.
- **Files modified:** `src/store/useAdaptiveStore.ts`
- **Commit:** `125c2ad`

### Stubs Shipped (per plan)

- `src/lib/signal-sources/density.ts` — returns `1.0` when no baseline loaded (real `clampComparableWarpWeight(1 + clamp01((O - E) / Math.max(E, 1)) * 1.5, 0.25, 4)` formula lands in 84-02)
- `src/lib/signal-sources/contextual.ts` — returns `1.0` when no baseline loaded (real winsorized z lands in 84-03 with pre-flight sensitivity check)

## Decisions Made

- [Phase 84, 84-01]: `dispatchWarpWeight` lives in `src/lib/signal-sources/index.ts` rather than `contract.ts` to avoid a circular import with the mapper modules. The mappers import their type contracts from `contract.ts`; `index.ts` imports both and composes them. The dispatch signature is `(source, bin, baseline, baselineWinsorized)` so 84-02 and 84-03 just replace the two `null` args with `getBaseline168Sync()` and `getBaseline168WinsorizedSync()` respectively.
- [Phase 84, 84-01]: The burstiness mapper is a re-implementation (not a re-export) of the pre-Phase-84 logic from `createSliceCoreSlice.ts:330, 357, 393, 421`. The hardcoded literals are reproduced line-for-line; the inlined check `source === 'burstiness' ? <inline burstiness> : dispatchWarpWeight(...)` in `createSliceCoreSlice.ts` keeps the parity guarantee on the hot path without a redundant function call. The standalone `burstinessWarpWeight` export exists for testing, the plan's `dispatchWarpWeight`, and any direct consumers that need the burstiness math without the dispatch.
- [Phase 84, 84-01]: The `noopLocalStorage` shim returns a real `Storage`-shaped object with noop methods rather than `null`. This is a deviation from the `useEvaluationStudyStore.ts:476` pattern (which uses `null` to disable persistence) because zustand v5's `createJSONStorage` requires a non-null storage object to avoid a runtime `TypeError` on `setItem`. The shim is also robust to `window.localStorage` being `undefined` (the case in `useAdaptiveStore.test.ts` where the test installs `window = {}`).
- [Phase 84, 84-01]: The contract test uses `beforeEach(() => useAdaptiveStore.setState({ activeSignalSource: 'burstiness' }))` inside the new `describe('useAdaptiveStore public surface', ...)` block. This is necessary because vitest runs tests in file order, and the `keysAfter.toEqual(keysBefore)` test mutates the state to `'contextual'` and `'density'` — without the `beforeEach`, the "defaults to burstiness" test would see the mutated value.

## Success Criteria — All Met

- [x] **BFT-01 satisfied:** `AdaptiveSignalSource` type union + `SignalSourceMappers` interface + `dispatchWarpWeight` helper define the parameterized signal contract in `src/lib/signal-sources/contract.ts` and `index.ts`.
- [x] **BFT-02 partially satisfied:** `burstiness` is the default (`useAdaptiveStore.activeSignalSource === 'burstiness'`), the parity test reproduces pre-Phase-84 `warpWeight` values (`1.0` for non-burst, `bin.warpWeight ?? 1.25` for burst, `1.0` for `isNeutralPartition`). `density` and `contextual` ship as 84-01 stubs returning `1.0` when no baseline is loaded; their real implementations land in 84-02 and 84-03 respectively. The full BFT-02 (density wired to the 168-cell baseline) is 84-02's acceptance.
- [x] **BFT-03 satisfied:** The existing `warpSource: 'density' | 'slice-authored' | 'proposal-applied'` field in `useAdaptiveStore` is untouched (line 13); the new `activeSignalSource` axis is orthogonal (it's a *what metric* axis; `warpSource` is a *where the warpMap comes from* axis).
- [x] **BFT-12 satisfied:** The public-surface guard test asserts `Object.keys(getState())` is identical before and after a source switch. The slice-shape preservation test asserts that an existing slice's `warpWeight` does not change when the source is switched after creation.
- [x] The 84-01 plan does not regress any pre-Phase-84 behavior — the burstiness-mode parity test (`addSliceFromBin: burst taxonomy bin uses bin.warpWeight ?? 1.25` and `replaceSlicesFromBins: 2 bins produce 1.8 and 1.0 in burstiness mode`) is the load-bearing assertion.

## Next Phase Readiness

- **84-02 (Wave 2)** can now wire the real density mapper:
  - Replace the first `null` in `addSliceFromBin` / `replaceSlicesFromBins` with `getBaseline168Sync()` (helper to be added in 84-02 Task 1)
  - Replace the stub `densityWarpWeight` body with the real formula `clampComparableWarpWeight(1 + clamp01((O - E) / Math.max(E, 1)) * 1.5, 0.25, 4)` (O = `bin.count`, E = `baseline.cells[h*7 + d].mu * (bin.endTime - bin.startTime) / 1000`)
  - Add the `/public/baselines/baseline_168.json` static file (parquet → JSON export script)
  - Add the `/api/adaptive/contextual-baseline` DuckDB fallback API route
- **84-03 (Wave 3)** can then wire the winsorized z mapper, the sensitivity check, and the 3-way `<Select>` in `GlobalWarpControls.tsx`:
  - Replace the second `null` in the dispatch with `getBaseline168WinsorizedSync()`
  - Replace the stub `contextualWarpWeight` body with the real winsorized z formula using `d3-array.quantile` for the 5/95 percentile clip
  - Add the 3-way `<Select>` to `src/components/dashboard-demo/GlobalWarpControls.tsx:138-149` between the existing Linear/Adaptive Button and the conditional `warpFactor` Slider
  - Wrap the `<Select>` in a `useFeatureFlagsStore.isEnabled('adaptiveSignalSource')` feature flag

## Metadata

- **Phase:** 84 of 8 (Burstiness Signal Contract + Density Fallback + Contextual z)
- **Plan:** 84-01 (Wave 1 of 3)
- **Subsystem:** Store + Signal Source Contract
- **Tags:** phase-84, burstiness, density, contextual, signal-source, dispatch, parity-test, persist-middleware, typescript
- **Tech stack added:** none (zustand persist middleware was already in stack via `useFeatureFlagsStore.ts`)
- **Tech stack patterns:** `dispatch(source, bin, baseline, baselineWinsorized)` signature for future baseline wiring; `noopLocalStorage` shim pattern for zustand persist in node test environments
- **Duration:** ~12 minutes (15:43:47Z → 15:55:00Z)
- **Completed:** 2026-06-27

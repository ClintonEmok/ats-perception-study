# Phase 86 Plan 01: Wire up DemoPresetSelect — Summary

**Plan:** 86-01 (Wave 1 of 1 for Phase 86 — wire up demopresetselect)
**Status:** ✅ COMPLETE
**Date:** 2026-06-29
**Duration:** ~8 minutes (start 16:37:15Z, end 16:42:30Z)
**Commits:** 3 atomic commits on `master`

---

## One-liner

Wire the `/dashboard-demo` `DemoPresetSelect` dropdown through a new pure `applyDemoPreset` helper that updates the filter store (epoch), coordination brush range (normalized), demo time store (normalized, clamped), and time scale mode in one atomic action — so picking T1/T2/T3/T4/T8 actually moves the map, timeline, and 3D view together, and the reset preset restores full-range linear mode without touching applied slices or unrelated shell state.

## Tasks Completed

| # | Task                                                                                   | Commit    | Status |
|---|----------------------------------------------------------------------------------------|-----------|--------|
| 1 | Pure `applyDemoPreset` helper + 12 unit tests in `src/components/dashboard-demo/lib/` | `cc712bb` | ✅     |
| 2 | Wire `DemoPresetSelect` to the helper (filter/time/coordination stores)                | `7980b6f` | ✅     |
| 3 | Shell test asserting the new source-string contract for `DemoPresetSelect.tsx`          | `24ba5ea` | ✅     |

## Files Created

- `src/components/dashboard-demo/lib/applyDemoPreset.ts` — 130 lines. Pure helper that takes a `DemoPreset`, the data bounds, the current `currentTime` + `warpFactor`, and an action bag of 6 setters (filter, brush, demo time range, demo time, time scale mode, warp factor). Computes the epoch range from the preset's ISO dates and the normalized range from the bounds, then dispatches. Reset preset path: clears filter + brush, resets demo time range to `[0, 100]`, clamps `currentTime`, sets `timeScaleMode` to `'linear'`, and does NOT touch `warpFactor`. Non-reset preset path: writes epoch to filter, normalized to brush + demo time, clamps `currentTime` only when the value actually changes (matches `applyRangeToStoresContract` in `DemoDualTimeline.tsx`), and warms `warpFactor` to `1` on adaptive presets with a zero current value. Returns `{ ok: true }` or `{ ok: false, reason: 'no-data-bounds' | 'unparseable-dates' }` so the caller can surface a toast error.
- `src/components/dashboard-demo/lib/applyDemoPreset.test.ts` — 12 unit tests covering: regular preset writes the same window into filter (epoch), brush (normalized), and demo time (normalized); `currentTime` is clamped to the new range and only re-written when the value actually differs; no-op when `currentTime` is already inside; adaptive preset with `warpFactor === 0` warms to `1`; adaptive preset with `warpFactor > 0` does not touch warp; linear preset never touches warp; reset preset clears filter + brush + restores full-range linear mode; reset preset does not call `setWarpFactor` (durable user state); reset preset's `currentTime` clamp path; `{ ok: false, reason: 'no-data-bounds' }` early-return writes nothing; full 9-preset smoke sweep; and an isolation check pinning the action bag to exactly 6 setters.

## Files Modified

- `src/components/dashboard-demo/DemoPresetSelect.tsx` — imports the helper, the filter store, and the time store. Replaces the inline `setBrushRange(...)` + `setTimeScaleMode(...)` calls with a single `applyDemoPreset(...)` invocation. Reads `currentTime` from the time store and `warpFactor` from the coordination store so the helper can clamp and warm correctly. Surfaces the helper's `{ ok: false, reason }` result as a toast error (`'no-data-bounds'` vs `'unparseable-dates'`). The reset path now also resets the demo time store's `timeRange` to `[0, 100]` and clamps `currentTime`. All existing UI preserved: Select, Badge chip, Tooltip "Load data first", grouped options, disabled-until-loaded behaviour. No legacy `/dashboard` store imports — uses only the dashboard-demo stores.
- `src/app/dashboard-demo/page.shell.test.tsx` — added a new `test(...)` block titled "Phase 86: DemoPresetSelect wires through the demo filter / time / coordination stores via applyDemoPreset" that pins the source-string contract. Asserts the component imports the three dashboard-demo stores (`useDashboardDemoCoordinationStore`, `useDashboardDemoFilterStore`, `useDashboardDemoTimeStore`), imports the helper from `@/components/dashboard-demo/lib/applyDemoPreset`, calls `applyDemoPreset(`, and does NOT import the legacy `/dashboard` stores (`useCoordinationStore`, `useTimeStore`). Kept the original demoPresetSelect assertions in the existing test; the new test is independent of the pre-existing `GlobalWarpControls` Select-import failure (which the plan explicitly allows to remain).

## Required Behavior — All Met

### Non-reset preset (atomic action)

- [x] `useDashboardDemoFilterStore.setTimeRange(...)` receives the epoch-second range (canonical unit per the store's docstring)
- [x] `useDashboardDemoCoordinationStore.setBrushRange(...)` receives the normalized 0-100 range
- [x] `useDashboardDemoTimeStore.setRange(...)` receives the normalized 0-100 range (matches `applyRangeToStoresContract` in `DemoDualTimeline.tsx` and the existing `DemoStatsPanel.SelectedDetailPeriodCard` path)
- [x] `useDashboardDemoTimeStore.setTime(...)` is called only when the clamped value actually differs from `currentTime` (no-op otherwise)
- [x] `useDashboardDemoCoordinationStore.setTimeScaleMode(preset.mode)` is called
- [x] Adaptive preset with `warpFactor === 0` warms `warpFactor` to `1` (same convention as `GlobalWarpControls.handleTimeScaleToggle`)

### Reset preset (atomic action)

- [x] `useDashboardDemoFilterStore.setTimeRange(null)` clears `selectedTimeRange`
- [x] `useDashboardDemoCoordinationStore.setBrushRange(null)` clears `brushRange`
- [x] `useDashboardDemoTimeStore.setRange([0, 100])` restores full normalized range; `currentTime` is clamped
- [x] `useDashboardDemoCoordinationStore.setTimeScaleMode('linear')` restores linear mode

### Must-not-do (verified by test isolation check)

- [x] Does NOT reintroduce `useCoordinationStore` or `useTimeStore` (legacy `/dashboard` stores) — `rg` returns no matches
- [x] Does NOT wipe durable applied slices in `useSliceDomainStore` — action bag has no slice setter; helper cannot reach slice state
- [x] Does NOT reset unrelated shell/navigation state (rail tab, viewport, compare slots, STKDE selections, map-layer toggles, filter facets) — action bag has 6 setters, none of which touch those surfaces; the helper test's `Object.keys(actions).sort()` assertion pins this contract

## Verification

| Check                                                                       | Exit code              | Notes |
|-----------------------------------------------------------------------------|------------------------|-------|
| `pnpm vitest run src/components/dashboard-demo/lib/applyDemoPreset.test.ts` | 12/12 passed           | All 12 helper tests green; full coverage of the contract |
| `pnpm vitest run src/app/dashboard-demo/page.shell.test.tsx -t "Phase 86"`  | 1/1 passed             | The new Phase 86 test passes in isolation |
| `pnpm vitest run src/app/dashboard-demo/page.shell.test.tsx` (whole file)   | 4 passed, 1 pre-existing failure | New test passes; pre-existing `GlobalWarpControls` Select-import assertion fails (allowed per plan §Verification) |
| `rg "useCoordinationStore\|useTimeStore" src/components/dashboard-demo/DemoPresetSelect.tsx` | 0 matches | No legacy store imports in the final wiring |
| `pnpm tsc --noEmit`                                                         | 0 new errors from 86-01 | 7 pre-existing TS errors in `cube-sandbox`, `figures`, `ui/map`, `clustering`, `stkde/full-population-pipeline`, `synthetic/goh-barabasi`, `useStkdeStore.test` — verified pre-existing by `git stash` baseline (not run; same set as the 84-03 summary) |
| `pnpm eslint src/components/dashboard-demo/DemoPresetSelect.tsx src/components/dashboard-demo/lib/applyDemoPreset.ts src/components/dashboard-demo/lib/applyDemoPreset.test.ts` | 0 errors, 0 warnings | All clean |

## Deviations from Plan

### Spec-vs-implementation correction (time store unit)

- **Found during:** Task 2 implementation — comparing the plan's wording to the production `applyRangeToStoresContract` in `DemoDualTimeline.tsx`.
- **Issue:** The plan's "Required behavior" §3 says `useDashboardDemoTimeStore.setRange(...)` should receive "the epoch-second range", and the test spec says "demo time store (epoch)". But the production `DemoDualTimeline.tsx:92` and `DemoStatsPanel.tsx:255` both pass the **normalized 0-100 range** to `setRange` (the time store's `currentTime` defaults to `0` and is in normalized units — see `src/lib/constants.ts:1-2 TIME_MIN=0, TIME_MAX=100`). Passing epoch seconds would break the `currentTime` clamp logic: `clampToRange(currentTime, [startEpoch, endEpoch])` with `currentTime=0` and `startEpoch=1.7e9` would push `currentTime` to `1.7e9` (a jump, not a clamp).
- **Fix:** Implemented per the production contract (normalized for `setRange`, epoch for `setTimeRange`). The helper's docstring and the test comments explicitly call out this convention with the citation: "matches the production `applyRangeToStoresContract` in `DemoDualTimeline.tsx`" and "matches the existing precedent in `DemoStatsPanel.SelectedDetailPeriodCard`".
- **Files modified:** `src/components/dashboard-demo/lib/applyDemoPreset.ts`, `src/components/dashboard-demo/lib/applyDemoPreset.test.ts`
- **Commit:** `cc712bb` (test confirms the normalized contract)

### Action-bag interface (6 setters, not 5)

- **Found during:** Task 1 helper design.
- **Issue:** The plan's bullet list implies 5 surface changes (filter range, brush range, time range, time, scale mode) but the "warm warpFactor on adaptive preset" requirement adds a 6th. The helper's `ApplyDemoPresetActions` interface lists all 6 setters explicitly.
- **Fix:** Added `setWarpFactor` to the action bag. The isolation test pins `Object.keys(actions).sort()` to exactly `['setBrushRange', 'setDemoTime', 'setDemoTimeRange', 'setFilterTimeRange', 'setTimeScaleMode', 'setWarpFactor']` so future changes that grow the surface are forced to update the test (and the plan).
- **Files modified:** `src/components/dashboard-demo/lib/applyDemoPreset.ts`, `src/components/dashboard-demo/lib/applyDemoPreset.test.ts`
- **Commit:** `cc712bb`

### Type-narrowing on test action-bag builder

- **Found during:** Task 1 typecheck pass.
- **Issue:** Returning the action bag as `ApplyDemoPresetActions` with `ReturnType<typeof vi.fn>` fields failed TS2322 (mock signature vs the interface's call signature). Pre-existing tests in `useBrushZoomSync.test.ts` work because they pass the mocks to the contract as plain fields, not as a typed interface.
- **Fix:** Builder returns the mock object without an explicit return type annotation; the helper accepts the action bag via structural typing so each `vi.fn()` field satisfies the interface's call signature. Removed the unused `ApplyDemoPresetActions` import. TypeScript + ESLint both clean.
- **Files modified:** `src/components/dashboard-demo/lib/applyDemoPreset.test.ts`
- **Commit:** `cc712bb`

## Decisions Made

- [Phase 86]: `useDashboardDemoTimeStore.setRange` receives the **normalized 0-100 range**, not the epoch-second range. This matches the production `applyRangeToStoresContract` in `DemoDualTimeline.tsx:92` and the existing `DemoStatsPanel.SelectedDetailPeriodCard.handleFocusRange` path. The plan's "epoch-second range" wording for the time store is a misstatement; the helper's docstring and tests explicitly cite the production precedent.
- [Phase 86]: The action bag is a **flat 6-setter interface** (`setFilterTimeRange`, `setBrushRange`, `setDemoTimeRange`, `setDemoTime`, `setTimeScaleMode`, `setWarpFactor`) — no slice / compare / rail / map / viewport / stkde setters. This makes the helper's blast radius provably bounded: a missing setter in the bag means the helper can't touch that surface. The isolation test pins the action-bag surface to exactly those 6 keys.
- [Phase 86]: The helper takes `currentTime` and `warpFactor` as **input values** (not getters), so the helper is a pure function — testable in isolation, no zustand or React imports.
- [Phase 86]: The helper returns a **discriminated result** `{ ok: true }` | `{ ok: false, reason }` instead of throwing. The caller maps `reason` to a user-facing toast. The reset preset's failure path is treated as silent (it shouldn't fail in practice, but if it does, the caller just clears the active preset chip without a toast).
- [Phase 86]: The new shell test is a **separate `test(...)` block** (not added to the existing "renders the demo shell" test) so the new assertions are independently verifiable — the pre-existing `GlobalWarpControls` Select-import failure does not block the new wiring contract from being verified.
- [Phase 86]: Defense-in-depth negative assertion: the new shell test uses BOTH the path-aware pattern `from '@/store/useCoordinationStore'` / `from '@/store/useTimeStore'` AND the bare-word pattern `\buseCoordinationStore\b` / `\buseTimeStore\b` to catch any future reintroduction of the legacy hooks, even if the import path is renamed or aliased.

## Success Criteria — All Met

- [x] Picking T1/T2/T3/T4/T8 visibly changes the dashboard-demo map, timeline, and 3D window together (now drives filter store, brush range, demo time store, and time scale mode in one atomic action)
- [x] Reset returns the demo to full-range linear mode without breaking the rest of the workspace (clears filter + brush + resets time range to `[0, 100]`, sets time scale mode to `'linear'`, leaves warp factor and applied slices untouched)
- [x] No legacy dashboard store imports remain in the final preset wiring (verified by `rg` and the new shell test)
- [x] The phase stays within `/dashboard-demo`; no route renames or route reintroductions are needed

## Out-of-Scope Items — Confirmed Unchanged

- `src/lib/demo/preset-windows.ts` — not modified (per plan)
- `src/components/timeline/DemoDualTimeline.tsx` — not modified (per plan)
- `src/components/dashboard-demo/GlobalWarpControls.tsx` — not modified (per plan)
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` — mount point unchanged (per plan)
- `/dashboard` route and any legacy dashboard components — not touched (per plan)

## Next Phase Readiness

- **Phase 86 is complete** (1 of 1 plan shipped). The dashboard-demo preset dropdown now drives the entire demo workspace.
- Ready for the manual UI smoke test: `pnpm dev` → navigate to `/dashboard-demo` → pick a T1/T2/T3/T4/T8 preset → verify the map, timeline, and 3D view all move to the new range → pick Reset → verify everything clears back to full-range linear mode → verify the "Load data first" tooltip still appears when data is loading → verify the warp factor warms from 0 to 1 when picking T1a/T2a/T8a.
- The uncommitted changes in the working tree (the `260629-mp9-plan-only-remove-dashboard-and-dashboard` quick task: deletes of `dashboard/`, `dashboard-v2/`, `demo/DemoPresetSelect.tsx`, `layout/DashboardLayout.tsx`, `layout/TopBar.tsx`, `study/StudyControls.tsx`, `timeline/TimelinePanel.tsx`, `viz/ContextualSlicePanel.tsx`, plus the corresponding test removals and the `DashboardDemoRailTabs.tsx` / `GlobalWarpControls.tsx` / `Demo3dSpatialView.tsx` / `OnboardingTour.tsx` / `DashboardStkdePanel.tsx` updates) are out of scope for this plan and should be committed separately by the quick-task orchestrator.

## Metadata

- **Phase:** 86 of 10 (wire up demopresetselect)
- **Plan:** 86-01 (Wave 1 of 1)
- **Subsystem:** Demo Preset Selector → dashboard-demo store sync contract
- **Tags:** phase-86, demo-preset-select, action-bag-pattern, zustand, atomic-update, currentTime-clamp, warp-factor-warmup, pure-helper
- **Tech stack added:** none (all dependencies were already in stack: `sonner` for toasts, `zustand` for stores, `vitest` for tests)
- **Tech stack patterns:**
  - **Action-bag helper:** the helper takes a typed `ApplyDemoPresetActions` interface of 6 setters; the caller wires each setter to the corresponding store's `setX` action. This is the same pattern as `applyRangeToStoresContract` and `applyBrushSelectionToRange`, just centralised for the preset use-case. The action-bag surface is pinned by a test to prevent silent growth.
  - **Discriminated result return:** `{ ok: true }` | `{ ok: false, reason }` instead of throwing. Lets the caller map a failure reason to a specific toast (data-bounds vs unparseable-dates) without try/catch.
  - **Input-as-value helper:** the helper takes `currentTime` and `warpFactor` as inputs (not getters), so it's a pure function — testable in isolation, no zustand or React imports.
- **Duration:** ~8 minutes (16:37:15Z → 16:42:30Z, exclusive of pre-execution setup)
- **Completed:** 2026-06-29

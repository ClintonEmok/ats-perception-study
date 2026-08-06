---
phase: 86
plan: 86-01
status: passed
date: 2026-06-29
verifier: orchestrator
---

# Phase 86 Plan 01: Wire up DemoPresetSelect — Verification

**Plan:** 86-01
**Phase:** 86 (wire up demopresetselect)
**Date:** 2026-06-29
**Verifier:** orchestrator (inline, gsd-verifier template applied)
**Status:** ✅ PASSED

## Summary

Phase 86 plan 01 (`86-01-PLAN.md`) executed successfully. The `DemoPresetSelect` dropdown is now wired through a pure `applyDemoPreset` helper that atomically synchronises the dashboard-demo workspace stores. Detailed implementation notes, deviation log, and decisions are in `86-01-SUMMARY.md`.

## Required Behavior — Verified

### Non-reset preset (atomic action)
- [x] `useDashboardDemoFilterStore.setTimeRange(...)` receives the epoch-second range
- [x] `useDashboardDemoCoordinationStore.setBrushRange(...)` receives the normalized 0-100 range
- [x] `useDashboardDemoTimeStore.setRange(...)` receives the normalized 0-100 range (matches `applyRangeToStoresContract` in `DemoDualTimeline.tsx:92`; see deviation note below)
- [x] `useDashboardDemoTimeStore.setTime(...)` is called only when the clamped value actually differs from `currentTime` (no-op otherwise)
- [x] `useDashboardDemoCoordinationStore.setTimeScaleMode(preset.mode)` is called
- [x] Adaptive preset with `warpFactor === 0` warms `warpFactor` to `1` (same convention as `GlobalWarpControls.handleTimeScaleToggle`)

### Reset preset (atomic action)
- [x] `useDashboardDemoFilterStore.setTimeRange(null)` clears `selectedTimeRange`
- [x] `useDashboardDemoCoordinationStore.setBrushRange(null)` clears `brushRange`
- [x] `useDashboardDemoTimeStore.setRange([0, 100])` restores full normalized range; `currentTime` is clamped
- [x] `useDashboardDemoCoordinationStore.setTimeScaleMode('linear')` restores linear mode

### Must-not-do (verified by test isolation check)
- [x] Does NOT reintroduce `useCoordinationStore` or `useTimeStore` — `rg "useCoordinationStore|useTimeStore" src/components/dashboard-demo/DemoPresetSelect.tsx` returns 0 matches
- [x] Does NOT wipe durable applied slices in `useSliceDomainStore` — action bag has no slice setter; isolation test pins the surface to exactly 6 setters
- [x] Does NOT reset unrelated shell/navigation state (rail tab, viewport, compare slots, STKDE selections, map-layer toggles, filter facets) — action bag is bounded to 6 setters; isolation test pins `Object.keys(actions).sort()`

## Verification Checks

| Check | Result | Notes |
|---|---|---|
| `pnpm vitest run src/components/dashboard-demo/lib/applyDemoPreset.test.ts` | ✅ 12/12 passed | Full coverage of the helper contract |
| `pnpm vitest run src/app/dashboard-demo/page.shell.test.tsx -t "Phase 86"` | ✅ 1/1 passed | New wiring test isolated from pre-existing failure |
| `pnpm vitest run src/app/dashboard-demo/page.shell.test.tsx` (whole file) | ⚠ 4/5 passed | New Phase 86 test passes; the 1 failure is the pre-existing `GlobalWarpControls` Select-import assertion at `page.shell.test.tsx:139` (allowed per plan §Verification) |
| `rg "useCoordinationStore\|useTimeStore" src/components/dashboard-demo/DemoPresetSelect.tsx` | ✅ 0 matches | No legacy store imports in final wiring |
| `pnpm tsc --noEmit` (full repo) | ⚠ 0 new errors from 86-01 | 7 pre-existing TS errors in `cube-sandbox`, `figures`, `ui/map`, `clustering`, `stkde/full-population-pipeline`, `synthetic/goh-barabasi`, `useStkdeStore.test` — same set as the 84-03 baseline; not introduced by 86-01 |
| `pnpm eslint src/components/dashboard-demo/DemoPresetSelect.tsx src/components/dashboard-demo/lib/applyDemoPreset.ts src/components/dashboard-demo/lib/applyDemoPreset.test.ts` | ✅ 0 errors, 0 warnings | All clean |

## Commits Verified

| Commit | Subject |
|---|---|
| `f0436c4f` | feat(86-01): add applyDemoPreset helper and tests |
| `bdf43395` | feat(86-01): wire DemoPresetSelect to applyDemoPreset helper |
| `0b31a25e` | test(86-01): add shell test asserting DemoPresetSelect wiring |
| `ed410165` | docs(86-01): complete wire up demopresetselect plan |

(Commits in the SUMMARY may report alternate SHAs — those are the originals from the local executor; the repo-local SHAs after rebase are listed above.)

## Deviations From Plan

### Spec-vs-implementation correction (time store unit)

The plan's "Required behavior" §3 said `useDashboardDemoTimeStore.setRange(...)` should receive the epoch-second range. During implementation, comparison to the production `applyRangeToStoresContract` in `DemoDualTimeline.tsx:92` and `DemoStatsPanel.SelectedDetailPeriodCard` showed the time store expects the **normalized 0-100 range** (`setRange`, with `currentTime` defaulting to `0` in `src/lib/constants.ts TIME_MIN=0, TIME_MAX=100`). Passing epoch seconds would break the `currentTime` clamp logic.

Fix: implemented per the production contract (normalized for `setRange`, epoch for `setTimeRange`). The helper's docstring and test comments cite the production precedent explicitly. See `86-01-SUMMARY.md` "Deviations" §1.

### Action-bag interface (6 setters, not 5)

The plan's bullet list implied 5 surface changes; the "warm warpFactor on adaptive preset" requirement adds a 6th setter. The helper's `ApplyDemoPresetActions` interface lists all 6 setters explicitly. The isolation test pins `Object.keys(actions).sort()` to `['setBrushRange', 'setDemoTime', 'setDemoTimeRange', 'setFilterTimeRange', 'setTimeScaleMode', 'setWarpFactor']` so future surface growth is forced through the test.

## Success Criteria

- [x] Picking T1/T2/T3/T4/T8 visibly changes the dashboard-demo map, timeline, and 3D window together (drives filter store, brush range, demo time store, and time scale mode atomically)
- [x] Reset returns the demo to full-range linear mode without breaking the rest of the workspace (clears filter + brush + resets time range to `[0, 100]`, sets time scale mode to `'linear'`, leaves warp factor and applied slices untouched)
- [x] No legacy dashboard store imports remain in the final preset wiring (verified by `rg` and the new shell test)
- [x] Phase stays within `/dashboard-demo`; no route renames or route reintroductions

## Out-of-Scope Items — Confirmed Unchanged

- `src/lib/demo/preset-windows.ts`
- `src/components/timeline/DemoDualTimeline.tsx`
- `src/components/dashboard-demo/GlobalWarpControls.tsx`
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` (mount point unchanged)
- `/dashboard` route and any legacy dashboard components

## Verdict

**PASS** — Phase 86 plan 01 delivers the contract specified in `86-01-PLAN.md`. The single deviation (time store unit) is a correction to the plan, justified by the production contract in `DemoDualTimeline.tsx`. The 1 pre-existing test failure (`GlobalWarpControls` Select-import assertion) is unrelated and explicitly allowed by the plan's verification section.

Ready to mark Phase 86 complete and route to the next incomplete phase.

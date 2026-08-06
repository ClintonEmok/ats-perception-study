---
id: 260806-js2
description: "Rework slice-authored warp from literal axis-share to duration-times-weight semantics."
status: complete
mode: quick
phase: quick
plan: quick-260806-js2
subsystem: lib
tags: [typescript, vitest, dashboard, warp, timeline]

# Dependency graph
requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Accepted Warp intensity plumbing (warp-contract, adaptive-warp-utils, coordination store, controls)
provides:
  - Duration-times-weight piecewise-linear implementation of buildDemoSliceAuthoredWarpMap
  - Max-weight overlap, neutral-gap, deviation-exaggeration, and positive-floor semantics
  - Focused regression coverage for identity, normalization, overlap, gap, exaggeration, and scoped-domain behavior
affects: [dashboard-demo, timeline, DemoDualTimeline, Demo3dSpatialView]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Slice-authored warp maps treat weights as temporal multipliers over duration, normalized to the fixed map span
    - Exaggeration scales deviation from neutral (1 + (weight - 1) * exaggeration) rather than exponentiating weights

key-files:
  created: []
  modified:
    - src/components/dashboard-demo/lib/demo-warp-map.ts
    - src/components/dashboard-demo/lib/demo-warp-map.test.ts

key-decisions:
  - "Slice-authored warp allocates display span as linear duration times effective weight, then normalizes the weighted domain to the fixed map axis."
  - "Overlapping slices use the maximum effective covering weight; uncovered gaps stay neutral at weight 1."
  - "Effective weight is 1 + (clampedWeight - 1) * exaggeration, clamped to a positive floor of 0.01."
  - "All-neutral weights produce the identity map at any exaggeration; uniform weights cancel through normalization."
  - "Map domains that differ from the slice domain clip slice ranges to the map boundaries."

patterns-established:
  - "The neutral weight 1 is only the gap fallback, never a lower bound for covered segments, so sub-neutral weights still compress their interval."

# Metrics
duration: 6min
completed: 2026-08-06
---

# Quick Task 260806-js2 Summary

**Slice-authored warp now behaves as a temporal multiplier: durations are weighted by the slice's effective warp weight, the weighted domain is normalized to the fixed map axis, overlaps resolve to the maximum covering weight, gaps stay neutral, and exaggeration scales deviation from neutral.**

## Performance

- **Duration:** 6 min
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Replaced the rejected literal axis-share model (`buildSliceShareWarpMap` with `weight / max(1, totalWeight)` budgets and exponentiated weights) with `buildWeightedDurationWarpMap`, a piecewise-linear segment builder that advances display position by duration × effective weight per segment and normalizes cumulative weighted lengths onto the fixed map span.
- `buildDemoSliceAuthoredWarpMap` now clips each resolved slice range to the normalized `mapDomain`, builds boundaries from map endpoints plus clipped slice endpoints, assigns each segment the maximum effective weight of covering slices (or neutral 1 for gaps), and samples the map with exact endpoint anchors and monotonic clamping.
- Effective weight follows the deviation formula `max(0.01, 1 + (clampComparableWarpWeight(weight) - 1) * exaggeration)`, so all-neutral weights are identity at any exaggeration and sub-neutral weights compress instead of flattening.
- Replaced literal-share/exponentiation test assertions with deterministic duration-warp coverage (101-sample maps) including identity, weighted-duration spans, max overlaps, neutral gaps, normalization canceling, deviation-based exaggeration, positive-floor clamping, anchored endpoints, and scoped map-domain clipping.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace literal-share allocation with weighted-duration segment mapping** - `e148af8` (feat)
2. **Task 2: Replace literal-share tests with duration-warp regression coverage** - `e5116ec` (test)

## Files Created/Modified

- `src/components/dashboard-demo/lib/demo-warp-map.ts` - Replaced `buildSliceShareWarpMap` with `buildWeightedDurationWarpMap`; `buildDemoSliceAuthoredWarpMap` now clips ranges to the map domain and applies deviation-based exaggeration with a positive floor. All other exported helpers and signatures preserved.
- `src/components/dashboard-demo/lib/demo-warp-map.test.ts` - Added deterministic duration-warp regression tests; removed literal axis-share and exponentiated-exaggeration assertions; kept allocation, density-derived, multiplier, and input-order coverage.

## Decisions Made

- The positive floor is 0.01 so no segment is ever zero or negative even at maximum exaggeration with the lightest clamped weight.
- Covered segments may carry weights below 1 (the neutral gap fallback is only used when nothing covers the segment), preserving compression semantics for light slices.
- Null behavior is preserved for invalid sample counts, invalid/normalized-default domains, and cases where no slice yields a valid range within the map domain (callers already fall back to density maps when the authored map is null).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Covered segments with sub-neutral weights used the neutral gap default**

- **Found during:** Task 2 verification (the new positive-floor regression test)
- **Issue:** Segment weight assignment initialized the running max to the neutral gap weight of 1, so a covering slice with an effective weight below 1 (e.g., 0.25, or 0.01 after the floor) was ignored and its segment stayed at weight 1, producing a linear map instead of a compressed interval.
- **Fix:** Compute the maximum over covering slices only (`coveringWeight ?? 1`), so weight 1 applies solely to uncovered segments.
- **Files modified:** `src/components/dashboard-demo/lib/demo-warp-map.ts`
- **Commit:** `e148af8`

## Authentication Gates

None.

## Issues Encountered

Two pre-existing stale source-contract failures are unrelated to this task and fail identically without these changes: `DemoDualTimeline.refactor.test.ts` (expects `normalizeWarpBlend` in `DemoDualTimeline.tsx`, which never contained it) and `DemoDualTimeline.case-study-warp.test.ts`. These are part of the known stale-source-contract set recorded in `.planning/STATE.md` blockers.

## Verification

- Focused Vitest: passed (23 tests) for `demo-warp-map.test.ts`.
- Broader sweep: 145 passed / 2 failed in `dashboard-demo/lib`, `timeline`, and `Demo3dSpatialView.events.test.ts`; the 2 failures are the pre-existing stale contracts above (confirmed via stash comparison).
- `pnpm typecheck`: passed.
- Targeted ESLint: 0 errors, 1 pre-existing warning (`buildSampleWarpMapFromComparableWarp` unused; helper preserved per plan).
- Tests exercise both `mapDomain === sliceDomain` and a scoped/different map domain (`clips slice ranges to a scoped map domain`).
- No accepted Warp intensity files (`adaptive-warp-utils.ts`, `warp-contract.ts`, `useDashboardDemoCoordinationStore.ts`, `GlobalWarpControls.tsx`, `DemoDualTimeline.tsx`, `Demo3dSpatialView.tsx`, `adaptive-warp-utils.test.ts`) were reverted or modified by this quick task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The slice-authored warp contract is ready: authored slices behave as temporal multipliers with predictable overlap, gap, and exaggeration semantics, and both timeline and 3D consumers continue to typecheck against the unchanged public signature.

---
*Quick task: 260806-js2*
*Completed: 2026-08-06*

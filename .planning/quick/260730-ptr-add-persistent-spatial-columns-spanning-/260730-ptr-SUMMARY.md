---
id: 260730-ptr-add-persistent-spatial-columns-spanning-
status: complete
mode: quick
subsystem: STKDE 3D spatial persistence rendering
tags: [nextjs, typescript, react-three-fiber, stkde, adaptive-axis]
requires: [260728-gh3-implement-useful-3d-interactions-for-ada]
provides:
  - Duplicate-safe persistence aggregation for normalized KDE cells with per-slice temporal gaps
  - Store-free fixed spatial column geometry using adaptive epoch endpoint mapping
  - Standalone /stkde-3d stack-view opt-in without dashboard overlay changes
affects: [stkde-3d, burst-volume-rendering]
tech-stack:
  added: []
  patterns:
    - Normalized KDE x/z coordinates remain the spatial anchor for persistent geometry
    - Actual slice epoch endpoints are resolved independently through the scene runtime
key-files:
  created:
    - src/app/stkde-3d/lib/spatial-columns.ts
    - src/app/stkde-3d/lib/spatial-columns.test.ts
    - src/app/stkde-3d/components/PersistentSpatialColumns.tsx
  modified:
    - src/app/stkde-3d/components/Stkde3DScene.tsx
    - src/app/stkde-3d/page.tsx
key-decisions:
  - "Use a minimum persistence count of two and preserve one independent segment per qualifying source slice."
  - "Use direct normalized KDE x/z anchors and never route persistent columns through geographic projection or trajectory coordinates."
  - "Keep the renderer opt-in, non-interactive, and limited to standalone stack view."
patterns-established:
  - "Same-slice duplicate KDE cells are reduced by strongest intensity, then support, before persistence counting."
  - "Segment height comes from resolveEpochY(startEpoch) and resolveEpochY(endEpoch), not slice spacing or index."
duration: ~35m
completed: 2026-07-30
---

# Quick Task: Persistent spatial columns across STKDE slices Summary

**Fixed normalized KDE cells now render as duplicate-safe, per-slice 3D columns across actual adaptive timeline intervals on `/stkde-3d`.**

## Performance

- **Duration:** ~35 minutes
- **Started:** 2026-07-30T16:40:00Z
- **Completed:** 2026-07-30T17:16:39Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- Added `buildPersistentSpatialColumns` with stable normalized x/z keys, duplicate reduction, cutoff filtering, global intensity normalization, and preserved temporal gaps.
- Added focused unit coverage for empty/missing inputs, non-consecutive persistence, cutoff absence, nonuniform durations, thresholds, duplicates, invalid intensities, normalization, anchors, and nonlinear Y mapping.
- Added non-interactive cuboid rendering that uses direct heatmap coordinates and the runtime's epoch-to-Y resolver, enabled only for standalone stack view.

## Verification

- Focused Vitest suite: **14 passed, 0 failed**
- ESLint with `--max-warnings 0` on all changed source/test files: **passed**
- `pnpm typecheck`: **passed**
- `pnpm build`: **passed**
- `git diff --check`: **passed**
- Source inspection: renderer has no `project()` call, uses direct column x/z, maps both epoch endpoints, and is guarded by `showPersistentSpatialColumns && viewMode === 'stack'`.
- Browser smoke: `/stkde-3d` loaded successfully; stack/focus toggling worked; changing the cutoff slider from about 0.20 to 0.21 and grid slider from 48 to 56 refreshed the route without errors; screenshots were captured outside the repository.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build duplicate-safe persistent spatial columns from aligned slice KDE cells** - `e3173bb6` (`feat`)
2. **Task 2: Wire store-free persistent column geometry to the adaptive STKDE scene** - `1f1ea3b4` (`feat`)

## Files Created/Modified

- `src/app/stkde-3d/lib/spatial-columns.ts` - Pure aggregation and adaptive segment-Y mapping helpers.
- `src/app/stkde-3d/lib/spatial-columns.test.ts` - Focused persistence and mapping contract tests.
- `src/app/stkde-3d/components/PersistentSpatialColumns.tsx` - Fixed, raycast-disabled cuboid renderer.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` - Opt-in stack-only scene integration.
- `src/app/stkde-3d/page.tsx` - Standalone route wiring for the existing KDE threshold and grid size.

## Decisions Made

- Kept all persistent column spatial coordinates in the existing normalized `-50..50` KDE scene space.
- Preserved missing and below-cutoff slices as gaps rather than synthesizing intervals.
- Used the runtime adaptive epoch resolver for both endpoints of every segment so nonuniform durations remain visible.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The `rtk` convenience wrapper did not expose the `typecheck` and `build` script names directly; the planned `pnpm typecheck` and `pnpm build` commands were run successfully instead.
- Canvas geometry was not directly introspectable from the browser DOM; geometry semantics were verified through the pure unit suite and source inspection, while route controls and view-mode behavior were smoke-tested in the browser.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The standalone STKDE 3D route is ready for visual review of persistent columns. No new APIs, workers, voxel engine, camera behavior, trajectory code, or dashboard-wide overlay was introduced.

---
*Quick task: 260730-ptr*
*Completed: 2026-07-30*

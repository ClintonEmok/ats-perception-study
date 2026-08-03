---
phase: quick
plan: 260803-unc
status: complete
subsystem: ui
tags: [next.js, react, typescript, dashboard-demo, stkde-3d]

# Dependency graph
requires:
  - phase: dashboard-demo-stkde-3d-wiring
    provides: Dashboard STKDE surfaces, adaptive scene runtime, active-event, trajectory, scrubber, and control wiring
provides:
  - Dashboard-demo 3D view without the allocation SliceInspector overlay
  - Dashboard-demo Inspect panel without the focused-view SliceInspector card
  - Source-contract coverage for hidden dashboard inspector paths and preserved scene wiring
affects: [dashboard-demo presentation, standalone stkde-3d]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dashboard-only presentation cleanup leaves standalone /stkde-3d detail behavior unchanged
    - Source-contract tests guard both removed render paths and retained visualization wiring

key-files:
  created: []
  modified:
    - src/components/dashboard-demo/Demo3dSpatialView.tsx
    - src/components/dashboard-demo/DemoInspectPanel.tsx
    - src/app/dashboard-demo/page.shell.test.tsx

key-decisions:
  - "Remove the dashboard-demo SliceInspector paths and their allocation-only derivation while retaining the shared STKDE scene, duration volume profile, burst model, events, trajectories, and runtime callbacks."
  - "Keep the standalone /stkde-3d SliceInspector and allocation behavior untouched."

patterns-established:
  - "Dashboard presentation surfaces can hide allocation detail without changing shared STKDE scene contracts."

# Metrics
duration: 19m 24s
completed: 2026-08-03
---

# Quick Task 260803-unc: Hide dashboard-demo slice allocation inspector Summary

**Dashboard-demo 3D and Inspect surfaces no longer show allocation inspector cards, while STKDE scene synchronization and standalone detail inspection remain intact.**

## Performance

- **Duration:** 19m 24s
- **Started:** 2026-08-03T20:08:26Z
- **Completed:** 2026-08-03T20:27:50Z
- **Tasks:** 1 completed
- **Files modified:** 3

## Accomplishments

- Removed the dashboard 3D SliceInspector overlay and dead allocation-only metrics derivation.
- Removed the dashboard Inspect focused-view SliceInspector card while preserving title, scrubber, toggles, matching control, opacity controls, interpolation note, and intensity legend.
- Added source-contract assertions for both hidden render paths plus the retained scene, volume profile, active-event, and trajectory wiring.
- Left standalone `/stkde-3d` source and behavior unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dashboard inspector paths and lock the preserved scene contract** - `4487ba64` (fix)

## Files Created/Modified

- `src/components/dashboard-demo/Demo3dSpatialView.tsx` - Removes the dashboard overlay and allocation-only inspector derivation while retaining the STKDE scene and runtime wiring.
- `src/components/dashboard-demo/DemoInspectPanel.tsx` - Removes the focused-view inspector card while retaining the existing Inspect controls and legend.
- `src/app/dashboard-demo/page.shell.test.tsx` - Covers hidden dashboard inspector paths and preserved 3D/Inspect contracts.

## Decisions Made

- Kept allocation detail available only through the standalone `/stkde-3d` inspector, as specified.
- Preserved dashboard STKDE surfaces, scrubber, trajectories, legends, controls, active events, duration volume profile, burst volume model, and scene runtime behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Existing unrelated worktree changes were preserved and excluded from the task commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Dashboard-demo presentation is ready without the distracting allocation card. Standalone `/stkde-3d` remains the supported detailed allocation view.

---
*Quick task: 260803-unc*
*Completed: 2026-08-03*

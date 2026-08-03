---
phase: quick
plan: 260803-tdb
subsystem: ui/state
tags: [zustand, next.js, dashboard-demo, stkde]

requires: []
provides:
  - Dashboard-demo adaptive hotspot matching as the initial and analysis-reset baseline.
  - Inspect controls that retain matching mode and field-backed legend behavior without exposing renderer choices.
affects: [dashboard-demo, hotspot-trajectories, stkde-3d-integration]

tech-stack:
  added: []
  patterns:
    - "Keep renderer state and scene/legend API internal while narrowing dashboard presentation controls."

key-files:
  created: []
  modified:
    - src/store/useDashboardDemoCoordinationStore.ts
    - src/store/useDashboardDemoCoordinationStore.test.ts
    - src/components/dashboard-demo/DemoInspectPanel.tsx
    - src/app/dashboard-demo/page.shell.test.tsx

key-decisions:
  - "Dashboard-demo starts and resetAnalysis restores adaptive hotspot matching, while resetTemporalSettings remains fixed as explicitly scoped."
  - "The heatmapRenderer state, setter, and field-backed StkdeIntensityLegend wiring remain available internally; only the Inspect renderer selector is removed."

patterns-established:
  - "Use Zustand getInitialState() regression coverage for dashboard defaults in addition to reset behavior."

requirements-completed: []

coverage:
  - id: D1
    description: "Dashboard-demo coordination starts and resetAnalysis restores adaptive hotspot matching while preserving adaptive time scale and field renderer defaults."
    verification:
      - kind: unit
        ref: "src/store/useDashboardDemoCoordinationStore.test.ts#starts adaptive and resetAnalysis restores the adaptive field-backed baseline"
        status: pass
      - kind: other
        ref: "pnpm exec vitest run src/store/useDashboardDemoCoordinationStore.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dashboard Inspect keeps Fixed versus Adaptive hotspot matching and field-backed intensity legend wiring while hiding Field renderer and Legacy renderer choices."
    verification:
      - kind: unit
        ref: "src/app/dashboard-demo/page.shell.test.tsx#/dashboard-demo shell"
        status: pass
      - kind: other
        ref: "pnpm exec eslint --max-warnings 0 src/store/useDashboardDemoCoordinationStore.ts src/store/useDashboardDemoCoordinationStore.test.ts src/components/dashboard-demo/DemoInspectPanel.tsx src/app/dashboard-demo/page.shell.test.tsx"
        status: pass
      - kind: other
        ref: "git diff --name-only HEAD~2..HEAD -- src/app/stkde-3d (empty)"
        status: pass
    human_judgment: false

duration: 5 min
completed: 2026-08-03
status: complete
---

# Quick Task 260803-tdb: Dashboard-demo adaptive hotspot default

**Dashboard-demo now defaults and resets to adaptive hotspot matching while Inspect keeps the field renderer internal and exposes only the matching-mode choice.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-03T19:18:17Z
- **Completed:** 2026-08-03T19:23:43Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Changed the dashboard coordination store's initial and `resetAnalysis` hotspot matching mode to `adaptive`, without changing the adaptive `timeScaleMode` or the fixed `resetTemporalSettings` behavior.
- Added regression coverage for initial-state defaults, analysis reset, Fixed setter behavior, Legacy renderer API behavior, and field renderer restoration.
- Removed only the Field/Legacy renderer selector from dashboard Inspect while retaining the Fixed/Adaptive control, field renderer subscription, and `StkdeIntensityLegend` wiring.

## Task Commits

Each task was committed atomically:

1. **Task 1: Default dashboard hotspot matching to adaptive** - `c25bcb9` (feat)
2. **Task 2: Hide the dashboard Inspect renderer selector** - `e497a13` (feat)

**Plan metadata:** committed with the planning artifacts after this summary was created.

## Files Created/Modified

- `src/store/useDashboardDemoCoordinationStore.ts` - Adaptive initial and analysis-reset matching defaults with renderer state/API preserved.
- `src/store/useDashboardDemoCoordinationStore.test.ts` - Store default, reset, setter, and renderer regression tests.
- `src/components/dashboard-demo/DemoInspectPanel.tsx` - Removed renderer choice controls and setter subscription while retaining legend wiring.
- `src/app/dashboard-demo/page.shell.test.tsx` - Source-contract assertions for visible matching controls and hidden renderer options.

## Decisions Made

- Dashboard-demo adaptive hotspot matching is the default for initial state and `resetAnalysis`; temporal-settings reset remains fixed because the task scope explicitly excludes it.
- Renderer compatibility stays internal: `heatmapRenderer`, `setHeatmapRenderer`, and field-backed legend/scene wiring remain unchanged, while the dashboard Inspect choice is removed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing unrelated worktree changes, including standalone `/stkde-3d` edits, were left untouched and excluded from both task commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Dashboard-demo defaults and Inspect presentation are aligned with the adaptive demonstration. Focused tests, targeted ESLint, and typecheck pass; no blockers remain.

---
*Quick task: 260803-tdb*
*Completed: 2026-08-03*

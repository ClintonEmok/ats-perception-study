---
phase: quick
plan: 260803-qm2
subsystem: dashboard-demo
tags: [stkde, applied-slices, case-studies, source-ids, zustand, nextjs]
requires:
  - phase: 260803-imh
    provides: server-authoritative dashboard STKDE response and canonical source-slice projection
provides:
  - source-ID-safe dashboard per-slice event accounting
  - shared standalone/dashboard case-study definitions and deterministic ten-slice ranges
  - visible dashboard case-study selector with atomic applied-stack replacement and synchronized time stores
affects: [dashboard-demo, stkde-3d, future-dashboard-screenshot-workflows]
tech-stack:
  added: []
  patterns: [nullable-server-metadata, shared-case-study-source, action-bag-store-synchronization]
key-files:
  created:
    - src/components/dashboard-demo/lib/stkde-slice-accounting.ts
    - src/components/dashboard-demo/lib/stkde-slice-accounting.test.ts
    - src/lib/demo/case-study-presets.ts
    - src/lib/demo/case-study-presets.test.ts
    - src/components/dashboard-demo/lib/applyDashboardCaseStudy.ts
    - src/components/dashboard-demo/lib/applyDashboardCaseStudy.test.ts
  modified:
    - src/components/dashboard-demo/lib/useDemoStkde.ts
    - src/components/dashboard-demo/Demo3dSpatialView.tsx
    - src/components/dashboard-demo/DemoInspectPanel.tsx
    - src/components/dashboard-demo/StkdeAnalysisPanel.tsx
    - src/app/stkde-3d/components/Stkde3DSceneProvider.tsx
    - src/app/stkde-3d/components/StkdeSliceStack.tsx
    - src/app/stkde-3d/components/SliceInspector.tsx
    - src/app/stkde-3d/page.tsx
    - src/components/dashboard-demo/DemoPresetSelect.tsx
    - src/components/dashboard-demo/DashboardDemoShell.tsx
    - src/app/dashboard-demo/page.shell.test.tsx
key-decisions:
  - "Dashboard slice event counts resolve only through response.sliceResults[sourceSliceId]; missing keys remain null/unknown while a server zero remains zero."
  - "The shared case-study module owns definitions, UTC boundaries, normalized conversion, and deterministic range construction, but imports no standalone loader or KDE code."
  - "Case-study selection replaces the canonical generated-applied stack through replaceSlicesFromBins, clears pending drafts and comparison IDs, and synchronizes all dashboard time/scope surfaces."
patterns-established:
  - "Use nullable explicit server metadata when a renderer needs a numeric fallback but the UI must distinguish unavailable from zero."
  - "Keep protocol presets and screenshot case studies in separate selector groups while routing both through pure action-bag helpers."
requirements-completed: []
coverage:
  - id: D1
    description: "Dashboard STKDE requests and renders per-slice counts by canonical source ID without treating missing results as zero."
    verification:
      - kind: unit
        ref: "src/components/dashboard-demo/lib/stkde-slice-accounting.test.ts"
        status: pass
      - kind: integration
        ref: "src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts"
        status: pass
      - kind: automated_ui
        ref: "agent-browser dashboard-demo smoke: server request contained 10 slice descriptors and inspector displayed a keyed event count"
        status: pass
    human_judgment: false
  - id: D2
    description: "Standalone and dashboard routes consume one canonical set of four case-study ranges and adaptive screenshot mode."
    verification:
      - kind: unit
        ref: "src/lib/demo/case-study-presets.test.ts"
        status: pass
      - kind: unit
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Selecting a case study visibly replaces the dashboard stack with ten applied slices and enters 3D Inspect mode while preserving protocol presets."
    verification:
      - kind: unit
        ref: "src/components/dashboard-demo/lib/applyDashboardCaseStudy.test.ts"
        status: pass
      - kind: automated_ui
        ref: "agent-browser dashboard-demo smoke: Full, Fourth of July, Spring Break, and New Year's each showed a 10-slice scrubber with no horizontal overflow"
        status: pass
    human_judgment: false
# Metrics
duration: 35m
completed: 2026-08-03
status: complete
---

# Quick Task 260803-qm2 Summary

**Server-keyed dashboard STKDE accounting plus shared adaptive case-study presets that replace the applied stack with ten screenshot-ready intervals.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-03T17:22:48Z
- **Completed:** 2026-08-03T17:57:39Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Added source-ID-safe event accounting that distinguishes a keyed server zero from an absent `sliceResults` entry, and threaded that nullable value through dashboard 3D and Inspect surfaces.
- Centralized Full, Fourth of July, Spring Break, and New Year's definitions with exact UTC ranges, adaptive screenshot mode, normalized conversion, and deterministic contiguous ten-slice construction.
- Added a visible Case studies selector beside the existing protocol presets; selection synchronizes epoch/normalized ranges, both scale stores, applied-slices STKDE scope, pending drafts, comparison state, and the canonical generated-applied slice stack.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make dashboard STKDE per-slice accounting source-ID-safe and applied-slices-only** — `cf6dbff`
2. **Task 2: Extract shared case-study definitions and preserve standalone behavior** — `bd21fea`
3. **Task 3: Add the first-class dashboard case-study selector and replace/synchronize the applied stack** — `84bfc48`

## Verification

- Focused final Vitest run: **PASS — 38 tests** across accounting, request descriptors, shared case studies, standalone route contracts, case-study application, protocol preset compatibility, and dashboard shell contracts.
- Targeted ESLint with `--max-warnings 0`: **PASS** for all task files.
- `pnpm typecheck`: **PASS**.
- `pnpm build`: **PASS** — production build completed and `/dashboard-demo` and `/stkde-3d` routes compiled.
- Browser smoke at 1920×1080 on `/dashboard-demo`: **PASS** after dismissing the existing onboarding overlay. Full, Fourth of July, Spring Break, and New Year's selections each showed a ten-slice scrubber, switched to 3D/Inspect, retained no horizontal overflow, and displayed keyed server event counts. The Fourth of July request was inspected directly and contained exactly ten canonical `filters.slices` descriptors. The STKDE rail showed `Applied slices only` and no `Full viewport` control.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended the shared STKDE stack slice type for nullable dashboard server counts**

- **Found during:** Task 1
- **Issue:** The first typecheck correctly rejected `serverEventCount` in `StkdeSliceStack` because its local prop type duplicated the scene slice identity shape.
- **Fix:** Reused `Stkde3DSceneSlice` for stack props and retained the new nullable field in the shared provider type.
- **Files modified:** `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx`, `src/app/stkde-3d/components/StkdeSliceStack.tsx`
- **Verification:** Targeted ESLint and `pnpm typecheck` passed.
- **Committed in:** `cf6dbff`

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Necessary type alignment only; no dependencies, routes, workers, standalone loader, or client-side KDE paths were added.

## Issues Encountered

- A second dev server could not start on port 3001 because an existing Next dev process already owned the project lock on port 3000. Browser smoke used that existing same-worktree server; no product blocker remained.
- The full-suite stale source-contract failures documented in `STATE.md` were not rerun or changed because they are unrelated to this quick task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Dashboard-demo now has a single server-authoritative applied-slices workflow with screenshot-ready case-study ranges. The existing standalone `/stkde-3d` loader/KDE behavior and protocol task presets remain intact. Future work can use the shared case-study source without duplicating date tables.

---
*Quick task: 260803-qm2*
*Completed: 2026-08-03*

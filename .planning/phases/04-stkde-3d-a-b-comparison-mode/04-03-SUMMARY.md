---
phase: 04-stkde-3d-a-b-comparison-mode
plan: 03
subsystem: ui
tags: [nextjs, react, typescript, react-three-fiber, drei, stkde, comparison, cameras, vitest]

# Dependency graph
requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Temporary A/B source references, source-aware context resolution, complete raw KDE fields, and shared absolute-domain helpers from Plans 04-01 and 04-02.
provides:
  - Source-correct focused event, surface, and full-source trajectory rendering for compact A/B panes.
  - A vertically stacked absolute comparison stage with one shared MapLibre capture, shared KDE domain, metadata markers, and explicit pane heights.
  - Imperative two-way CameraControls linking with unlink preservation, relink snap-to-A, reduced-motion-aware reset, and pure tests.
affects: [04-04-signed-difference-presets, 04-05-ui-hardening, phase-05-cube-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Focused panes use compact render coordinates only for geometry while sourceSliceId/sourceSliceIndex and epoch metadata remain authoritative for data and interaction callbacks.
    - Comparison stages own one captured map texture and pass it to independent focused Canvas instances rather than mounting duplicate MapLibre owners.
    - Camera pose synchronization stays imperative through CameraControls refs and a guarded controller; pose changes never enter React render state.

key-files:
  created:
    - src/app/stkde-3d/components/StkdeComparisonStage.tsx
    - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
    - src/app/stkde-3d/lib/comparison-camera.ts
    - src/app/stkde-3d/lib/comparison-camera.test.ts
  modified:
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/page.stkde.test.ts
    - src/app/stkde-3d/components/Stkde3DScene.tsx
    - src/app/stkde-3d/components/StkdeSliceStack.tsx
    - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
    - src/app/stkde-3d/components/StkdeIntensityLegend.tsx
    - src/app/stkde-3d/lib/raw-events.ts

key-decisions:
  - "Absolute comparison uses two independent focused Canvas viewports in a vertical rail, while one stage-owned MapLibre capture and one absolute domain keep the analytical context matched."
  - "Focused rendering may remap the local surface index to zero, but events, trajectories, hover/select payloads, DOM markers, and epoch placement resolve through the original source slice identity."
  - "Camera linking is implemented as an imperative guarded pose controller: updates propagate with transition disabled, re-linking snaps B to A, and reset applies the shared front-oblique pose to both panes."

patterns-established:
  - "Pass selected source data and full trajectory source data as separate props to focused scene layers."
  - "Give every comparison pane a stable interval-slot/source-id marker and a real fixed/minimum height so R3F receives a sized parent."

requirements-completed: [BURST-06]

coverage:
  - id: D1
    description: "Focused A/B surfaces and active events resolve the selected original source slice, while trajectory snapshots retain source IDs, source indexes, and epoch placement."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-source-context.test.ts"
        status: pass
      - kind: unit
        ref: "src/app/stkde-3d/lib/raw-events.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Absolute comparison renders A above B with one stage-owned map capture, shared raw KDE domain, exact source metadata, and responsive fixed-height panes."
    requirement: "BURST-06"
    verification:
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: true
    rationale: "Source-contract/build checks prove the stage wiring and markers, but final WebGL composition and breakpoint spacing still need browser screenshot review."
  - id: D3
    description: "Linked absolute cameras synchronize both directions, suppress feedback loops, preserve independent poses, snap B to A on relink, and reset to the front-oblique pose."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-camera.test.ts"
        status: pass
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
    human_judgment: true
    rationale: "Pure controller tests cover pose policy; real pointer rotation, pan, zoom, and reduced-motion behavior require a browser/WebGL session."

# Metrics
duration: 6h 45m
completed: 2026-08-02
status: complete
---

# Phase 4 Plan 3: Vertical Absolute Comparison Panes Summary

**Matched top-and-bottom STKDE absolute panes now share one map/domain context, preserve original source identity through focused remapping, and synchronize CameraControls imperatively.**

## Performance

- **Duration:** 6h 45m
- **Started:** 2026-08-02T00:08:01Z
- **Completed:** 2026-08-02T06:53:09Z
- **Tasks:** 3 completed
- **Files modified:** 11 relevant source/test files plus this summary

## Accomplishments

- Preserved source-aware event and trajectory context in compact focused scenes; full-source trajectories now retain original IDs, indexes, and epoch/Y placement instead of disappearing in focus mode.
- Added the vertical A-over-B absolute comparison stage and reusable focused viewport with one shared MapLibre texture, shared raw KDE absolute domain, exact metadata markers, a shared legend, and responsive fixed-height layout while leaving the default stack path intact.
- Added linked/independent/reset camera behavior using current Drei CameraControls APIs, guarded imperative pose propagation, relink snap-to-A, and targeted controller coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply source-aware context to focused scene overlays** - `38c903f` (feat)
2. **Task 2: Build the vertical absolute comparison stage with source-correct overlays** - `ae4ac0d` (feat)
3. **Task 3: Implement linked, independent, and reset camera behavior** - `1719e86` (feat)

Additional correctness commits:

- `07d592d` (fix): keep the comparison stage vertically scrollable below the desktop frame.
- `024f228` (fix): remove render-time ref access and stabilize focused scene/route callbacks for lint-clean camera wiring.

## Files Created/Modified

- `src/app/stkde-3d/components/StkdeComparisonStage.tsx` - Owns the one-map, two-row absolute comparison rail, shared domain/legend, metadata markers, and camera controller wiring.
- `src/app/stkde-3d/components/StkdeComparisonViewport.tsx` - Resolves selected source context and renders one focused A or B Canvas with source-correct events and full trajectories.
- `src/app/stkde-3d/lib/comparison-camera.ts` - Defines serializable poses and guarded bidirectional CameraControls synchronization.
- `src/app/stkde-3d/lib/comparison-camera.test.ts` - Covers linking, feedback suppression, unlinking, relinking, defaults, and reset behavior.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` - Supports externally owned map textures, focused source event context, full-source trajectory context, shared fields, and pane camera refs.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` - Converts raw fields into shared-domain display cells for focused absolute panes.
- `src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx` - Renders full-source trajectories in focused panes and emits original source metadata.
- `src/app/stkde-3d/lib/raw-events.ts` - Adds source-aware event-group resolution.
- `src/app/stkde-3d/page.tsx` - Switches only completed pairs into the comparison stage and preserves stack/selection flow.
- `src/app/stkde-3d/page.stkde.test.ts` - Locks stage, viewport, source, and camera contracts.

## Decisions Made

- The comparison stage owns one map capture and shares the resulting texture across two independent Canvas instances; no second full stack or additive A+B geometry is mounted.
- Source identity is authoritative over compact render indexes. Focused local index `0` is never used to select events or trajectory results.
- Camera pose is mutable controller/ref state rather than React state, with immediate propagation and explicit relink/reset semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired the new comparison stage into the route**

- **Found during:** Task 2 (Build the vertical absolute comparison stage with source-correct overlays)
- **Issue:** The stage/viewport artifacts could not satisfy the completed-pair behavior without replacing the existing page scene when comparison mode became absolute; `page.tsx` was omitted from the task file list despite being named by the plan's key link.
- **Fix:** Added a route-local completed-pair branch that renders the stage and keeps selecting/default stack paths unchanged.
- **Files modified:** `src/app/stkde-3d/page.tsx`, `src/app/stkde-3d/page.stkde.test.ts`
- **Verification:** Targeted route tests, typecheck, and production build pass.
- **Committed in:** `ae4ac0d`

**2. [Rule 3 - Blocking] Removed render-time camera ref access**

- **Found during:** Task 3 verification
- **Issue:** The React hooks lint rule rejected constructing the camera controller by reading CameraControls refs during render.
- **Fix:** Create the controller in an effect after refs are mounted, then keep pose propagation in event callbacks; stabilized the route surface callback as a `useCallback`.
- **Files modified:** `src/app/stkde-3d/components/StkdeComparisonStage.tsx`, `src/app/stkde-3d/components/Stkde3DScene.tsx`, `src/app/stkde-3d/page.tsx`
- **Verification:** Targeted lint has no issues, full lint has 0 errors, typecheck and build pass.
- **Committed in:** `024f228`

**3. [Rule 3 - Blocking] Preserved vertical usability below the desktop frame**

- **Found during:** Task 3 responsive layout review
- **Issue:** The existing page-level `overflow-hidden` could clip the fixed-height two-row comparison rail on narrower layouts.
- **Fix:** Changed the route shell to protect horizontal overflow while allowing the required vertical page scroll.
- **Files modified:** `src/app/stkde-3d/page.tsx`
- **Verification:** Route tests, typecheck, and production build pass.
- **Committed in:** `07d592d`

---

**Total deviations:** 3 auto-fixed (3 blocking). **Impact on plan:** All fixes were required to make the planned stage reachable, lint-safe, and usable at the specified responsive heights; no new API, store, or architectural data model was introduced.

## Issues Encountered

- Full lint passes with 0 errors and 97 pre-existing warnings outside this plan.
- The targeted Phase 4 suite passes 28 tests. The repository's known unrelated full-suite stale source-contract failures remain documented in `STATE.md` and the implemented baseline.
- No new package, API route, Zustand comparison store, or difference scene was added; signed difference remains the next plan's responsibility.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-04 can consume the reusable stage/viewport, shared absolute field context, and source-aware trajectory boundary to add the separate signed difference view, exact-pair presets, and invalidation wiring.
- Browser/WebGL review remains useful for the fixed-height A-over-B composition and live camera rotation/pan/zoom synchronization; pure tests cover the controller policy.

## Self-Check: PASSED

---
*Phase: 04-stkde-3d-a-b-comparison-mode*
*Completed: 2026-08-02*

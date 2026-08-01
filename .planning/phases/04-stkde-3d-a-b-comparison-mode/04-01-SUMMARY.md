---
phase: 04-stkde-3d-a-b-comparison-mode
plan: 01
subsystem: ui
tags: [nextjs, react, typescript, stkde, comparison, accessibility, vitest]

# Dependency graph
requires:
  - phase: 03-cluster-evolution
    provides: Existing standalone STKDE-3D rendered slices, KDE groups, hotspot context, and source-slice identity.
provides:
  - Route-local temporary A/B selection state machine with duplicate guards, reset, invalidation, and mode transitions.
  - Keyboard-accessible comparison rail and interval picker over the existing rendered slice stack.
  - Source-aware surface selection runtime branch and deterministic context resolver for future focused comparison panes.
affects: [04-02-raw-kde-comparison-math, 04-03-vertical-absolute-panes, 04-04-signed-difference-presets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Route-local derived comparison state remains null until explicit Compare entry and never enters Zustand or the persistent slice domain.
    - Source slice identity travels with rendered interaction payloads; compact local indices never replace the original source index.
    - Selecting-mode runtime callbacks suppress focus, resize, active-index, and playback side effects while ordinary stack mode retains existing behavior.

key-files:
  created:
    - src/app/stkde-3d/lib/comparison.ts
    - src/app/stkde-3d/lib/comparison.test.ts
    - src/app/stkde-3d/components/StkdeComparisonControls.tsx
    - src/app/stkde-3d/lib/comparison-source-context.ts
    - src/app/stkde-3d/lib/comparison-source-context.test.ts
  modified:
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/components/Stkde3DScene.tsx
    - src/app/stkde-3d/components/StkdeSliceStack.tsx
    - src/app/stkde-3d/components/Stkde3DSceneProvider.tsx
    - src/app/stkde-3d/page.stkde.test.ts

key-decisions:
  - "Comparison state is route-local and temporary; the default route keeps comparison null and the existing ten-slice stack authoritative."
  - "A/B identity uses sourceSliceId with original sourceSliceIndex/index fallback, preserving metadata through compact focused remapping."
  - "Back to stack clears comparison and explicitly forces full-stack mode while preserving dataset and shared analysis settings."

patterns-established:
  - "Comparison status keys map to the locked UI copy and are exposed through an aria-live region."
  - "The source-context resolver returns selected event/KDE groups alongside complete source slices/results reserved for trajectory rendering."

requirements-completed: [BURST-06]

coverage:
  - id: D1
    description: "Temporary A/B state transitions cover entry, A-to-B advance, duplicate rejection, completed-pair locking, reset, invalidation, exit, and difference mode."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Accessible comparison rail exposes Compare intervals, A/B metadata, exact selection prompts, keyboard interval buttons, reset, Back to stack, partial states, and exit announcements."
    requirement: "BURST-06"
    verification:
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: true
    rationale: "The plan's source-contract and type checks prove the accessible control path exists, but real keyboard and screen-reader behavior still benefits from browser UAT."
  - id: D3
    description: "Rendered surface callbacks preserve source identity and resolve selected event/KDE groups without losing the complete trajectory source context."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-source-context.test.ts"
        status: pass
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-08-01
status: complete
---

# Phase 4 Plan 1: Temporary STKDE-3D A/B Selection Tracer Summary

**Route-local A/B interval selection over the existing ten-slice STKDE stack, with accessible controls and source-safe interaction context for the comparison renderers that follow.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-01T23:31:36Z
- **Completed:** 2026-08-01T23:42:34Z
- **Tasks:** 3 completed
- **Files modified:** 10 relevant source/test files plus this summary

## Accomplishments

- Added a pure temporary comparison state machine that auto-advances from A to B, rejects duplicate references, locks completed pairs, supports reset/invalidation, and preserves exact interval metadata.
- Added an accessible comparison rail with keyboard interval buttons, A/B metadata cards, live status copy, zero/one/partial states, `Reset comparison`, `Back to stack`, and explicit full-stack lifecycle behavior.
- Routed selecting-mode WebGL surface clicks through source-aware callbacks without changing ordinary stack focus, active-index, playback, or resize behavior; added deterministic event/KDE/trajectory context resolution.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the temporary comparison state machine** - `4afd033` (feat)
2. **Task 2: Add the accessible selection rail and explicit full-stack lifecycle** - `50bc1ed` (feat)
3. **Task 3: Route stack surface clicks into A/B selection and preserve source context** - `fe4cf1b` (feat)

Additional correctness fix:

- `05ab3a5` (fix): preserve an `aria-live` announcement after `Back to stack` clears the temporary comparison state.

## Files Created/Modified

- `src/app/stkde-3d/lib/comparison.ts` - Typed route-local comparison state transitions and locked status copy.
- `src/app/stkde-3d/lib/comparison.test.ts` - State-machine lifecycle coverage.
- `src/app/stkde-3d/components/StkdeComparisonControls.tsx` - Accessible comparison entry, picker, metadata, status, reset, and exit controls.
- `src/app/stkde-3d/lib/comparison-source-context.ts` - Source identity and selected/full analytical context resolver.
- `src/app/stkde-3d/lib/comparison-source-context.test.ts` - Compact-index, event/KDE, fallback, and context preservation coverage.
- `src/app/stkde-3d/page.tsx` - Comparison lifecycle and runtime wiring.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` - Comparison selection props and source-safe scene forwarding.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` - Selecting-mode callback branch, source index payloads, and selected-surface emphasis.
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx` - Comparison interaction runtime contract.
- `src/app/stkde-3d/page.stkde.test.ts` - Source-contract assertions for comparison labels, handlers, identity, and store boundaries.

## Decisions Made

- Comparison references remain temporary route state and are not added to Zustand, the persistent slice domain, or any API path.
- `sourceSliceId` is primary identity, with original source index fallback for absent IDs and compact focused render indices.
- Compare entry and Back to stack both explicitly force `isFocusedView=false`; Back to stack clears only comparison references and retains all dataset/analysis settings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Completed source payload typing after adding original source indexes**

- **Found during:** Task 3 (Route stack surface clicks into A/B selection and preserve source context)
- **Issue:** The stack's local slice prop type did not expose the new `sourceSliceIndex` field, blocking typecheck.
- **Fix:** Extended the stack slice type and retained the original source index through hover and select payloads.
- **Files modified:** `src/app/stkde-3d/components/StkdeSliceStack.tsx`
- **Verification:** Targeted Vitest suite and `pnpm typecheck` pass.
- **Committed in:** `fe4cf1b`

**2. [Rule 2 - Missing Critical] Preserved an exit announcement after unmounting comparison controls**

- **Found during:** Final verification of Task 2 lifecycle behavior
- **Issue:** Clearing comparison on Back to stack would otherwise remove the only live region before announcing the exit state.
- **Fix:** Added route-local announcement state rendered by the comparison rail after temporary references are cleared.
- **Files modified:** `src/app/stkde-3d/page.tsx`, `src/app/stkde-3d/components/StkdeComparisonControls.tsx`
- **Verification:** Targeted Vitest suite and `pnpm typecheck` pass.
- **Committed in:** `05ab3a5`

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2). **Impact:** Both fixes were required for source-safe type correctness and the locked accessibility lifecycle; no scope creep.

## Issues Encountered

- ESLint completed with 0 errors and 99 pre-existing warnings across the repository.
- Production build completed successfully. The known unrelated full-suite stale source-contract failures from the project baseline were not changed by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-02 can consume the stable route-local A/B references and source context to preserve raw KDE fields and compute shared/signed comparison math.
- Browser UAT should verify actual WebGL surface selection, keyboard picker behavior, and the selected-surface accent ring before the paired viewport work lands.

## Self-Check: PASSED

---
*Phase: 04-stkde-3d-a-b-comparison-mode*
*Completed: 2026-08-01*

---
phase: 04-stkde-3d-a-b-comparison-mode
plan: 04
subsystem: ui
tags: [nextjs, react, typescript, stkde, kde, comparison, presets, vitest]

# Dependency graph
requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Temporary A/B references, raw KDE fields, matched absolute panes, shared map capture, and linked camera behavior from Plans 04-01 through 04-03.
provides:
  - Dedicated top-down signed KDE(A)-KDE(B) heatmap-only comparison scene with red-neutral-blue legend semantics.
  - Exact built-in full and Fourth of July comparison presets with deterministic fixture validation and runtime interval resolution.
  - Dataset invalidation and pending preset application that preserve valid A/B references across shared analytical setting changes.
affects: [04-05-ui-hardening, phase-05-cube-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Declarative preset identity stores dataset, zero-based indices, and expected labels; runtime resolution copies epoch bounds and source IDs from rendered surfaces.
    - Difference mode owns one orthographic heatmap scene and never reuses temporal or additive overlay layers.
    - Preset loading is a route-local pending transaction; case-study replacement invalidates temporary references while shared settings recompute the existing pair.

key-files:
  created:
    - src/app/stkde-3d/lib/comparison-presets.ts
    - src/app/stkde-3d/lib/comparison-presets.test.ts
    - src/app/stkde-3d/lib/comparison-fixtures.ts
    - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
    - src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx
  modified:
    - src/app/stkde-3d/components/StkdeComparisonStage.tsx
    - src/app/stkde-3d/components/StkdeComparisonControls.tsx
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/page.stkde.test.ts

key-decisions:
  - "Preset catalog entries remain timestamp-free and resolve actual start/end epochs and sourceSliceIds only after the selected dataset has produced rendered surfaces."
  - "A-B is rendered as one orthographic spatial field using complete raw KDE grids, with zero centered in a dedicated red-neutral-blue palette and no temporal/additive overlays."
  - "Case-study replacement clears temporary comparison state immediately; KDE, adaptive-time, renderer, opacity, matching, and inspector changes keep the same A/B identity and recompute shared results."

patterns-established:
  - "Exact preset mismatch throws a typed resolution error and surfaces the locked comparison error copy rather than selecting a nearby interval."
  - "Difference controls redundantly expose sign meaning through text, legend labels, and heatmap-only helper copy instead of color alone."

requirements-completed: [BURST-06]

coverage:
  - id: D1
    description: "The code-defined catalog contains exactly full-slice-02-vs-08 and fourth-of-july-slice-03-vs-09, and strict resolution validates deterministic fixture indices, labels, source identity, and runtime epochs."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-presets.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "A-B replaces the absolute panes with one top-down signed KDE field, symmetric domain, accessible red-neutral-blue legend, and explicit heatmap-only layer discipline."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-difference.test.ts"
        status: pass
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: true
    rationale: "The pure field and source-contract/build checks prove the implementation boundaries; actual WebGL top-down framing and visual legend composition still warrant browser review."
  - id: D3
    description: "Preset application waits for the selected dataset and rendered KDE results, invalidates stale A/B references on case-study changes, and preserves the pair through ordinary shared-setting recomputation."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison.test.ts"
        status: pass
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: true
    rationale: "The route source contract proves one range-fetch lifecycle and the state wiring; asynchronous replacement and shared-control behavior should still be exercised in browser UAT."

# Metrics
duration: 13min
completed: 2026-08-02
status: complete
---

# Phase 4 Plan 4: Signed Difference and Exact Preset Summary

**A single raw-field top-down KDE(A)-KDE(B) view with explicit sign semantics, exact-index reproducible presets, and safe dataset lifecycle invalidation.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-02T07:00:20Z
- **Completed:** 2026-08-02T07:13:55Z
- **Tasks:** 3 completed
- **Files modified:** 9 relevant source/test files

## Accomplishments

- Added the exact two-entry comparison preset catalog, deterministic 0/1/2/10-slice fixture, strict dataset/index/label/source resolver, and runtime epoch metadata propagation.
- Added one orthographic signed difference scene and accessible red-neutral-blue legend; difference mode omits slices, events, trajectories, burst volumes, adaptive axis, and additive geometry while preserving A/B metadata.
- Wired preset loading, visible resolution errors, case-study invalidation, exact mode/layer settings, and shared-setting recomputation through the existing single dataset request lifecycle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define and strictly resolve the concrete built-in preset catalog** - `432197b` (feat)
2. **Task 2: Render the signed heatmap-only difference mode** - `2c3b399` (feat)
3. **Task 3: Wire preset application, invalidation, and shared-setting recomputation** - `ec19069` (feat)

**Plan metadata:** `9e46c84` (docs: complete signed difference comparison plan)

## Files Created/Modified

- `src/app/stkde-3d/lib/comparison-presets.ts` - Exact catalog, typed resolution errors, and runtime metadata resolver.
- `src/app/stkde-3d/lib/comparison-fixtures.ts` - Deterministic rendered-slice fixture for catalog tests.
- `src/app/stkde-3d/lib/comparison-presets.test.ts` - Catalog, fixture, runtime-bound, and mismatch coverage.
- `src/app/stkde-3d/components/StkdeDifferenceScene.tsx` - Single signed top-down field with raw-grid subtraction and map context.
- `src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx` - Text-redundant signed legend and semantic labels.
- `src/app/stkde-3d/components/StkdeComparisonStage.tsx` - Absolute/difference branch, metadata, mode tabs, and legend integration.
- `src/app/stkde-3d/components/StkdeComparisonControls.tsx` - Preset selector, exact pair labels, mode controls, and error/reset UI.
- `src/app/stkde-3d/page.tsx` - Pending preset transaction, dataset invalidation, layer gating, and shared-setting propagation.
- `src/app/stkde-3d/page.stkde.test.ts` - Difference-layer, preset lifecycle, and single-fetch source contracts.

## Decisions Made

- Kept production preset definitions free of guessed quantile-derived epoch literals; only actual `sceneSlices` provide interval bounds.
- Used the existing raw KDE comparison helper and a separate signed palette so absolute sequential rendering remains unchanged.
- Preserved route-local temporary state and the existing `/api/crimes/range` lifecycle; no duplicate slices, stores, or comparison endpoint were introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored type-safe completed-comparison narrowing**

- **Found during:** Task 1 (Define and strictly resolve the concrete built-in preset catalog)
- **Issue:** The new difference-capable comparison branch widened the state mode and TypeScript no longer narrowed `comparison` from a derived boolean before stage props were read.
- **Fix:** Replaced the derived boolean guard with an inline state/mode/selection narrowing expression.
- **Files modified:** `src/app/stkde-3d/page.tsx`
- **Verification:** Preset tests and `pnpm typecheck` pass.
- **Committed in:** `432197b` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** Required for type-safe mode integration; no scope creep.

## Issues Encountered

- Full lint completed with 0 errors and 97 existing warnings outside this plan.
- Targeted Phase 4 tests, typecheck, and production build passed. The known unrelated full-suite stale visualization/showcase source-contract failures remain documented in `STATE.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 04-05 can harden loading/error/overflow states and perform browser/WebGL review of the exact presets, top-down signed field, disabled difference controls, and responsive comparison layout. No new backend or data setup is required.

---
*Phase: 04-stkde-3d-a-b-comparison-mode*
*Completed: 2026-08-02*

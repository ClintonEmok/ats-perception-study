---
phase: 04-stkde-3d-a-b-comparison-mode
plan: 05
subsystem: ui
tags: [nextjs, react, typescript, stkde, comparison, accessibility, responsive, vitest]

# Dependency graph
requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Temporary A/B selection, raw KDE fields, matched absolute panes, camera linking, signed difference mode, exact presets, and invalidation wiring from Plans 04-01 through 04-04.
provides:
  - Injectable single-loader lifecycle with explicit real-load failure, retry, empty, and labeled mock states.
  - Fetch-spy, route/source-contract, and deterministic 0/1/2/10-slice fixture coverage for comparison behavior and request reuse boundaries.
  - Stable DOM/accessibility markers, fixed-height responsive comparison layout, long-label handling, reduced-motion camera behavior, and browser-verified Phase 4 workflow.
affects: [phase-05-cube-integration, browser-uat, stkde-3d-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Route-local dataset loading is isolated in an injectable helper; only case-study changes and explicit retries enter the range-request lifecycle.
    - Comparison state and render readiness are exposed through stable data attributes and exact user-facing status copy, with keyboard controls remaining authoritative over WebGL selection.
    - Comparison panes retain fixed minimum heights, wrapped interval identity, and reduced-motion-safe camera transitions across responsive layouts.

key-files:
  created:
    - src/app/stkde-3d/lib/dataset-loader.ts
    - src/app/stkde-3d/lib/dataset-loader.test.ts
    - src/app/stkde-3d/comparison.integration.test.ts
  modified:
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/page.stkde.test.ts
    - src/app/stkde-3d/components/StkdeComparisonControls.tsx
    - src/app/stkde-3d/components/StkdeComparisonStage.tsx
    - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
    - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
    - src/app/stkde-3d/components/StkdeIntensityLegend.tsx
    - src/lib/kde/compute-slice-kde.ts
    - src/app/stkde-3d/lib/comparison-difference.test.ts

key-decisions:
  - "Real range-load failures remain visible at the route level; mock data is available only through explicit configuration and is labeled Using mock data."
  - "The range loader is the sole data-request path, while A/B selection and shared setting changes operate on the already loaded dataset."
  - "WebGL cannot prove all interaction semantics in Vitest, so stable DOM markers, keyboard picker controls, source contracts, fetch spies, and browser verification jointly cover the comparison flow."

patterns-established:
  - "Use data-comparison-stage, data-comparison-mode, data-render-status, data-selection-slot, data-interval-slot, data-source-slice-id, data-camera-linked, data-difference-field, and data-comparison-preset-id for observable comparison states."
  - "Use exact rendered interval identity and full accessible labels rather than truncated display labels for A/B references."

requirements-completed: [BURST-06]

coverage:
  - id: D1
    description: "One injectable cursor-paginated dataset lifecycle handles real data, retries, failures, empty results, and request reuse boundaries without duplicate range requests."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/dataset-loader.test.ts"
        status: pass
      - kind: integration
        ref: "src/app/stkde-3d/comparison.integration.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Comparison UI exposes stable state markers, exact loading/error/empty/mock copy, deterministic interval fixtures, accessible controls, fixed-height panes, long-label wrapping, and reduced-motion behavior."
    requirement: "BURST-06"
    verification:
      - kind: integration
        ref: "src/app/stkde-3d/comparison.integration.test.ts"
        status: pass
      - kind: other
        ref: "src/app/stkde-3d/page.stkde.test.ts"
        status: pass
      - kind: other
        ref: "pnpm lint"
        status: pass
    human_judgment: true
    rationale: "Responsive spacing, focus visibility, reduced-motion behavior, and readable WebGL parent sizing require browser observation in addition to source and type checks."
  - id: D3
    description: "Default stack, A/B selection, source-correct absolute panes, linked/unlinked cameras, signed difference, exact presets, invalidation, and request reuse were verified in a real browser."
    requirement: "BURST-06"
    verification:
      - kind: manual_procedural
        ref: "Browser UAT: http://localhost:3000/stkde-3d"
        status: pass
    human_judgment: true
    rationale: "WebGL camera interaction, visual heatmap composition, responsive behavior, and browser network counts cannot be fully asserted by jsdom/source tests."
  - id: D4
    description: "Raw KDE comparison remains valid when Float32 storage rounds the observed maximum metadata."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-difference.test.ts"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false

# Metrics
duration: 6h 1m
completed: 2026-08-02
status: complete
---

# Phase 4 Plan 5: UI Hardening, State Contracts, and Browser Verification Summary

**Injectable STKDE dataset loading, truthful error/mock states, stable comparison observability, responsive accessibility hardening, and browser-verified A/B comparison behavior.**

## Performance

- **Duration:** 6h 1m
- **Started:** 2026-08-02T07:22:39Z
- **Completed:** 2026-08-02T13:24:01Z
- **Tasks:** 3 completed
- **Files modified:** 12 relevant source/test files plus this summary

## Accomplishments

- Extracted the cursor-paginated `/api/crimes/range` loop into `loadStkde3dDataset(preset, fetchImpl)`, added fetch-spy coverage for pagination/failure/retry, and kept A/B/shared-setting changes off the route load lifecycle.
- Replaced silent live-to-mock substitution with explicit loading, empty, error, retry, and `Using mock data` states; added stable DOM markers and deterministic zero/one/two/ten-slice fixture coverage.
- Hardened the comparison rail and stage for accessible selection, exact interval identity, long labels, fixed 320px WebGL parents, narrow vertical layout, signed semantics, and reduced motion.
- Browser verification passed for the default stack, A-pending-B selection, source-correct absolute panes, linked/unlinked cameras, signed difference, exact presets, invalidation, request reuse, and stack restoration.
- Retained the Float32 raw KDE maximum correction from `07636920`, which removed the comparison-domain runtime failure observed during browser verification.

## Task Commits

Each production task was committed atomically:

1. **Task 1: Add route contracts and fetch-spy coverage for one dataset lifecycle** - `c7ae7be` (feat)
2. **Task 2: Harden UI-SPEC states, accessibility, responsive layout, and explicit error/retry behavior** - `e8b750f` (fix)
3. **Task 3: Verify the complete comparison flow and network reuse** - approved browser checkpoint (no code changes)

Additional correctness commit retained during browser verification:

- `07636920` (fix): align raw KDE maximum metadata with Float32 storage and add regression coverage.

## Files Created/Modified

- `src/app/stkde-3d/lib/dataset-loader.ts` - Injectable range/pagination loader and explicit configured mock loader.
- `src/app/stkde-3d/lib/dataset-loader.test.ts` - Fetch-spy pagination, failure, retry, and call-count tests.
- `src/app/stkde-3d/comparison.integration.test.ts` - Route/source/DOM contracts and deterministic fixture coverage.
- `src/app/stkde-3d/page.tsx` - Single load/retry lifecycle and loading/error/empty/mock stage states.
- `src/app/stkde-3d/components/StkdeComparisonControls.tsx` - Accessible status, retry, selection, preset, and difference controls.
- `src/app/stkde-3d/components/StkdeComparisonStage.tsx` - Stable readiness markers and responsive comparison chrome.
- `src/app/stkde-3d/components/StkdeComparisonViewport.tsx` - Fixed-height panes and wrapped full interval metadata.
- `src/app/stkde-3d/components/StkdeDifferenceScene.tsx` - Reduced-motion-safe signed field camera behavior.
- `src/app/stkde-3d/components/StkdeIntensityLegend.tsx` - Responsive expanded absolute legend.
- `src/lib/kde/compute-slice-kde.ts` - Float32-aligned raw maximum metadata.

## Decisions Made

- Real fetch failures are errors, not implicit mock-data fallbacks; mock data requires configuration and a visible warning.
- Dataset loading depends only on the selected case study and explicit retry token, preserving loaded data across comparison and shared analysis controls.
- Human browser verification is the final authority for WebGL composition, cameras, visual sign semantics, responsive pane sizing, and network request reuse.

## Deviations from Plan

None - the plan was executed as written. The additional `07636920` Float32 metadata fix was supplied during the browser verification interval, retained as a correctness improvement, and verified by the final targeted suite and build.

**Total deviations:** 0 executor deviations. **Impact:** No scope creep; the additional raw-field fix prevents valid Float32 fields from being rejected by comparison-domain validation.

## Issues Encountered

- The full `pnpm test -- --run` baseline still reports four unrelated stale source-contract failures in `CubeVisualization.stkde.test.ts`, `cube-store-overrides.phase1.test.ts`, `evolution-flow.phase4.test.tsx`, and `showcase.test.tsx`. The targeted Phase 4 suite passes independently.
- Full lint completes with 0 errors and existing repository warnings; no new Phase 4 lint errors remain.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 is ready to close and Phase 5 can proceed with shared-model cube integration. The standalone `/stkde-3d` comparison contract is covered by pure tests, route contracts, fetch-spy request boundaries, and approved browser UAT. The four unrelated full-suite source-contract failures remain separate maintenance work.

---
*Phase: 04-stkde-3d-a-b-comparison-mode*
*Completed: 2026-08-02*

---
phase: 04-stkde-3d-a-b-comparison-mode
plan: 02
subsystem: analytics
tags: [typescript, kde, stkde, comparison, vitest, color-scale]

# Dependency graph
requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Temporary route-local A/B selection references and source-slice identity from Plan 04-01.
provides:
  - Complete raw KDE fields retained beside backward-compatible sparse display cells.
  - Public `@/lib/kde` KdeField export and tested barrel contract.
  - Shared absolute domain, raw signed KDE(A)-KDE(B) subtraction, and deterministic invalid-input handling.
  - Dedicated red-neutral-blue signed palette and semantic legend labels.
affects: [04-03-vertical-absolute-panes, 04-04-signed-difference-presets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Complete row-major Float32Array analytical fields remain separate from thresholded display-cell projections.
    - Comparison math validates aligned field metadata and uses stable positive fallback domains for zero data.
    - Signed color semantics are centralized in a palette separate from sequential absolute renderers.

key-files:
  created:
    - src/lib/kde/compute-slice-kde.test.ts
    - src/lib/kde/index.test.ts
    - src/app/stkde-3d/lib/comparison-difference.ts
    - src/app/stkde-3d/lib/comparison-difference.test.ts
    - src/app/stkde-3d/lib/palette.test.ts
  modified:
    - src/lib/kde/types.ts
    - src/lib/kde/index.ts
    - src/lib/kde/compute-slice-kde.ts
    - src/app/stkde-3d/lib/palette.ts

key-decisions:
  - "The raw field preserves actual KDE maxima, values, support, and grid metadata while the existing result max and sparse cells retain their prior display behavior."
  - "Missing, malformed, or misaligned fields throw typed KdeComparisonError values instead of silently rendering neutral comparison output."
  - "Signed palette input is normalized to [-1, 1], with blue for B-dominant values, neutral at zero, and red for A-dominant values; sequential palettes remain unchanged."

patterns-established:
  - "Import comparison field types through the public @/lib/kde barrel rather than private KDE modules."
  - "Use raw Float32Array subtraction for signed comparisons; only convert to sparse cells at the final display boundary."

requirements-completed: [BURST-06]

coverage:
  - id: D1
    description: "The KDE pipeline exposes complete raw values/support metadata through SliceKdeResult and the public @/lib/kde barrel without changing sparse display cells."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/lib/kde/compute-slice-kde.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/kde/index.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shared absolute and symmetric signed comparison helpers subtract aligned raw fields, preserve below-threshold values, and reject invalid inputs deterministically."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/comparison-difference.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A dedicated red-neutral-blue signed palette maps B-dominant, neutral, and A-dominant values with reusable gradient and semantic-label helpers while preserving sequential helpers."
    requirement: "BURST-06"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/lib/palette.test.ts"
        status: pass
      - kind: other
        ref: "pnpm lint"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-08-01
status: complete
---

# Phase 4 Plan 2: Raw KDE Comparison Math and Signed Palette Summary

**Complete raw KDE fields, shared absolute scaling, truthful signed KDE subtraction, and a dedicated red-neutral-blue palette for the Phase 4 comparison views.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-01T23:43:00Z
- **Completed:** 2026-08-01T23:54:25Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Added complete row-major raw KDE values and support grids to `SliceKdeResult` without changing thresholded sparse display-cell behavior or legacy result maxima.
- Exported `KdeField` from `@/lib/kde` and added barrel/computation tests for field completeness, ordering, coordinates, empty input, and display compatibility.
- Added validated shared-domain, raw signed subtraction, display conversion, stable zero-domain fallback, and typed missing/mismatch errors with targeted sign and threshold coverage.
- Added and tested the dedicated red-neutral-blue signed palette, gradient, semantic labels, safe clamping, and unchanged sequential helper path.

## Task Commits

Each task was committed atomically:

1. **Task 1: Preserve complete raw KDE fields and expose them through the public barrel** - `e0e6277` (feat)
2. **Task 2: Implement shared absolute and signed comparison math** - `61a9cfe` (feat)
3. **Task 3: Add and test the dedicated signed palette** - `0d820d8` (feat)

## Files Created/Modified

- `src/lib/kde/types.ts` - Defines complete `KdeField` metadata and adds it to `SliceKdeResult`.
- `src/lib/kde/index.ts` - Publicly exports `KdeField` with existing KDE APIs.
- `src/lib/kde/compute-slice-kde.ts` - Retains complete raw values/support arrays before display thresholding.
- `src/lib/kde/compute-slice-kde.test.ts` - Covers raw completeness, sparse threshold behavior, deterministic ordering, and empty fields.
- `src/lib/kde/index.test.ts` - Verifies public barrel import and field shape.
- `src/app/stkde-3d/lib/comparison-difference.ts` - Provides shared absolute conversion and aligned signed subtraction.
- `src/app/stkde-3d/lib/comparison-difference.test.ts` - Covers positive/negative/zero, thresholded, empty, identical, and invalid inputs.
- `src/app/stkde-3d/lib/palette.ts` - Adds the independent signed stop list, color helper, gradient, and semantic labels.
- `src/app/stkde-3d/lib/palette.test.ts` - Verifies signed endpoints, neutral mapping, clamping, gradient output, and sequential preservation.

## Decisions Made

- Raw analytical fields are the source for comparison; sparse normalized cells remain a display-only compatibility projection.
- The signed comparison contract fails visibly for missing or mismatched fields and uses a stable `1e-9` fallback only for valid all-zero domains.
- Signed palette semantics are centralized and never reinterpret the existing sequential absolute ramps.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact:** No scope change; existing uncommitted palette and unrelated workspace changes were preserved.

## Issues Encountered

- Initial local test fixtures exposed the expected sparse cutoff and Float32 precision behavior; assertions were corrected before the task commits. No production-code issue remained.
- Repository lint completed with 0 errors and 99 existing warnings outside this plan's scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-03 can consume `SliceKdeResult.field`, `computeSharedAbsoluteDomain`, `convertKdeFieldToDisplayCells`, and `computeSignedKdeDifference` for matched absolute panes and the later signed view.
- Existing sequential palette helpers remain available for absolute field/legacy renderers; signed labels and gradient are ready for the difference legend.
- Targeted tests, typecheck, and lint pass. Browser/WebGL camera and visual verification remain with the viewport/stage plans.

---
*Phase: 04-stkde-3d-a-b-comparison-mode*
*Completed: 2026-08-01*

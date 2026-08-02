---
id: 260802-compare-ux-feedback
status: complete
mode: quick
subsystem: ui
tags: [nextjs, react, typescript, stkde, kde, accessibility, vitest]

requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Temporary route-local A/B comparison state, exact presets, raw KDE fields, and the STKDE-3D route lifecycle
provides:
  - Nullable slot-first comparison selection with B-first assignment, replacement, duplicate guards, locking, reset, and invalidation
  - Source-safe matched 2D absolute KDE maps and a single signed A-B difference map with canonical spatial mapping
  - Accessible comparison rail and regression coverage for preserved standalone, preset, loader, and clutter-removal contracts
affects: [phase-05-cube-integration, stkde-3d, comparison UX]

tech-stack:
  added: []
  patterns: [route-local nullable A/B slot state, shared raw-field map rendering, display-only signed gamma contrast, native accessible control rail]

key-files:
  created:
    - src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
    - src/app/stkde-3d/lib/comparison-map.ts
    - src/app/stkde-3d/lib/comparison-map.test.ts
  modified:
    - src/app/stkde-3d/lib/comparison.ts
    - src/app/stkde-3d/lib/comparison.test.ts
    - src/app/stkde-3d/components/StkdeComparisonControls.tsx
    - src/app/stkde-3d/components/StkdeComparisonStage.tsx
    - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
    - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/page.stkde.test.ts
    - src/app/stkde-3d/comparison.integration.test.ts

key-decisions:
  - "Comparison entry is explicitly awaiting-slot with activeSlot null; reset and invalidation remain A-pending states."
  - "Stage resolves A and B through full source context before reading raw KDE fields, then shares one canonical map texture and absolute domain."
  - "Absolute and difference views are static 2D field maps; camera compatibility fields remain internal but no comparison camera path is rendered."
  - "Signed contrast is display-only: raw A-B values and symmetric domains remain unchanged while sign-preserving gamma improves low-value visibility."

patterns-established:
  - "Native slot buttons dispatch the route-owned activateComparisonSlot action; the native interval select is authoritative for keyboard assignment."
  - "Visible comparison cards expose only slot, full dates, counts, and state; source identity remains in payloads and stable DOM markers."

duration: 2h 32m
completed: 2026-08-02
---

# Quick Task: Phase 4 comparison UX feedback Summary

**Slot-first A/B comparison with source-safe matched 2D KDE maps, high-contrast signed difference rendering, and accessible regression coverage**

## Performance

- **Duration:** 2h 32m
- **Started:** 2026-08-02T14:25:00Z
- **Completed:** 2026-08-02T16:57:53Z
- **Tasks:** 3 completed
- **Source/test files changed:** 12 (within the approved 15-file scope)

## Accomplishments

- Added explicit nullable slot activation, B-first selection, partial replacement, duplicate rejection, ready locking, reset, invalidation, and polite live status messaging.
- Added canonical `[-50, 50]` field-map coordinates, row y-flip, shared raw absolute domains, and display-only sign-preserving gamma contrast.
- Replaced comparison camera/3D overlay presentation with two matched absolute 2D maps or one signed difference map, while preserving source identity, presets, loader lifecycle, and standalone stack behavior.
- Added route/source/DOM assertions for native controls, preset-ready `activeSlot: null`, map ordering, clutter removal, and request/preservation contracts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the explicit slot-first state machine and accessible rail** - `08a1a06` (`feat`)
2. **Task 2: Define the bounded source-safe field-map and signed-contrast math** - `0870e20` (`feat`)
3. **Task 3: Add route/DOM regression coverage and run the preserved workflow checks** - `403d3a0` (`feat`)

Follow-up atomic fixes:

- `8b439d2` - strict TypeScript-compatible preset-ready test assertion
- `85a9f14` - explicit slot prompt copy and status-region accessibility

## Files Created/Modified

- `src/app/stkde-3d/lib/comparison.ts` - nullable slot-first state transitions and status messages.
- `src/app/stkde-3d/components/StkdeComparisonControls.tsx` - native A/B controls, compact interval select, date/count-only cards, and live status.
- `src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx` - static raw-field map renderer with shared map context.
- `src/app/stkde-3d/lib/comparison-map.ts` - canonical cell, row, absolute, and signed display helpers.
- `src/app/stkde-3d/components/StkdeComparisonStage.tsx` - source-aware two-map/one-difference orchestration.
- `src/app/stkde-3d/components/StkdeComparisonViewport.tsx` - metadata-light map wrappers and stable markers.
- `src/app/stkde-3d/components/StkdeDifferenceScene.tsx` - camera-free signed-field wrapper.
- `src/app/stkde-3d/page.tsx` - route-owned slot activation and preset-ready nullable state wiring.
- `src/app/stkde-3d/lib/comparison.test.ts` - state transition coverage.
- `src/app/stkde-3d/lib/comparison-map.test.ts` - canonical mapping and gamma coverage.
- `src/app/stkde-3d/page.stkde.test.ts` - route/source/DOM regression contracts.
- `src/app/stkde-3d/comparison.integration.test.ts` - lifecycle and integration contracts.

## Decisions Made

- Keep comparison state temporary and route-owned; do not introduce a persistent store or new slice collection.
- Resolve raw KDE fields by source context rather than compact display indexes.
- Centralize coordinate orientation and signed display contrast in pure helpers.
- Keep the mode selector in the rail as the single authoritative mode control.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected a strict TypeScript test assertion**

- **Found during:** Task 3 quality gates
- **Issue:** `null as const` was rejected by the repository TypeScript version in the preset-ready compatibility test.
- **Fix:** Used inferred nullable object state without the invalid const assertion.
- **Files modified:** `src/app/stkde-3d/lib/comparison.test.ts`
- **Verification:** Targeted Vitest and `pnpm typecheck` pass.
- **Committed in:** `8b439d2`

**2. [Rule 2 - Missing Critical] Exposed the comparison live region as a status**

- **Found during:** Task 3 browser verification
- **Issue:** The polite announcement content had `aria-live` but was not exposed as a status landmark in the browser accessibility snapshot.
- **Fix:** Added `role="status"` and explicit A/B prompt copy while retaining the polite live region.
- **Files modified:** `src/app/stkde-3d/components/StkdeComparisonControls.tsx`
- **Verification:** Browser snapshots and DOM inspection showed the slot prompt/status; lint and targeted tests pass.
- **Committed in:** `85a9f14`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical accessibility exposure)
**Impact on plan:** Both fixes were small correctness/accessibility hardening changes within the approved source scope; no architectural or dependency changes were introduced.

## Issues Encountered

- An existing Next dev server occupied port 3000 during the first browser attempt; it was stopped and the verification server was restarted.
- The exact `USE_MOCK_DATA=true` browser command did not expose the non-public env variable to the client bundle, so it loaded the range API. The same verification was completed with the public client alias also set: `USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true`. No repository file was changed for this environment-only issue.
- The documented four unrelated full-suite stale source-contract failures remain outside this quick task and were not changed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The `/stkde-3d` comparison UX is ready for the planned Phase 5 shared-model refactoring. The comparison camera helper/test remains intentionally untouched as deferred compatibility code. Existing unrelated full-suite stale source-contract failures remain a baseline concern.

---
*Quick task: 260802-compare-ux-feedback*
*Completed: 2026-08-02*

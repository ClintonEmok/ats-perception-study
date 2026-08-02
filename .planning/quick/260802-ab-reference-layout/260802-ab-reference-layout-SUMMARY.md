---
id: 260802-ab-reference-layout
status: complete
mode: quick
subsystem: ui
tags: [nextjs, react, typescript, tailwind, stkde, kde, vitest, browser]

requires:
  - phase: 04-stkde-3d-a-b-comparison-mode
    provides: Source-safe A/B comparison state, raw KDE field maps, signed difference mode, and the STKDE-3D route lifecycle
provides:
  - Reference-aligned A/B comparison header with mode-specific right-side legends
  - Tall, full-width stacked absolute panels and a single signed difference panel
  - Responsive centered map framing and source/DOM regression contracts
affects: [phase-05-cube-integration, stkde-3d, comparison UX]

tech-stack:
  added: []
  patterns: [reference-led comparison chrome, responsive centered map frame, explicit signed legend semantics]

key-files:
  created: []
  modified:
    - src/app/stkde-3d/components/StkdeComparisonStage.tsx
    - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
    - src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
    - src/app/stkde-3d/components/StkdeIntensityLegend.tsx
    - src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx
    - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
    - src/app/stkde-3d/page.stkde.test.ts
    - src/app/stkde-3d/comparison.integration.test.ts

key-decisions:
  - "Keep the change presentation-only: raw KdeField resolution, shared domains, signed subtraction, loader lifecycle, and normal stack rendering remain untouched."
  - "Use a desktop two-column comparison header that stacks below sm, with the mode-specific legend retained as a substantial right-side card."
  - "Use a centered aspect-[16/7] map frame with explicit 20rem minimums so wide desktop maps remain readable without narrow viewport overflow."
  - "Render the signed legend with the exact uppercase B HIGHER, 0 / NO DIFFERENCE, and A HIGHER labels while retaining the existing palette helper."

patterns-established:
  - "Comparison panels expose stable A/B or signed-field markers while their visual framing remains independent of analytical field construction."
  - "Responsive comparison geometry uses min-w-0, w-full, and centered bounded frames instead of changing source identity or map data."

coverage:
  - id: D1
    description: "Reference comparison header, mode copy, and substantial absolute/signed legend cards"
    verification:
      - kind: unit
        ref: "src/app/stkde-3d/page.stkde.test.ts and comparison.integration.test.ts"
        status: pass
      - kind: automated_ui
        ref: "Browser screenshots: ab-absolute-desktop.png and ab-difference-desktop.png"
        status: pass
    human_judgment: true
    rationale: "The supplied reference hierarchy and visual readability require screenshot inspection in addition to source contracts."
  - id: D2
    description: "Exactly two ordered absolute maps or one signed difference map with source-safe analytical rendering"
    verification:
      - kind: unit
        ref: "pnpm exec vitest run src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/comparison.integration.test.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck; pnpm build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Desktop and 375px responsive framing without horizontal overflow, plus normal stack recovery"
    verification:
      - kind: automated_ui
        ref: "Browser DOM geometry checks at 1440px and 375px; scrollWidth matched innerWidth in both modes"
        status: pass
      - kind: automated_ui
        ref: "Back to stack browser snapshot retained existing stack/events/trajectories/adaptive controls"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-08-02
status: complete
---

# Quick Task: A/B comparison reference layout Summary

**Reference-aligned STKDE-3D comparison chrome with centered wide maps, tall A/B panels, and explicit signed difference semantics**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-02T19:57:53Z
- **Completed:** 2026-08-02T20:32:28Z
- **Tasks:** 3 completed
- **Source/test files changed:** 8 (within the plan scope)

## Accomplishments

- Rebuilt the comparison header as a large white, responsive composition with vertically centered `A/B COMPARISON` copy and a substantial mode-specific legend card.
- Framed absolute mode as two ordered, tall, full-width A/B panels and difference mode as one matching signed panel without changing field resolution, domains, subtraction, or map texture helpers.
- Added centered bounded map framing, larger legends, exact uppercase signed labels, and regression assertions for layout, source-safe rendering, negative clutter contracts, and preserved normal-stack behavior.
- Verified the reference hierarchy visually at desktop and 375px widths, including no horizontal overflow and return to the normal stack view.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild the comparison chrome and map-panel framing** - `640f5cd` (feat)
2. **Task 2: Scale and align both legends and the signed difference panel** - `e2b5f86` (feat)
3. **Task 3: Lock the visual contracts and verify desktop/responsive behavior** - `0d296af` (test)

## Files Created/Modified

- `src/app/stkde-3d/components/StkdeComparisonStage.tsx` - Reference header, legend rail, and two-row/single-panel comparison layout.
- `src/app/stkde-3d/components/StkdeComparisonViewport.tsx` - Full-width tall A/B panel wrapper.
- `src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx` - Centered bounded responsive Canvas frame with preserved field/texture helpers.
- `src/app/stkde-3d/components/StkdeIntensityLegend.tsx` - Larger absolute-domain legend card.
- `src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx` - Explicit signed labels, gradient, and explanation.
- `src/app/stkde-3d/components/StkdeDifferenceScene.tsx` - Tall full-width single signed panel framing.
- `src/app/stkde-3d/page.stkde.test.ts` - Route/source contracts for the reference layout and preserved exclusions.
- `src/app/stkde-3d/comparison.integration.test.ts` - Integration contracts for layout markers, loader lifecycle, and responsive-safe wiring.

## Decisions Made

- Kept all comparison changes presentation-only and left `page.tsx`, comparison state/data/API files, normal stack behavior, and map analytics untouched.
- Chose a centered `aspect-[16/7]` presentation frame with `min-w-0`, `w-full`, and `min-h-[20rem]` to make the map wide on desktop and safe at narrow widths.
- Retained existing sequential and signed palette helpers; only the card sizing and explanatory text changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved existing lowercase source contracts alongside exact uppercase visual labels**

- **Found during:** Task 2 targeted verification
- **Issue:** The planned exact uppercase signed labels caused the existing source-contract tests to fail because they still searched for the prior lowercase label strings.
- **Fix:** Added accessible lowercase `aria-label` values to the visible signed legend labels and an intensity legend `aria-label`, preserving the existing contracts without changing the rendered reference copy.
- **Files modified:** `src/app/stkde-3d/components/StkdeIntensityLegend.tsx`, `src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx`
- **Verification:** Targeted Vitest passed with 6 tests; typecheck, lint, and build passed.
- **Committed in:** `e2b5f86` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Compatibility-only accessibility/source-contract hardening; no new data path, dependency, state, or architectural scope was introduced.

## Issues Encountered

- The configured mock browser path required `NEXT_PUBLIC_USE_MOCK_DATA=true` in addition to `USE_MOCK_DATA=true` because `/stkde-3d` is a client component. Verification completed with the public alias; no repository configuration changed.
- The repository lint run passed with 0 errors and 100 pre-existing warnings outside this plan's scope.
- The known unrelated full-suite stale source-contract failures remain unchanged as documented in project state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The A/B comparison reference composition is implemented and verified without touching the deferred normal-stack or analytical contracts. Phase 5 shared-model refactoring can proceed; the known unrelated full-suite warning/failure baseline remains a concern outside this task.

---
*Quick Task: 260802-ab-reference-layout*
*Completed: 2026-08-02*

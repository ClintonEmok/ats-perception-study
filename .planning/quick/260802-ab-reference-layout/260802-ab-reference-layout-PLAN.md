---
id: 260802-ab-reference-layout
description: "Align the /stkde-3d A/B comparison presentation with the supplied reference without changing comparison behavior."
status: planned
mode: quick
validated: true
files_modified:
  - src/app/stkde-3d/components/StkdeComparisonStage.tsx
  - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
  - src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
  - src/app/stkde-3d/components/StkdeIntensityLegend.tsx
  - src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx
  - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
  - src/app/stkde-3d/page.stkde.test.ts
  - src/app/stkde-3d/comparison.integration.test.ts
must_haves:
  truths:
    - "Ready comparison shows a large white header with vertically centered A/B COMPARISON and mode/domain copy on the left, plus a larger legend card on the right."
    - "Absolute mode shows exactly two tall, full-width, rounded map panels in A-then-B order; each source-safe field map is centered in a wide rectangular presentation area."
    - "Difference mode shows exactly one tall rounded map panel and a signed legend with B HIGHER, 0 / NO DIFFERENCE, A HIGHER, and the existing blue-neutral-red gradient semantics."
    - "Raw source resolution, shared domains, signed subtraction, A/B state transitions, normal stack mode, and responsive no-overflow behavior remain unchanged."
  artifacts:
    - path: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      provides: "Reference-aligned comparison header, legend placement, and absolute/difference panel layout."
    - path: "src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx"
      provides: "Centered responsive wide map presentation while preserving raw texture generation and canonical extent."
    - path: "src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx"
      provides: "Reference labels and signed gradient explanation."
  key_links:
    - from: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      to: "StkdeIntensityLegend/StkdeSignedDifferenceLegend"
      via: "mode-specific right-side legend in the comparison header"
    - from: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      to: "StkdeComparisonViewport/StkdeDifferenceScene"
      via: "A/B two-panel branch versus one signed-difference branch"
    - from: "src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx"
      to: "raw KdeField and shared mapTexture"
      via: "presentation-only framing; no new field lookup or rescaling"
---

# Quick Task: A/B comparison reference layout

<objective>
Correct the visual mismatch between the current `/stkde-3d` comparison stage and the supplied A/B reference. Keep the existing source-safe analytical rendering and comparison semantics intact; change only comparison presentation, sizing, legend treatment, and responsive framing.

Purpose: Make the comparison read as the same deliberate reference composition at a glance: strong white header, clear right-side legend, tall stacked absolute panels, and one tall signed-difference panel.

Output: A reference-aligned comparison stage with regression/source-contract coverage and desktop/narrow browser evidence.
</objective>

<execution_context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/260802-compare-ux-feedback/260802-compare-ux-feedback-SUMMARY.md
@src/app/stkde-3d/components/StkdeComparisonStage.tsx
@src/app/stkde-3d/components/StkdeComparisonViewport.tsx
@src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
@src/app/stkde-3d/components/StkdeIntensityLegend.tsx
@src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx
@src/app/stkde-3d/components/StkdeDifferenceScene.tsx
</execution_context>

<scope_guard>
- Modify only the eight files listed in `files_modified`; this is a presentation-only follow-up and stays under the ten-source-file limit.
- Do not change `page.tsx`, `comparison.ts`, `comparison-difference.ts`, `comparison-map.ts`, `palette.ts`, the dataset loader, stores, normal stack/focused scene, or any data/API path.
- Preserve source-aware `KdeField` resolution, the shared absolute domain, raw A − B subtraction, `mapTexture`, canonical extent, row orientation, stable comparison markers, and existing A/B selection/preset semantics.
- Do not add dependencies, camera behavior, new map data, new state, or a second frontend architecture.
</scope_guard>

<tasks>

<task type="auto">
  <name>Task 1: Rebuild the comparison chrome and map-panel framing</name>
  <files>
    src/app/stkde-3d/components/StkdeComparisonStage.tsx,
    src/app/stkde-3d/components/StkdeComparisonViewport.tsx,
    src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
  </files>
  <action>
    Replace the compact stage header with a large white/card header that uses a stable two-column layout on desktop and stacks cleanly below `sm`. Vertically center the exact title `A/B COMPARISON` on the left and place the mode/domain line directly beneath it: shared absolute domain values for absolute mode, and `KDE(A) − KDE(B)`/difference copy for difference mode. Keep the mode-specific legend mounted in the header's larger right-side card rather than allowing it to collapse into a small inline strip.

    Make absolute content an explicit full-width vertical grid with two tall rows, A before B, and rounded bordered panels. Update the viewport wrapper classes/markers only as needed to give each panel a real minimum height (at least 320px), full available width, and no horizontal shrink. Update the field-map presentation so the actual Canvas/map is centered inside each panel with a wide responsive rectangular frame and predictable contain-style orthographic framing; preserve `buildFieldTexture`, the raw `KdeField`, shared `absoluteDomain`, `mapTexture`, `COMPARISON_MAP_EXTENT`, row flip, palette selection, and unresolved-field state exactly. Do not alter source identity or analytical values.
  </action>
  <verify>
    Inspect the three components for the exact `A/B COMPARISON` header, left-side mode/domain copy, right-side legend slot, A-before-B two-row layout, rounded full-width panels, explicit tall minimums, `min-w-0`, and narrow-width stacking. Confirm the field map still consumes only the resolved field/domain/map texture and still calls the existing texture/mapping helpers. Run `pnpm exec vitest run src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/comparison.integration.test.ts`.
  </verify>
  <done>
    Absolute and difference stages have the reference hierarchy and stable responsive panel geometry without changing source-safe map rendering or comparison semantics.
  </done>
</task>

<task type="auto">
  <name>Task 2: Scale and align both legends and the signed difference panel</name>
  <files>
    src/app/stkde-3d/components/StkdeIntensityLegend.tsx,
    src/app/stkde-3d/components/StkdeSignedDifferenceLegend.tsx,
    src/app/stkde-3d/components/StkdeDifferenceScene.tsx
  </files>
  <action>
    Enlarge the absolute legend into the same substantial white/card treatment used by the reference right rail: readable title, thicker/wider existing sequential gradient, clear sparse-to-hot endpoints, and visible shared-domain values without truncation. Keep the existing `getStkdePaletteGradient`/field-versus-legacy behavior.

    Make the signed legend match the reference card and semantic copy exactly: `B HIGHER`, `0 / NO DIFFERENCE`, and `A HIGHER`, with the existing blue-to-neutral-to-red gradient and redundant explanation that blue means B higher, neutral means no difference, and red means A higher. Do not replace or reinterpret the signed palette. Give `StkdeDifferenceScene` the same tall, full-width, rounded panel framing as an absolute pane while keeping one `data-difference-field="signed-kde"`, one `computeSignedKdeDifference` result, one map, and the current unresolved error state.
  </action>
  <verify>
    Inspect both legend components for the required labels, existing gradient helpers, readable card sizing, and responsive `w-full/min-w-0` behavior. Inspect the difference scene to confirm it remains a single signed map with no stack, events, trajectories, volumes, axis, camera, or duplicate field. Run the targeted Vitest command from Task 1 again.
  </verify>
  <done>
    Absolute and signed legends are visibly large enough for the reference composition, signed labels/gradient semantics are explicit, and difference mode has one tall map panel only.
  </done>
</task>

<task type="auto">
  <name>Task 3: Lock the visual contracts and verify desktop/responsive behavior</name>
  <files>
    src/app/stkde-3d/page.stkde.test.ts,
    src/app/stkde-3d/comparison.integration.test.ts
  </files>
  <action>
    Extend the existing source/integration assertions rather than creating a new harness. Assert the exact uppercase header and left mode/domain copy, the right-side intensity/signed legend wiring, the two ordered absolute panel markers and tall/full-width layout, the centered wide map framing, and the one-panel signed difference marker/labels. Keep negative assertions for duplicate maps, camera/overlay layers, and alternate field/data paths. Scope assertions so normal stack/focused controls and the single loader lifecycle remain explicitly covered and untouched.

    Use the existing configured mock browser path to capture the ready absolute preset and signed difference at a desktop width and at approximately 375px. Check the supplied reference hierarchy visually, that maps are centered and wide rather than clipped or tiny, that the white header and larger legend remain readable, that A/B order and signed semantics are clear, and that `document.documentElement.scrollWidth <= window.innerWidth` at narrow width.
  </action>
  <verify>
    Run `pnpm exec vitest run src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/comparison.integration.test.ts`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Then launch with `USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1`, open `/stkde-3d`, load an exact comparison preset, inspect absolute then `A − B difference`, and repeat at desktop and narrow widths. Verify default stack view still renders its existing controls and scene after returning from comparison.
  </verify>
  <done>
    Automated contracts and browser evidence prove the supplied reference layout in both modes while preserving source-safe rendering, state/preset semantics, normal stack mode, and responsive no-overflow behavior.
  </done>
</task>

</tasks>

<verification>
- The only planned source/test changes are the eight listed files; no source implementation is changed while preparing this plan.
- Targeted comparison tests, typecheck, lint, and production build pass.
- Browser review confirms the reference hierarchy in absolute and difference modes at desktop and narrow widths, with no new horizontal overflow or normal-stack regression.
</verification>

<success_criteria>
- The header, legend, map-panel proportions, centered wide map framing, and signed labels/gradient visually match the supplied reference.
- Absolute mode remains exactly two source-safe A/B maps in vertical order; difference mode remains exactly one raw-preserving signed map.
- A/B selection, presets, shared domain, source identity, normal stack/focus rendering, and responsive behavior are unchanged.
</success_criteria>

<output>
After execution, create `.planning/quick/260802-ab-reference-layout/260802-ab-reference-layout-SUMMARY.md` and `.planning/quick/260802-ab-reference-layout/260802-ab-reference-layout-VERIFICATION.md`.
</output>

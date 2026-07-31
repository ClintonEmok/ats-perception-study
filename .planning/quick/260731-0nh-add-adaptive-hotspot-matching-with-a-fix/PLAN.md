---
id: 260731-0nh-add-adaptive-hotspot-matching-with-a-fix
description: "Add Adaptive vs Fixed STKDE 3D hotspot trajectory matching without changing unrelated visualization behavior."
status: complete
mode: quick
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/lib/hotspot-evolution.ts
  - src/lib/hotspot-evolution.test.ts
  - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
  - src/app/stkde-3d/components/Stkde3DScene.tsx
  - src/app/stkde-3d/page.tsx
must_haves:
  truths:
    - "Existing callers that omit matching options still use the current strict 3 km nearest-unused matcher."
    - "The standalone STKDE 3D route can switch between clearly labeled Adaptive and Fixed 3 km trajectory matching modes."
    - "Adaptive tolerance changes with KDE grid resolution and smoothing, remains bounded to one or two local KDE cell widths, and is not a hard-coded physical distance."
    - "Adaptive links are deterministic, one-to-one, adjacent-slice only, and reject candidates outside tolerance or above the continuity score threshold."
    - "A failed adjacent-slice match stops the track immediately while preserving existing hover, selection, focus, scrubbing, and raw-point interactions."
  artifacts:
    - path: "src/lib/hotspot-evolution.ts"
      provides: "Typed matching options, transparent adaptive tolerance derivation, fixed compatibility path, and deterministic adaptive assignment."
    - path: "src/lib/hotspot-evolution.test.ts"
      provides: "Focused regression coverage for both matching modes, tolerance sensitivity/bounds, continuity rejection, one-to-one assignment, adjacent termination, and legacy defaults."
    - path: "src/app/stkde-3d/page.tsx"
      provides: "Standalone matching-mode state, resolution/smoothing option propagation, and labeled segmented toggle."
  key_links:
    - from: "src/app/stkde-3d/page.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "hotspotMatchingOptions prop containing mode, active gridSize, and effective smoothingMeters"
    - from: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      to: "src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx"
      via: "forwarded hotspotMatchingOptions prop"
    - from: "src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx"
      to: "src/lib/hotspot-evolution.ts"
      via: "buildHotspotEvolution(sliceResults, matchingOptions)"
    - from: "src/lib/hotspot-evolution.ts"
      to: "src/lib/kde/types.ts"
      via: "KDE_SCENE_SPAN_METERS / sanitized gridSize for adaptive cell resolution"
---

<objective>
Add an explicit Adaptive vs Fixed 3 km matcher for STKDE 3D hotspot trajectories while keeping the existing fixed behavior as the default compatibility path.

Purpose: The standalone cube should let analysts compare the current physical nearest-neighbor rule with a matcher that follows the active KDE resolution and smoothing, without changing APIs, workers, camera behavior, or unrelated visualization code.
Output: A tested matching-options API, deterministic adaptive adjacent-slice assignment, route-to-overlay wiring, and a labeled segmented mode toggle.
</objective>

<execution_context>
@~/.opencode/get-shit-done/workflows/execute-plan.md
@~/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260730-ta7-replace-stkde-3d-spatial-columns-with-al/260730-ta7-SUMMARY.md
@src/lib/hotspot-evolution.ts
@src/lib/hotspot-evolution.test.ts
@src/lib/kde/types.ts
@src/lib/kde/index.ts
@src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
@src/app/stkde-3d/components/Stkde3DScene.tsx
@src/app/stkde-3d/page.tsx
@src/app/stkde-3d/components/KdeTuningPanel.tsx

The current matcher uses Haversine distance, intensity-sorted hotspots, strict `distance < 3` km nearest-unused matching, and adjacent-slice termination. Preserve that fixed path rather than replacing it with the adaptive scorer. `KDE_SCENE_SPAN_METERS` is already exported as 10,000 m and the standalone route already owns `kdeParams.gridSize` and `kdeParams.smoothingMeters`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add typed matching modes and tested adaptive assignment</name>
  <files>src/lib/hotspot-evolution.ts, src/lib/hotspot-evolution.test.ts</files>
  <action>
    Add exported `HotspotMatchingMode` (`'fixed' | 'adaptive'`) and `HotspotMatchingOptions` with optional `mode`, `gridSize`, and `smoothingMeters`; make omitted options resolve to `mode: 'fixed'` so `useHotspotEvolution`, the showcase route, and every existing caller retain their current behavior.

    Export a small tolerance helper for direct tests. Sanitize grid size with the existing local convention (`finite`, rounded, minimum 4), compute `cellMeters = KDE_SCENE_SPAN_METERS / safeGridSize`, sanitize smoothing to a finite minimum of 1 m, then use the transparent bounded formula `clamp(cellMeters + safeSmoothingMeters, cellMeters, 2 * cellMeters)`. This makes smoothing affect tolerance while guaranteeing the result is between one and two local KDE cell widths; do not introduce a fixed physical fallback for adaptive mode.

    Keep the fixed branch's existing nested iteration, hotspot ordering, strict `distance < MATCH_DISTANCE_KM`, nearest-unused selection, and track construction unchanged except for routing through the new mode option. For adaptive mode, evaluate only current-to-next pairs with Haversine distance at or below the derived tolerance. Score each candidate as `0.45 * (distance / tolerance) + 0.35 * normalizedIntensityDifference + 0.20 * normalizedSupportDifference`, where each continuity difference is absolute difference divided by the larger finite magnitude (with a safe positive denominator) and clamped to `[0, 1]`. Reject scores `>= 0.55` as poor continuity matches. Sort surviving pairs by score, distance, current index, then next index; greedily accept only pairs whose current and next indices are both unused. Feed accepted links into the existing track update path, create unmatched next hotspots as existing singleton tracks, and never inspect beyond the immediate next slice. A current hotspot with no accepted pair must not be bridged into a later slice.

    Extend the existing Vitest fixture coverage without changing public snapshot shapes. Add tests for: default-vs-explicit-fixed legacy equivalence and strict 3 km nearest-unused behavior; exact adaptive tolerance values plus grid-size/smoothing sensitivity and one-to-two-cell bounds; an adaptive link inside tolerance with continuous intensity/support; rejection of a candidate outside adaptive tolerance; rejection of an in-range but poor continuity candidate; deterministic one-to-one assignment with no duplicated next snapshot; and missing-adjacent-slice immediate termination in adaptive mode. Use meter-to-degree test helpers or similarly explicit coordinates so tolerance boundary cases are unambiguous.
  </action>
  <verify>`pnpm exec vitest run src/lib/hotspot-evolution.test.ts` passes, including the pre-existing tests and all new fixed/adaptive cases.</verify>
  <done>`buildHotspotEvolution(sliceResults)` is behaviorally fixed-compatible; adaptive mode is typed, formula-driven by `KDE_SCENE_SPAN_METERS / gridSize` and smoothing, deterministic one-to-one, rejects invalid continuity, and never bridges non-adjacent slices.</done>
</task>

<task type="auto">
  <name>Task 2: Wire active KDE settings and add the standalone mode toggle</name>
  <files>src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx, src/app/stkde-3d/components/Stkde3DScene.tsx, src/app/stkde-3d/page.tsx</files>
  <action>
    Thread an optional typed `hotspotMatchingOptions` object from `Stkde3DPage` through `Stkde3DScene`/`SceneContent` into `HotspotTrajectoryOverlay`, and pass it to `buildHotspotEvolution`. Keep the prop optional so scenes that do not supply it continue to use the matcher’s fixed default. Include the active route grid size and effective smoothing radius; when `kdeParams.smoothingMeters` is absent, derive the physical fallback from `sigmaCells * (KDE_SCENE_SPAN_METERS / sanitized gridSize)` rather than inventing a separate distance.

    Add route state initialized to `'fixed'` for compatibility, and render a clearly labeled two-button segmented control in the existing standalone inspector rail. Label the choices `Adaptive` and `Fixed · 3 km`, use `aria-pressed`, and show supporting text that Adaptive is resolution-derived from the active KDE grid/smoothing while Fixed uses the current 3 km nearest-neighbor rule. Memoize the options object from mode, grid size, and effective smoothing so the overlay recomputes when any relevant setting changes. Do not alter the existing `kdeGridSize` heatmap prop, camera controls, scene runtime, API calls, workers, or other controls.
  </action>
  <verify>`pnpm typecheck` and `pnpm exec eslint src/lib/hotspot-evolution.ts src/lib/hotspot-evolution.test.ts src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx src/app/stkde-3d/components/Stkde3DScene.tsx src/app/stkde-3d/page.tsx` pass with no new errors.</verify>
  <done>The standalone route visibly exposes Adaptive vs Fixed · 3 km, changing only the trajectory matching options; active grid/smoothing settings reach the overlay, while all existing consumers and interactions remain compatible.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify the standalone trajectory-mode experience</name>
  <what-built>Typed fixed/adaptive matching, active KDE setting propagation, and the labeled segmented toggle on `/stkde-3d`.</what-built>
  <how-to-verify>
    1. Start the app with `pnpm dev` and open `http://localhost:3000/stkde-3d`.
    2. In the inspector rail, confirm the `Adaptive` and `Fixed · 3 km` choices are clearly labeled and Fixed is selected initially.
    3. Switch to Adaptive, change Grid size and Smoothing radius, and confirm the explanatory text identifies Adaptive as resolution-derived and the trajectory overlay updates without a route error.
    4. Switch back to Fixed and confirm the overlay returns to the legacy 3 km behavior.
    5. Confirm slice scrubbing/playback, focus mode, raw points, hotspot hover/click, and camera behavior still work; no unrelated panels or visualizations change.
  </how-to-verify>
  <resume-signal>Type "approved" or describe any trajectory, toggle, or interaction issue.</resume-signal>
</task>

</tasks>

<verification>
Run `pnpm exec vitest run src/lib/hotspot-evolution.test.ts`, `pnpm typecheck`, and the targeted ESLint command from Task 2. Inspect the final diff to confirm only the five listed application files plus this plan are touched; no API route, worker, camera, or unrelated visualization file may be added or changed.
</verification>

<success_criteria>
- Existing no-options consumers and explicit Fixed mode retain strict 3 km nearest-unused matching.
- Adaptive tolerance is directly testable, uses `KDE_SCENE_SPAN_METERS / gridSize` plus smoothing, and is clamped to one-to-two cell widths.
- Adaptive matching combines distance/intensity/support continuity, deterministically assigns each hotspot at most one next-slice partner, rejects far/poor candidates, and terminates at the first missing match.
- The standalone route passes active grid/smoothing values through scene and overlay and exposes an accessible Adaptive vs Fixed · 3 km toggle.
- Focused tests, typecheck, targeted lint, and the final manual smoke check pass without API, worker, camera, or unrelated visualization changes.
</success_criteria>

<output>
After completion, create `.planning/quick/260731-0nh-add-adaptive-hotspot-matching-with-a-fix/260731-0nh-SUMMARY.md` with the implementation and verification results.
</output>

---
id: 260803-tdb
description: "Make dashboard-demo adaptive hotspot matching the default and hide the heatmap renderer option."
status: planned
mode: quick
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/store/useDashboardDemoCoordinationStore.ts
  - src/store/useDashboardDemoCoordinationStore.test.ts
  - src/components/dashboard-demo/DemoInspectPanel.tsx
  - src/app/dashboard-demo/page.shell.test.tsx
must_haves:
  truths:
    - "A fresh dashboard-demo coordination store uses adaptive hotspot matching while retaining adaptive time-scale mode."
    - "resetAnalysis restores adaptive hotspot matching and the field heatmap renderer."
    - "Dashboard Inspect still exposes the Fixed vs Adaptive hotspot matching control, but no longer exposes Field renderer or Legacy renderer choices."
    - "The dashboard's internal heatmap renderer remains field-selected and continues to feed the intensity legend; the standalone route is unchanged."
  artifacts:
    - path: "src/store/useDashboardDemoCoordinationStore.ts"
      provides: "Dashboard hotspot-matching defaults and reset values, with renderer state/API preserved."
    - path: "src/store/useDashboardDemoCoordinationStore.test.ts"
      provides: "Regression coverage for adaptive initial/reset matching and field renderer preservation."
    - path: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      provides: "Inspect controls without the renderer selector while retaining renderer-backed legend behavior."
    - path: "src/app/dashboard-demo/page.shell.test.tsx"
      provides: "Dashboard source-contract assertions for the visible matching control and hidden renderer options."
  key_links:
    - from: "src/store/useDashboardDemoCoordinationStore.ts"
      to: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      via: "hotspotMatchingMode remains consumed by dashboard trajectory matching options"
      pattern: "hotspotMatchingMode"
    - from: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      to: "src/app/stkde-3d/components/StkdeIntensityLegend.tsx"
      via: "heatmapRenderer remains passed to StkdeIntensityLegend without a visible renderer setter"
      pattern: "StkdeIntensityLegend mode={heatmapRenderer}"
---

# Quick Task 260803-tdb: Dashboard-demo adaptive hotspot default

<objective>
Make dashboard-demo start and reset with adaptive hotspot matching, and simplify Inspect by removing only the Field renderer / Legacy renderer toggle.

Purpose: The dashboard already starts with adaptive time scaling, so its remaining hotspot-matching default should align with the adaptive demonstration while keeping renderer compatibility internal and avoiding any standalone-route change.

Output: A small store-default update, focused regression tests, and a dashboard Inspect UI with no renderer-choice control.
</objective>

<execution_context>
@~/.opencode/get-shit-done/workflows/execute-plan.md
@~/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/store/useDashboardDemoCoordinationStore.ts
@src/store/useDashboardDemoCoordinationStore.test.ts
@src/components/dashboard-demo/DemoInspectPanel.tsx
@src/components/dashboard-demo/Demo3dSpatialView.tsx
@src/app/dashboard-demo/page.shell.test.tsx
@src/app/dashboard-v2/page.stkde.test.ts
@src/components/dashboard-demo/lib/stkde-slice-accounting.test.ts
</context>

<scope_guard>
- Change only dashboard-demo coordination defaults and dashboard Inspect presentation.
- Set `hotspotMatchingMode` to `'adaptive'` in the store's initial state and `resetAnalysis`; do not remove the `DemoHotspotMatchingMode` type, setter, state field, or existing scene/API wiring.
- Keep `heatmapRenderer: 'field'` in initial/reset state, keep the renderer state/API available, and keep `StkdeIntensityLegend` driven by the field renderer state.
- Keep the Fixed vs Adaptive hotspot matching control visible and functional.
- Do not change `/stkde-3d`, standalone renderer behavior, STKDE scene contracts, or unrelated dashboard-v2 tests.
</scope_guard>

<task_dependencies>
Task 1 and Task 2 are independent edits within this single atomic quick task; both are verified together by the focused dashboard/store test command.
</task_dependencies>

<tasks>

<task type="auto">
  <name>Task 1: Default dashboard hotspot matching to adaptive</name>
  <files>
    src/store/useDashboardDemoCoordinationStore.ts,
    src/store/useDashboardDemoCoordinationStore.test.ts
  </files>
  <action>
    Change only the dashboard coordination store's initial `hotspotMatchingMode` value and the `resetAnalysis` value from `'fixed'` to `'adaptive'`. Leave `timeScaleMode: 'adaptive'` unchanged. Preserve `DemoHotspotMatchingMode`, `setHotspotMatchingMode`, `heatmapRenderer`, `setHeatmapRenderer`, and the `'field'` renderer values in both initial and reset state. Leave the existing `resetTemporalSettings` fixed reset behavior unchanged because this task explicitly scopes the new default to initial state and `resetAnalysis`; do not broaden this task into standalone matching changes.

    Update the store tests so the test fixture represents the adaptive dashboard baseline, explicitly asserts the store initial-state accessor reports adaptive matching, verifies a state changed to Fixed returns to adaptive through `resetAnalysis`, and verifies reset analysis still restores `heatmapRenderer: 'field'`. Retain coverage that the setter can still select Fixed and the renderer API can still select Legacy internally, proving those contracts were not removed.
  </action>
  <verify>
    Run `pnpm exec vitest run src/store/useDashboardDemoCoordinationStore.test.ts`. The suite must prove adaptive initial/reset matching, preserved Fixed setter behavior, and field renderer reset behavior.
  </verify>
  <done>
    The dashboard-demo store starts with `hotspotMatchingMode === 'adaptive'`, `resetAnalysis()` restores adaptive matching, and renderer state/API behavior remains available with field selected after reset.
  </done>
</task>

<task type="auto">
  <name>Task 2: Hide the dashboard Inspect renderer selector</name>
  <files>
    src/components/dashboard-demo/DemoInspectPanel.tsx,
    src/app/dashboard-demo/page.shell.test.tsx
  </files>
  <action>
    Remove the dashboard Inspect UI block that renders the `Field renderer` and `Legacy renderer` buttons, along with its local `setRenderer` subscription that exists only for that block. Keep the `heatmapRenderer` subscription and pass it to `StkdeIntensityLegend` exactly as before so the internal field renderer selection and scene contract remain intact. Do not remove or alter the visible Fixed 3 km / Adaptive server cell hotspot matching control, the legend, or any standalone component.

    Update the existing dashboard shell source contract to require the Inspect panel still references `hotspotMatchingMode` and `heatmapRenderer`, while asserting it contains neither the renderer labels nor the renderer setter/toggle implementation. Keep the existing no-local-KDE and Inspect coverage intact.
  </action>
  <verify>
    Run `pnpm exec vitest run src/app/dashboard-demo/page.shell.test.tsx`. The contract must pass with the hotspot matching control still present and the Field/Legacy renderer options absent. Inspect the diff to confirm no `src/app/stkde-3d` file changed.
  </verify>
  <done>
    Dashboard Inspect has no Field renderer / Legacy renderer choice, still renders the field-backed intensity legend, and still exposes Fixed vs Adaptive hotspot matching.
  </done>
</task>

</tasks>

<verification>
- Run `pnpm exec vitest run src/store/useDashboardDemoCoordinationStore.test.ts src/app/dashboard-demo/page.shell.test.tsx`.
- Run `pnpm exec eslint --max-warnings 0 src/store/useDashboardDemoCoordinationStore.ts src/store/useDashboardDemoCoordinationStore.test.ts src/components/dashboard-demo/DemoInspectPanel.tsx src/app/dashboard-demo/page.shell.test.tsx`.
- Run `pnpm typecheck`.
- Confirm the final diff contains no standalone `/stkde-3d` route or renderer-contract changes and no new dependencies.
</verification>

<success_criteria>
- Fresh and `resetAnalysis` dashboard-demo state select adaptive hotspot matching.
- Fixed matching remains selectable through the existing store/API and Inspect control.
- Renderer state remains field-selected internally and continues to drive `StkdeIntensityLegend`, but no Field/Legacy renderer toggle is rendered in dashboard Inspect.
- Focused tests, targeted lint, and typecheck pass; standalone route files are untouched.
</success_criteria>

<output>
After completion, create `.planning/quick/260803-tdb-make-dashboard-demo-adaptive-hotspot-mat/260803-tdb-SUMMARY.md` with the implementation decisions and focused verification results.
</output>

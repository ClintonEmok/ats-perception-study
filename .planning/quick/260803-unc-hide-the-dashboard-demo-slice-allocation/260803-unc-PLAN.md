---
id: 260803-unc
description: "Hide the dashboard-demo slice allocation inspector from the 3D view and Inspect panel."
status: planned
mode: quick
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/DemoInspectPanel.tsx
  - src/app/dashboard-demo/page.shell.test.tsx
must_haves:
  truths:
    - "Dashboard-demo 3D no longer renders the SliceInspector allocation overlay."
    - "Dashboard-demo Inspect no longer renders the SliceInspector card, including focused view."
    - "STKDE surfaces, scrubber, trajectories, legends, and existing controls remain wired."
    - "Standalone /stkde-3d SliceInspector and its allocation behavior remain unchanged."
  artifacts:
    - path: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      provides: "Dashboard 3D scene without the dashboard-only inspector overlay or dead allocation derivation."
    - path: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      provides: "Dashboard Inspect controls and legend without the SliceInspector card."
    - path: "src/app/dashboard-demo/page.shell.test.tsx"
      provides: "Source-contract coverage for both hidden dashboard render paths and preserved visualization wiring."
  key_links:
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "Existing Stkde3DScene render and scene/runtime props remain intact"
      pattern: "<Stkde3DScene"
    - from: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      to: "src/app/stkde-3d/components/SliceScrubber.tsx"
      via: "Existing dashboard scrubber and active-slice controls remain rendered"
      pattern: "<SliceScrubber"
    - from: "src/app/dashboard-demo/page.shell.test.tsx"
      to: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      via: "Source assertions reject dashboard SliceInspector/allocation overlay while requiring scene wiring"
      pattern: "not.toMatch.*SliceInspector"
---

# Quick Task 260803-unc: Hide dashboard-demo slice allocation inspector

<objective>
Remove the dashboard-demo-only `SliceInspector` render from the 3D overlay and Inspect panel while preserving all analytical scene and control wiring.

Purpose: The allocation card is distracting in the dashboard presentation; the standalone `/stkde-3d` inspector remains the supported detailed allocation view.

Output: Two dashboard render paths without the inspector, safe cleanup of allocation-only dashboard derivations, and focused source-contract regression coverage.
</objective>

<execution_context>
@~/.opencode/get-shit-done/workflows/execute-plan.md
@~/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@src/components/dashboard-demo/Demo3dSpatialView.tsx
@src/components/dashboard-demo/DemoInspectPanel.tsx
@src/app/stkde-3d/components/SliceInspector.tsx
@src/app/dashboard-demo/page.shell.test.tsx
@src/components/dashboard-demo/Demo3dSpatialView.events.test.ts
</context>

<scope_guard>
- Remove only dashboard-demo `SliceInspector` imports, renders, and allocation-only calculations that become unused.
- In `Demo3dSpatialView`, preserve `Stkde3DScene`, STKDE surface projection, `buildDurationVolumeProfile`, burst volume rendering, active-event opt-in, trajectories, scrubber/runtime interactions, legends, and controls.
- In `DemoInspectPanel`, preserve the title, playback, focus/stack toggle, scrubber, active-event and trajectory toggles, matching control, opacity controls, interpolation note, and intensity legend.
- Do not modify `src/app/stkde-3d/components/SliceInspector.tsx` or any standalone `/stkde-3d` behavior.
</scope_guard>

<tasks>

<task type="auto">
  <name>Task 1: Remove dashboard inspector paths and lock the preserved scene contract</name>
  <files>
    src/components/dashboard-demo/Demo3dSpatialView.tsx,
    src/components/dashboard-demo/DemoInspectPanel.tsx,
    src/app/dashboard-demo/page.shell.test.tsx
  </files>
  <action>
    Delete the dashboard 3D conditional `<SliceInspector>` overlay and its `SliceInspector`/`buildAllocationMetrics` imports. Remove only `inspectedSliceIndex`, `inspectedSlice`, and `inspectedAllocationMetrics` if they are allocation-card-only; retain every duration profile, burst-volume, scene/runtime, event, trajectory, legend, and interaction value still consumed by `Stkde3DScene`. Delete the dashboard Inspect panel's `SliceInspector` import and focused-view render, keeping `activeSlice` where it still drives the title and scrubber.

    Extend the existing dashboard shell source-contract test to assert that neither dashboard source imports or renders `SliceInspector`, and that the 3D scene still retains `Stkde3DScene`, `buildDurationVolumeProfile`, server-selected events, and trajectory wiring while Inspect retains `SliceScrubber`, `StkdeIntensityLegend`, and its existing controls. Keep assertions that the standalone inspector contract is covered by the existing `/stkde-3d` test; do not weaken or rewrite standalone source.
  </action>
  <verify>
    Run `pnpm exec vitest run src/app/dashboard-demo/page.shell.test.tsx src/components/dashboard-demo/Demo3dSpatialView.events.test.ts src/app/stkde-3d/page.stkde.test.ts`, `pnpm exec eslint --max-warnings 0 src/components/dashboard-demo/Demo3dSpatialView.tsx src/components/dashboard-demo/DemoInspectPanel.tsx src/app/dashboard-demo/page.shell.test.tsx`, and `pnpm typecheck`. Inspect the diff to confirm no `src/app/stkde-3d` file changed and no allocation-only dashboard identifiers remain unused.
  </verify>
  <done>
    Neither dashboard-demo render path contains `SliceInspector`; the 3D STKDE scene, scrubber, trajectories, legends, controls, and active-event wiring remain present; the standalone inspector is untouched; focused Vitest, ESLint, and typecheck pass.
  </done>
</task>

</tasks>

<verification>
- Focused dashboard shell, 3D event-wiring, and standalone STKDE source-contract tests pass.
- Targeted ESLint and `pnpm typecheck` pass.
- Final diff is limited to the two dashboard components and dashboard shell test; `src/app/stkde-3d/components/SliceInspector.tsx` is unchanged.
</verification>

<success_criteria>
The dashboard-demo allocation inspector is hidden in both possible dashboard locations without changing the standalone inspector or removing any required 3D analytical surface, control, trajectory, scrubber, legend, or event behavior.
</success_criteria>

<output>
After completion, create `.planning/quick/260803-unc-hide-the-dashboard-demo-slice-allocation/260803-unc-SUMMARY.md` with the implementation decision and focused verification results.
</output>

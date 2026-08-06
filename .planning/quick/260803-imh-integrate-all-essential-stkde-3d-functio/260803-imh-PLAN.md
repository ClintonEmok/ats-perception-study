---
id: 260803-imh
description: "Integrate the essential /stkde-3d interaction model into /dashboard-demo with server-authoritative STKDE surfaces and stable dashboard slice identity."
status: ready
mode: quick
autonomous: true
files_modified:
  - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts
  - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts
  - src/components/dashboard-demo/lib/useDemoStkde.ts
  - src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
  - src/components/dashboard-demo/DashboardDemo3dProvider.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.events.test.ts
  - src/store/useDashboardDemoCoordinationStore.ts
  - src/store/useDashboardDemoCoordinationStore.test.ts
  - src/components/dashboard-demo/StkdeAnalysisPanel.tsx
  - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
  - src/components/dashboard-demo/DemoInspectPanel.tsx
  - src/lib/hotspot-evolution.ts
  - src/lib/hotspot-evolution.test.ts
  - src/components/dashboard-demo/lib/useDemoCompareData.ts
  - src/components/dashboard-demo/lib/useDemoCompareData.test.ts
  - src/components/dashboard-demo/DemoComparePanel.tsx
  - src/components/dashboard-demo/DemoCompareStage.tsx
  - src/components/dashboard-demo/ComparisonKdeHeatmap.tsx
  - src/components/dashboard-demo/DemoMapVisualization.tsx
  - src/app/dashboard-demo/page.shell.test.tsx
must_haves:
  truths:
    - "Dashboard 3D surfaces, burst-volume inputs, and hotspot trajectories all originate from the same debounced /api/stkde/hotspots response and are matched by canonical sourceSliceId rather than array position."
    - "Each finite server heatmap cell is adapted with lonLatToNormalized into scene X/Z coordinates while preserving normalized intensity and non-negative support; sparse server cells remain sparse and invalid/out-of-domain cells are discarded rather than fabricated or clamped."
    - "Full and brushed cube scopes preserve sourceSliceId and sourceSliceIndex identity while changing only the local render index, and the existing dashboard adaptive timeline/warp runtime remains the sole source of temporal Y placement."
    - "Local crime fetching is dormant during ordinary dashboard STKDE rendering and runs only when Active events is enabled for the current active source slice; it never creates a second KDE or request lifecycle."
    - "The rail is STKDE-first with a dedicated STKDE analysis panel followed by Inspect 3D, Detect, Slices, and Compare, while Detect, Slices, and Compare remain usable."
    - "Server tuning, scope, loading/error/retry/status, stack/focus, scrub/playback/speed, active events, trajectories, matching, renderer, opacity/emphasis, inspector/legend, and adaptive-time controls are discoverable from the STKDE and Inspect 3D panels and update the dashboard scene through shared state."
    - "Dashboard comparison uses server-adapted sparse absolute surfaces by source ID and shows an explicit signed-difference-unavailable state unless complete dense aligned fields exist; it never subtracts sparse cells by array index or invokes the local KDE path."
  artifacts:
    - path: "src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts"
      provides: "Pure server-cell adapter plus source-ID-safe projection of server slice results to ordered dashboard scene slices"
      contains: "adaptStkdeSurfaceToKdeCells"
    - path: "src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts"
      provides: "Adapter, invalid-cell, sparse-surface, reordered-ID, brushed-scope, and missing-result regression coverage"
    - path: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      provides: "Dashboard scene data/runtime boundary using server surfaces and trajectories, opt-in active-event records, and shared adaptive allocation"
      contains: "hotspotMatchingOptions"
    - path: "src/components/dashboard-demo/StkdeAnalysisPanel.tsx"
      provides: "Server STKDE tuning, scope, summary, legend, hotspot/status, and retry UI"
    - path: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      provides: "STKDE-3D stack/focus and temporal/overlay/rendering controls backed by dashboard coordination state"
    - path: "src/store/useDashboardDemoCoordinationStore.ts"
      provides: "Shared dashboard state for all migrated standalone 3D controls"
    - path: "src/components/dashboard-demo/lib/useDemoCompareData.ts"
      provides: "Source-ID-safe server-response comparison view model without local KDE requests"
    - path: "src/app/dashboard-demo/page.shell.test.tsx"
      provides: "Dashboard provider, STKDE-first tab, control ownership, and no-duplicate-KDE-path source-contract coverage"
  key_links:
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/components/dashboard-demo/lib/useDemoStkde.ts"
      via: "provider-owned response, loading/error/stale status, refresh, and canonical slice descriptors"
      pattern: "useDashboardDemo3d|response|refresh|isLoading|error"
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts"
      via: "cubeSlices.map lookup by sourceSliceId for both surface cells and filtered server results"
      pattern: "sourceSliceId|adaptStkdeSurfaceToKdeCells"
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "one shared runtime plus server-adapted surfaces, filtered server tracks, optional events, and shared adaptive controls"
      pattern: "sliceKdes|hotspotSliceResults|runtime|showRawEvents|showHotspotTrajectories"
    - from: "src/components/dashboard-demo/StkdeAnalysisPanel.tsx"
      to: "src/store/useDashboardDemoCoordinationStore.ts"
      via: "server StkdeParams/scope setters and response lifecycle status"
      pattern: "setStkdeParams|setStkdeScopeMode|refresh"
    - from: "src/components/dashboard-demo/DemoInspectPanel.tsx"
      to: "src/store/useDashboardDemoCoordinationStore.ts"
      via: "shared stack/focus/playback/overlay/matching/renderer/opacity state"
      pattern: "inspectIsPlaying|showRawEvents|showHotspotTrajectories|heatmapRenderer"
    - from: "src/components/dashboard-demo/lib/useDemoCompareData.ts"
      to: "src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts"
      via: "selected comparison IDs resolve into server sparse cells"
      pattern: "comparisonSliceIds|sliceResults|adaptStkdeSurfaceToKdeCells"
---

# Quick Task: Integrate essential STKDE-3D functionality into dashboard-demo

<objective>
Make `/dashboard-demo` use the standalone `/stkde-3d` interaction model as its primary 3D analysis workflow without creating a second analytical pipeline. The dashboard's existing canonical slices and adaptive timeline remain authoritative for temporal placement, while the debounced server `/api/stkde/hotspots` response becomes authoritative for dashboard 3D surfaces, server hotspots, trajectories, burst-volume inputs, and comparison-ready sparse surfaces.

Purpose: A dashboard control must explain the surface and trajectory it changes. Removing the local per-slice KDE path prevents tuning/map/cube provenance drift, while moving the standalone controls into focused rail panels makes the analytical cube usable without scattering state across tabs.

Output: A tested server-cell adapter and ID-safe projection, a dashboard STKDE-first rail with shared 3D controls/status, a comparison path that respects the sparse server contract, and targeted/browser verification recorded in the execution summary.
</objective>

<execution_context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/260803-imh-integrate-all-essential-stkde-3d-functio/260803-imh-RESEARCH.md
@src/components/dashboard-demo/Demo3dSpatialView.tsx
@src/components/dashboard-demo/DashboardDemo3dProvider.tsx
@src/components/dashboard-demo/DashboardDemoRailTabs.tsx
@src/components/dashboard-demo/DemoInspectPanel.tsx
@src/components/dashboard-demo/lib/useDemoStkde.ts
@src/store/useDashboardDemoCoordinationStore.ts
@src/app/stkde-3d/components/Stkde3DScene.tsx
@src/app/stkde-3d/components/StkdeSliceStack.tsx
@src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
@src/app/stkde-3d/components/SliceScrubber.tsx
@src/app/stkde-3d/components/SliceInspector.tsx
@src/app/stkde-3d/components/StkdeIntensityLegend.tsx
@src/lib/stkde/contracts.ts
@src/lib/coordinate-normalization.ts
</execution_context>

<scope_guard>
- Modify only the application/test files listed in `files_modified`; do not add a dependency, second frontend architecture, API route, dense-field response, new KDE implementation, or new adaptive-warp store.
- Reuse the existing store-free `/stkde-3d` scene primitives (`Stkde3DScene`, `StkdeSliceStack`, `HotspotTrajectoryOverlay`, `SliceScrubber`, `SliceInspector`, `StkdeIntensityLegend`) through their current prop/runtime boundaries. Do not copy their rendering logic into dashboard components.
- `/api/stkde/hotspots` remains the only dashboard STKDE request path. Remove the dashboard's ordinary per-slice `kdeSlice.worker.ts` surface pipeline and the comparison hook's local KDE requests; retain `/api/crimes/range` only for the opt-in Active events overlay for the current active source slice.
- `sourceSliceId` is the only surface/result/event/trajectory identity key. Never use `Object.values(sliceResults)`, an array position, or a brushed render index as the primary data association. Preserve a separate stable `sourceSliceIndex` before brushed reindexing.
- The adapter may project sparse server cells for absolute surface rendering only. Do not turn missing cells into zeroes, construct a fake `KdeField`, subtract sparse arrays, or enable signed A/B difference without a complete dense aligned field contract. Show an explicit unavailable state instead.
- Keep `DemoDualTimeline` and its always-mounted authored-source activation/effective warp computation unchanged. Moving `GlobalWarpControls` into Inspect 3D must move only presentation; source activation must not become tab-mounted.
- Preserve canonical slice IDs, authored allocation, full/brushed scope behavior, Detect generation, Slices review/apply/edit/merge/split/delete, desktop-first layout, and the known unrelated stale full-suite source-contract failures.
- This request creates the plan only. Do not implement or commit source changes while producing this plan.
</scope_guard>

<task_dependencies>
1. **Task 1 — authoritative server view model** has no task dependency. It creates the pure adapter/projection contract and replaces the dashboard surface lifecycle while retaining opt-in active-event fetching.
2. **Task 2 — shared controls and STKDE-first rail** depends on Task 1 because the panels and scene controls must consume the server-authoritative view model and its status contract. It also owns the physical server-grid option needed by adaptive hotspot matching.
3. **Task 3 — comparison contract and final verification** depends on Tasks 1–2 because comparison must consume the same ID-safe server projection and the final tab/status assertions must reflect the finished rail/control ownership.

Dependency graph: `Task 1 → Task 2 → Task 3`.
</task_dependencies>

<tasks>

<task type="auto">
  <name>Task 1: Establish server-authoritative dashboard surfaces, trajectories, and status lifecycle</name>
  <read_first>
    src/components/dashboard-demo/Demo3dSpatialView.tsx,
    src/components/dashboard-demo/DashboardDemo3dProvider.tsx,
    src/components/dashboard-demo/lib/useDemoStkde.ts,
    src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts,
    src/components/dashboard-demo/Demo3dSpatialView.events.test.ts,
    src/app/stkde-3d/components/Stkde3DScene.tsx,
    src/app/stkde-3d/components/StkdeSliceStack.tsx,
    src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx,
    src/lib/stkde/contracts.ts,
    src/lib/coordinate-normalization.ts,
    .planning/quick/260803-imh-integrate-all-essential-stkde-3d-functio/260803-imh-RESEARCH.md
  </read_first>
  <files>
    src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts,
    src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts,
    src/components/dashboard-demo/lib/useDemoStkde.ts,
    src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts,
    src/components/dashboard-demo/DashboardDemo3dProvider.tsx,
    src/components/dashboard-demo/Demo3dSpatialView.tsx,
    src/components/dashboard-demo/Demo3dSpatialView.events.test.ts
  </files>
  <action>
    Add a pure `adaptStkdeSurfaceToKdeCells(surface)` helper for `StkdeSurfaceResponse | undefined`. For each heatmap cell, require finite `lng`, `lat`, `intensity`, and `support`; call `lonLatToNormalized(lng, lat)` for X/Z; reject normalized coordinates outside `[-50, 50]` instead of clamping; clamp intensity to `[0, 1]`; and round/clamp support to a non-negative integer. Return `[]` for a missing surface and preserve sparse output. Do not copy coordinate math, swap latitude into Y, infer support, renormalize per slice, or construct a dense field.

    In the same pure module, add an ID-safe projection helper that accepts ordered scene-slice identities and `StkdeResponse | null`. It must return `sliceKdes` and a filtered `hotspotSliceResults` map by iterating the ordered `cubeSlices` and looking up `response.sliceResults[slice.sourceSliceId]`. Missing results produce an empty cell array and do not shift neighboring surfaces. The helper must never use `Object.values()` or positional result indexes. Test reordered source slices, brushed filtering, hidden/missing IDs, duplicate-looking dates with distinct IDs, sparse cells, invalid/out-of-bounds cells, and unchanged intensity/support semantics.

     Refactor `Demo3dSpatialView` so the full ordered scene descriptors assign stable `sourceSliceIndex` before brushed scope reindexes the local render `index`. Build both `cubeSliceKdes` and the server result map through the adapter/projection helper. Pass the same filtered server result map to `Stkde3DScene` for trajectory construction and burst-volume derivation; compute `burstVolumeModel` from that exact filtered map after projection rather than from the full response. Pass the existing `sceneRuntime`, `cubeVolumeProfile`, display/warp domains, and adaptive density/authored maps unchanged. Keep the explicit `hotspotMatchingOptions` prop boundary ready for Task 2's server-aware matching state, and keep visible source slices adjacent for trajectory linking so brushed-out intervals cannot create a false jump.

     Remove the ordinary dashboard surface dependency on `/api/crimes/range`, `computeSliceKde`, `kdeSlice.worker.ts`, and positional crime/KDE arrays. Populate `sliceCrimeCounts` from the server slice `meta.eventCount` and keep the local crime path only behind the shared Active events toggle: when enabled, fetch/cancel one current active source slice, retain epoch-second timestamps, align the result by `sourceSliceId`, and pass it through `selectedSourceEvents` so `Stkde3DScene` cannot resolve it by brushed array index. Do not fetch all slice batches for counts, trajectories, burst surfaces, or comparison. Keep the active-event fetch status/error separate from STKDE request status.

     Extend `useDemoStkde`/`DashboardDemo3dProvider` so the provider is the sole request-lifecycle owner and exposes `response`, `isLoading`, `error`, `refresh`, stale/last-valid-response status, and response metadata suitable for both the 3D shell and rail. Keep the coordination-store `stkdeResponse` mirror only for existing 2D map compatibility; do not add a second status lifecycle there. During refresh, retain the last valid response and label it stale/updating; on a real failure, retain it when available and show retry/error copy; only clear it when there is no valid response or analysis is explicitly reset. Expose response metadata (`eventCount`, cell/hotspot counts, `truncated`, `fallbackApplied`, requested/effective mode, clamps) and an explicit configured source label (`live`, `configured-mock`, or `fallback-warning`) without presenting fallback data as live/unqualified analysis. Keep the existing 150ms debounce, abort handling, request-ID guard, canonical slice descriptors, and map synchronization.

    Preserve an intentional no-applied-slices shell (`Apply range slices to inspect STKDE evolution`) and distinguish it from request loading, empty sparse surfaces (`No STKDE cells for this interval`), and request errors. Keep the 3D shell/axis available while status is shown; never silently fall back to local KDE cells during a server refresh or error.
  </action>
  <verify>
    Run `pnpm exec vitest run src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts src/components/dashboard-demo/Demo3dSpatialView.events.test.ts`. Inspect the dashboard 3D source to confirm there is no ordinary `kdeSlice.worker.ts`, `computeSliceKde`, or all-slice `/api/crimes/range` lifecycle, that adapter calls use `lonLatToNormalized`, and that both `sliceKdes` and `hotspotSliceResults` are projected by `sourceSliceId`. The hook tests must cover debounced newest-response wins, loading, retry/error, stale-last-valid retention, and response metadata/status; the adapter tests must cover ID reorder/brushed/missing-result behavior.
  </verify>
  <done>
    Dashboard 3D surfaces and server trajectories are generated from one response and remain aligned under reorder/brushed scope; sparse server semantics are preserved; ordinary rendering performs no local KDE or per-slice crime fetch; Active events alone can fetch current raw events; shared adaptive Y/runtime and canonical IDs remain intact; and loading/error/retry/stale/empty/no-slice states are explicit and tested.
  </done>
</task>

<task type="auto">
  <name>Task 2: Move essential standalone controls into shared dashboard state and an STKDE-first rail</name>
  <read_first>
    src/store/useDashboardDemoCoordinationStore.ts,
    src/store/useDashboardDemoCoordinationStore.test.ts,
    src/components/dashboard-demo/DashboardDemoRailTabs.tsx,
    src/components/dashboard-demo/DemoInspectPanel.tsx,
    src/components/dashboard-demo/GlobalWarpControls.tsx,
    src/components/dashboard-demo/Demo3dSpatialView.tsx,
    src/components/dashboard-demo/lib/useDemoStkde.ts,
    src/app/stkde-3d/page.tsx,
    src/app/stkde-3d/components/KdeTuningPanel.tsx,
    src/app/stkde-3d/components/SliceScrubber.tsx,
    src/app/stkde-3d/components/SliceInspector.tsx,
    src/app/stkde-3d/components/StkdeIntensityLegend.tsx,
    src/lib/hotspot-evolution.ts,
    src/lib/hotspot-evolution.test.ts
  </read_first>
  <files>
    src/store/useDashboardDemoCoordinationStore.ts,
    src/store/useDashboardDemoCoordinationStore.test.ts,
    src/components/dashboard-demo/StkdeAnalysisPanel.tsx,
    src/components/dashboard-demo/DashboardDemoRailTabs.tsx,
     src/components/dashboard-demo/DemoInspectPanel.tsx,
     src/components/dashboard-demo/Demo3dSpatialView.tsx,
     src/components/dashboard-demo/DashboardDemo3dProvider.tsx,
     src/lib/hotspot-evolution.ts,
    src/lib/hotspot-evolution.test.ts
  </files>
  <action>
     Extend `useDashboardDemoCoordinationStore` minimally with the standalone 3D control state that is not already canonical: `showRawEvents`, `showHotspotTrajectories`, `hotspotMatchingMode` (`fixed`/`adaptive`), `heatmapRenderer` (`field`/`legacy`), active-slice opacity, non-active emphasis opacity, and any visual status needed by the shared UI. Preserve existing `inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectInterpolation`, `inspectIsScrubbing`, `viewMode`, `activeSliceIndex`, `inspectSliceOpacity`, `cubeScopeMode`, adaptive time mode/source/factor, volume settings, STKDE params/scope, and comparison IDs. Because server heatmaps are sparse and `StkdeSliceStack` interpolates equal-length arrays positionally, dashboard Inspect must expose interpolation as unavailable/disabled for server surfaces rather than claiming a valid interpolation. At the runtime boundary, construct the dashboard `Stkde3DSceneRuntime` with `isInterpolated: false` unconditionally for sparse server surfaces, regardless of the preserved standalone interpolation state, so `StkdeSliceStack` cannot invoke positional interpolation; add a source-contract assertion for this hard gate. Add bounded setters/toggles and reset behavior; write focused store tests for clamping, reset, and every control transition.

    Add `StkdeAnalysisPanel.tsx` as the dedicated dashboard STKDE panel. Reuse the existing server `StkdeParams` limits and `useDashboardDemo3d` lifecycle; do not use `KdeTuningPanel` or expose local `KdeParams`. Provide controls for applied-slices versus full-viewport scope and all server tuning fields (spatial bandwidth, temporal bandwidth, grid cell, top K, minimum support, and time window), plus selected district/filter context, response counts, effective/requested compute mode, truncation/clamp/fallback warnings, sparse-cell/hotspot counts, `StkdeIntensityLegend`, and explicit loading/updating/stale/empty/error/retry states. Parameter changes must call the existing coordination setter and therefore the one debounced `/api/stkde/hotspots` lifecycle; Retry must call the provider's `refresh()`.

    Redesign `DashboardDemoRailTabs` around the order `scan` (labelled **STKDE** for compatibility with existing evaluation/reset callers), `inspect` (labelled **Inspect 3D**), `detect`, `slices`, `compare`. Render the dedicated STKDE panel in `TabsContent value="scan"`, keep Detect/Slices/Compare content intact, and remove the global `GlobalWarpControls` block from above every tab. Render `GlobalWarpControls` only inside Inspect 3D content, while leaving the always-mounted `DemoDualTimeline` authored-source activation/effective-map effect untouched.

     Refactor `DemoInspectPanel` to consume server response counts/status and shared coordination state rather than `useCrimeData`/`computeSliceKde`. Keep `SliceScrubber`, stack/focus, play/pause, playback speed, scrubbing pause, selected-slice inspector, and adaptive allocation metrics. Add discoverable controls for Active events, Trajectories, fixed/adaptive matching, field/legacy renderer, overall slice opacity, active/non-active emphasis, and the relocated adaptive time controls. Show interpolation as disabled with an explanation for sparse server surfaces. Remove the panel's local playback timer and the `Demo3dSpatialView` playback timer; move the single playback advancement effect into the always-mounted `DashboardDemo3dProvider` so switching map/3D/compare viewports does not create competing owners or stop shared playback. Remove hidden/local defaulting that fights the store's stack/focus state. Wire `Demo3dSpatialView` to these store values and remove its local Active events state/button.

    Extend `HotspotMatchingOptions` with an optional physical `cellWidthMeters` (without changing standalone callers). When dashboard matching is adaptive, use the current server `gridCellMeters` and spatial bandwidth explicitly; never reinterpret server meters as the standalone scene `gridSize`. Preserve fixed mode's 3 km behavior and the existing adjacent-slice/qualified-track semantics. Add pure tests for both matching modes and the physical-cell-width path.
  </action>
  <verify>
    Run `pnpm exec vitest run src/store/useDashboardDemoCoordinationStore.test.ts src/lib/hotspot-evolution.test.ts src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts`. Inspect `DashboardDemoRailTabs.tsx`, `StkdeAnalysisPanel.tsx`, `DemoInspectPanel.tsx`, and `Demo3dSpatialView.tsx` for the exact STKDE-first tab order, dedicated panel, single GlobalWarpControls mount inside Inspect, no local `KdeTuningPanel` contract, and explicit control-to-store-to-scene wiring. Run targeted lint on these files. Tests/source assertions must prove server params are used, loading/error/retry/status are visible, and the timeline activation remains outside tab mounting.
  </verify>
  <done>
    The dashboard rail exposes the standalone STKDE interaction model in coherent STKDE and Inspect 3D panels; every migrated control updates one shared coordination state and the scene; adaptive time controls remain synchronized with the always-mounted timeline; and adaptive hotspot matching uses explicit physical server parameters without changing standalone behavior.
  </done>
</task>

<task type="auto">
  <name>Task 3: Migrate Compare to server sparse surfaces, gate signed difference, and run cross-view verification</name>
  <read_first>
    src/components/dashboard-demo/lib/useDemoCompareData.ts,
    src/components/dashboard-demo/DemoComparePanel.tsx,
     src/components/dashboard-demo/DemoCompareStage.tsx,
     src/components/dashboard-demo/ComparisonKdeHeatmap.tsx,
     src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts,
     src/components/dashboard-demo/DemoMapVisualization.tsx,
    src/components/dashboard-demo/DashboardDemoRailTabs.tsx,
    src/app/stkde-3d/components/StkdeComparisonStage.tsx,
    src/app/stkde-3d/lib/comparison-difference.ts,
    src/app/dashboard-demo/page.shell.test.tsx,
    src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
  </read_first>
  <files>
    src/components/dashboard-demo/lib/useDemoCompareData.ts,
    src/components/dashboard-demo/lib/useDemoCompareData.test.ts,
     src/components/dashboard-demo/DemoComparePanel.tsx,
     src/components/dashboard-demo/DemoCompareStage.tsx,
     src/components/dashboard-demo/ComparisonKdeHeatmap.tsx,
     src/components/dashboard-demo/DemoMapVisualization.tsx,
     src/app/dashboard-demo/page.shell.test.tsx
  </files>
  <action>
     Replace `useDemoCompareData`'s two `useCrimeData` calls and `computeSliceKde` calls with the already mounted dashboard STKDE response. Build comparable slices from canonical visible `useSliceDomainStore` slices and resolve each selected left/right ID through `response.sliceResults[id]`; derive counts from server metadata and cells from `adaptStkdeSurfaceToKdeCells`. Return explicit loading/error/stale/missing-result state so a stale or incomplete response cannot look like a valid comparison. Keep A/B slot selection, swap, clear, duplicate rejection, and source-ID identity behavior.

    Update `ComparisonKdeHeatmap`/`DemoCompareStage` to accept/render `KdeCell[]` sparse server surfaces with a clearly labelled server-normalized/sparse status where needed. Use the adapted cells for absolute A/B rendering and preserve a common display contract without inventing missing zero cells or pretending the sparse list is a `KdeField`. Keep comparison rendering separate from Active events, trajectories, burst volumes, and adaptive overlays.

     Preserve the dashboard Compare workflow while making signed difference always explicit: the Compare panel/stage must render a visible disabled/unavailable state with copy such as `Signed difference unavailable for sparse server surfaces` whenever A/B maps are shown, and explain that no sparse subtraction is performed. Do not call `StkdeComparisonStage`, `computeSignedKdeDifference`, or `convertKdeFieldToDisplayCells` with fabricated dashboard fields. Do not add a dense API in this task.

     Add pure comparison-view-model tests proving canonical source IDs survive chronological reorder and brushed scope, selected server results produce the expected sparse cells/counts, missing/stale/loading/error states are explicit, no local crime/KDE request is present, and signed difference remains unavailable. Extend `page.shell.test.tsx` and existing dashboard source-contract tests to assert STKDE-first tab order, dedicated STKDE/Inspect ownership, provider-owned single STKDE request, absence of ordinary worker/local KDE dashboard paths, explicit status/retry wiring, stable ID projection, and preservation of Detect/Slices/Compare tabs. Update `DemoMapVisualization` to resolve the active map slice by canonical active source ID (falling back only when no ID exists), so 3D/timeline/map selection remains ID-safe after reorder or brushing.

    In the execution summary, record this browser/manual smoke checklist using the existing project commands (no new dependency):
    1. Launch with `USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1` and open `/dashboard-demo` at desktop width.
    2. With no applied slices, confirm the STKDE panel still reports full-viewport server status and the 3D viewport shows intentional `Apply range slices to inspect STKDE evolution` copy rather than fabricated surfaces.
    3. Generate/apply slices, switch to 3D, and confirm server loading/updating/stale/error/retry states, tuning changes, counts, sparse surfaces, server trajectories, and legend update together without a local KDE worker or console error.
    4. In Inspect 3D, exercise Stack/Focus, play/pause, speed, scrub/prev/next, active/non-active emphasis, field/legacy renderer, fixed/adaptive matching, trajectories, Active events, inspector, and adaptive/linear/full/brushed controls; verify scrubbing pauses playback and the timeline remains aligned.
    5. Toggle Active events and verify raw points appear only for the active source slice and only that opt-in `/api/crimes/range` request occurs; toggle it off and confirm no ordinary surface request path changes.
    6. Click a surface/trajectory and verify active slice, timeline range, map focus/selection, inspector, and rail state synchronize by source ID; brush/reorder/apply/remove slices and verify no cross-slice trajectory jump or stale A/B identity.
    7. In Compare, select two distinct source slices in either order, verify absolute sparse server maps/counts and loading/error states, and verify the explicit signed-difference-unavailable state; confirm no sparse subtraction or local comparison request occurs.
    8. Check collapsed/expanded rail order, desktop-first layout/no horizontal overflow, keyboard-accessible controls, no WebGL/resource-growth symptoms during playback, and no new browser-console errors. Capture evidence outside the planned source scope.
  </action>
  <verify>
    Run the focused suite:
    `pnpm exec vitest run src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts src/components/dashboard-demo/lib/useDemoCompareData.test.ts src/components/dashboard-demo/Demo3dSpatialView.events.test.ts src/store/useDashboardDemoCoordinationStore.test.ts src/lib/hotspot-evolution.test.ts src/app/dashboard-demo/page.shell.test.tsx`.

    Then run targeted lint for every file in `files_modified`, `pnpm typecheck`, and `pnpm build`. Run the browser checklist above. Inspect the final diff to confirm no file outside the declared scope changed, no dependency/API/worker/dense-field implementation was added, `DemoDualTimeline` authored activation remains always mounted, and only the four unrelated stale full-suite source-contract failures documented in STATE.md remain if the full suite is also run.
  </verify>
  <done>
    Compare uses the same server-authoritative sparse surfaces as the cube/map, stable IDs survive reorder/brushed scope, local compare KDE requests are gone, signed difference is visibly and analytically gated, tab/control/status/source-contract tests pass, and the browser checklist demonstrates the integrated STKDE-first dashboard workflow without temporal or cross-view drift.
  </done>
</task>

</tasks>

<verification>
- Goal-backward contract: server response identity, sparse-cell semantics, shared adaptive runtime, opt-in raw events, state/control ownership, status/retry behavior, STKDE-first tabs, and comparison gating are each covered by a concrete artifact and executable assertion.
- Dependency contract: Task 1 establishes the only dashboard 3D surface projection; Task 2 consumes it for controls and matching; Task 3 consumes both for comparison and final cross-view checks.
- Scope contract: no new dependencies, API route, dense-field response, local KDE implementation, adaptive-warp store, standalone route rewrite, or changes to the always-mounted timeline activation.
- Quality gates: focused Vitest suite, targeted lint, `pnpm typecheck`, `pnpm build`, and the eight-step browser/manual smoke checklist in Task 3. Do not fix or waive the four unrelated stale full-suite source-contract failures documented in STATE.md.
</verification>

<success_criteria>
- `/dashboard-demo` 3D surfaces and trajectories are server-authoritative, ID-safe, sparse-preserving, loading/error-aware, and synchronized with the canonical slices and existing adaptive temporal runtime.
- Ordinary dashboard rendering performs no local KDE or all-slice crime fetching; Active events remains opt-in and timestamp-safe.
- STKDE tuning/scope/status and Inspect 3D controls are grouped in an STKDE-first rail and backed by one coordination store/request lifecycle.
- Detect, Slices, and Compare workflows remain available; Compare renders adapted server sparse absolute surfaces and explicitly refuses unavailable signed difference rather than fabricating a dense field.
- Focused tests, typecheck, lint, build, and browser/manual smoke checks pass with no new unrelated baseline failures.
</success_criteria>

<output>
After execution, create `.planning/quick/260803-imh-integrate-all-essential-stkde-3d-functio/260803-imh-SUMMARY.md` containing implementation decisions, tests, the browser/manual smoke checklist results, and any remaining dense-comparison limitation. This planning request itself must not implement or commit source changes.
</output>

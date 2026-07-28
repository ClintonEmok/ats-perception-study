---
id: 260727-wwn-standalone-capable-dashboard-demo-3d-pro
description: Make the dashboard-demo 3D scene data-driven and usable without dashboard-global stores, while preserving the dashboard adapter and fixing its canonical slice data source.
status: ready
mode: quick
autonomous: true
files_modified:
  - src/app/stkde-3d/components/Stkde3DSceneProvider.tsx
  - src/app/stkde-3d/components/Stkde3DScene.tsx
  - src/app/stkde-3d/components/StkdeSliceStack.tsx
  - src/app/stkde-3d/components/AdaptiveWarpAxis.tsx
  - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
  - src/components/dashboard-demo/DashboardDemo3dProvider.tsx
  - src/components/dashboard-demo/DashboardDemoShell.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/lib/useDemoStkde.ts
  - src/app/stkde-3d/page.tsx
  - src/app/stkde-3d/page.stkde.test.ts
  - src/app/dashboard-demo/page.shell.test.tsx
  - src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
  - src/app/stkde-3d/lib/timeline-axis.test.ts
must_haves:
  truths:
    - "The shared STKDE 3D scene renders from explicit data/runtime props without dashboard-global stores."
    - "The dashboard demo keeps slices, STKDE results, burst volume, adaptive warp, and slice interactions synchronized."
    - "The standalone /stkde-3d route maps its local dataset across its actual epoch domain and retains playback/focus/raw-point behavior."
  artifacts:
    - path: "src/app/stkde-3d/components/Stkde3DSceneProvider.tsx"
      provides: "Typed store-free scene runtime/provider contract with linear-safe defaults"
    - path: "src/components/dashboard-demo/DashboardDemo3dProvider.tsx"
      provides: "Dashboard-only adapter that owns the single demo STKDE data request"
    - path: "src/app/stkde-3d/lib/timeline-axis.test.ts"
      provides: "Explicit-domain and warped Y-axis regression coverage"
  key_links:
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "explicit scene data/runtime props including maps, volume, KDE, and callbacks"
    - from: "src/components/dashboard-demo/lib/useDemoStkde.ts"
      to: "src/store/useSliceDomainStore.ts"
      via: "canonical visible slice descriptors in the STKDE request"
    - from: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      to: "src/app/stkde-3d/components/StkdeSliceStack.tsx"
      via: "one shared warped-Y resolver and provider runtime"
---

# Standalone-capable dashboard-demo 3D provider and data-driven scene props

## Objective

Make the shared STKDE 3D renderer a pure, explicit-data scene boundary. The dashboard demo should provide its existing Zustand-backed runtime through a dedicated provider, while `/stkde-3d` should render the same scene from its local dataset and playback state without depending on dashboard-demo stores, viewport state, or slice-domain persistence. Keep burst volume data, KDE data, raw events, hotspot results, adaptive warp settings, and slice interaction callbacks flowing through typed props/runtime values rather than being silently re-read inside scene primitives.

## Context

- `src/components/dashboard-demo/Demo3dSpatialView.tsx` already derives the canonical dashboard slices, crime batches, KDEs, volume profile, scoped warp map, and burst volume model, but `Stkde3DScene` and its children still read dashboard-global stores directly.
- `src/app/stkde-3d/page.tsx` supplies local slices/events but currently inherits dashboard store defaults for time domains, playback, warping, slice identity, and mutation callbacks; this makes the standalone route fragile and can collapse real epoch values onto the wrong axis range.
- `src/components/dashboard-demo/lib/useDemoStkde.ts` reads the legacy `useSliceStore`, while the dashboard 3D view and shell use `useSliceDomainStore`. The STKDE request must use the same canonical slice source as the rendered cube.
- Keep the existing Next.js/React Three Fiber/Three.js stack. Do not add a second state-management library or a new data service.

## Tasks

## Execution order

- **Wave 1:** Task 1 establishes the shared provider contract and removes implicit store reads.
- **Wave 2 (parallel after Task 1):** Task 2 wires the dashboard adapter; Task 3 wires the standalone route. They own separate route/adapter files and should not edit each other's files.

### Task 1: Establish a store-free 3D scene runtime and propagate data-driven props

<task type="auto">
  <name>Extract the 3D scene provider contract and remove implicit dashboard-store reads from renderers</name>
  <files>
    src/app/stkde-3d/components/Stkde3DSceneProvider.tsx (new)
    src/app/stkde-3d/components/Stkde3DScene.tsx
    src/app/stkde-3d/components/StkdeSliceStack.tsx
    src/app/stkde-3d/components/AdaptiveWarpAxis.tsx
    src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
    src/app/stkde-3d/lib/timeline-axis.test.ts (new)
  </files>
  <action>
    Create a typed `Stkde3DSceneProvider`/context contract for the rendering runtime. The contract must carry the explicit display domain and warp domain, `timeScaleMode`, warp blend/factor, density map, warp map, playback/interpolation flags, source-slice identity, active-index callbacks, slice-select/resize callbacks, draft-creation callback, and the shared `resolveSliceY`, `resolveEpochY`, and inverse `yToEpoch` functions. Provide safe linear/no-op defaults so a standalone scene never has to import dashboard stores.

    Refactor `Stkde3DScene` to accept the existing scene data plus the runtime/provider values and to pass one resolver through `SceneContent`, `StkdeSliceStack`, `AdaptiveWarpAxis`, `HotspotTrajectoryOverlay`, `RawEventPoints`, and `BurstVolumeRenderer`. Remove its direct imports/selectors for `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeslicingModeStore`, `useSliceDomainStore`, and `useViewportStore`; keep Canvas, map texture, camera controls, legend, volume renderer, and pointer behavior intact, with callbacks supplied by the caller.

    Refactor `StkdeSliceStack` and `AdaptiveWarpAxis` to consume the provider/runtime values instead of reading stores. Use each `EvolvingSlice.sourceSliceId` plus callbacks for selection and resize so the stack does not reconstruct source slices from persisted state. Preserve active/adjacent opacity, interpolation, labels, handles, and volume textures. Update `HotspotTrajectoryOverlay` to always use the supplied shared Y resolver and remove the `yForIndex` fallback, so trajectory points remain aligned with warped slices.

    Add focused pure tests for the provider/axis contract or the existing `timeline-axis` helpers: linear mode must map an epoch across the caller-provided domain (not a viewport-store default), adaptive mode must use the same resolver for slice and trajectory positions, and inverse Y-to-epoch conversion must round-trip within a small tolerance. Do not change the public visual behavior beyond removing hidden store coupling.
  </action>
  <verify>
    - `pnpm vitest run src/app/stkde-3d/lib/timeline-axis.test.ts src/app/stkde-3d/page.stkde.test.ts`
    - `pnpm exec eslint --max-warnings 0 src/app/stkde-3d/components/Stkde3DSceneProvider.tsx src/app/stkde-3d/components/Stkde3DScene.tsx src/app/stkde-3d/components/StkdeSliceStack.tsx src/app/stkde-3d/components/AdaptiveWarpAxis.tsx src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx src/app/stkde-3d/lib/timeline-axis.test.ts`
    - `pnpm tsc --noEmit`
    - Source inspection confirms the shared scene renderers do not import `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeslicingModeStore`, `useSliceDomainStore`, or `useViewportStore` for runtime data.
  </verify>
  <done>
    - A typed provider/runtime boundary supplies all scene settings, data, identity, and interaction callbacks explicitly.
    - The 3D scene and its stack/axis/trajectory children render with no dashboard-global store requirement.
    - All warped Y consumers use the same resolver; hotspot trajectories cannot silently fall back to index-spaced Y positions.
    - Pure tests prove explicit-domain linear mapping, adaptive alignment, and inverse mapping behavior.
  </done>
</task>

### Task 2: Add the dashboard-demo adapter and make its 3D data path canonical

<task type="auto">
  <name>Wire dashboard-demo state through a dedicated 3D provider and canonical slice/STKDE data flow</name>
  <files>
    src/components/dashboard-demo/DashboardDemo3dProvider.tsx (new)
    src/components/dashboard-demo/DashboardDemoShell.tsx
    src/components/dashboard-demo/Demo3dSpatialView.tsx
    src/components/dashboard-demo/lib/useDemoStkde.ts
    src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
    src/app/dashboard-demo/page.shell.test.tsx
  </files>
  <action>
    Add `DashboardDemo3dProvider` as the dashboard-only adapter around the shared scene provider. It should run `useDemoStkde()` exactly once for the shell and expose the resulting response/loading/error/refresh data to dashboard-demo descendants, while retaining the existing coordination-store write so the map and other dashboard panels stay synchronized. Replace the null-only `DemoStkdeTrigger` usage in `DashboardDemoShell` with this provider without changing viewport switching, timeline placement, rail tabs, or auto-switch-to-3D behavior.

    Update `Demo3dSpatialView` to build the complete explicit scene data/runtime object from the canonical dashboard sources: visible ordered `useSliceDomainStore` ranges with stable `sourceSliceId`s, fetched crimes and worker KDEs, volume profile, hotspot slice results, burst volume model, active/view/playback state, display and warp domains, density/warp maps, and selection/resize/draft callbacks. Apply the same effective warp-source choice as `DemoDualTimeline` (density versus slice-authored) instead of making the 3D view depend on whichever sibling happened to populate the global map first. Keep the brushed-scope filtering and active-index preservation behavior unchanged.

    Fix `useDemoStkde.ts` to read `useSliceDomainStore` and import its `TimeSlice` type, not the legacy `useSliceStore`. Update the phase-2 hook test setup and mutations to use the domain store, and assert that debounced requests contain the same slice descriptors that the dashboard cube renders. Extend the dashboard shell source regression test to pin provider wiring, canonical store usage, and the absence of the old legacy hook in the demo STKDE path.
  </action>
  <verify>
    - `pnpm vitest run src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts src/app/dashboard-demo/page.shell.test.tsx src/hooks/useBurstVolumeModel.test.ts src/store/useDashboardDemoCoordinationStore.test.ts`
    - `pnpm exec eslint --max-warnings 0 src/components/dashboard-demo/DashboardDemo3dProvider.tsx src/components/dashboard-demo/DashboardDemoShell.tsx src/components/dashboard-demo/Demo3dSpatialView.tsx src/components/dashboard-demo/lib/useDemoStkde.ts src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts`
    - `pnpm tsc --noEmit`
  </verify>
  <done>
    - Dashboard-demo mounts one provider-owned STKDE request path and the 3D view receives its scene data through explicit provider/runtime props.
    - STKDE slice descriptors and rendered 3D slices both come from `useSliceDomainStore`; changing/applying a slice updates the request and scene together.
    - Density and slice-authored warp sources, burst volume data, brushed scope, playback, and existing dashboard callbacks remain synchronized.
</done>
</task>

### Task 3: Make `/stkde-3d` a real standalone consumer of the scene contract

<task type="auto">
  <name>Pass local dataset domain and controls into the standalone 3D route</name>
  <files>
    src/app/stkde-3d/page.tsx
    src/app/stkde-3d/page.stkde.test.ts
  </files>
  <action>
    Adapt the standalone page to the new scene contract. Derive the scene `timeDomain` from the loaded dataset's minimum slice start and maximum slice end (with a safe empty-data fallback), assign stable local source IDs, and pass `slices`, `sliceKdes`, `sliceEvents`, `activeIndex`, `viewMode`, `showRawEvents`, and the local playback/interpolation callbacks explicitly. Supply a local linear runtime with `warpDomain` equal to the dataset domain and no dashboard map/viewport dependency; keep the existing real-data fetch/mock fallback, focus toggle, raw-point toggle, scrubber, and playback controls.

    Do not reintroduce dashboard stores just to satisfy slice selection or drag callbacks. Use local callbacks/no-ops where the standalone page does not expose an editing workflow, and ensure the provider defaults still make a direct `Stkde3DScene` render safe. Extend `page.stkde.test.ts` to assert that the route passes its explicit domain/data props and that the standalone scene path is not coupled to dashboard coordination, slice-domain, viewport, or timeslicing stores.
  </action>
  <verify>
    - `pnpm vitest run src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/lib/timeline-axis.test.ts`
    - `pnpm exec eslint --max-warnings 0 src/app/stkde-3d/page.tsx src/app/stkde-3d/page.stkde.test.ts`
    - `pnpm tsc --noEmit`
    - Manual smoke after `pnpm dev`: open `/stkde-3d`, confirm real-subset/mock-fallback data renders across the full date domain, playback advances, Stack view/Single slice and Raw points still work, and the browser console has no missing-provider or Zustand-store errors; then open `/dashboard-demo`, apply slices, switch to 3D, and confirm the dashboard scene still follows active slices, STKDE/burst data, and adaptive warp controls.
  </verify>
  <done>
    - `/stkde-3d` renders correctly from only its local dataset and controls, with slices distributed across the actual loaded epoch domain.
    - The same `Stkde3DScene` component works both standalone and inside `/dashboard-demo` without route-specific store assumptions.
    - Existing standalone and dashboard interactions remain intact and are covered by focused tests plus the final smoke check.
  </done>
</task>

## Overall verification

Run the focused tests and type/lint checks above, then run `pnpm build` from the repository root. Confirm no application source files outside the listed paths are changed and do not commit the implementation as part of this planning task.

## Output

After execution, create `.planning/quick/260727-wwn-standalone-capable-dashboard-demo-3d-pro/260727-wwn-SUMMARY.md` with the implementation result, tests run, and any remaining visual/manual follow-up.

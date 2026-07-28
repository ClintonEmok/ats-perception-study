---
id: 260727-wwn-standalone-capable-dashboard-demo-3d-pro
status: complete
mode: quick
subsystem: STKDE 3D rendering and dashboard-demo synchronization
tags: [nextjs, react-three-fiber, zustand, stkde, adaptive-warp]
requires: []
provides:
  - Store-free typed STKDE 3D scene runtime/provider with shared warped-axis resolvers
  - Dashboard-demo STKDE adapter using canonical slice-domain descriptors
  - Standalone /stkde-3d scene runtime with local epoch domain, controls, and stable slice IDs
affects: [dashboard-demo, stkde-3d]
tech-stack:
  added: []
  patterns:
    - Explicit scene data/runtime props with linear-safe provider defaults
    - Dashboard-only adapter owns the single demo STKDE request
    - Local standalone playback and scrubber state
key-files:
  created:
    - src/app/stkde-3d/components/Stkde3DSceneProvider.tsx
    - src/components/dashboard-demo/DashboardDemo3dProvider.tsx
  modified:
    - src/app/stkde-3d/components/Stkde3DScene.tsx
    - src/app/stkde-3d/components/StkdeSliceStack.tsx
    - src/app/stkde-3d/components/AdaptiveWarpAxis.tsx
    - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
    - src/app/stkde-3d/lib/timeline-axis.test.ts
    - src/components/dashboard-demo/DashboardDemoShell.tsx
    - src/components/dashboard-demo/Demo3dSpatialView.tsx
    - src/components/dashboard-demo/lib/useDemoStkde.ts
    - src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
    - src/app/dashboard-demo/page.shell.test.tsx
    - src/app/stkde-3d/page.tsx
    - src/app/stkde-3d/page.stkde.test.ts
completed: 2026-07-27
duration: 1h 10m
---

# Quick Task: Standalone-capable dashboard-demo 3D scene

Implemented a typed, store-free STKDE 3D scene boundary while preserving dashboard synchronization and making `/stkde-3d` consume only local dataset/runtime state.

## Implementation Result

- Added `Stkde3DSceneProvider` with explicit display/warp domains, adaptive settings, data identity, interaction callbacks, and shared forward/inverse Y resolvers with safe linear defaults.
- Removed dashboard, slice-domain, timeline, and viewport store reads from the shared scene, stack, adaptive axis, and hotspot trajectory renderers.
- Added `DashboardDemo3dProvider`; the shell now owns one `useDemoStkde()` request path and the hook uses `useSliceDomainStore` descriptors.
- Wired dashboard 3D data/runtime props for canonical slices, crimes, KDEs, burst volume, hotspot results, effective density/slice-authored warp, playback, and editing callbacks.
- Made `/stkde-3d` derive its epoch domain from loaded slices, assign stable local source IDs, use a local linear runtime, and keep playback/focus/raw-point/scrubber controls independent of dashboard stores.

## Verification

- Focused Vitest suite: **21 passed**
- ESLint with `--max-warnings 0` on all changed implementation/test files: **passed**
- `pnpm tsc --noEmit`: **passed**
- `pnpm build`: **passed**
- Source inspection: shared scene renderers and standalone route contain no dashboard coordination, slice-domain, viewport, or timeslicing store reads.

## Commits

- `49ad38d` feat(quick-260727): add store-free STKDE 3D scene runtime
- `ad6e986` fix(quick-260727): preserve scene pointer callbacks
- `6a74451` feat(quick-260727): wire dashboard 3D adapter and canonical slices
- `68d73f5` fix(quick-260727): preserve focused slice identity callbacks
- `702beb7` feat(quick-260727): make STKDE 3D route standalone
- `8143525` fix(quick-260727): keep dashboard 3D burst data client-safe
- `830d5f0` fix(quick-260727): keep standalone scrubber local
- `7dfe6e6` fix(quick-260727): align STKDE requests with rendered ranges
- `03d7fed` fix(quick-260727): preserve brushed cube data alignment

## Decisions Made

- Runtime construction is explicit at each consumer: dashboard derives effective warp/data state, while standalone uses a local linear runtime.
- Slice identity travels with rendered slices and callbacks rather than being reconstructed from persisted stores inside scene primitives.
- The dashboard burst-volume model uses the direct client-safe burst module so DuckDB-backed STKDE code is not bundled into the client.

## Deviations from Plan

### Auto-fixed Issues

1. **Rule 2 - Missing critical:** The existing standalone scrubber imported dashboard coordination state. Replaced it with local playback/scrubbing/speed props and callbacks in `/stkde-3d`.
2. **Rule 3 - Blocking:** Production build client-bundled the DuckDB-backed STKDE barrel through the dashboard burst-volume hook. Switched the dashboard 3D view to the direct client-safe burst-volume module.
3. **Test maintenance:** Updated stale source-regression expectations to match the current inspector and dashboard shell structure while adding provider/canonical-store assertions.

## Remaining Follow-up

No automated or type/lint blockers remain. A browser-level visual smoke check of `/stkde-3d` and `/dashboard-demo` is still recommended when a local browser session is available.

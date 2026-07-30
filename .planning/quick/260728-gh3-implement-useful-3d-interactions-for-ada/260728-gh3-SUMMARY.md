---
id: 260728-gh3-implement-useful-3d-interactions-for-ada
status: complete
mode: quick
subsystem: STKDE 3D interaction and dashboard synchronization
tags: [nextjs, react-three-fiber, zustand, stkde, adaptive-warp]
requires: [260727-wwn-standalone-capable-dashboard-demo-3d-pro]
provides:
  - Recoverable clock-time and visual allocation metrics for 3D slices
  - Store-free semantic slice, burst, trajectory, camera, and scan callbacks
  - Dashboard canonical synchronization for 3D selections and temporal commits
  - Standalone-safe inspection and fixed-duration scan controls
affects: [dashboard-demo, stkde-3d]
tech-stack:
  added: []
  patterns:
    - Full epoch domain remains the temporal commit authority
    - Exact top-level hotspot matching with centroid/range spatial fallback
    - Hover and scan proposal state stays local to the consuming view
key-files:
  created:
    - src/app/stkde-3d/lib/temporal-interactions.ts
    - src/components/dashboard-demo/lib/syncDemo3dInteraction.ts
    - src/components/dashboard-demo/lib/syncDemo3dInteraction.test.ts
  modified:
    - src/app/stkde-3d/lib/volume-encoding.ts
    - src/lib/hotspot-evolution.ts
    - src/app/stkde-3d/components/SliceInspector.tsx
    - src/app/stkde-3d/components/Stkde3DSceneProvider.tsx
    - src/app/stkde-3d/components/Stkde3DScene.tsx
    - src/app/stkde-3d/components/StkdeSliceStack.tsx
    - src/app/stkde-3d/components/BurstVolumeRenderer.tsx
    - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
    - src/components/dashboard-demo/Demo3dSpatialView.tsx
    - src/app/stkde-3d/page.tsx
completed: 2026-07-30
---

# Quick Task: Useful adaptive 3D interactions

Implemented the first useful interaction layer for the standalone-capable STKDE 3D scene without introducing a second timeline or dashboard-store dependencies into shared scene primitives.

## Implementation Result

- Added allocation metrics that distinguish actual clock duration from warped display duration, including event density, optional adaptive weight/signal, visual share, linear share, expansion/compression, and thickness.
- Added fixed-duration adaptive-axis scan proposals with explicit Apply-to-timeline commits.
- Preserved source `StkdeHotspot.id` values through trajectory snapshots.
- Added typed semantic callbacks for slice hover/select, burst selection, trajectory selection, camera focus, and scan proposals.
- Added shared slice/burst allocation inspection UI and interactive burst/trajectory targets.
- Wired dashboard selections through existing canonical stores and `applyRangeToStoresContract` using `fullTimeDomain`.
- Added safe trajectory mismatch handling: unknown slice-result hotspot IDs remain unselected and use centroid/range spatial bounds instead.
- Kept `/stkde-3d` local and independent from dashboard coordination, filter, time, and slice-domain stores.

## Verification

- Focused Vitest suite: **32 passed, 0 failed**
- ESLint with `--max-warnings 0` on the changed integration files: **passed**
- `pnpm tsc --noEmit`: **passed**
- `pnpm build`: **passed**
- `git diff --check`: **passed**
- Browser smoke: `/stkde-3d` loaded and exposed the local inspector/scan controls; the follow-up dashboard session was interrupted before interaction verification.

## Remaining Follow-up

- Complete a browser-level smoke pass on `/dashboard-demo` and `/stkde-3d`, especially clicking burst/trajectory targets and applying a scan proposal.
- Consider a small follow-up UI pass for inspector placement/occlusion after visual review.

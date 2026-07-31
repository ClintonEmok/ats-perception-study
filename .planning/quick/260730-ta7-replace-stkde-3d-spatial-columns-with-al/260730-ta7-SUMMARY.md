---
id: 260730-ta7-replace-stkde-3d-spatial-columns-with-al
status: complete
mode: quick
subsystem: STKDE 3D hotspot movement trajectories
tags: [nextjs, typescript, react-three-fiber, stkde, trajectories]
---

# Quick Task Summary

Replaced the low-value fixed spatial columns with hotspot movement trajectories in `/stkde-3d`.

## Accomplishments

- Added `kde-hotspots.ts` to derive up to five separated high-intensity KDE peaks per slice.
- Wired those slice candidates into the existing hotspot evolution matcher.
- Corrected trajectory coordinates to the normalized `-50..50` heatmap scene space.
- Rendered only multi-slice tracks, with immediate termination across missing slices.
- Preserved existing hotspot hover, selection, and camera-focus payloads.
- Removed `PersistentSpatialColumns` and its aggregation tests.

## Verification

- Focused Vitest suite: **9 passed, 0 failed**.
- `pnpm typecheck`: passed.
- ESLint: passed with existing repository warnings and no errors.
- `pnpm build`: passed.
- Browser smoke: `/stkde-3d` loaded and visibly rendered colored trajectory lines and snapshot markers over the heatmap stack.

## Changed Files

- `src/app/stkde-3d/lib/kde-hotspots.ts`
- `src/app/stkde-3d/lib/kde-hotspots.test.ts`
- `src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx`
- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/page.tsx`
- `src/lib/hotspot-evolution.test.ts`
- Removed `src/app/stkde-3d/components/PersistentSpatialColumns.tsx`
- Removed `src/app/stkde-3d/lib/spatial-columns.ts`
- Removed `src/app/stkde-3d/lib/spatial-columns.test.ts`

## Residual Concern

The current matcher is intentionally conservative: it does not bridge a missing slice, so a track can disappear and a later reappearing hotspot starts a new trajectory.

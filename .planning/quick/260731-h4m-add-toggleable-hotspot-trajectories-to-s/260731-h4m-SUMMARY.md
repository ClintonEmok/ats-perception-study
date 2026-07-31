---
id: 260731-h4m-add-toggleable-hotspot-trajectories-to-s
status: complete
mode: quick
subsystem: STKDE 3D trajectory visibility
tags: [nextjs, typescript, react-three-fiber, stkde, trajectories]
---

# Quick Task Summary

Added an independent trajectory visibility toggle to `/stkde-3d`.

## Changes

- Added `Trajectories` button beside `Raw points` in the route header.
- The button defaults on and exposes `aria-pressed` state.
- The scene conditionally mounts `HotspotTrajectoryOverlay` from the visibility prop.
- Adaptive/Fixed matching and qualified-track count remain available regardless of visibility.

## Verification

- Focused tests: **15 passed, 0 failed**.
- `pnpm typecheck`: passed.
- Targeted ESLint: passed with no issues.
- Dev route: `http://localhost:3000/stkde-3d` returns HTTP 200.
- Browser smoke: button state changed `true -> false -> true` successfully.

Changes are intentionally left uncommitted for review.

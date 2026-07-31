---
id: 260731-nsj
status: complete
mode: quick
subsystem: Standalone STKDE 3D adaptive temporal scaling
tags: [nextjs, typescript, stkde, adaptive-time, timeline]
---

# Quick Task Summary

Implemented density-derived adaptive temporal warping for standalone `/stkde-3d`.

## Changes

- Added `standalone-adaptive-time.ts` to derive a density map and warp map from event timestamps.
- Standalone runtime now uses adaptive time and the shared `resolveEpochY` path by default.
- Added an `Adaptive time` UI toggle for linear fallback comparison.
- Volume slab allocation receives the same active time-scale mode, warp blend, warp map, and domain.
- Active event points and trajectories therefore share the same adaptive vertical coordinate system.

## Verification

- Focused Vitest suite: **19 passed, 0 failed**.
- `pnpm typecheck`: passed.
- Targeted ESLint: passed with no issues.
- `pnpm build`: passed.
- Dev route: `http://localhost:3000/stkde-3d` returns HTTP 200.
- Browser smoke: `Adaptive time` started pressed, toggled to false, returned to true, and the route remained healthy.

Changes are intentionally left uncommitted for review.

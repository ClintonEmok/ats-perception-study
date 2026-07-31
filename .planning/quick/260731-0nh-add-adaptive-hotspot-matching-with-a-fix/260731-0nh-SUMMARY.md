---
id: 260731-0nh-add-adaptive-hotspot-matching-with-a-fix
status: complete
mode: quick
subsystem: STKDE 3D hotspot trajectory matching
tags: [nextjs, typescript, stkde, trajectories, matching]
---

# Quick Task Summary

Added a reversible Adaptive vs Fixed 3 km matcher for STKDE 3D hotspot trajectories.

## Matching Behavior

- Fixed mode preserves the legacy strict nearest-unused match within 3 km.
- Adaptive tolerance is `clamp(cellWidth + smoothingMeters, cellWidth, 2 * cellWidth)`, where `cellWidth = 10000 / gridSize`.
- Adaptive candidates are scored using distance, intensity continuity, and support continuity.
- Candidate links are deterministic and one-to-one.
- Tracks remain adjacent-slice only and terminate immediately when matching fails.
- The route defaults to Fixed for compatibility and exposes an accessible Adaptive/Fixed 3 km toggle.

## Verification

- Focused Vitest suite: **14 passed, 0 failed**.
- `pnpm typecheck`: passed.
- Targeted ESLint: passed with no issues.
- `pnpm build`: passed.
- Browser smoke: `/stkde-3d` loaded, Fixed was selected initially, Adaptive switched successfully, the displayed derived tolerance changed after grid adjustment, and Fixed restored its legacy explanation.

## Changed Files

- `src/lib/hotspot-evolution.ts`
- `src/lib/hotspot-evolution.test.ts`
- `src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx`
- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/page.tsx`

Changes are intentionally left uncommitted for review.

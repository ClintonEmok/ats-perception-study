---
id: 260731-1pa-remove-hotspot-track-caps-and-display-qu
status: complete
mode: quick
subsystem: STKDE 3D qualified hotspot tracks
tags: [nextjs, typescript, stkde, trajectories]
---

# Quick Task Summary

Removed arbitrary five-track limits and added qualified-track visibility to `/stkde-3d`.

## Changes

- Local KDE candidate selection now keeps every separated cell that qualifies under the active KDE cutoff.
- Shared hotspot slice preparation no longer truncates candidate hotspots to five.
- The 3D trajectory overlay renders every track with at least two snapshots.
- The track-matching panel reports the current qualified-track count.
- Fixed/Adaptive matching logic was not changed.

## Verification

- Focused Vitest suite: **15 passed, 0 failed**.
- `pnpm typecheck`: passed.
- Targeted ESLint: passed with no issues.
- `pnpm build`: passed.
- Browser smoke: `/stkde-3d` displayed the qualified count and rendered all qualifying trajectories; the current real subset reported **53 qualified tracks**.

Changes are intentionally left uncommitted for review.

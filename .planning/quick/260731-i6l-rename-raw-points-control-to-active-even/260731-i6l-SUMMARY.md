---
id: 260731-i6l-rename-raw-points-control-to-active-even
status: complete
mode: quick
subsystem: STKDE 3D controls
tags: [nextjs, typescript, stkde, ui]
---

# Quick Task Summary

Renamed the misleading `Raw points` control to `Active events` in `/stkde-3d`.

The overlay remains unchanged: it shows event points for the active slice only.

## Verification

- Route test: passed.
- TypeScript: passed.
- Targeted ESLint: passed.
- Dev route: HTTP 200 at `http://localhost:3000/stkde-3d`.
- Browser smoke: `Active events` is visible in the route header.

Changes are intentionally left uncommitted for review.

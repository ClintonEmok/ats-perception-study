---
id: 260731-h4m-add-toggleable-hotspot-trajectories-to-s
description: "Add a standalone visibility toggle for STKDE hotspot trajectories."
status: complete
mode: quick
validated: true
---

# Quick Task: Toggle hotspot trajectories

## Objective

Allow users to hide or show the hotspot trajectory overlay independently of the existing Raw points and Adaptive/Fixed matching controls.

## Implementation

- Added `showHotspotTrajectories` scene prop with a visible default.
- Added a `Trajectories` button with `aria-pressed` state to `/stkde-3d`.
- Kept trajectory matching options and qualified-track counts active when the overlay is hidden.
- Added route source coverage for the new control and scene prop.

## Verification

- 15 focused tests passed.
- TypeScript passed.
- Targeted ESLint passed with no issues.
- Dev server running at `http://localhost:3000`.
- Browser smoke confirmed trajectory toggle transitions `true -> false -> true`.

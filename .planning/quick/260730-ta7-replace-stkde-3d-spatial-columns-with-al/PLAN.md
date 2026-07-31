---
id: 260730-ta7-replace-stkde-3d-spatial-columns-with-al
description: "Replace fixed STKDE spatial columns with aligned hotspot movement trajectories."
status: complete
mode: quick
validated: true
---

# Quick Task: Replace STKDE spatial columns with hotspot trajectories

## Objective

Show how KDE hotspot peaks move through the adaptive 3D timeline instead of repeating persistent cells as fixed columns. Tracks use adjacent slices only and terminate immediately when a hotspot is absent.

## Implementation

- Derive up to five spatially separated peak candidates from each live local KDE slice.
- Feed those candidates into the existing hotspot evolution matcher and trajectory interaction layer.
- Use normalized heatmap coordinates for trajectory rendering so paths align with the surfaces.
- Render only tracks with at least two adjacent observations.
- Remove the fixed-column renderer and its tests.

## Verification

- Focused Vitest suite passed.
- TypeScript passed.
- ESLint passed with existing repository warnings only.
- Production build passed.
- Browser smoke confirmed visible trajectory lines and markers on `/stkde-3d`.

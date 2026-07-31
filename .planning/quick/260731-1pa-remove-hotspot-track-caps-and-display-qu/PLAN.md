---
id: 260731-1pa-remove-hotspot-track-caps-and-display-qu
description: "Remove arbitrary hotspot track caps and display the qualified-track count."
status: complete
mode: quick
validated: true
---

# Quick Task: Remove hotspot track caps

## Objective

Use the existing KDE cutoff, spatial separation, and Fixed/Adaptive matcher to determine which tracks qualify. Do not impose an arbitrary five-candidate or five-rendered-track limit.

## Implementation

- Removed the five-candidate limit from local KDE peak selection.
- Removed the five-hotspot limit from shared slice result preparation.
- Removed the five-rendered-track limit from the 3D trajectory overlay.
- Added a qualified-track count to the standalone track-matching control.
- Kept Fixed/Adaptive matcher logic unchanged.

## Verification

- 15 focused tests passed.
- TypeScript passed.
- Targeted ESLint passed with no issues.
- Production build passed.
- Browser smoke showed all qualifying trajectories and `53 qualified tracks` on the current real subset.

---
id: 260731-nsj
description: "Implement density-derived adaptive temporal warp for standalone /stkde-3d."
status: complete
mode: quick
validated: true
---

# Quick Task: Standalone adaptive temporal warp

## Objective

Make standalone `/stkde-3d` use the same density-derived adaptive time mapping as the dashboard, with a linear fallback toggle.

## Implementation

- Built a local density and warp map from preserved event timestamps.
- Enabled adaptive time by default in the standalone scene runtime.
- Added an `Adaptive time` toggle to switch between adaptive and linear mappings.
- Passed the active warp settings into duration volume allocation.
- Kept event points and hotspot trajectories on the shared runtime epoch-to-Y path.

## Verification

- 19 focused tests passed.
- TypeScript passed.
- Targeted ESLint passed with no issues.
- Production build passed.
- Browser smoke confirmed adaptive time starts enabled, toggles off/on, and the route remains HTTP 200.

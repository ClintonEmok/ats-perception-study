---
id: 260731-i6l-rename-raw-points-control-to-active-even
description: "Rename the STKDE 3D raw-points control to accurately describe active-slice events."
status: complete
mode: quick
validated: true
---

# Quick Task: Rename active event control

## Objective

Make the event overlay label match the implementation: it renders event points for the currently active slice, not a full raw-point dataset.

## Implementation

- Renamed `Raw points` to `Active events`.
- Updated route source coverage.

## Verification

- Route test passed.
- TypeScript passed.
- Targeted ESLint passed.
- Dev route returned HTTP 200.
- Browser snapshot shows the `Active events` control.

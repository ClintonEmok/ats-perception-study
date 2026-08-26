---
status: resolved
trigger: "YOU FORGOT TO MAKE THE TOP DOWN EVOLUTION ANIMATION AS THE SLICES ACTIVELY CHANGE SHOWING EVOLUTION"
created: 2026-08-26
updated: 2026-08-26
---

# Debug Session: Top-Down Slice Evolution

## Symptoms

- expected: During the top-down cube segment, slices actively change over time to visibly communicate temporal evolution while retaining the same underlying data.
- actual: The top-down segment holds a static slice stack after scan mode was disabled to fix inconsistent content.
- errors: None reported.
- timeline: Introduced by the previous correction that set `scanDayProgress={-1}`.
- reproduction: Play or inspect the product-release composition's cube transition and top-down hold.

## Current Focus

- hypothesis: Disabling `scanDayProgress` removed both the inconsistent scan overlay and the only slice-evolution driver; the top-down sequence needs a separate stable-data activation animation.
- test: Inspect `DashboardDemoProductRelease.tsx` and `DashboardDemoCube.tsx` props and frame calculations.
- expecting: The cube receives no frame-varying slice activation value during the top-down hold.
- next_action: gather initial evidence

## Evidence

- `DashboardDemoProductRelease.tsx:177` passed `scanDayProgress={-1}` throughout the cube scene.
- `DashboardDemoCube.tsx:88-89` derives `isScanning` exclusively from that prop, and the only frame-varying day activation previously came from `activeScan`.
- The product-release top-down hold is local seconds `8.2` through `10.0`; it had no alternate slice activation input.

## Eliminated

- Changing the underlying cells, slice timestamps, or projection was rejected because side and top-down views must show identical cube content.
- Re-enabling scan mode was rejected because it restores the inconsistent scan overlay that motivated `scanDayProgress={-1}`.

## Resolution

- root_cause: `scanDayProgress={-1}` disabled the cube's only active-slice animation, leaving the top-down hold static.
- fix: Added optional `sliceEvolutionProgress` to `DashboardDemoCube`; it changes only active-slice opacity, outline, and point emphasis. `DashboardDemoProductRelease` drives it from slice 1 through slice 7 during the top-down hold while leaving scan mode disabled.
- verification: Targeted ESLint and TypeScript checks passed; frame inspection confirmed the product-release composition renders distinct active slices during the hold without changing slice geometry or adding vertical stems.
- files_changed: `video/dashboard-demo-showcase/DashboardDemoCube.tsx`, `video/dashboard-demo-showcase/DashboardDemoProductRelease.tsx`, `.planning/debug/top-down-slice-evolution.md`

## Postmortem

- The scan animation was coupled to visual activation state instead of being modeled as a separate presentation driver.
- Future cube animations should keep data, geometry, camera, and emphasis drivers independent so a visual correction cannot silently remove temporal motion.

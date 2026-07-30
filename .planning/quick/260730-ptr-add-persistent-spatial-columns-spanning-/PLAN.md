---
id: 260730-ptr-add-persistent-spatial-columns-spanning-
description: "Add fixed spatial columns to /stkde-3d by aggregating persistent normalized heatmap cells across actual STKDE slices."
status: ready
mode: quick
validated: true
autonomous: true
user_setup: []
files_modified:
  - src/app/stkde-3d/lib/spatial-columns.ts
  - src/app/stkde-3d/lib/spatial-columns.test.ts
  - src/app/stkde-3d/components/PersistentSpatialColumns.tsx
  - src/app/stkde-3d/components/Stkde3DScene.tsx
  - src/app/stkde-3d/page.tsx
must_haves:
  truths:
    - "In /stkde-3d, a qualifying heatmap cell stays at one normalized x/z position while its column segments occupy the actual timeline intervals in which that cell qualifies."
    - "A cell that is absent or below the existing KDE cutoff in an intermediate slice leaves a visible vertical gap; the renderer never interpolates a column through that slice."
    - "Column segment boundaries use the same runtime epoch-to-Y resolver as the slice surfaces, so nonuniform slice durations and adaptive warping affect height without changing the cell's spatial anchor."
    - "Columns are fixed spatial aggregates, not moving hotspot/trajectory ribbons, and the existing trajectory projection mismatch is not propagated into their coordinates."
  artifacts:
    - path: "src/app/stkde-3d/lib/spatial-columns.ts"
      provides: "Pure duplicate-safe persistence aggregation and epoch-to-Y segment mapping for normalized KDE cells."
    - path: "src/app/stkde-3d/lib/spatial-columns.test.ts"
      provides: "Unit coverage for persistence, gaps, duration, normalization, duplicates, empty inputs, and coordinate contracts."
    - path: "src/app/stkde-3d/components/PersistentSpatialColumns.tsx"
      provides: "Non-interactive fixed-position 3D column geometry rendered from aggregated slice segments."
  key_links:
    - from: "src/app/stkde-3d/page.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "opt-in standalone route flag and existing KDE cutoff/grid settings"
      pattern: "showPersistentSpatialColumns"
    - from: "src/app/stkde-3d/components/PersistentSpatialColumns.tsx"
      to: "src/app/stkde-3d/lib/spatial-columns.ts"
      via: "buildPersistentSpatialColumns plus segment Y mapping"
      pattern: "buildPersistentSpatialColumns"
    - from: "src/app/stkde-3d/components/PersistentSpatialColumns.tsx"
      to: "src/app/stkde-3d/components/Stkde3DSceneProvider.tsx"
      via: "runtime resolveEpochY callback for both segment endpoints"
      pattern: "resolveEpochY"
    - from: "src/app/stkde-3d/components/PersistentSpatialColumns.tsx"
      to: "src/lib/kde/types.ts"
      via: "normalized KdeCell x/z values are used directly, without project()"
      pattern: 'cell\\.x|cell\\.z'
---

# Quick Task: Persistent spatial columns across STKDE slices

## Objective

Add the recommended fixed spatial-column interpretation to `/stkde-3d`. A heatmap cell that survives a configurable number of slice-level KDE results should render as a stable column at that cell's normalized `(x, z)` location, with one vertical segment per qualifying actual timeline slice. The aggregation must retain gaps rather than turning persistence into a continuous moving ribbon.

Purpose: The current route renders independent heatmap surfaces and a separate projected hotspot trajectory. Persistent columns should reveal spatial persistence without changing the existing STKDE contracts, data pipeline, adaptive axis, or trajectory semantics.

Output: A pure, unit-tested aggregation contract; a store-free, non-interactive column renderer; and an opt-in `/stkde-3d` integration. Do not add an API route, worker, voxel engine, camera system, trajectory refactor, or dashboard-wide behavior.

## Context

Read these before execution:

- `AGENTS.md`
- `.planning/STATE.md`
- `.planning/PROJECT.md`
- `.planning/quick/260728-gh3-implement-useful-3d-interactions-for-ada/260728-gh3-SUMMARY.md`
- `src/app/stkde-3d/lib/types.ts`
- `src/app/stkde-3d/lib/timeline-axis.ts`
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx`
- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/components/StkdeSliceStack.tsx`
- `src/app/stkde-3d/page.tsx`
- `src/lib/kde/compute-slice-kde.ts`
- `src/lib/kde/types.ts`
- `src/lib/projection.ts`
- `src/lib/coordinate-normalization.ts`

Established contracts and constraints:

- `computeSliceKde()` emits `KdeCell` values at normalized scene coordinates (currently the `-50..50` heatmap coordinate space) and removes cells whose normalized intensity is not greater than its configured cutoff. `sliceKdes` is aligned to the ordered `slices` array in both the standalone page and the dashboard adapter.
- `Stkde3DSceneRuntime.resolveEpochY(epochSec)` is the canonical adaptive/linear epoch-to-Y mapping. `resolveSliceY()` only anchors the slice start; persistent segments must resolve both actual epoch endpoints through `resolveEpochY()` and must not use `SLICE_SPACING` or slice index as their temporal geometry.
- The existing `HotspotTrajectoryOverlay` calls `src/lib/projection.ts::project()`, which uses WebMercator pixel-like coordinates centered on downtown. Those coordinates do not share the normalized heatmap grid's scale/orientation. This task must not call `project()` for columns, must not convert a heatmap cell through lat/lon, and must not modify the trajectory overlay. If a geographic conversion is ever needed later, it must use the repository's explicit normalization contract rather than silently reusing `project()`.
- Keep shared scene code store-free. The column layer is opt-in from `/stkde-3d` so the dashboard's existing scene does not gain a new overlay unless explicitly enabled.
- A missing/empty `sliceKdes[i]` is the authoritative absence signal. Do not synthesize a cell from neighboring slices, connect non-adjacent observations, or fill below-cutoff gaps.

## Scope guardrails

- Add only the five files listed in frontmatter; the test file and renderer are new.
- Use existing `KdeCell`, `EvolvingSlice`, `Stkde3DSceneRuntime`, `resolveEpochY`, and KDE cutoff/grid settings. Do not duplicate STKDE computation or introduce another spatial coordinate system.
- The persistence threshold is a minimum number of qualifying slice observations, not a geometric interpolation threshold. Default it to `2`; keep it as a pure helper/renderer option rather than adding a new control panel.
- Treat each qualifying source slice as its own segment. Adjacent qualifying segments may visually touch, but a missing/below-cutoff slice must remain a missing segment even when the same cell qualifies before and after it.
- Preserve the current focus view semantics: persistent columns render only in stack view; single-slice focus must not fabricate persistence from a one-element array.

## Tasks

### Task 1: Define and test the pure persistent-cell aggregation contract

<task type="auto">
  <name>Build duplicate-safe persistent spatial columns from aligned slice KDE cells</name>
  <files>
    src/app/stkde-3d/lib/spatial-columns.ts (new)
    src/app/stkde-3d/lib/spatial-columns.test.ts (new)
  </files>
  <action>
    Create a pure `buildPersistentSpatialColumns` helper whose input is the ordered slice metadata (`index`, `startEpoch`, `endEpoch`), aligned `KdeCell[][]`, a minimum persistence count defaulting to `2`, and the existing KDE intensity cutoff as an optional defensive threshold. Pair KDE arrays by slice-array position, treating a missing array or empty array as no observation; ignore non-finite cells and invalid/non-positive time ranges. Use a canonical key derived only from normalized cell x/z (round to a stable small precision before keying) so duplicate cell records within one slice cannot inflate persistence. For same-slice duplicates, keep the strongest finite intensity and use support as a deterministic tie-breaker; never sum duplicates or turn one slice into multiple persistence hits.

    Group observations by that key, retain groups with at least the persistence threshold, and emit one segment per qualifying source slice with the exact source `sliceIndex`, `startEpoch`, `endEpoch`, raw intensity, support, and a globally normalized intensity. Normalize retained finite segment intensities against the maximum retained raw intensity, clamp the normalized result to `[0, 1]`, and return an empty result when there are no valid retained intensities. Sort segments by actual epoch start with a stable source-index tie-breaker. Do not merge across absent slices; the output must contain no synthesized interval between two observations. Keep the canonical x/z anchor on the normalized heatmap coordinates, not on `centroidLat`/`centroidLng` or `project()` output.

    Export a small pure `mapPersistentSpatialSegmentToY(segment, resolveEpochY)` helper (or equivalent typed mapping function) for the renderer. Resolve both actual epoch endpoints independently, return center/height only when the mapped endpoints are finite and increasing, and never derive height from slice index, fixed spacing, or linear interpolation between slice centers. Keep output types local to this module and import the existing `KdeCell` contract rather than creating a second cell shape.

    Add focused Vitest cases before any geometry work: empty slices and missing KDE arrays produce no segments; a cell present in non-consecutive slices passes the threshold but preserves the middle gap; a below-cutoff cell is absent rather than filled; nonuniform epoch durations are preserved exactly; `minSlices` excludes one-off cells; duplicate cells count once and select the deterministic winner; invalid/zero intensities do not poison normalization; retained intensities normalize against the retained global maximum; and normalized x/z anchors remain unchanged. Add a mapping case with a deliberately non-linear/uneven epoch-to-Y callback proving both actual endpoints are used.
  </action>
  <verify>
    - `pnpm vitest run src/app/stkde-3d/lib/spatial-columns.test.ts`
    - `pnpm exec eslint --max-warnings 0 src/app/stkde-3d/lib/spatial-columns.ts src/app/stkde-3d/lib/spatial-columns.test.ts`
    - The test assertions explicitly distinguish `sliceIndex`/epoch boundaries from visual Y, prove a non-consecutive persistence gap remains absent, and prove duplicate records do not increase persistence count.
  </verify>
  <done>
    - A deterministic pure helper returns fixed normalized x/z anchors with per-slice temporal segments and no fabricated gaps.
    - Persistence, threshold absence, duplicate handling, intensity normalization, empty input, nonuniform duration, and adaptive endpoint mapping all have unit coverage.
    - The helper has no React, Three.js, store, API, worker, or geographic projection dependency.
  </done>
</task>

### Task 2: Render the fixed columns only in the standalone stack view

<task type="auto">
  <name>Wire store-free persistent column geometry to the adaptive STKDE scene</name>
  <files>
    src/app/stkde-3d/components/PersistentSpatialColumns.tsx (new)
    src/app/stkde-3d/components/Stkde3DScene.tsx
    src/app/stkde-3d/page.tsx
  </files>
  <action>
    Add `PersistentSpatialColumns` as a store-free renderer that consumes aligned `slices`/`sliceKdes`, the current `kdeGridSize`, the existing cutoff when supplied, and `resolveEpochY` from `useStkde3DSceneRuntime()`. Build the pure model with the default two-slice persistence threshold. For each returned segment, use `mapPersistentSpatialSegmentToY` and render a shallow box/cuboid at the segment's direct normalized `x`/`z` anchor, centered between the mapped start/end Y values, with height equal to the mapped interval. Size the footprint from the existing grid size (with a small lower bound), use the existing STKDE intensity palette/transparent material conventions, and make the geometry non-interactive/non-blocking so slice selection, resize handles, burst targets, and trajectory targets retain their current event behavior. Prefer a compact instanced or otherwise bounded geometry path if implementation is straightforward, but do not build a voxel engine.

    The renderer must create independent segment geometry from the helper output: qualifying observations in multiple slices form a fixed column at the same x/z, while an absent/below-cutoff slice creates no mesh between its neighbors. Do not render `Line`, centroid paths, moving ribbons, lat/lon positions, `project()`, `SLICE_SPACING`, or `yForIndex()`. Use both `resolveEpochY(startEpoch)` and `resolveEpochY(endEpoch)` so adaptive warping and nonuniform durations match the surface/axis mapping. Return null for empty models or invalid mapped segments.

    Extend `Stkde3DScene` with an opt-in `showPersistentSpatialColumns` flag and the minimal threshold/grid props needed by the renderer. Mount the new layer in `SceneContent` only when the flag is true and `viewMode === 'stack'`; keep it out of focus mode and keep the shared scene free of dashboard-store imports. In `/stkde-3d/page.tsx`, enable the flag and pass the current `kdeParams.threshold`/`kdeParams.gridSize` so changing the existing KDE cutoff or grid size changes the same cells/footprints as the surfaces. Leave the dashboard adapter unmodified and therefore opt-in false by default. Do not change `HotspotTrajectoryOverlay`, `src/lib/projection.ts`, STKDE APIs, workers, or camera behavior.
  </action>
  <verify>
    - `pnpm vitest run src/app/stkde-3d/lib/spatial-columns.test.ts src/app/stkde-3d/lib/timeline-axis.test.ts src/app/stkde-3d/page.stkde.test.ts`
    - `pnpm exec eslint --max-warnings 0 src/app/stkde-3d/lib/spatial-columns.ts src/app/stkde-3d/lib/spatial-columns.test.ts src/app/stkde-3d/components/PersistentSpatialColumns.tsx src/app/stkde-3d/components/Stkde3DScene.tsx src/app/stkde-3d/page.tsx`
    - `pnpm typecheck`
    - `pnpm build`
    - Source inspection confirms the new renderer contains no `project(` call, uses direct cell x/z, calls `resolveEpochY` for both segment endpoints, and is only enabled by `/stkde-3d` stack view.
    - Manual smoke on `/stkde-3d`: columns remain vertically aligned to one heatmap cell across qualifying slices; empty/cutoff slices show holes; longer/shorter real slice intervals produce corresponding Y spans; changing KDE cutoff/grid updates the same cell field; focus mode hides persistence columns; existing slice hover/select, resize, playback, raw points, and trajectory behavior remain intact.
  </verify>
  <done>
    - `/stkde-3d` visibly renders fixed spatial columns from the tested aggregation model without moving hotspot ribbons.
    - Geometry honors actual epoch intervals and the adaptive runtime resolver while preserving gaps and normalized heatmap anchors.
    - Existing standalone and dashboard scene behavior remains safe because the overlay is opt-in, non-interactive, and introduces no new data/worker/API path.
  </done>
</task>

## Overall verification

Run Task 1's focused tests before Task 2's integration checks. Then run the focused route/axis tests, lint, `pnpm typecheck`, `pnpm build`, and `git diff --check`. Confirm that the aggregation tests cover empty slices, missing arrays, below-cutoff absence, nonuniform durations, persistence threshold, intensity normalization, duplicate cells, and non-consecutive gaps. Confirm by source inspection that columns use normalized `KdeCell.x/z` directly and never use the trajectory `project()` function. Complete the `/stkde-3d` manual smoke path and verify that only the standalone stack view opts in.

Success means:

- A spatial heatmap cell that persists across the threshold is represented by stable fixed x/z geometry with one actual-slice segment per qualifying observation.
- Missing or below-threshold observations remain visible temporal gaps, including between qualifying observations before and after the gap.
- Segment Y bounds come from the same adaptive `resolveEpochY` mapping used by the scene surfaces/axis, not from fixed slice spacing or trajectory interpolation.
- Duplicate cells are deterministic, intensity values are safely normalized, empty inputs do not crash, and nonuniform durations are not collapsed into equal-height slices.
- No new API, worker, voxel renderer, camera system, projection refactor, trajectory ribbon, or dashboard-wide overlay is introduced.

## Output

After execution, create `.planning/quick/260730-ptr-add-persistent-spatial-columns-spanning-/260730-ptr-SUMMARY.md` with the implementation result, focused verification results, and manual smoke notes. Do not create that summary during planning-only review.

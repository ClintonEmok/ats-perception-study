# Phase 79: Adaptive 3D Visualization + Interactive Slices — Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is exclusively about making the adaptive warp map visible in the demo 3D STKDE widget and adding interactive manipulation for applied slices in the 3D view (select, resize, warp weight, delete). Double-click creation still produces a pending draft for the Slices tab.

It does **not** expand the map behavior, timeline animation beyond warp density strips, camera policy, study/logging infrastructure, or any non-demo route. The only intended work surface is the demo 3D widget chain + cross-view sync verification.

</domain>

<decisions>
## Implementation Decisions

### Adaptive axis visualization
- **D-01:** The warp map (1024 bins) renders as a semi-transparent volumetric axis behind the slice stack, not replacing the stack itself.
- **D-02:** Bin color follows a warm gradient from the density map (blue = sparse, orange/red = dense) so distortion reads at a glance.
- **D-03:** In linear mode all bins are equal height (or hidden). In adaptive mode bin height = proportional to warped duration.

### Variable slice spacing
- **D-04:** Applied slices in `StkdeSliceStack` reposition based on the warp map instead of fixed `yForIndex = START_Y + index * SLICE_SPACING`.
- **D-05:** The mapping uses `(startEpoch + endEpoch) / 2` sampled through the warp map for each slice's Y position.
- **D-06:** When `timeScaleMode === 'linear'`, slices return to fixed equal spacing. The toggle is instantaneous.

### 3D slice interaction
- **D-07:** Clicking an applied slice sets `activeSliceIndex` in the shared coordination store — same channel as the Inspect panel.
- **D-08:** Drag handles render only on the selected applied slice, at the top and bottom of its volume.
- **D-09:** Double-click on empty space creates a pending draft via `addManualDraftRange()` — same function as the "Range" button in the Slices tab.
- **D-10:** All applied-slice edits in 3D write through shared stores (`useSliceDomainStore`, `useDashboardDemoTimeslicingModeStore`) — timeline and Slices tab react automatically.

### Warp weight and delete
- **D-11:** Per-slice warp weight is adjustable via an HTML overlay slider on the selected slice.
- **D-12:** A delete button in the same overlay removes the slice from the store.

### Cross-view sync
- **D-13:** No new coordination channel is introduced. The existing stores already connect all views.
- **D-14:** Verification tests are manual: confirm each direction (tab→3D, 3D→tab, 3D→timeline, timeline→3D) stays in sync.

### Planning split
- **D-15:** ADP-01 and ADP-02 (axis + variable spacing) are the foundation — they must land first for the visual to exist.
- **D-16:** ADP-03 and ADP-04 (interaction + sync) build on the foundation.
- **D-17:** ADP-05 and ADP-06 (warp weight, delete, polish) complete the interaction set.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — canonical phase 79 goal, plan list, and success criteria.
- `.planning/REQUIREMENTS.md` — ADP-01 through ADP-06 are the source-of-truth requirements.
- `.planning/STATE.md` — milestone state and phase completion history.

### Demo 3D widget path
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — orchestration layer with ordered slice list.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — 3D scene wrapper and pass-through layer.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — slice rendering, positions, and interaction surface.
- `src/store/useDashboardDemoCoordinationStore.ts` — shared warp state (warpMap, densityMap, timeScaleMode, warpFactor, activeSliceIndex).
- `src/store/useSliceDomainStore.ts` — applied slice definitions, update/remove methods.
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — pending draft creation via `addManualDraftRange`, `updatePendingBinRange`.
- `src/lib/stores/viewportStore.ts` — current viewport time window used for adaptive positioning.

### Adaptive computation pipeline
- `src/workers/adaptiveTime.worker.ts` — 1024-bin warp map computation from timestamps.
- `src/components/timeline/hooks/useScaleTransforms.ts` — `toDisplaySeconds()` and `sampleWarpSeconds()` for Y↔time mapping.
- `src/lib/adaptive-utils.ts` — `ADAPTIVE_BIN_COUNT = 1024`, `ADAPTIVE_KERNEL_WIDTH = 3`.

### Existing interaction patterns
- `src/components/viz/SlicePlane.tsx` — drag handle and raycasting pattern for slice resize in the main dashboard.
- `src/components/viz/TimeSlices.tsx` — double-click to create slice pattern.
- `src/components/viz/AggregatedBars.tsx` — `instancedMesh` pattern for 1024-bin rendering.

</canonical_refs>

<specifics>
## Specific Ideas

- The adaptive warp axis should sit behind the slice stack with low opacity (~15%) so slices remain the primary visual element.
- Slice Y-position in adaptive mode should be derived from each slice's midpoint time, not its duration. Duration already drives thickness.
- The drag handle interaction in `SlicePlane.tsx` uses pointer capture + window-level pointermove — this pattern should be reused for 3D drag-to-resize.
- The timeline warp density strip can reuse the existing `DensityHeatStrip` component from `src/components/timeline/DensityHeatStrip.tsx`.

</specifics>

<assumptions>
## Assumptions

- The warp map in `useDashboardDemoCoordinationStore` is computed and available when `timeScaleMode === 'adaptive'`.
- Applied slices in `useSliceDomainStore` always have `startDateTimeMs` and `endDateTimeMs` values for epoch time calculation.
- `updatePendingBinRange` in the timeslicing store handles both draft range updates — a resize callback can call this directly.
- The existing `activeSliceIndex` in the coordination store is sufficient for 3D→tab sync without additional wiring.
- The current viewport time window comes from `useViewportStore` and is the domain used for adaptive slice spacing.
- Pending drafts remain non-interactive in 3D and stay visible only in the Slices tab.

</assumptions>

---

*Phase: 79-adaptive-3d-visualization*
*Context gathered: 2026-06-09*

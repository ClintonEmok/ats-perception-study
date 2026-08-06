# Phase 74 Summary: Coordination Polish (FLOW-10)

## Goal

Synchronize the map, 3D view, and timeline around the active slice so that apply, playback, and navigation feel coherent across all views.

## Changes Made

### Task 1: Bridge `activeSliceIndex` → `activeSliceId` (DemoInspectPanel.tsx)
Added a `useEffect` in `DemoInspectPanel` that watches `activeIndex` and `visibleSlices`. When the active index changes (via playback or scrubber), it calls `useSliceDomainStore.getState().setActiveSlice(slice.sourceSliceId)`, propagating the index change to the domain store. This fixes the timeline highlight desync during playback/scrubbing.

### Task 2: Set `activeSliceIndex` immediately on apply (DemoSlicePanel.tsx)
In `handleApplySingleDraft`, after `applySingleGeneratedBin` succeeds, compute the index of the newly added slice in the sorted visible-range array and call `setActiveSliceIndex`. This eliminates the stale-index window where the inspect panel showed the wrong slice after apply.

### Task 3: Map responds to active slice (DemoMapVisualization.tsx + MapVisualization.tsx)
- Added `sliceTimeRange` and `activeSliceLabel` optional props to `MapVisualization`
- `DemoMapVisualization` computes the active slice's epoch range and label using the same `resolveSliceEpochRange` logic as the 3D view
- `MapVisualization` filters crime data client-side to only show points within the active slice's time range
- A "Slice: [name]" label appears in the map overlay when filtered

### Task 4: Guard 3D view override on data refetch (Demo3dSpatialView.tsx)
Changed the `useEffect` that sets `activeSliceIndex` to last slice to only fire on initial load (guarded by `hasLoadedRef`). On subsequent refetches, it only clamps if the index is out of bounds. This preserves the user's scrub position during playback.

## Files Changed
- `src/components/dashboard-demo/DemoInspectPanel.tsx` — bridge effect
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — set index on apply
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — guard refetch override
- `src/components/dashboard-demo/DemoMapVisualization.tsx` — compute slice context
- `src/components/map/MapVisualization.tsx` — filter data by slice time range

## Validation
- TypeScript: `tsc --noEmit` passes (no new errors)
- Tests: 94/99 pass, all 5 failures are pre-existing sourcemap tests (unrelated to Phase 74)

# Phase 5 Baseline: Cube Integration

**Status:** In progress

The shared burst model and renderer are available to the STKDE-3D and dashboard-demo paths, but `src/components/viz/TimeSlices.tsx` still performs slice-local cluster analysis and mounts several overlays directly. The remaining work is to complete that orchestration boundary without breaking map, timeline, cube, or active-selection synchronization.

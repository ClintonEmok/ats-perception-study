---
id: 20260803-adaptive-temporal-allocation
mode: quick
status: planned
---

# Adaptive temporal allocation context

## Goal

Make the dashboard-demo slice-authored temporal warp allocate one shared display domain from the existing density signal, while allowing each canonical `TimeSlice` to provide a bounded manual weight hint.

## Locked scope

- Primary implementation remains local to `src/components/dashboard-demo/lib/demo-warp-map.ts`.
- The timeline and 3D demo must consume the same dashboard-demo `densityMap` and full epoch domain when building the authored map.
- Manual editing uses `useSliceDomainStore.updateSlice`; do not wire `useAdaptiveStore`, `useWarpSliceStore`, or change legacy adaptive stores.
- Do not mutate `TimeSlice.range`, source dates, or any source slice geometry. Sorting and allocation operate on copied comparable-bin inputs.
- Preserve the existing shared `scoreComparableWarpBins()` / `buildComparableWarpMap()` pipeline, including positive minimum widths, bounded comparable weights, cumulative contiguous boundaries, and neutral fallback behavior.
- Do not add dependencies, workers, new stores, API routes, or a second temporal allocation implementation.

## Research findings to preserve

- `resolveSliceRange()` currently leaves normalized `[0, 100]` ranges in comparable bins even though callers and the sampler use epoch-second domains. Resolve normalized slice positions against the supplied epoch domain before scoring and sampling.
- Automatic per-slice signal is the mean of the existing `Float32Array` density map over that slice interval. `TimeSlice.warpWeight` is the manual per-slice hint/override and must be passed through `clampComparableWarpWeight()`.
- Comparable bins must be stably ordered by chronology before `scoreComparableWarpBins()` and `buildComparableWarpMap()`.
- The sampler must return finite, monotonic values clamped to the requested domain, including overlapping source slices whose allocated display segments remain distinct and contiguous.

## Existing anchors

- `DemoDualTimeline.tsx` computes and stores the dashboard-demo density map for `warpDomain`.
- `Demo3dSpatialView.tsx` reads the same coordination-store density map and uses `fullTimeDomain` for full-cube authored placement.
- `DemoSlicePanel.tsx` already reads canonical slices and `updateSlice`, and already displays the current warp strength.
- `src/lib/binning/warp-scaling.ts` owns the shared clamping and minimum-width allocation; its defaults are the authoritative `0.25`–`4` warp-weight bounds and `0.08` minimum-width request.

---
id: 20260803-adaptive-temporal-allocation
description: "Implement dashboard-demo adaptive temporal allocation from density-derived slice weights with bounded manual overrides and shared non-overlapping display space."
status: complete
mode: quick
validated: true
files_modified:
  - src/components/dashboard-demo/lib/demo-warp-map.ts
  - src/components/dashboard-demo/lib/demo-warp-map.test.ts
  - src/components/timeline/DemoDualTimeline.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/DemoSlicePanel.tsx
must_haves:
  truths:
    - "Visible dashboard-demo slices are allocated in chronological order across one shared epoch-second display domain, with finite contiguous non-overlapping output segments and a positive minimum width for every valid slice."
    - "A slice's automatic allocation weight is derived from the mean of the existing dashboard density map over its interval, while a finite manual TimeSlice.warpWeight acts as a bounded per-slice hint/override."
    - "Normalized TimeSlice ranges are converted into the epoch domain before comparable-bin scoring and sampling, and the source slice ranges/geometry are not mutated."
    - "The dashboard-demo timeline and 3D view build authored warp maps from the same density-map/domain inputs and identical slice dependencies whenever slice-authored mode is active."
    - "The slice details UI exposes a bounded numeric warp-weight control that updates only the canonical slice-domain store."
    - "Visible warp-enabled slices activate the existing dashboard slice-authored source from an always-mounted dashboard consumer, so the density-aware authored allocation remains reachable when the slice panel tab is inactive."
  artifacts:
    - path: "src/components/dashboard-demo/lib/demo-warp-map.ts"
      provides: "Density-aware authored comparable bins, normalized-to-epoch range resolution, chronological allocation, and domain-safe sample mapping."
      contains: "buildDemoSliceAuthoredWarpMap"
    - path: "src/components/dashboard-demo/lib/demo-warp-map.test.ts"
      provides: "Focused unit coverage for conversion, density/manual weighting, bounds, ordering, fallback, minimum widths, and overlap allocation."
    - path: "src/components/timeline/DemoDualTimeline.tsx"
      provides: "Timeline authored-map call using the shared dashboard density map and full warp domain."
    - path: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      provides: "3D authored-map call using the same density/domain contract as the timeline."
    - path: "src/components/dashboard-demo/DemoSlicePanel.tsx"
      provides: "Bounded per-slice numeric warp-weight editor wired to updateSlice."
  key_links:
    - from: "src/components/dashboard-demo/lib/demo-warp-map.ts"
      to: "src/lib/binning/warp-scaling.ts"
      via: "clampComparableWarpWeight, scoreComparableWarpBins, and buildComparableWarpMap"
      pattern: "clampComparableWarpWeight|scoreComparableWarpBins|buildComparableWarpMap"
    - from: "src/components/dashboard-demo/lib/demo-warp-map.ts"
      to: "Float32Array densityMap"
      via: "finite interval-index averaging over the supplied epoch domain"
      pattern: "densityMap"
    - from: "src/components/timeline/DemoDualTimeline.tsx"
      to: "src/components/dashboard-demo/lib/demo-warp-map.ts"
      via: "authored map memo receives densityMap, slices, and warpDomain"
      pattern: "buildDemoSliceAuthoredWarpMap"
    - from: "src/components/dashboard-demo/Demo3dSpatialView.tsx"
      to: "src/components/dashboard-demo/lib/demo-warp-map.ts"
      via: "authored map memo receives densityMap, slices, and fullTimeDomain"
      pattern: "buildDemoSliceAuthoredWarpMap"
    - from: "src/components/dashboard-demo/DemoSlicePanel.tsx"
      to: "useSliceDomainStore.updateSlice"
      via: "bounded numeric input updates warpWeight only"
      pattern: "updateSlice.*warpWeight"
---

# Quick Task: Dashboard-demo adaptive temporal allocation

<objective>
Implement the dashboard-demo authored temporal allocation so dense intervals receive more display space automatically, analysts can tune a slice with a bounded numeric override, and the timeline/cube use one stable shared-space mapping.

Purpose: Fix the normalized-range/epoch-domain mismatch and make authored allocation reflect the existing density signal without touching legacy adaptive stores or source slice geometry.

Output: A tested density-aware `demo-warp-map` implementation, synchronized timeline/3D call sites, and a canonical per-slice warp-weight control.
</objective>

<execution_context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/20260803-adaptive-temporal-allocation/CONTEXT.md
@src/components/dashboard-demo/lib/demo-warp-map.ts
@src/lib/binning/warp-scaling.ts
@src/lib/time-domain.ts
@src/components/dashboard-demo/lib/demo-warp-map.test.ts
@src/components/timeline/DemoDualTimeline.tsx
@src/components/dashboard-demo/Demo3dSpatialView.tsx
@src/components/dashboard-demo/DemoSlicePanel.tsx
</execution_context>

<scope_guard>
- Modify only the five application/test files listed in `files_modified`; the plan and context artifact are planning files, not application scope.
- Do not modify `useAdaptiveStore`, `useWarpSliceStore`, `useDashboardDemoCoordinationStore`, legacy adaptive utilities, shared source slice geometry, APIs, workers, or dependencies.
- Keep `buildComparableWarpMap()` as the allocator of cumulative contiguous display boundaries. Do not implement a second allocator or mutate input `TimeSlice` objects/ranges.
- Use the existing dashboard-demo `densityMap`; do not recompute density in the new warp helper and do not introduce another density source.
- Keep the work as one coherent quick task with the three bounded tasks below; no speculative architecture or unrelated UI changes.
</scope_guard>

<task_dependencies>
1. **Task 1 — core helper and tests** has no task dependency. It consumes the existing time-domain and comparable-warp APIs and creates the new `buildDemoSliceAuthoredWarpMap` input contract plus its focused regression suite.
2. **Task 2 — timeline/3D wiring** depends on Task 1 because both call sites must adopt the density-aware helper signature. It owns no files from Task 1 and only wires existing dashboard-demo state.
3. **Task 3 — manual control** is independent of Tasks 1–2 at the code level because the canonical `TimeSlice` and `updateSlice` already exist; run its final verification after Tasks 1 and 2 so the whole contract is checked together.

Dependency graph: `Task 1 → Task 2`; `Task 3` can be completed independently; `Task 1 + Task 2 + Task 3 → final quality gates`.
</task_dependencies>

<tasks>

<task type="auto">
  <name>Task 1: Build and test density-aware shared-space authored allocation</name>
  <files>
    src/components/dashboard-demo/lib/demo-warp-map.ts,
    src/components/dashboard-demo/lib/demo-warp-map.test.ts
  </files>
  <action>
    Update `resolveSliceRange()` to accept the requested epoch-second domain and convert every normalized `TimeSlice.range`/`TimeSlice.time` position from `[0, 100]` into that domain before returning it. Clamp the normalized inputs first, normalize reversed endpoints, reject non-positive/invalid intervals, and never write the converted values back to the source slice. Preserve the existing burst/non-burst point half-width behavior, but express its result in the epoch domain.

     Change `buildDemoSliceAuthoredWarpMap()` and its internal `buildSampleWarpMapFromComparableWarp()` contract so the builder receives the existing `Float32Array | null` density map alongside the epoch domain. For each visible, warp-enabled slice, compute the finite mean density-map value over the slice interval by mapping the epoch interval to clamped density indices. Use that mean as the comparable-bin automatic signal/count; when no usable density map exists, use a neutral unit signal rather than inventing a width-based signal. Keep a zero-density signal valid so the shared scorer can produce its neutral fallback. Extract/export a small `buildDemoSliceAuthoredWarpAllocation()` result helper that returns the shared `ComparableWarpMapResult | null`; the sampled public map should delegate to it so focused tests can assert exact cumulative boundaries and minimum width shares without duplicating the allocator.

    Preserve `TimeSlice.warpWeight` as the per-slice manual hint, but pass it through `clampComparableWarpWeight()` (the existing default bounds are 0.25–4) instead of the local 0–3 clamp. Stable-sort the newly-created comparable-bin copies by `startTime`, then `endTime`, then `id` before calling `scoreComparableWarpBins()` and `buildComparableWarpMap()`. Use the existing shared allocator with the 0.08 minimum-width request and its bounded-weight options; do not mutate `slices` or their ranges. Keep all output allocation in the supplied domain so overlapping source intervals still receive separate cumulative boundary segments rather than overlapping display-space ranges.

    Harden `buildSampleWarpMapFromComparableWarp()` against empty/invalid bins and edge positions: clamp logical sample positions to the domain, select the chronological comparable bin, interpolate only within finite bin/boundary values, clamp each result to the domain, and enforce finite nondecreasing samples. Preserve the neutral fallback and the final endpoint exactly.

    Add `demo-warp-map.test.ts` following the co-located Vitest style. Cover: normalized-range-to-epoch conversion through the public builder output; a density-heavy interval receiving more display allocation; a manual `warpWeight` override changing allocation; NaN/Infinity/out-of-range manual weights being clamped through `clampComparableWarpWeight()` without non-finite output; reversed input slices producing the same chronologically ordered result; finite monotonic output clamped to the requested domain; missing/all-zero density neutral fallback; positive minimum width for every valid comparable bin through the exported allocation result; and overlapping source slices yielding strictly increasing cumulative boundaries through that same result plus a finite monotonic sampled map. Use small deterministic `Float32Array` fixtures and assert source slice ranges remain unchanged.
  </action>
  <verify>
    Run `pnpm exec vitest run src/components/dashboard-demo/lib/demo-warp-map.test.ts`. Inspect that the helper imports and calls `clampComparableWarpWeight`, `scoreComparableWarpBins`, and `buildComparableWarpMap`, that normalized ranges are converted before bin construction, that comparable bins are sorted before scoring, and that the test fixtures assert all nine required behaviors.
  </verify>
  <done>
     `buildDemoSliceAuthoredWarpMap(slices, densityMap, domain, sampleCount)` returns finite domain-clamped monotonic samples whose slice allocation is density-derived or manually hinted, bounded, chronologically stable, minimum-width protected, neutral when signal is unavailable/degenerate, and cumulative in shared display space without changing source slice ranges.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire identical authored-map inputs into the timeline and 3D view</name>
  <files>
    src/components/timeline/DemoDualTimeline.tsx,
    src/components/dashboard-demo/Demo3dSpatialView.tsx
  </files>
  <action>
     Update the `buildDemoSliceAuthoredWarpMap()` call in `DemoDualTimeline.tsx` to pass the dashboard-demo coordination-store `densityMap`, the same full `warpDomain` used to compute `nextDensityMap`, and the existing sample count. Keep the existing `nextDensityMap`/`setPrecomputedMaps` flow unchanged; the authored helper consumes the already-available map and does not touch a legacy adaptive store. Keep the timeline fallback domain authoritative at `[0, 100]`. Because this component is always mounted in the dashboard shell, add a small effect that selects the existing `'slice-authored'` source whenever `hasVisibleWarpSlices` is true and returns to `'density'` when no authored slices remain; do not add a second source model.

     Update the authored-map call in `Demo3dSpatialView.tsx` to pass its dashboard-demo `densityMap`, `fullTimeDomain`, and the same sample-count policy. Align its unavailable-data fallback with the timeline's `[0, 100]` full domain. Keep scoped brushed density behavior, `warpSource` selection, warp blending, volume profile wiring, and scene runtime behavior unchanged. The full-domain authored map must not switch to `scopedDensityMap` or a new domain.

    Make both authored-map `useMemo` dependency lists include exactly the data that determines the result: `slices`, the shared density-map value, the full epoch domain, and the sample-count expression (or stable dependencies that produce it). Do not leave a stale density map/domain dependency in either component, and do not alter the source slice order/geometry used by the scene or timeline.
  </action>
  <verify>
    Inspect both call sites side by side and confirm they pass the dashboard-demo density map plus their equivalent full epoch domain and use the same `Math.max(96, slices.length * 8 || 0)` sample-count policy. Confirm both memo dependency arrays invalidate on slices, density map, and domain changes. Run `pnpm exec vitest run src/components/dashboard-demo/lib/demo-warp-map.test.ts` after the signature changes and use `pnpm exec eslint src/components/timeline/DemoDualTimeline.tsx src/components/dashboard-demo/Demo3dSpatialView.tsx` for the two integration files.
  </verify>
  <done>
    Timeline and 3D authored temporal placement respond to the same density/slice/domain state, with no legacy adaptive-store wiring, scoped-domain substitution, stale memo result, or source geometry mutation.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add the bounded canonical per-slice warp control and run final gates</name>
  <files>
    src/components/dashboard-demo/DemoSlicePanel.tsx
  </files>
  <action>
    In the selected-slice details dialog, add a numeric `Input` for the manual warp weight next to the existing Burst / warp summary. Give it an explicit accessible label such as `Warp weight`, `type="number"`, `min={0.25}`, `max={4}`, and a small decimal step (for example `0.05`). Display the selected slice's current value with the existing `warpWeight ?? 1` fallback and explain that it is a per-slice hint/override used by authored allocation.

     On numeric changes, ignore empty/non-finite intermediate values and call only the canonical `useSliceDomainStore.updateSlice(selectedSlice.id, { warpWeight: clampComparableWarpWeight(parsedValue) })`. Import the existing `clampComparableWarpWeight()` helper rather than duplicating its bounds. Preserve evaluation-lock behavior, the existing `warpEnabled` meaning, date editing, and all legacy adaptive stores; do not add a second store or alter slice ranges/geometry. Source activation is owned by the always-mounted timeline task, not this tab-mounted panel.
  </action>
  <verify>
    Inspect `DemoSlicePanel.tsx` for the bounded numeric input, the shared clamp helper, and an `updateSlice` call whose patch contains only `warpWeight`. Run `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx` and confirm no imports or calls to `useAdaptiveStore` or `useWarpSliceStore` were added.
  </verify>
  <done>
    Analysts can enter a finite per-slice warp weight in the visible 0.25–4 control range; stored values are clamped through the shared helper via canonical `updateSlice`, invalid intermediate input is safe, and existing slice/domain controls remain unchanged.
  </done>
</task>

</tasks>

<verification>
- Focused unit suite: `pnpm exec vitest run src/components/dashboard-demo/lib/demo-warp-map.test.ts`.
- Targeted lint: `pnpm exec eslint src/components/dashboard-demo/lib/demo-warp-map.ts src/components/dashboard-demo/lib/demo-warp-map.test.ts src/components/timeline/DemoDualTimeline.tsx src/components/dashboard-demo/Demo3dSpatialView.tsx src/components/dashboard-demo/DemoSlicePanel.tsx`.
- Static types: `pnpm typecheck`.
- Production build: `pnpm build`.
- Manual source review confirms only the five listed application/test files are in scope, both visualization call sites use the same density/domain/sample-count contract, the UI uses canonical `updateSlice`, and no legacy adaptive store or source slice geometry was changed.
</verification>

<success_criteria>
- Normalized slice positions are resolved into epoch seconds before comparable scoring/sampling.
- Density interval means drive automatic allocation; manual `TimeSlice.warpWeight` hints are clamped to the shared 0.25–4 bounds.
- Chronological comparable bins produce cumulative contiguous display allocation with positive minimum widths, no overlap, finite monotonic domain-clamped samples, and neutral fallback for absent/degenerate signal.
- `DemoDualTimeline` and `Demo3dSpatialView` use the same dashboard density map, full epoch domain, slice inputs, and sample-count policy for authored maps when slice-authored mode is active, with aligned fallback domains.
- The always-mounted timeline activates slice-authored mode while visible slices exist, the bounded numeric control updates only canonical slice-domain state, and focused Vitest, targeted eslint, typecheck, and build pass.
</success_criteria>

<output>
After execution, create `.planning/quick/20260803-adaptive-temporal-allocation/20260803-adaptive-temporal-allocation-SUMMARY.md` with the implementation and verification result. Do not commit planning or application changes as part of this quick-task execution.
</output>

# Quick Task: Integrate essential STKDE-3D into dashboard-demo - Research

**Researched:** 2026-08-03  
**Domain:** Next.js dashboard integration, server STKDE surfaces, React Three Fiber scene synchronization  
**Confidence:** HIGH for codebase findings; MEDIUM for comparison/API extension sizing

## Summary

The standalone route already provides the correct interaction model: a store-free `Stkde3DScene` runtime, stacked KDE surfaces, shared warped Y placement, slice playback/scrubbing, focus mode, active events, hotspot trajectories, burst volumes, tuning, inspection, and A/B comparison. Most scene primitives can be reused directly. The dashboard already owns the canonical slices, STKDE request, adaptive maps, and cross-view stores, so the migration should be an adapter/data-flow change rather than a second 3D implementation.

The principal mismatch is analytical provenance. `/dashboard-demo` currently renders local worker KDE cells in 3D while its server STKDE response supplies only hotspot/trajectory results. The map and rail use the server response, but the cube surfaces and current comparison path use separate local `/api/crimes/range` + `computeSliceKde` pipelines. This makes dashboard tuning controls unable to explain the 3D surfaces and permits temporal/index drift when slices are filtered or reordered.

**Primary recommendation:** make the debounced dashboard `/api/stkde/hotspots` response authoritative for 3D surface cells and trajectories, adapt each server slice result by stable `sourceSliceId` into `KdeCell[]`, retain local crime fetching only for active raw events, and move the standalone controls into an STKDE-first rail with one shared runtime for the cube, timeline, map, and compare mode.

## Current Architecture and Gap Matrix

| Concern | Standalone `/stkde-3d` | Dashboard `/dashboard-demo` | Migration decision |
|---|---|---|---|
| Slice source | Local dataset loader creates ten `EvolvingSlice`s and local IDs | `useSliceDomainStore` visible range slices | Dashboard canonical slices remain authoritative; never re-create IDs positionally |
| Surface data | `computeSliceKde()` per local event slice | `kdeSlice.worker.ts` computes local cells; server response is not used for surfaces | Replace dashboard surface input with adapted `stkdeResponse.sliceResults[id].heatmap.cells` |
| Hotspots/tracks | Local cells become `StkdeSurfaceResponse` through `kde-hotspots.ts` | Server `sliceResults` already contain hotspots | Use server hotspots directly; use local helper only for standalone/mock/local fallback |
| Temporal placement | `createStkde3DSceneRuntime()` owns the local epoch domain and warp resolver | Dashboard runtime already owns full/brushed domain, density/slice-authored warp, and allocation | Preserve dashboard runtime; surface adaptation must not alter timestamps |
| Raw events | Local dataset events | Separate per-slice crime fetch, aligned by source ID | Keep this fetch only for the opt-in active-events layer |
| Tuning | `KdeTuningPanel` controls local `KdeParams` | `useDemoStkde` controls server `StkdeParams`; 3D local worker ignores those params | One server-authoritative STKDE tuning panel; do not expose two meanings for “grid/smoothing” |
| Compare | Standalone stage expects complete `KdeField`s and supports signed difference | `DemoCompareStage` uses fresh local crime requests and SVG `KdeCell`s | Reuse comparison UI only after a dense field contract exists, or explicitly gate signed difference |

## Standard Stack

No new dependency is needed. Use the pinned project stack:

| Existing tool | Version | Use in this migration |
|---|---:|---|
| Next.js App Router | 16.1.6 | Existing `/api/stkde/hotspots` and dashboard route boundaries |
| React / TypeScript | 19.2.3 / 5.9.3 | Typed adapter and rail components |
| Zustand | 5.0.10 | Extend `useDashboardDemoCoordinationStore` for 3D controls only |
| Three.js / React Three Fiber / Drei | 0.182.0 / 9.5.0 / 10.7.7 | Reuse `Stkde3DScene`, `StkdeSliceStack`, `CameraControls`, and overlays |
| Vitest | 4.0.18 | Pure adapter, hook, synchronization, and source-contract tests |

**Do not add:** another frontend architecture, another data service, another KDE implementation, or another adaptive-warp store. The existing local DuckDB/API and worker model remain the data source; only the dashboard’s 3D surface projection changes.

## Architecture Patterns

### Directly reusable standalone functionality

Reuse these modules without copying their rendering logic:

- `src/app/stkde-3d/components/Stkde3DScene.tsx` — shared Canvas, map texture, scene runtime, camera controls, event layer, and prop boundary.
- `Stkde3DSceneProvider.tsx` — explicit `displayDomain`, `warpDomain`, `resolveEpochY`, `yToEpoch`, source IDs, and interaction callbacks. This is the synchronization boundary.
- `StkdeSliceStack.tsx` — field/legacy surface textures, active/adjacent opacity, interpolation, click/hover, and slice-boundary handles.
- `AdaptiveWarpAxis.tsx` — must consume the same runtime resolver as slices, trajectories, burst samples, and raw events.
- `HotspotTrajectoryOverlay.tsx` — server hotspot tracks are already in the required `StkdeSurfaceResponse` shape; pass a filtered, source-ID-keyed result map and explicit matching options.
- `BurstVolumeRenderer.tsx` and `SliceInspector.tsx` — reuse with dashboard burst model and allocation profile.
- `SliceScrubber.tsx` — move into the dashboard inspect rail, backed by coordination-store playback state.
- `StkdeIntensityLegend.tsx` and `KdeTuningPanel.tsx` — reuse presentation patterns, but replace the local `KdeParams` contract with server `StkdeParams` for dashboard tuning.
- `StkdeComparisonControls.tsx` / `StkdeComparisonStage.tsx` — reuse selection and presentation after resolving the dense-field limitation described below.

Do not reuse `dataset-loader.ts`, standalone case-study state, or `buildStandaloneAdaptiveTimeMaps()` in the dashboard. Dashboard density and authored warp maps are already shared with `DemoDualTimeline`; recomputing them from per-slice events would create a second temporal source.

### Recommended project structure

```text
src/components/dashboard-demo/
├── lib/
│   ├── adaptStkdeSurfaceToKdeCells.ts       # pure server-cell → scene-cell adapter
│   ├── adaptStkdeSurfaceToKdeCells.test.ts
│   └── useDemoStkde.ts                      # existing request lifecycle
├── DashboardDemoRailTabs.tsx                # STKDE-first tab order
├── StkdeTuningPanel.tsx                      # server StkdeParams controls
└── Demo3dSpatialView.tsx                     # explicit scene data/runtime adapter

src/store/useDashboardDemoCoordinationStore.ts
└── 3D control state: renderer, trajectories, matching mode, raw events, active/non-active opacity
```

Keep the adapter pure and keep `useDemoStkde()` mounted once in `DashboardDemo3dProvider`. The response lifecycle must remain debounced, abortable, and request-ID guarded.

## Exact Data-Flow Gaps

### 1. Server STKDE and local 3D KDE are different pipelines

`useDemoStkde.ts` posts `StkdeParams`, canonical slice descriptors, and dashboard domain to `/api/stkde/hotspots`. The route computes a normalized server heatmap and per-slice `sliceResults` keyed by the submitted slice IDs. However, `Demo3dSpatialView.tsx` separately:

1. fetches `/api/crimes/range` once per rendered slice, with up to 50,000 records;
2. converts records to local events;
3. sends only coordinates to `kdeSlice.worker.ts`;
4. renders those worker cells as `sliceKdes`.

The worker currently does not receive dashboard `StkdeParams`; its default local `KdeParams` are therefore not the server’s bandwidth, temporal, grid, support, or threshold settings. The result is a visually plausible but analytically different cube.

### 2. Dashboard passes server results only to trajectory/burst consumers

The current scene call has `sliceKdes={cubeSliceKdes}` but `hotspotSliceResults={stkdeResponse?.sliceResults}`. This is the core gap: surface textures use local cells while tracks and burst-volume derivation use server surfaces. Change the scene input to derive both surfaces and tracks from one server response. Local crime records should remain only for `showRawEvents` because the STKDE response intentionally does not contain individual events.

### 3. Positional indexes are unsafe under brushed scope

`cubeSlices` filters and reindexes slices for the brushed domain. `sourceSliceId` survives, but `sourceSliceIndex` is not explicitly carried through dashboard scene slices. Any fallback to `slice.index`, positional `sliceKdes[index]`, or `Object.values(sliceResults)` can associate a heatmap, event batch, or track with the wrong time interval. Stable IDs must be primary; rendered `index` is only a local draw index.

### 4. Server response is sparse, not a complete `KdeField`

`StkdeSurfaceResponse.heatmap.cells` contains `{lng, lat, intensity, support}` for populated/positive cells. It has no grid row/column metadata and no complete zero-valued field. That is sufficient for the stack’s `KdeCell[]` texture path, but it is not sufficient to fabricate the standalone comparison `KdeField` or a mathematically valid signed difference. Missing cells mean “not returned,” not necessarily “zero intensity.”

For A/B signed difference, add an explicit dense-field response for the selected pair (with grid metadata and response-size limits), or keep that mode disabled until such a contract exists. Do not subtract sparse cell lists by array index.

## Server Cell → `KdeCell` Contract

Add a pure adapter, then project by ID:

```ts
import { lonLatToNormalized } from '@/lib/coordinate-normalization';
import type { KdeCell } from '@/lib/kde';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';

export function adaptStkdeSurfaceToKdeCells(
  surface: StkdeSurfaceResponse | undefined,
): KdeCell[] {
  if (!surface) return [];

  return surface.heatmap.cells.flatMap((cell) => {
    if (![cell.lng, cell.lat, cell.intensity, cell.support].every(Number.isFinite)) return [];
    const { x, z } = lonLatToNormalized(cell.lng, cell.lat);
    // The API bbox is DEFAULT_STKDE_BBOX, which matches CHICAGO_BOUNDS.
    // Reject invalid out-of-domain cells; do not clamp a bad cell into another one.
    if (x < -50 || x > 50 || z < -50 || z > 50) return [];
    return [{
      x,
      z,
      intensity: Math.min(1, Math.max(0, cell.intensity)),
      support: Math.max(0, Math.round(cell.support)),
    }];
  });
}

const cubeSliceKdes = cubeSlices.map((slice) =>
  adaptStkdeSurfaceToKdeCells(stkdeResponse?.sliceResults[slice.sourceSliceId]),
);
```

Rules for this adapter:

- `lonLatToNormalized()` is the only coordinate conversion; do not copy the local `[x,z]` math or swap latitude into Y. In the scene, X/Z are spatial and Y is time.
- The current server implementation already normalizes intensity to `[0,1]` and emits `heatmap.maxIntensity: 1`; preserve/clamp that value rather than renormalizing each slice differently.
- Preserve support as the server cell count, rounded and non-negative. Do not infer support from intensity.
- Preserve sparse cells. The existing field texture can rasterize them to the selected display texture size, but that texture size is a render resolution, not the server grid resolution.
- Build the array from `cubeSlices.map(...)`, never from `Object.values(sliceResults)`.
- Add `sourceSliceIndex` to each full ordered dashboard scene slice before brushed reindexing. Keep `sourceSliceId` unchanged in `cubeSlices`; use render `index` only for profile/texture lookup.
- Surface adaptation changes no `startEpoch`, `endEpoch`, or event timestamp. Slice planes use `resolveSliceY(slice)`; trajectories use `resolveEpochY(peak midpoint)`; raw events use `resolveEpochY(event.timestampEpochSec)`. All three must receive the same runtime.
- When a brushed scope is active, filter server results to the ordered `cubeSlices` IDs before matching tracks. This prevents a hidden slice from linking two visible slices across a temporal gap.

## STKDE-First Rail Structure

Use the existing rail infrastructure, but make the STKDE-3D workflow the primary path. A coherent order is:

1. **STKDE** (rename current Overview/Scan): scope (`applied-slices` vs `full-viewport`), district/filter context, server tuning, run summary, event/cell/hotspot counts, truncation/fallback warnings, intensity legend, hotspot list, retry/empty state. This tab edits `stkdeParams`; it does not compute local KDE.
2. **Inspect 3D** (current Inspect): play/pause, stack/focus, slice scrubber, playback speed, active-events toggle, trajectory toggle, fixed/adaptive hotspot matching, field/legacy renderer, slice opacity, active/non-active emphasis, selected-slice inspector, and the shared adaptive-time controls.
3. **Detect**: preserve burst-window candidate generation and crime-type selection. On successful generation, route to Slices/Inspect as today.
4. **Slices**: preserve review, merge/split, apply, delete, date editing, and per-slice authored warp weight. Applied slices remain the only source of temporal stack intervals.
5. **Compare**: keep A/B slot selection keyed by source ID and move the standalone comparison mode here. Absolute comparison can use adapted surfaces; signed difference requires dense fields and a shared domain.

Move `GlobalWarpControls` into the Inspect 3D content rather than leaving it as an unlabelled global block above every tab. Keep its always-mounted authored-source activation logic in `DemoDualTimeline`/dashboard consumers; only the controls move. This avoids breaking the 2026-08-03 shared allocation decision while making adaptive time visible where the user is inspecting the cube.

Controls that must not remain dashboard-only or hidden:

| Standalone control/interaction | Dashboard destination | State/data owner |
|---|---|---|
| KDE tuning | STKDE tab | `stkdeParams` + `useDemoStkde` request |
| Active events | Inspect 3D | coordination store; local crime batches |
| Trajectories | Inspect 3D | coordination store; server `sliceResults` |
| Matching mode | Inspect 3D | coordination store; server-aware matching options |
| Field vs legacy renderer | Inspect 3D | coordination store/render prop |
| Stack/focus, play, speed, scrub | Inspect 3D | existing coordination store |
| Adaptive/linear, warp factor/source, cube scope, temporal resolution | Inspect 3D | existing coordination store and shared maps |
| Slice inspector/legend | Inspect 3D | adapted surface + allocation metrics |
| A/B selection and mode | Compare | existing comparison IDs, then server/dense fields |

## Don't Hand-Roll

| Problem | Do not build | Use instead |
|---|---|---|
| Server cell projection | A second coordinate formula or map-specific conversion | `lonLatToNormalized()` plus one pure adapter |
| Surface rendering | A new Three.js plane/texture system | `Stkde3DScene` → `StkdeSliceStack` |
| Time placement | Per-overlay index spacing or separate warp math | `createStkde3DSceneRuntime()` resolvers |
| Hotspot evolution | New nearest-neighbor tracking | `buildHotspotEvolution()` with explicit matching options |
| Adaptive allocation | A dashboard-only warp implementation | Existing `densityMap` / `buildDemoSliceAuthoredWarpMap()` shared by timeline and cube |
| Query lifecycle | Another fetch in the 3D view | `useDemoStkde()` provider-owned debounced/abortable request |
| Signed KDE difference | Subtracting sparse cells by array position | Dense, metadata-bearing A/B field contract or a clearly gated mode |

## Loading, Error, Empty, Mock, and Performance Rules

### State handling

- **Initial loading:** retain the existing 3D shell and show `STKDE surfaces loading…` in the scene/rail. The provider must expose `isLoading`, `error`, and `refresh` to the 3D view; it currently destructures only `response`.
- **Refreshing:** keep the last valid response visible while the debounced request runs, with a stale/update badge. Do not silently switch to local KDE cells during a server refresh.
- **Error:** keep the last valid response if available and mark it stale; otherwise show a clear retry state. Wire the existing `refresh()` action into the STKDE tab and scene status. Do not clear the cube into an apparently empty state without an error explanation.
- **No applied slices:** the temporal 3D stack should explicitly say “Apply range slices to inspect STKDE evolution.” The top-level server map may still show full-viewport STKDE, but it is not a temporal stack. Disable compare until two valid rendered slices exist.
- **Empty surface:** render the stack shell/axis and show “No STKDE cells for this interval”; distinguish this from request loading.
- **Mock/fallback:** fixtures may drive deterministic tests, but any configured mock or API fallback must be labeled. Never present mock/fallback output as live analysis. The standalone route already labels mock data; dashboard `useDemoStkde` currently has no equivalent visible source/status contract and should add one if mock mode is supported.

### Performance constraints

- Removing local KDE surface computation eliminates the duplicated per-slice worker input and repeated 50k-range fetches for ordinary rendering. Keep the local event path only when active events are enabled, and cancel/ignore stale fetches on slice changes.
- Keep server limits and metadata visible: `maxEvents`, `maxGridCells`, `meta.truncated`, `fallbackApplied`, and `effectiveComputeMode` are analytical warnings, not incidental logs.
- Adapt and memoize server cells by response identity and slice ID. Keep the existing texture disposal path in `StkdeSliceStack`; do not create new textures in render loops.
- If the API is extended for dense A/B fields, return only the selected two fields, include grid metadata, enforce the existing response-size guard, and avoid sending dense fields for every temporal slice.
- Active events and trajectory points are opt-in/derived overlays. Keep them out of comparison/difference mode as the standalone design already does.
- The R3F documentation confirms `frameloop="demand"` for on-demand rendering and deferred disposal on unmount. Do not switch the whole scene blindly: playback, camera controls, and interpolation require invalidation/continuous updates. First reduce data/texture churn; consider demand mode only for paused, non-transitioning states with an explicit camera/playback invalidation path.

## Common Pitfalls

### Pitfall 1: Mixing server surfaces with local KDE controls

**What goes wrong:** A user changes dashboard STKDE bandwidth or grid controls, the map and hotspot list change, but 3D surfaces do not.  
**Prevention:** server `StkdeParams` are the only analytical tuning contract for dashboard surfaces; local `KdeParams` are not rendered as dashboard truth.

### Pitfall 2: Mapping slice results by array position

**What goes wrong:** Brushed scope, sorted slices, or a new applied slice shifts an array and paints a valid heatmap on the wrong temporal plane.  
**Prevention:** stable `sourceSliceId` lookup at every boundary; preserve `sourceSliceIndex` separately from render `index`.

### Pitfall 3: Treating sparse server cells as a complete field

**What goes wrong:** Missing cells become false zeroes, producing invalid absolute domains or signed differences.  
**Prevention:** use sparse adapter cells only for stack textures; require a dense field contract for difference mode.

### Pitfall 4: Recomputing adaptive Y locally

**What goes wrong:** surfaces, trajectory points, burst volumes, and timeline ticks drift after changing warp source, factor, or brushed scope.  
**Prevention:** pass one `sceneRuntime` through all renderers and keep timestamps untouched by the spatial adapter.

### Pitfall 5: Letting hidden slices participate in tracks

**What goes wrong:** a trajectory appears to jump across a brushed-out or missing interval.  
**Prevention:** order/filter the server result map to visible `cubeSlices` before `buildHotspotEvolution`; tracks only link adjacent rendered source slices.

### Pitfall 6: Moving authored warp activation into a tab

**What goes wrong:** timeline and 3D disagree when the Slices/Inspect tab is not mounted.  
**Prevention:** retain the always-mounted activation/effective-map computation; move only the UI controls.

## Code Examples

### ID-safe surface projection

```ts
const orderedSceneSlices = countedSlices.map((slice, index) => ({
  ...slice,
  index,
  sourceSliceIndex: index,
}));

const visibleCubeSlices = orderedSceneSlices
  .filter((slice) => cubeScopeMode !== 'brushed' || overlaps(slice, cubeTimeDomain))
  .map((slice, renderIndex) => ({ ...slice, index: renderIndex }));

const surfaceCells = visibleCubeSlices.map((slice) =>
  adaptStkdeSurfaceToKdeCells(stkdeResponse?.sliceResults[slice.sourceSliceId]),
);

const visibleServerResults = Object.fromEntries(
  visibleCubeSlices.flatMap((slice) => {
    const result = stkdeResponse?.sliceResults[slice.sourceSliceId];
    return result ? [[slice.sourceSliceId, result]] : [];
  }),
);
```

### Shared warped scene boundary

```tsx
<Stkde3DScene
  slices={visibleCubeSlices}
  sliceKdes={surfaceCells}
  hotspotSliceResults={visibleServerResults}
  sliceEvents={cubeSliceEvents} // raw events only
  timeDomain={cubeTimeDomain}
  runtime={sceneRuntime}
  showRawEvents={showRawEvents}
  showHotspotTrajectories={showHotspotTrajectories}
  heatmapRenderer={heatmapRenderer}
/>
```

`sceneRuntime.resolveSliceY`, `resolveEpochY`, and `yToEpoch` must continue to use the dashboard’s effective time mode, blend, `activeWarpMap`, `activeWarpDomain`, and `cubeTimeDomain`. Do not derive those values from the response’s hotspot peak windows.

## Migration Plan

### Wave 1 — Establish the authoritative dashboard STKDE view model

1. Add and test the pure server-cell adapter.
2. Add stable `sourceSliceIndex` to dashboard scene descriptors and create ID-safe projections for `cubeSlices`, `surfaceCells`, and filtered server results.
3. Expose the provider’s `isLoading`, `error`, `refresh`, response metadata, and mock/fallback status to `Demo3dSpatialView` and the STKDE rail.
4. Remove dashboard surface dependence on `kdeSlice.worker.ts`; retain crime range/event alignment only for active events.

### Wave 2 — Wire all standalone interactions into dashboard state

1. Add server-authoritative `StkdeTuningPanel` using `StkdeParams` and existing store clamping/debounce.
2. Move scrubber/playback, stack/focus, active events, trajectories, renderer, matching, opacity, legend, and inspector into Inspect 3D.
3. Pass `hotspotMatchingOptions` explicitly and filter results to visible source IDs. If adaptive matching needs physical server-grid data, extend its options with a physical cell-width input instead of pretending server `gridCellMeters` is the local `gridSize`.
4. Keep shared adaptive allocation/runtime inputs identical to the current timeline path for full and brushed cube scopes.

### Wave 3 — Make Compare use the same analytical contract

1. Replace `useDemoCompareData`’s independent local KDE requests for ordinary absolute comparison with selected dashboard STKDE results.
2. Add a dense, metadata-bearing field response for selected A/B slices if signed difference is required; otherwise render an explicit “difference unavailable for sparse server surfaces” state.
3. Reuse standalone A/B controls/stage with source-ID resolution and disable comparison during loading, with fewer than two slices, missing fields, or stale response identity.

### Wave 4 — Verify cross-view behavior and browser states

Run focused tests, typecheck/lint/build, then a browser smoke pass for a no-slice state, server loading, tuning refresh, active events, trajectory selection, adaptive/linear toggle, brushed scope, and A/B comparison. WebGL scene behavior needs DOM markers plus manual/browser verification; source-string tests alone cannot prove rendered alignment.

## Tests Needed

### Pure/data-contract tests

- Server cell adapter maps lng/lat to X/Z, preserves normalized intensity/support, rejects invalid/out-of-bounds cells, and returns `[]` for missing surfaces.
- ID projection remains correct when source slices are chronologically reordered, brushed, hidden, or inserted; `sourceSliceId` and `sourceSliceIndex` remain stable while render `index` changes.
- Missing server slice result creates an empty surface without shifting neighboring surfaces.
- Server response metadata (`truncated`, fallback, requested/effective mode) is exposed as a stale/warning state.

### STKDE and 3D behavior

- Tuning controls update each `StkdeParams` field with store limits and produce a debounced request containing the same values.
- A deterministic response produces visible 3D surface inputs from server cells and server hotspot tracks; no local worker KDE is used for dashboard surfaces.
- Adjacent hotspot snapshots create trajectories; missing/filtered slices break links; fixed/adaptive matching uses explicit options.
- `SliceScrubber` prev/next/range/play/speed updates the same active source slice seen by cube, timeline, map, and inspector; scrubbing pauses playback.
- Active-events toggle renders only events from the active source slice and preserves event timestamps.
- Linear and adaptive modes map the same slice boundaries, trajectory midpoint, burst sample, and raw event timestamp through one runtime; inverse Y-to-epoch round-trips.
- Full/brushed cube scope preserves source IDs, uses the correct display/warp domain, and does not use hidden server results in tracks.

### Cross-view and comparison tests

- Selecting a 3D surface updates active slice, timeline range, map active slice, rail selection, and inspection details.
- Selecting a trajectory updates active slice, temporal range, selected hotspot, and map spatial bounds; clearing selection resets partial-sync state.
- Applying/removing a slice refreshes the server request and 3D projection without stale surfaces or stale A/B slots.
- Compare slots reject duplicates, survive reordering by ID, and show loading/error/empty states. Absolute mode uses one shared field domain; signed mode only enables with complete compatible fields.

### Browser/manual checks

- No applied slices: intentional empty 3D stack copy; STKDE map/rail remains understandable.
- STKDE request loading and retry/error preserve clear status and do not silently fall back to local surfaces.
- Mock/fallback data is visibly labeled.
- Tuning, trajectories, active events, scrubber, adaptive warp, brushed scope, and cross-view selection work without console errors or WebGL resource growth.

## State of the Art

| Previous/current approach | Required approach | Impact |
|---|---|---|
| Dashboard local worker KDE drives 3D; server STKDE drives map/tracks | Server STKDE slice surfaces drive cube, map, tracks, and burst model | One analytical provenance and responsive tuning |
| Local compare requests and SVG sparse KDE | Server-selected A/B surfaces; dense fields for signed difference | No duplicate query path or invalid sparse subtraction |
| Global warp block always visible above every rail tab | Warp controls grouped with 3D Inspect; allocation computation remains always mounted | STKDE-3D interaction model is discoverable without breaking shared maps |
| Positional slice arrays | Stable source-ID projections with separate render indexes | Brushed/reordered slices remain temporally correct |

The current R3F documentation supports on-demand rendering and deferred resource disposal, but playback/camera/interpolation mean demand mode requires an explicit invalidation design. Treat it as a later optimization, not part of the data migration.

## Open Questions

1. **Is signed A/B difference mandatory in this dashboard task?**
   - Known: standalone difference requires complete `KdeField`s; dashboard server JSON returns sparse cells only.
   - Recommendation: if mandatory, extend the API for only selected A/B fields with grid metadata and size guards. Otherwise gate difference explicitly rather than producing a false field.

2. **Should dashboard adaptive hotspot matching use server physical grid width?**
   - Known: existing adaptive matcher derives tolerance from local `gridSize` and smoothing; server returns `gridCellMeters` in the request state but not in the response contract/grid metadata.
   - Recommendation: pass a physical cell-width option or use fixed matching until exact server grid metadata is available; do not use an undocumented scene-span conversion as a silent approximation.

3. **What is the dashboard mock contract?**
   - Known: standalone labels mock data; `useDemoStkde` currently reports only response/loading/error and the server route does not return a dashboard mock-source field.
   - Recommendation: add an explicit source/warning flag to the hook or response metadata before presenting mock fixtures in the unified dashboard.

## Sources

### Primary (HIGH confidence)

- `src/app/stkde-3d/page.tsx` — standalone state, controls, local dataset lifecycle, adaptive runtime, comparison wiring, and loading/error/empty states.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — reusable scene prop boundary and shared runtime.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — `KdeCell` rendering, texture generation, interpolation, and source-ID interactions.
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx` — explicit forward/inverse temporal resolver contract.
- `src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx` and `src/lib/hotspot-evolution.ts` — server surface track construction and matching behavior.
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — current dashboard fetches, local worker KDE path, adaptive maps, ID alignment, and scene props.
- `src/components/dashboard-demo/lib/useDemoStkde.ts` — debounced server request, canonical slice descriptors, response lifecycle, and dashboard parameters.
- `src/lib/stkde/contracts.ts`, `src/lib/stkde/compute.ts`, `src/app/api/stkde/hotspots/route.ts` — server response shape, normalization, slice-result IDs, limits, and fallback semantics.
- `src/store/useDashboardDemoCoordinationStore.ts` and `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` — existing control state and tab architecture.
- `.planning/quick/260727-wwn-standalone-capable-dashboard-demo-3d-pro/260727-wwn-SUMMARY.md` and `.planning/quick/20260803-adaptive-temporal-allocation/20260803-adaptive-temporal-allocation-SUMMARY.md` — prior locked decisions: store-free scene boundary, canonical slices, and shared authored warp.

### Secondary (MEDIUM confidence)

- Context7 `/pmndrs/react-three-fiber`, current scaling-performance and Canvas documentation — confirms `frameloop="demand"`, explicit Canvas performance options, and declarative resource disposal; applicability is constrained by this scene’s playback and camera updates.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — pinned in `AGENTS.md` and existing imports.
- Architecture/data-flow: HIGH — directly verified in current route, hook, response contract, worker, and dashboard scene.
- Comparison migration: MEDIUM — the sparse-vs-dense limitation is certain, but the final API field encoding is a planning decision.
- Performance: MEDIUM/HIGH — request and texture costs are visible in code; exact browser frame impact requires a smoke/profile run.

**Research date:** 2026-08-03  
**Valid until:** 2026-08-17 (dashboard code is local/stable, but R3F and Next.js behavior are fast-moving)

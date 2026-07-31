---
id: 260731-juc
status: reconnaissance-complete
mode: quick
source_changes: none
commit: none
---

# STKDE 3D / Dashboard Demo Reconnaissance

## Scope

Inspected the repository instructions, `/stkde-3d`, `/dashboard-demo`, shared KDE/hotspot, scene-runtime, adaptive-warp, volume-allocation, and relevant tests. No application source was changed. The working tree already contained unrelated uncommitted changes; they were left untouched.

## 1. Shared vs route-specific pieces and contracts

### Shared scene/rendering layer

- `src/app/stkde-3d/components/Stkde3DScene.tsx` is the shared React Three Fiber scene. It mounts `StkdeSliceStack`, `HotspotTrajectoryOverlay`, optional `RawEventPoints`, `BurstVolumeRenderer`, and `AdaptiveWarpAxis`.
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx` defines `Stkde3DSceneRuntime`. The important shared contract is `resolveEpochY(epochSec)`, `resolveSliceY(slice)`, `yToEpoch(y)`, source-slice IDs, and interaction callbacks.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` consumes `EvolvingSlice` plus optional `sourceSliceId`, KDE cells, and `DurationVolumeProfileEntry[]`.
- `src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx` consumes `StkdeSurfaceResponse.sliceResults`, matches snapshots through shared `buildHotspotEvolution`, and places each snapshot at the midpoint of `peakStartEpochSec`/`peakEndEpochSec`.

### Shared data/temporal contracts

- `src/lib/stkde/contracts.ts`: `StkdeResponse` contains aggregate top-level output plus `sliceResults: Record<string, StkdeSurfaceResponse>`. Each hotspot carries centroid, support, radius, and peak epoch bounds, but no raw event records.
- `src/lib/hotspot-evolution.ts`: shared fixed/adaptive hotspot matching and tracked snapshot contract. It needs at least two snapshots for a rendered track.
- `src/types/crime.ts`: canonical raw event contract is `CrimeRecord`, including `timestamp` in Unix epoch seconds and normalized `x/z` coordinates.
- `src/app/stkde-3d/lib/types.ts`: scene raw events currently use `MockCrimeEvent { x, z, type }`; this is the key contract gap because it omits the canonical timestamp.
- `src/app/stkde-3d/lib/volume-encoding.ts`: shared duration/display allocation model. `buildDurationVolumeProfile` can use adaptive warp-adjusted display duration; `buildAllocationMetrics` reports clock duration separately from display duration, shares, ratio, and thickness.

### Standalone-route-specific wiring

- `src/app/stkde-3d/page.tsx` owns its dataset loading, local/mock slice generation, local KDE computation, local `buildKdeHotspotSliceResults`, track-matching controls, and visibility controls.
- Standalone `createStkde3DSceneRuntime` is explicitly linear (`timeScaleMode: 'linear'`, `warpBlend: 0`), so its trajectories and active-event points are not a test of dashboard adaptive placement.
- `src/app/stkde-3d/lib/mock-data.ts` creates `sliceEvents` and slices locally. Real `CrimeRecord` rows are deliberately reduced to `{ x, z, type }` before reaching the scene.

### Dashboard-demo-specific wiring

- `src/components/dashboard-demo/DashboardDemoShell.tsx` mounts `DashboardDemo3dProvider`, then selects `Demo3dSpatialView` as the 3D viewport.
- `src/components/dashboard-demo/lib/useDemoStkde.ts` posts slice descriptors and dashboard filters to `/api/stkde/hotspots`, returns `StkdeResponse`, and stores it in `useDashboardDemoCoordinationStore`.
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` derives visible `TimeSlice` descriptors, fetches raw `/api/crimes/range` data per slice into `crimesBySlice: CrimeRecord[][]`, runs KDE in `kdeSlice.worker.ts`, and passes the resulting `sliceKdes` plus the API `sliceResults` to `Stkde3DScene`.
- Dashboard scene slices use `sourceSliceId: slice.id`, so they can match API `sliceResults` keys in the full cube scope.

## 2. How the dashboard supplies slices, KDE/hotspots, events, and adaptive allocation

1. **Slices:** `useSliceDomainStore` visible range slices are normalized to epoch ranges, sorted, and assigned scene indexes in `Demo3dSpatialView`. `cubeSlices` is either the full ordered set or a brushed subset.
2. **Raw events:** `/api/crimes/range` returns `CrimeRecord[]` for each ordered slice. The dashboard currently strips each record to `{ x, z, type }` in `sliceEvents`; timestamps are not forwarded.
3. **Local KDE:** the dashboard posts only `{ x, z }` to `kdeSlice.worker.ts`; worker results become `KdeCell[][]` and drive the heatmap surfaces. These are separate from the server STKDE response.
4. **Hotspot results:** `useDemoStkde` returns server `StkdeResponse.sliceResults`, keyed by source slice ID. `HotspotTrajectoryOverlay` runs shared evolution matching over those surfaces. In dashboard focus mode the trajectory overlay intentionally renders nothing.
5. **Adaptive runtime:** the coordination store holds `timeScaleMode`, `warpSource`, `warpFactor`, density/warp maps, and map domain. `Demo3dSpatialView` converts `warpFactor` from `0..3` to `warpBlend` `0..1`, chooses density or slice-authored maps, and creates the shared runtime with `cubeTimeDomain`, `activeWarpDomain`, `activeWarpMap`, `sceneEpochToY`, and `sceneYToEpoch`.
6. **Map construction:** `DemoDualTimeline` precomputes the full density map via `computeDensityMap` + `buildDensityWarpMap`; slice-authored allocation uses `buildDemoSliceAuthoredWarpMap`. Brushed cube scope creates a scoped density/warp map from overview timestamps and currently takes precedence over the selected warp source.
7. **Volume allocation:** full-scope `volumeProfile` calls `buildDurationVolumeProfile` with the active warp settings. In brushed scope, `cubeVolumeProfile` is rebuilt locally from raw slice duration percentages, so slab thickness/allocation no longer uses the active adaptive map even though runtime Y coordinates still do.

## 3. Safe-enablement assessment

### Active events: **not safe to enable in dashboard by default yet**

- Dashboard does not pass `showRawEvents`; `Stkde3DScene` therefore uses its `false` default. The standalone route has the `Active events` control, but it only renders the active slice.
- If enabled with the current contract, `RawEventPoints` places every point at `resolveSliceY(slice) + 0.15`, i.e. one slice-level Y, not the event's timestamp. This is visually a slice marker, not accurate per-event adaptive placement.
- In brushed scope, `cubeSlices` reindexes the filtered slices while `sliceEvents` remains aligned to the full ordered slice array. `RawEventPoints` indexes `sliceEvents[slice.index]`, so it can render the wrong slice's event group after filtering.
- Dashboard raw queries cover the complete source slice. Once events are placed by timestamp, events outside a brushed `cubeTimeDomain` must be filtered or the query must be clipped; otherwise they collapse onto an axis boundary through the clamped runtime mapping.

### Trajectories: **already enabled in dashboard stack mode, with scoped caveats**

- `showHotspotTrajectories` defaults to `true` in `Stkde3DScene`, and dashboard passes `hotspotSliceResults`; therefore the overlay is already mounted when the response contains multi-slice tracks. Focus mode intentionally hides it.
- Snapshot epoch bounds come from the server STKDE contract, so midpoint Y placement can use the dashboard adaptive `resolveEpochY` without raw event timestamps.
- Dashboard does not currently expose a trajectory visibility control or pass explicit `HotspotMatchingOptions`; shared matching therefore uses its default fixed matcher.
- In brushed scope the response can contain snapshots for slices outside `cubeSlices`; the overlay drops snapshots whose source slice is absent, but it does not explicitly filter the result by display epoch. A future scope-safe pass should filter results/snapshots to the active cube domain before rendering.

## 4. Exact blockers for accurate per-event adaptive Y placement

1. **Timestamp loss:** `CrimeRecord.timestamp` is available from the API, but `generateStkde3dRealData` and `Demo3dSpatialView` remove it; `MockCrimeEvent` has no timestamp field. `StkdeSurfaceResponse` cannot restore it because it is aggregate output.
2. **Wrong renderer input:** `RawEventPoints` only receives `resolveSliceY`, so it cannot call the adaptive runtime for each event.
3. **Slice/event alignment:** array indexing relies on `slice.index`; dashboard brushed mode remaps scene indexes without remapping `sliceEvents`. Source-ID keyed event groups or cube-aligned event arrays are required.
4. **Brushed-domain clipping:** per-event placement must exclude events outside `cubeTimeDomain` (or fetch clipped groups) before calling the Y resolver.
5. **Runtime map lifecycle:** the correct map is the runtime callback, not a separately reconstructed transform. Full scope selects the store's density/authored map; brushed scope can replace it with a scoped map. Before the timeline effect publishes a map, adaptive mode intentionally falls back to linear mapping, so tests and UI should tolerate/gate that transient state.
6. **Allocation parity:** brushed `cubeVolumeProfile` currently uses raw duration percentages rather than `buildDurationVolumeProfile` with `activeWarpMap`; event Y placement can be correct while slab thickness and allocation metrics disagree with the adaptive axis.
7. **Units:** `CrimeRecord.timestamp` and STKDE epoch fields are seconds; any new event field must remain seconds (not `startDateTimeMs` milliseconds) before calling `resolveEpochY`.

## 5. Minimal next implementation plan

Assumption: the desired outcome is a dashboard-safe `Active events` layer while retaining the already-working trajectory overlay. No clarification is needed for the reconnaissance; decide separately whether dashboard active events should be always-on or have a new toggle.

### Task A — preserve and align event contracts

**Files:**

- `src/app/stkde-3d/lib/types.ts`
- `src/app/stkde-3d/lib/mock-data.ts`
- `src/components/dashboard-demo/Demo3dSpatialView.tsx`
- Optional small helper/test file under `src/app/stkde-3d/lib/` or `src/components/dashboard-demo/lib/`

**Action:** Add an epoch-seconds timestamp to the scene event contract, preserve `CrimeRecord.timestamp` in real and dashboard event conversion, give generated mock events deterministic in-slice timestamps, and provide event groups aligned by `sourceSliceId` or by the final `cubeSlices` order. Filter events to `cubeTimeDomain` for brushed rendering. Do not derive timestamps from STKDE hotspots.

**Verify/done:** A test proves real/dashboard event conversion preserves seconds, brushed filtering selects the correct source slice, and no full-scope or brushed event group is shifted by the local `index` remap.

### Task B — place active events through the shared adaptive runtime

**Files:**

- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx` only if the runtime contract needs a small read-only addition
- `src/components/dashboard-demo/Demo3dSpatialView.tsx`
- `src/app/stkde-3d/lib/timeline-axis.test.ts` plus a focused raw-event mapping test

**Action:** Change `RawEventPoints` to call `runtime.resolveEpochY(event.timestampEpochSec)` per event, retain a clearly tested fallback only if a compatibility path is unavoidable, and pass a dashboard visibility decision explicitly. Keep trajectory rendering on the existing shared `StkdeSurfaceResponse` path. Make brushed volume allocation use `buildDurationVolumeProfile` with the same active map, or document the deliberate visual difference before changing it.

**Verify/done:** Tests round-trip event timestamps through a non-linear warp map and assert distinct event Y values; dashboard source assertions prove the event prop and source-ID alignment are wired; full targeted Vitest, `pnpm typecheck`, and targeted ESLint pass.

### Baseline/final verification commands

```bash
pnpm exec vitest run \
  src/app/stkde-3d/page.stkde.test.ts \
  src/app/stkde-3d/lib/timeline-axis.test.ts \
  src/app/stkde-3d/lib/kde-hotspots.test.ts \
  src/app/stkde-3d/lib/volume-encoding.test.ts \
  src/components/dashboard-demo/page.shell.test.tsx \
  src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts \
  src/components/dashboard-demo/lib/syncDemo3dInteraction.test.ts
pnpm typecheck
pnpm eslint src/app/stkde-3d src/components/dashboard-demo src/lib/hotspot-evolution.ts
```

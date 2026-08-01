# Phase 4: STKDE-3D A/B Comparison - Research

**Researched:** 2026-08-01  
**Domain:** Next.js client route, React Three Fiber focused viewports, client-side KDE comparison  
**Confidence:** HIGH for the existing architecture and library APIs; MEDIUM for final visual composition until browser-tested

## Summary

The existing `/stkde-3d` route already has all of the data needed for comparison in one client-local pipeline: `dataset`, ten `sceneSlices` with stable `sourceSliceId` values, one `sliceKdeResults` array, shared `timeDomain`, one adaptive warp, and shared KDE controls (`src/app/stkde-3d/page.tsx:191-403`). Comparison should remain derived page/view state. It must select references to those rendered slices, never call a slice-domain action, create a second dataset request, or append duplicate slice objects.

The safest rendering shape is a comparison stage containing two vertically stacked, reusable focused R3F viewports for absolute mode and one dedicated top-down difference viewport for difference mode. Two independent `Canvas` instances are preferable to a single `Canvas` with multiple `View` regions for this phase: each pane gets its own `CameraControls` ref and event surface, while all analytical arrays, map context, and configuration remain shared. Extract the current `SceneContent`/map-plane logic rather than mounting two complete copies of the current `Stkde3DScene` with two hidden MapLibre sources.

The main analytical gap is that `computeSliceKde` returns normalized cell intensities while its raw `maxIntensity` is currently discarded by `page.tsx` (`src/lib/kde/compute-slice-kde.ts:14-103`, `page.tsx:302-310`). A truthful shared absolute scale and `KDE(A) - KDE(B)` field require preserving the unnormalized grid (or an equivalent raw field) for each result. Use one global absolute domain for both focused panes and a symmetric `[-maxAbs, +maxAbs]` domain for the signed field. Keep the current sequential palette in absolute mode; add a separate red-neutral-blue palette where red is A-dominant, neutral is zero, and blue is B-dominant.

**Primary recommendation:** Add a small, tested comparison domain in `src/app/stkde-3d/lib/`, extract a reusable focused viewport with imperative `CameraControls` synchronization, preserve raw KDE fields for comparison, and integrate it into `page.tsx` without introducing a store or new data/API path.

## Standard Stack

The established stack for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | 16.2.9 (`package.json:68`) | Client App Router route | Existing `/stkde-3d` entry point; do not add another frontend architecture. |
| React | 19.2.7 | Local route state and composition | Existing page uses `useState`, `useMemo`, and `useEffect`. |
| Three.js | 0.182.0 | Scene, camera, texture, and vector primitives | Existing scene and texture code already use Three directly. |
| `@react-three/fiber` | 9.6.1 | R3F `Canvas`, pointer events, responsive render surface | Existing `Stkde3DScene.tsx` uses `Canvas`; R3F automatically resizes Canvas to its parent. |
| `@react-three/drei` | 10.7.7 | `CameraControls`, `Line`, `Html`, and R3F helpers | Existing scene uses `CameraControls`; current Drei docs expose imperative refs and update/control events. |
| `camera-controls` | 3.1.2 transitive dependency | Camera pose read/write | Installed type definitions expose `getPosition`, `getTarget`, `setLookAt`, and `reset`; use through Drei, not as a second control implementation. |
| Existing KDE implementation | local `src/lib/kde` | Grid KDE and parameters | `computeSliceKde` is already the route's source of truth for every rendered surface. |
| Vitest | 4.1.9 | Pure comparison and contract tests | Existing co-located test convention and `page.stkde.test.ts` source-contract approach. |

### Supporting

| Library | Purpose | When to Use |
|---|---|---|
| Tailwind CSS 4 | Responsive comparison-stage layout and labels | Use the existing route styling; no new CSS framework. |
| `lucide-react` | Compare/reset/link control icons | Use existing icon dependency only if icons are needed. |
| MapLibre / `CanvasTexture` | Existing map context under the 3D surface | Reuse the current captured map texture; do not add a second map provider for the difference view. |

**Installation:** No new packages are required.

**Version note:** `.planning/codebase/STACK.md` and the generated `AGENTS.md` stack section contain older snapshots in places. `package.json` and installed declarations are the implementation source of truth: current project dependencies are Next 16.2.9, React 19.2.7, R3F 9.6.1, Drei 10.7.7, and Vitest 4.1.9.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Two focused Canvas panes | One Canvas plus Drei `View` regions | `View` is a supported advanced pattern, but it complicates independent `CameraControls`, event routing, and `makeDefault`. Use it only if a later performance pass proves two Canvases too expensive. |
| Route-local comparison state | Zustand slice-domain state | Zustand would make temporary references persistent/global and violates the spec's temporary-reference boundary. |
| Pure client-side difference | New `/api` comparison endpoint | Adds duplicate requests and a second analytical source; the two existing grids are already in memory and the subtraction is at most a 128x128 field. |
| Existing map/scene primitives | deck.gl or a new 2D mapping library | Introduces a second rendering path and risks coordinate/color-scale drift from the existing normalized `[-50, 50]` KDE scene. |

## Architecture Patterns

### Existing Integration Points

| File / symbol | Current responsibility | Phase 4 use |
|---|---|---|
| `src/app/stkde-3d/page.tsx:191-207` `Stkde3DPage` state | Owns active index, dataset, playback, controls, and case-study selection | Add compare lifecycle, `ComparisonState`, pending preset application, and invalidation here or in a route-local hook. |
| `page.tsx:282-315` `sceneSlices`, `sliceKdeResults` | Derives ten rendered slices, stable IDs, and KDE results | Treat as the only source of A/B references and shared fields. |
| `page.tsx:317-358` adaptive and volume derivation | Builds one shared temporal warp and volume profile | Pass the same resolved domain/warp/settings to A and B; do not recompute per pane. |
| `src/app/stkde-3d/components/StkdeSliceStack.tsx:259-276` `handleSliceSelect` | Emits source ID, interval, and focus point; compact mode remaps rendered index to 0 | Reuse in stack selection mode, but identify selections by `sourceSliceId`, not compact `index`. Disable resize handles while selecting if clicks must mean selection only. |
| `src/app/stkde-3d/components/Stkde3DScene.tsx:172-311` `SceneContent` | Composes axis, slice stack, events, trajectories, burst volume, and one `CameraControls` | Split reusable focused scene layers from the current single-scene wrapper. Absolute panes should receive one selected slice and one selected KDE array. |
| `Stkde3DScene.tsx:314-435` `Stkde3DScene` | Owns MapLibre capture, Canvas, runtime provider, and camera focus state | Refactor so a comparison stage can share one map texture and mount two independent Canvas viewports without duplicate hidden MapLibre maps. |
| `Stkde3DSceneProvider.tsx:145-197` `createStkde3DSceneRuntime` | Produces coordinate/time resolvers and interaction callbacks | Reuse the same display/warp domains and maps. Give comparison panes no-op or pane-local interaction callbacks so a missed click in B cannot clear page selection. |
| `src/app/stkde-3d/lib/palette.ts:6-67` | Sequential absolute palette and gradient helper | Preserve for absolute views; add a separate signed stop list/function rather than reinterpreting sequential intensity colors. |
| `src/app/stkde-3d/components/StkdeIntensityLegend.tsx` | Existing sequential legend pattern | Extend or parallel it with a signed legend showing `B higher`, `0`, and `A higher`; it is currently not mounted by `page.tsx`. |

### Recommended Project Structure

```text
src/app/stkde-3d/
├── page.tsx                              # route controls, dataset lifecycle, stage integration
├── lib/
│   ├── comparison.ts                     # temporary state transitions and selection guards
│   ├── comparison-presets.ts             # exact-pair code-defined presets and resolution
│   ├── comparison-difference.ts          # raw-field alignment, A-B subtraction, symmetric domain
│   └── comparison.test.ts                 # pure state, preset, domain, and sign tests
└── components/
    ├── StkdeComparisonStage.tsx           # selecting / absolute / difference orchestration
    ├── StkdeComparisonViewport.tsx        # one focused Canvas + one CameraControls instance
    ├── StkdeDifferenceScene.tsx           # one top-down heatmap-only scene
    ├── StkdeComparisonControls.tsx         # A/B metadata and mode/camera controls
    └── StkdeSignedDifferenceLegend.tsx    # red-neutral-blue legend
```

Names may be consolidated, but keep pure math/state out of React components. Do not create a persistent comparison store or a new slice collection.

### Pattern 1: Temporary A/B state machine

**What:** Store only references `{ index, sourceSliceId, startEpoch, endEpoch }`, plus `mode`, `activeSlot`, and `linkedCameras`. A click while selecting fills A, advances to B, and then fills B only when its identity differs. Once both are filled, completed selection is locked per D-01; replacement requires `Reset comparison`.

**When to use:** All selection, reset, exit, dataset invalidation, and preset resolution paths.

**Example:**

```typescript
export function selectComparisonSlice(
  state: Stkde3DComparisonState,
  selection: ComparisonSelection,
): Stkde3DComparisonState {
  if (state.mode !== 'selecting') return state;

  if (state.activeSlot === 'A') {
    return { ...state, a: selection, activeSlot: 'B' };
  }

  if (state.a?.sourceSliceId === selection.sourceSliceId) return state;

  return { ...state, b: selection, mode: 'absolute' };
}
```

The actual helper should also reject an ID collision when a source ID is missing by comparing the rendered index. A preset resolver must validate the declared index and epoch bounds against the current `sceneSlices`; never fall back to “the closest label.”

### Pattern 2: Shared raw KDE field and signed difference

**What:** Preserve the unnormalized intensity grid in `SliceKdeResult` (or introduce an equivalent field-returning helper) while retaining the current normalized `cells` for existing rendering. Both absolute panes use the same raw-domain maximum. The difference utility aligns equal grid cells and subtracts raw values.

**When to use:** Absolute comparison scale, difference mode, legends, and tests.

**Example:**

```typescript
type KdeField = {
  values: Float32Array;
  gridSize: number;
  maxIntensity: number;
};

export function computeSignedKdeDifference(a: KdeField, b: KdeField) {
  if (a.gridSize !== b.gridSize || a.values.length !== b.values.length) {
    throw new Error('KDE comparison requires matching grids');
  }

  const values = new Float32Array(a.values.length);
  let maxAbs = 0;
  for (let index = 0; index < values.length; index += 1) {
    const difference = (a.values[index] ?? 0) - (b.values[index] ?? 0);
    values[index] = difference;
    maxAbs = Math.max(maxAbs, Math.abs(difference));
  }

  return { values, domain: [-Math.max(maxAbs, 1e-9), Math.max(maxAbs, 1e-9)] as [number, number] };
}
```

`computeSliceKde` currently creates the raw `intensity` array at lines 48-79 and then stores only normalized values in `cells` at lines 84-99. Expose that array before it is discarded. Reconstructing raw values from rounded normalized cells and `maxIntensity` is acceptable only as a temporary fallback; it cannot represent cells removed by the threshold and is not sufficient for a truthful difference field.

### Pattern 3: Imperative camera pose linking

**What:** Keep camera refs and pose synchronization imperative. Read the source pane's current pose from `CameraControls.getPosition` and `getTarget` in `onUpdate`, then call the other pane's `setLookAt` with `enableTransition=false`. Guard mirrored updates with an origin/suppression ref or epsilon comparison to prevent feedback loops.

**When to use:** Absolute comparison only. Difference mode has one top-down camera and does not participate in A/B linking.

**Example:**

```typescript
type CameraPose = { position: [number, number, number]; target: [number, number, number] };

function readCameraPose(controls: CameraControls): CameraPose {
  const position = controls.getPosition(new THREE.Vector3(), false);
  const target = controls.getTarget(new THREE.Vector3(), false);
  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
  };
}

function applyCameraPose(controls: CameraControls, pose: CameraPose) {
  return controls.setLookAt(
    pose.position[0], pose.position[1], pose.position[2],
    pose.target[0], pose.target[1], pose.target[2],
    false,
  );
}
```

Drei's current `CameraControls` docs expose `onUpdate`, `setLookAt`, and refs. The installed camera-controls 3.1.2 declaration confirms `getPosition(out, receiveEndValue?)`, `getTarget(out, receiveEndValue?)`, and `reset()`. Use `smoothTime`, not the old `damping` prop. When re-enabling linking, read A's current pose and immediately apply it to B before enabling subsequent propagation, as required by D-03. `Reset views` should explicitly apply the shared front-oblique pose to both controls rather than depending on each Canvas's historical reset state.

### Pattern 4: Layer-gated scene composition

**What:** Difference mode renders only the shared map context plus one signed heatmap plane and signed legend. It must not mount `StkdeSliceStack`, `RawEventPoints`, `HotspotTrajectoryOverlay`, `BurstVolumeRenderer`, or `AdaptiveWarpAxis` in that mode.

**When to use:** Every render of A-B mode; controls may remain visible but raw events/trajectories must be visually and semantically disabled there.

### Recommended Decomposition

1. **Comparison domain first:** Add typed state transitions, selection identity guards, reset/invalidation helpers, and exact-pair preset resolution. Test these without React.
2. **KDE contract:** Preserve raw grid values and grid metadata in the existing KDE result path; add shared absolute-domain and signed-difference helpers. Test empty, identical, missing-cell, opposite-sign, and mismatched-grid cases.
3. **Focused viewport extraction:** Factor one focused scene from `Stkde3DScene`; keep source IDs and selected interval metadata intact while passing a one-slice KDE array. Share the captured map texture and avoid creating two hidden MapLibre sources.
4. **Camera controller:** Add two pane-local controls refs and a linked-camera controller using imperative pose propagation. Keep pose updates out of React state so camera movement does not rebuild textures or re-render both panes every frame.
5. **Stage and controls:** Add `Compare`, A/B selection prompts, interval metadata, `Absolute`, `A - B difference`, `Linked cameras`, `Reset views`, `Reset comparison`, and `Back to stack`. Preserve the current stack as the default.
6. **Preset/invalidation wiring:** Apply case-study, KDE, adaptive-time, renderer, layer, and camera values together; defer exact interval resolution until the matching dataset has loaded. Clear A/B on case-study/dataset changes, but preserve them across shared parameter recomputation.
7. **Verification:** Run targeted Vitest tests, typecheck, lint, and production build; manually verify camera interactions and responsive layout because jsdom cannot provide a real WebGL canvas.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Orbit/pan/zoom and camera pose | Custom pointer math or duplicated OrbitControls | Drei `CameraControls` and camera-controls `getPosition`/`getTarget`/`setLookAt` | Handles rotation, truck/pan, dolly, damping, bounds, and control events already used by the route. |
| A/B persistence | New Zustand slice domain or database object | Page-local state machine with source-slice references | The contract explicitly makes comparison temporary and forbids duplicate persistent slices. |
| A-B analytics request | New API route or second data fetch | Subtract the two already loaded raw KDE fields in a pure client helper | The field is small, deterministic, and must use the same loaded context. |
| Signed color interpolation | Ad hoc CSS color branching in JSX | A typed signed palette helper beside `lib/palette.ts` | Keeps red/neutral/blue semantics consistent across texture and legend and makes sign tests possible. |
| Responsive Canvas measurement | Manual window resize listeners | R3F `Canvas` parent sizing plus stable CSS stage dimensions | R3F's Canvas handles resize; manual listeners introduce lifecycle and stale-size bugs. |
| Slice identity | Array position alone | `sourceSliceId` plus index/epoch validation | Focused/compact scenes remap rendered indices; source IDs survive that remapping. |

**Key insight:** The feature is mostly a view over existing slices. The dangerous custom work is not subtraction itself; it is accidentally creating a second data model, using independently normalized fields, or letting two imperative cameras fight through React state.

## Common Pitfalls

### Pitfall 1: Subtracting independently normalized cell values

**What goes wrong:** A value of `1` in A and `1` in B can mean different raw KDE intensities because `computeSliceKde` normalizes each slice by its own maximum.

**Why it happens:** `page.tsx` keeps only `result.cells` for rendering while `maxIntensity` is not propagated to the scene.

**How to avoid:** Preserve raw grid values and derive one absolute domain from both selected results. Compute A-B from raw fields, not rounded normalized cells.

**Warning signs:** A difference map reports neutral for two differently sized peaks, or changing the pair changes the meaning of the absolute color ramp.

### Pitfall 2: Thresholded sparse cells produce an incomplete difference

**What goes wrong:** A cell omitted from `cells` is treated as “no KDE,” even though it may have a below-threshold positive value; subtraction becomes biased.

**Why it happens:** `computeSliceKde` only pushes cells where normalized intensity exceeds `threshold` (`compute-slice-kde.ts:84-99`).

**How to avoid:** Subtract a complete raw grid, treating only actual zero cells as zero. Keep thresholded cells for the existing absolute renderer if desired, but do not use the sparse list as the analytical difference source.

### Pitfall 3: Compact focus indices overwrite source identity

**What goes wrong:** A focused slice is rewritten to `index: 0` in `Stkde3DScene.tsx:204-210`, so a comparison callback that trusts `index` can select the wrong source slice.

**Why it happens:** Focus is a local render coordinate, not a dataset identity.

**How to avoid:** Carry `sourceSliceId`, `startEpoch`, and `endEpoch` through every payload; resolve back to `sceneSlices` by source ID in the page.

### Pitfall 4: Two complete scenes duplicate map resources and textures

**What goes wrong:** Mounting two unchanged `Stkde3DScene` components creates two hidden MapLibre maps and two captured map textures, increasing startup work and risking inconsistent map captures.

**Why it happens:** `MapTileSource` is currently owned by each scene (`Stkde3DScene.tsx:46-103, 365-369`).

**How to avoid:** Let the comparison stage own one map capture or pass one shared `CanvasTexture` into both focused scene renderers. Establish one clear owner for disposal.

### Pitfall 5: Camera link feedback loops and render storms

**What goes wrong:** A updates B, B's update updates A, or every camera tick updates React state and rebuilds KDE textures.

**Why it happens:** `CameraControls` emits update events during transitions and user input; React state is too coarse for per-frame pose.

**How to avoid:** Keep refs and suppression/epsilon guards in the camera controller, use immediate `setLookAt` for mirrored poses, and keep the latest pose out of page state. Test the propagation policy separately from WebGL.

### Pitfall 6: Re-linking does not snap B to A

**What goes wrong:** Turning linking back on leaves B at its independent pose until the next user event, making the first view misleading.

**How to avoid:** On `false -> true`, read A's current pose and immediately apply it to B. The behavior is explicitly locked in `04-CONTEXT.md` D-03.

### Pitfall 7: Stale A/B references survive dataset replacement

**What goes wrong:** A/B source IDs from Fourth of July are rendered against Spring Break data after the async loader replaces `dataset`.

**How to avoid:** Clear comparison state in the same `caseStudyPresetId` lifecycle that currently calls `setDataset(null)` and resets `activeIndex` (`page.tsx:210-278`). Resolve pending presets only after the new `sceneSlices` exist. Do not clear selections for ordinary KDE/adaptive/renderer changes because the source intervals remain valid.

### Pitfall 8: Presets match display labels but not intervals

**What goes wrong:** “Slice 3” selects a different interval after data or pagination changes.

**How to avoid:** Store `datasetPresetId`, exact `sliceIndex`, exact `startEpoch`, exact `endEpoch`, label, all KDE parameters, adaptive setting, renderer, layer, view, and camera. Validate all identity fields before applying. If the declared pair is unavailable, fail visibly rather than selecting a nearby slice.

### Pitfall 9: Difference mode leaks additive layers

**What goes wrong:** Events, trajectories, slab geometry, or burst overlays make a signed field look like another 3D stack.

**How to avoid:** Use a dedicated difference scene or an explicit layer gate. Render only base map context, signed heatmap, and signed legend. Keep the A/B metadata in DOM controls rather than adding 3D labels that imply another temporal axis.

### Pitfall 10: Difference domain collapses for identical or empty inputs

**What goes wrong:** `maxAbs = 0` causes division by zero or an unreadable all-transparent map.

**How to avoid:** Use a small stable fallback domain for all-zero differences, render zero as the neutral stop, and test empty/identical fields. Treat missing A/B or mismatched grids as an invalid comparison state, not as a silent zero field.

### Pitfall 11: Responsive Canvas has no usable height

**What goes wrong:** One or both panes render a blank or clipped Canvas when the left grid changes rows at narrow widths.

**How to avoid:** Give the comparison stage two explicit grid rows, `min-h-0`, `min-w-0`, and a narrow-screen minimum pane height. Keep `Canvas` at `h-full w-full`; do not rely on an auto-height child. R3F will resize when the parent has a real size.

### Pitfall 12: Existing focus behavior hides trajectories

**What goes wrong:** `HotspotTrajectoryOverlay` returns no tracks in `viewMode === 'focus'` (`HotspotTrajectoryOverlay.tsx:38-42`), so a preset layer of `heatmap-with-trajectories` cannot visibly reproduce the current toggle in a focused pane.

**How to avoid:** Decide this explicitly in the plan. The low-risk choice is to preserve current focused semantics and document trajectories as unavailable in focused comparison; if acceptance requires them, add a deliberate focused trajectory representation rather than mounting the full ten-slice track layer twice.

### Pitfall 13: Baseline test noise obscures Phase 4 failures

**What goes wrong:** Four existing full-suite source-contract failures are mistaken for regressions.

**How to avoid:** Keep targeted Phase 4 tests separate and report the known unrelated failures from `STATE.md`/`IMPLEMENTED-BASELINE.md`. The current targeted STKDE checks pass: 16 tests across the route, KDE hotspot, volume encoding, and adaptive-time files.

## Code Examples

### Exact-pair preset resolution

```typescript
type Stkde3DComparisonPreset = {
  id: string;
  label: string;
  datasetPresetId: CaseStudyPresetId;
  intervalA: { sliceIndex: number; startEpoch: number; endEpoch: number; label: string };
  intervalB: { sliceIndex: number; startEpoch: number; endEpoch: number; label: string };
  view: 'absolute' | 'difference';
  parameters: { kde: KdeParams; adaptiveTime: boolean; renderer: StkdeHeatmapRenderer };
  layer: 'heatmap' | 'heatmap-with-events' | 'heatmap-with-trajectories';
  camera: 'front-oblique';
};

function resolvePresetInterval(
  slices: readonly Stkde3DSceneSlice[],
  interval: Stkde3DComparisonPreset['intervalA'],
): ComparisonSelection | null {
  const slice = slices[interval.sliceIndex];
  if (!slice) return null;
  if (slice.startEpoch !== interval.startEpoch || slice.endEpoch !== interval.endEpoch) return null;
  return {
    index: slice.index,
    sourceSliceId: slice.sourceSliceId ?? `standalone-${slice.index}-${slice.startEpoch}-${slice.endEpoch}`,
    startEpoch: slice.startEpoch,
    endEpoch: slice.endEpoch,
  };
}
```

Define initial built-ins with explicit distinct pairs (for example 0-based pairs `[1, 7]` and `[2, 8]` across the existing ten-slice case studies), then capture literal epoch bounds from the current deterministic dataset and lock them in tests. Do not derive a pair from a label at runtime. A preset that cannot validate its exact bounds should remain unavailable instead of silently changing the analyst's intended comparison.

### Shared absolute domain

```typescript
const aMax = aResult.maxIntensity;
const bMax = bResult.maxIntensity;
const absoluteMax = Math.max(aMax, bMax, 1e-9);
const absoluteDomain: [number, number] = [0, absoluteMax];

const toAbsoluteIntensity = (normalized: number, sliceMax: number) =>
  (normalized * sliceMax) / absoluteMax;
```

Prefer using the preserved raw field directly. The formula above is only a compatibility bridge for existing normalized cells; it cannot recover cells removed by thresholding and must not power signed subtraction.

### Signed palette mapping

```typescript
function signedColor(value: number, maxAbs: number): string {
  const normalized = maxAbs > 0 ? Math.max(-1, Math.min(1, value / maxAbs)) : 0;
  const t = 0.5 + normalized * 0.5;
  // Interpolate blue -> neutral -> red using a dedicated palette stop list.
  return getSignedDifferenceColor(t);
}
```

Use a fixed semantic direction: `value > 0` means A is stronger and is red; `value === 0` is neutral; `value < 0` means B is stronger and is blue. Do not use the existing cream-to-red sequential `getStkdeIntensityColor` for negative values.

### Responsive vertical stage

```tsx
<div className="grid min-h-0 min-w-0 flex-1 grid-rows-2 gap-2">
  <StkdeComparisonViewport label="A" className="min-h-[20rem] min-w-0" />
  <StkdeComparisonViewport label="B" className="min-h-[20rem] min-w-0" />
</div>
```

The stage should remain vertical at narrow widths; the existing page can continue using its desktop grid with the side rail at `lg`. Each viewport needs an explicit height through the grid row/minimum so R3F's automatic resize has non-zero dimensions.

## State of the Art

| Old/current approach | Phase 4 approach | Impact |
|---|---|---|
| One `Canvas`, one `CameraControls`, one active slice | Reusable focused viewport with one controls instance per pane | Enables matched A/B inspection without making two full cubes. |
| Per-slice normalized `cells` only | Preserve raw KDE grid plus normalized cells | Makes absolute colors comparable and subtraction truthful. |
| Sequential cream-to-red palette | Dedicated symmetric red-neutral-blue difference palette | Encodes direction as well as magnitude. |
| `viewMode: 'stack' | 'focus'` | Add comparison stage modes outside the ordinary stack/focus path | Keeps default stack behavior unchanged and prevents difference from looking temporal. |
| `camera-controls` v2-era naming risk | Current Drei 10.7.7/camera-controls v3 API with `smoothTime` and pose methods | Drei 10.5+ documents camera-controls v3; do not add deprecated damping-based code. |

**Deprecated/outdated:**

- Do not use a custom `OrbitControls` synchronization layer or old `damping` prop; the installed `CameraControls` declaration uses `smoothTime` and exposes current pose methods.
- Do not treat the pre-Phase-4 “direct comparison deferred” note as current scope; `04-SPEC.md`, `04-CONTEXT.md`, and `REQUIREMENTS.md` now lock BURST-06 as active.

## Open Questions

1. **What literal epoch bounds should ship in the initial presets?**
   - What we know: The route always derives ten slices, but real slice boundaries come from the loaded records (`mock-data.ts:263-302`), so exact endpoints are dataset-dependent.
   - What's unclear: The current artifact set does not record the local DuckDB/API response values for each case-study slice.
   - Recommendation: Capture the current deterministic dataset's endpoints during implementation, use explicit pairs such as 0-based `[1, 7]` and `[2, 8]`, and add a resolver test. Treat endpoint mismatch as preset invalidation, not an automatic remap.

2. **Should trajectories be visible in absolute focused panes?**
   - What we know: Existing focus mode intentionally suppresses `HotspotTrajectoryOverlay`; the locked layer contract still names a trajectory layer.
   - What's unclear: Whether acceptance expects full tracks in each focused pane or only the existing toggle/control semantics.
   - Recommendation: Preserve current focus behavior unless the product owner requires focused trajectory cues; if required, design a selected-interval cue explicitly rather than showing the entire temporal track twice.

3. **Should the map base be visible below the difference field?**
   - What we know: The current 3D scene places a captured MapLibre texture under the KDE plane (`Stkde3DScene.tsx:405-429`), and the spec requires one signed map over the shared spatial extent.
   - What's unclear: Whether “heatmap-only” means no geographic base context or no analytical overlays.
   - Recommendation: Keep the geographic base map as context, but render no events, trajectories, slabs, burst volumes, or axis. Make the signed legend and A/B metadata explicit.

## Sources

### Primary (HIGH confidence)

- Local `04-SPEC.md` and `04-CONTEXT.md` — locked behavior, state/preset contracts, D-01 through D-04, boundaries, and acceptance criteria.
- Local `page.tsx`, `Stkde3DScene.tsx`, `StkdeSliceStack.tsx`, `Stkde3DSceneProvider.tsx` — current route state, source-slice identity, scene composition, map capture, focus remapping, and callbacks.
- Local `src/lib/kde/compute-slice-kde.ts` and `src/lib/kde/types.ts` — current grid, normalization, threshold, and parameter behavior.
- Local `palette.ts`, `standalone-adaptive-time.ts`, `kde-hotspots.ts`, `mock-data.ts`, and `page.stkde.test.ts` — existing renderer, adaptive context, slice construction, and test conventions.
- [Drei CameraControls documentation](https://github.com/pmndrs/drei/blob/master/docs/controls/camera-controls.mdx) — current `CameraControls` props, refs, update events, and `setLookAt` usage.
- [React Three Fiber Canvas documentation](https://docs.pmnd.rs/react-three-fiber/api/canvas) — Canvas sizing, camera props, `orthographic`, and parent-resize behavior.
- [Vitest writing tests](https://vitest.dev/guide/learn/writing-tests) — co-located `.test.*` discovery and TypeScript test patterns.
- Context7 `/pmndrs/drei` — verified CameraControls API and current Drei 10.5+ camera-controls v3 note.
- Context7 `/pmndrs/react-three-fiber` — verified Canvas behavior, pointer events, automatic resize, and the supported multi-view pattern.
- Context7 `/vitest-dev/vitest` — verified TypeScript and component/browser testing options.

### Secondary (MEDIUM confidence)

- Installed `node_modules/@react-three/drei/core/CameraControls.d.ts` and `node_modules/.pnpm/camera-controls@3.1.2_three@0.182.0/node_modules/camera-controls/dist/index.d.ts` — verified exact installed signatures for `getPosition`, `getTarget`, `setLookAt`, `reset`, `onUpdate`, and `smoothTime`. This is implementation evidence for the current lockfile, not a substitute for pinning a future version.
- `.planning/codebase/3D_SCENE_COMPOSITION.md` — established project camera/reset conventions; some portions describe older global scene code and should not override the current `/stkde-3d` source.

### Tertiary (LOW confidence)

- None used for core claims. No web-search-only claim is being used as an implementation requirement.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified against `package.json`, installed declarations, and current official/Context7 documentation.
- Architecture: HIGH — directly traced through the current route and scene sources; the recommended extraction is an incremental refactor.
- KDE/difference math: HIGH for the existing normalization and threshold behavior; MEDIUM for the proposed raw-field extension until implemented and tested.
- Camera linking: HIGH for available APIs; MEDIUM for exact event-suppression behavior until exercised in a real browser/WebGL session.
- Responsive layout: MEDIUM — R3F behavior is documented, but final pane heights need visual verification at project breakpoints.
- Pitfalls/tests: HIGH — grounded in current source and the recorded baseline; trajectory-in-focus behavior is an explicit open product decision.

**Research date:** 2026-08-01  
**Valid until:** 2026-09-01 for the stable project stack; re-check camera-controls/Drei signatures if dependencies are upgraded.

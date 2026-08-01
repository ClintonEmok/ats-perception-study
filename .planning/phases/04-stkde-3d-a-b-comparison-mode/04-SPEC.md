# Phase 4: STKDE-3D A/B Comparison Specification

**Created:** 2026-08-01
**Status:** Design contract for implementation
**Scope:** `/stkde-3d`

## Goal

Enable analysts to select two existing rendered STKDE intervals, inspect them in matched top-and-bottom 2.5D views, and switch to a truthful 2D signed KDE difference view without creating duplicate or persistent slices.

## Background

The `/stkde-3d` route currently renders one adaptive ten-slice stack. It has a single active slice index, a stack/focused view toggle, case-study presets, KDE controls, active-event and trajectory toggles, and a shared adaptive temporal warp. It does not currently provide a comparison mode, a second temporary selection, linked camera behavior, or a signed difference renderer.

Direct comparison was previously deferred in the project requirements. This document makes the interaction and visualization contract concrete before implementation.

## Requirements

1. **Comparison entry**: The route provides an explicit `Compare` mode without changing the default stack workflow.
   - Current: `/stkde-3d` supports stack and single-slice focused views only.
   - Target: A user can enter and exit comparison mode while preserving the normal full-cube view.
   - Acceptance: The default route still opens in stack view, and `Back to stack` returns to the full ten-slice cube.

2. **Temporary A/B selection**: A and B reference two different existing rendered slices.
   - Current: The route has one active slice index and no A/B selection state.
   - Target: In comparison selection mode, the user clicks a rendered surface for A, the UI automatically advances to B, and the next click assigns B.
   - Acceptance: A and B can be selected from the current ten rendered surfaces; selecting the same surface twice is rejected; no duplicate slice is added to any slice collection or store.

3. **Vertical absolute comparison**: Absolute comparison uses two focused 3D viewports arranged vertically.
   - Current: The route renders one focused view at a time.
   - Target: The comparison stage shows A in the top viewport and B in the bottom viewport. Each viewport contains one selected temporal slab/surface and its spatial KDE over the map plane.
   - Acceptance: After A and B are selected, both labeled viewports are visible at the same time, with A above B and no additive A+B overlay.

4. **Matched rendering context**: Absolute A and B views use identical analytical and spatial context.
   - Current: One scene receives the active slice, current settings, and current camera.
   - Target: Both comparison viewports use the same dataset/case-study window, map extent, spatial projection, KDE parameters, adaptive-time setting, heatmap renderer, and absolute color domain.
   - Acceptance: A value rendered with a given absolute color represents the same intensity range in B; changing a shared analytical setting updates both views consistently.

5. **Linked camera control**: Camera linking is enabled by default and can be disabled.
   - Current: The route has one interactive 3D camera and no comparison camera state.
   - Target: A `Linked cameras` control keeps both viewport cameras synchronized when either viewport is rotated, panned, or zoomed. Turning it off preserves the current matched view and allows independent inspection. `Reset views` restores both to the default front-oblique camera.
   - Acceptance: With linking enabled, a camera interaction in either viewport produces the same camera orientation, target, and zoom in the other viewport. With linking disabled, the views can diverge without affecting one another.

6. **Comparison controls and labels**: The comparison stage makes the selected intervals and view state explicit.
   - Current: The side rail describes only the single active slice and current analysis controls.
   - Target: The comparison UI identifies A and B by interval label, start/end time, and event count, and exposes `Absolute`, `A - B difference`, `Linked cameras`, `Reset views`, and `Back to stack` controls.
   - Acceptance: A screenshot or accessibility snapshot of comparison mode contains unambiguous A/B labels, interval metadata, the active comparison mode, and the camera-link state.

7. **Two-dimensional difference view**: A-B defaults to a single 2D signed KDE map.
   - Current: No difference field exists, and every STKDE-3D view is rendered as a 3D stack or focused slab.
   - Target: Difference mode replaces the paired absolute viewports with one top-down 2D map of `KDE(A) - KDE(B)` over the shared spatial extent. Warm values indicate higher A intensity, cool values indicate higher B intensity, and neutral values indicate little difference.
   - Acceptance: Difference mode renders one signed field with a symmetric diverging color scale centered at zero, retains A/B interval metadata, and does not present the result as a ten-slice temporal cube.

8. **Difference-layer discipline**: The difference view is heatmap-only.
   - Current: Active events and hotspot trajectories are independently toggleable in the absolute scene.
   - Target: Raw event points, trajectories, additive overlays, and unrelated volume overlays are hidden in A-B difference mode so the signed field remains interpretable.
   - Acceptance: Difference mode contains no additive A+B geometry and does not display event or trajectory overlays.

9. **Reproducible built-in presets**: The route provides a small set of code-defined comparison presets.
   - Current: The route has case-study dataset presets but no comparison presets.
   - Target: Each comparison preset records the dataset/case-study window, A interval, B interval, comparison mode, analytical parameters, layer, and camera preset. Initial presets are shipped in code; user-saved and URL-encoded presets are not required.
   - Acceptance: Loading a built-in preset selects the declared case-study, resolves the declared A/B rendered surfaces, applies its view and parameter values, and produces the same comparison state on repeat loads.

10. **Context invalidation**: A/B selections cannot silently refer to another dataset.
    - Current: Changing the case-study preset replaces the loaded dataset and resets the active index.
    - Target: Changing the dataset or case-study clears A/B selections and returns the comparison flow to A selection. Changing shared rendering parameters recomputes the existing A/B views without creating new slice objects.
    - Acceptance: After a case-study change, neither stale A nor stale B is rendered; the user must select both intervals again.

11. **Existing workflow preservation**: Comparison mode does not regress the current STKDE-3D analysis controls.
    - Current: Case-study selection, adaptive time, KDE tuning, heatmap renderer, event visibility, trajectory visibility, and slice inspection already work in the route.
    - Target: Those controls continue to work in stack and absolute comparison views, while difference mode applies the explicit heatmap-only restriction.
    - Acceptance: Existing STKDE-3D tests pass, the normal stack view remains functional, and shared setting changes are reflected in both absolute comparison viewports.

## Boundaries

**In scope:**

- A `Compare` mode for `/stkde-3d`.
- Temporary A/B selection from the existing rendered ten-slice stack.
- Auto-advance from A selection to B selection.
- Top-and-bottom focused absolute comparison viewports.
- Linked and independent camera behavior with reset-to-match controls.
- Shared absolute color scale and matched analytical context.
- A single 2D signed `KDE(A) - KDE(B)` difference view.
- Built-in reproducible comparison presets.
- Tests for selection, state invalidation, view modes, difference sign/scale, and camera-link behavior where practical.

**Out of scope:**

- Arbitrary freeform A/B date-range editing — keep the first comparison contract aligned with the existing rendered surfaces.
- Two full ten-slice cubes displayed simultaneously — too redundant and visually dense for the first comparison view.
- Additive A+B overlays — they increase occlusion and make direct contrast ambiguous.
- User-saved comparison objects or persistent duplicate slices — comparison state is temporary by design.
- URL sharing or backend storage for presets — built-in code presets are sufficient for the first version.
- A 3D difference cube or lifted difference slab — the subtraction is a spatial field and should not imply an invented temporal dimension.
- Redesigning the dashboard map/timeline control layer — this contract is specific to `/stkde-3d`.
- Rewriting the adaptive-time or STKDE pipelines — comparison must consume their existing outputs.

## State Contract

Comparison state is local/derived view state, not a new persistent slice domain.

```ts
type ComparisonSelection = {
  index: number;
  sourceSliceId: string;
  startEpoch: number;
  endEpoch: number;
};

type Stkde3DComparisonState = {
  mode: 'selecting' | 'absolute' | 'difference';
  activeSlot: 'A' | 'B';
  a: ComparisonSelection | null;
  b: ComparisonSelection | null;
  linkedCameras: boolean;
};
```

The exact module/store location is an implementation decision. The behavior must preserve the temporary-reference boundary above.

## Preset Contract

The initial preset shape must preserve enough information to reproduce a comparison without relying only on a display label.

```ts
type Stkde3DComparisonPreset = {
  id: string;
  label: string;
  datasetPresetId: string;
  intervalA: { sliceIndex: number; startEpoch: number; endEpoch: number; label: string };
  intervalB: { sliceIndex: number; startEpoch: number; endEpoch: number; label: string };
  view: 'absolute' | 'difference';
  parameters: {
    kde: KdeParams;
    adaptiveTime: boolean;
    renderer: 'field' | 'legacy';
  };
  layer: 'heatmap' | 'heatmap-with-events' | 'heatmap-with-trajectories';
  camera: 'front-oblique';
};
```

Difference mode always resolves the effective layer to signed heatmap-only, regardless of an absolute preset's optional event/trajectory layer.

## Constraints

- Preserve the existing Next.js, TypeScript, Zustand, React Three Fiber, and MapLibre architecture.
- Reuse the currently loaded dataset, slice KDE grids, spatial bounds, and map context; comparison must not issue duplicate data requests for A and B.
- Use one shared absolute color domain for A and B. Use a symmetric domain around zero for A-B.
- Keep the default stack workflow unchanged when comparison mode is inactive.
- Keep the interaction usable at the existing desktop-first viewport and provide a sensible vertical stack at narrower widths.
- Do not introduce a second frontend architecture or a separate persistent data model for comparison.

## Acceptance Criteria

- [ ] `/stkde-3d` opens in the existing full stack view and exposes an explicit `Compare` entry point.
- [ ] A user can select two distinct rendered surfaces, with the first selection automatically advancing from A to B.
- [ ] A/B selections are temporary references; no duplicate slice or persistent comparison object is created.
- [ ] Absolute comparison renders A above B as two focused 3D viewports.
- [ ] Both absolute viewports use the same data context, map extent, camera state by default, KDE parameters, adaptive-time setting, renderer, and absolute color domain.
- [ ] Linked camera interaction synchronizes orientation, target, and zoom between the two viewports.
- [ ] Disabling linked cameras permits independent inspection, and resetting restores both views to the same default camera.
- [ ] A-B replaces the pair with one top-down 2D signed KDE map centered at zero.
- [ ] Positive A-B values and negative A-B values have distinct, documented color meanings.
- [ ] Difference mode hides raw events, trajectories, additive overlays, and unrelated volume geometry.
- [ ] Built-in presets reproduce their declared dataset, A/B intervals, parameters, layer, view mode, and camera preset.
- [ ] Changing the dataset/case study clears stale A/B selections.
- [ ] Existing STKDE-3D tests pass, and new comparison behavior has targeted automated coverage.
- [ ] Typecheck, lint, and production build pass.

## Design Decisions

- Absolute comparison is top-and-bottom rather than side-by-side to preserve horizontal space for the map and 3D surface.
- Each absolute pane is a focused single-slice view, not a second full ten-slice cube.
- A-B is 2D by default because `KDE(A) - KDE(B)` is a spatial field and should not imply an invented temporal axis.
- KDE intensity is the first and only difference metric.
- Linked cameras are enabled by default but explicitly toggleable.
- Built-in code presets are the first reproducibility mechanism.
- Additive overlays are not the primary comparison interaction.

## References

- `src/app/stkde-3d/page.tsx`
- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/components/StkdeSliceStack.tsx`
- `src/app/stkde-3d/components/SliceScrubber.tsx`
- `src/app/stkde-3d/lib/standalone-adaptive-time.ts`
- `src/app/stkde-3d/lib/mock-data.ts`
- `.planning/STATE.md` — direct comparison is currently listed as deferred.

---

*This document defines what the STKDE-3D comparison feature must do. Implementation details remain subject to the subsequent planning and discussion workflow.*

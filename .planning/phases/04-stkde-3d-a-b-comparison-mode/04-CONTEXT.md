# Phase 4: STKDE-3D A/B Comparison - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a standalone comparison workflow to `/stkde-3d` that lets an analyst select two existing rendered STKDE intervals, inspect them in matched top-and-bottom focused views, and switch to a truthful signed 2D KDE difference view. Comparison references remain temporary derived view state; the existing stack workflow, adaptive-time pipeline, and loaded dataset remain the source of truth.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**11 requirements are locked.** See `04-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `04-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- A `Compare` mode for `/stkde-3d`.
- Temporary A/B selection from the existing rendered ten-slice stack.
- Auto-advance from A selection to B selection.
- Top-and-bottom focused absolute comparison viewports.
- Linked and independent camera behavior with reset-to-match controls.
- Shared absolute color scale and matched analytical context.
- A single 2D signed `KDE(A) - KDE(B)` difference view.
- Built-in reproducible comparison presets.
- Tests for selection, state invalidation, view modes, difference sign/scale, and camera-link behavior where practical.

**Out of scope (from SPEC.md):**
- Arbitrary freeform A/B date-range editing.
- Two full ten-slice cubes displayed simultaneously.
- Additive A+B overlays.
- User-saved comparison objects or persistent duplicate slices.
- URL sharing or backend storage for presets.
- A 3D difference cube or lifted difference slab.
- Redesigning the dashboard map/timeline control layer.
- Rewriting the adaptive-time or STKDE pipelines.

</spec_lock>

<decisions>
## Implementation Decisions

### Selection lifecycle
- **D-01:** Once both A and B are selected, the comparison references are locked for inspection. Replacing either interval uses an explicit `Reset comparison` action and returns the flow to A selection; clicking a new surface does not silently replace a completed slot.

### Reproducible presets
- **D-02:** The first built-in comparison presets contain exact A/B interval pairs, not only case-study date windows. Each preset must resolve concrete rendered surfaces and preserve the declared A/B metadata when loaded.

### Camera behavior
- **D-03:** Linked cameras are enabled by default. When linking is re-enabled after independent navigation, viewport B immediately snaps to viewport A's current camera pose; subsequent interactions remain synchronized.

### Difference encoding
- **D-04:** Absolute A/B views retain the existing KDE intensity palette. Difference mode uses a dedicated red-neutral-blue diverging palette centered at zero: positive `A - B` values are red/A-dominant, zero is neutral, and negative values are blue/B-dominant. The scale is symmetric around zero.

### the agent's Discretion
- The exact component/module split for comparison state and rendering.
- The camera synchronization mechanism and how camera pose is represented internally.
- Concrete hue values, contrast tuning, legend layout, and responsive CSS within the red-neutral-blue semantic contract.
- The initial concrete A/B slice indices for each built-in preset, provided they are explicit, distinct, reproducible, and drawn from the existing rendered surfaces.
- Whether comparison state is kept in the page or extracted into a local hook, as long as it remains temporary view state and does not enter the persistent slice domain.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and phase contract
- `.planning/phases/04-stkde-3d-a-b-comparison-mode/04-SPEC.md` — Locked Phase 4 requirements, boundaries, state contract, preset contract, constraints, and acceptance criteria.
- `.planning/ROADMAP.md` — Phase 4 goal, dependencies, success criteria, and execution order.
- `.planning/REQUIREMENTS.md` — BURST-06 traceability and milestone out-of-scope boundaries.
- `.planning/STATE.md` — Current project position and carried-forward decisions.
- `.planning/PROJECT.md` — Project purpose and product constraints.

### Existing implementation baseline
- `.planning/codebase/IMPLEMENTED-BASELINE.md` — Verified standalone STKDE-3D capabilities and known test baseline.
- `.planning/codebase/STACK.md` — Next.js, React Three Fiber, Zustand, testing, and build constraints.
- `.planning/codebase/ARCHITECTURE.md` — Component, state, data, worker, and STKDE integration patterns.
- `.planning/codebase/CONVENTIONS.md` — TypeScript, React, naming, styling, and testing conventions.
- `.planning/codebase/3D_SCENE_COMPOSITION.md` — Existing Canvas, `CameraControls`, scene-layer, and interaction patterns.
- `.planning/codebase/STKDE_TEMPORAL_SCOPE.md` — Existing STKDE grid, KDE, slice, and response semantics.

### Standalone route and reusable scene code
- `src/app/stkde-3d/page.tsx` — Current route-local dataset loading, case-study presets, ten-slice derivation, KDE computation, controls, and scene wiring.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — Current Canvas, map texture, focused scene composition, overlays, and camera controls.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — Existing slice surface rendering, KDE texture generation, source-slice IDs, and slice selection payloads.
- `src/app/stkde-3d/components/Stkde3DSceneProvider.tsx` — Runtime callbacks and scene coordinate/source-slice resolution.
- `src/app/stkde-3d/components/StkdeIntensityLegend.tsx` — Existing absolute KDE legend pattern.
- `src/app/stkde-3d/lib/palette.ts` — Existing sequential absolute KDE palettes to preserve outside difference mode.
- `src/app/stkde-3d/lib/types.ts` — Existing slice and KDE cell data types.
- `src/app/stkde-3d/lib/standalone-adaptive-time.ts` — Existing adaptive temporal placement shared by all rendered slices.
- `src/app/stkde-3d/lib/mock-data.ts` — Real/mock dataset and rendered-slice construction.
- `src/app/stkde-3d/page.stkde.test.ts` — Existing route/source contract tests to preserve and extend.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StkdeSliceStack` already renders a provided slice/KDE pair, resolves stable `sourceSliceId` values, and emits selection payloads, so comparison selection can reference existing surfaces rather than creating new slice objects.
- `Stkde3DScene` already supports focused single-slice rendering through `viewMode="focus"`, map texture placement, and `CameraControls`; comparison panes can reuse these primitives with selected-slice inputs.
- `page.tsx` already derives `sceneSlices`, `sliceKdes`, hotspot results, adaptive warp maps, and volume profiles from one loaded dataset, providing the matched analytical context required by both A and B.
- `Stkde3DSceneProvider` exposes the runtime callback boundary needed to route slice clicks into page-local temporary comparison state.
- `StkdeIntensityLegend` and `lib/palette.ts` provide the absolute heatmap legend/palette pattern; difference mode should add a separate signed legend rather than reinterpret the sequential scale.

### Established Patterns
- Route-local client state is used for standalone `/stkde-3d` controls; persistent Zustand slice-domain state is reserved for the broader dashboard workflow.
- R3F scene layers are composed inside a single `Canvas` with `CameraControls`; heavy analytical data is computed before rendering and passed as props.
- Slice identity is carried through stable source IDs and epoch bounds, while normalized x/z coordinates are used for spatial KDE rendering.
- Pure data transformations belong in `src/app/stkde-3d/lib/` or `src/lib/` and should receive targeted Vitest coverage.
- The current absolute KDE palette is sequential warm cream-to-red; it must not be reused as the signed difference encoding because it does not distinguish positive from negative change.

### Integration Points
- `src/app/stkde-3d/page.tsx` is the main integration point for Compare entry/exit, temporary A/B state, preset application, reset/invalidation, and shared control propagation.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` is the rendering integration point for one focused pane, two vertically arranged absolute panes, and the single top-down difference view.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` is the selection/rendering primitive to adapt or wrap for comparison selection without adding slices to a store.
- Existing dataset changes already reset loading and active index in the case-study effect; comparison state must be invalidated in the same lifecycle.
- Existing route tests and co-located pure utility tests are the primary validation surfaces; typecheck, lint, and production build remain required gates.

</code_context>

<specifics>
## Specific Ideas

- The comparison should read as two matched analytical views, not as two unrelated cubes.
- A/B selection is intentionally temporary and should feel like choosing references from the already rendered stack.
- Difference mode should make direction obvious at a glance: red means A is stronger, blue means B is stronger, and neutral means little difference.
- Preserve the existing stack view as the default and make `Back to stack` a clear escape from comparison mode.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-06-24-replace-arbitrary-0-7-burst-threshold-with-data-driven-cutof.md` — Data-driven burst cutoff calibration is a separate burst-generation concern and does not belong in standalone STKDE-3D comparison.
- `2026-06-24-showcase-adaptive-time-scaling-in-dashboard-demo.md` — Dashboard-demo adaptive-time education is outside the `/stkde-3d` phase boundary and should be planned separately.

</deferred>

---

*Phase: 4-STKDE-3D A/B Comparison*
*Context gathered: 2026-08-01*

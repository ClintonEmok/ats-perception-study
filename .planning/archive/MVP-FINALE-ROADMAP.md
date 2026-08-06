# Roadmap: MVP Finale (v2.0)

## Overview

Milestone **MVP Finale** delivers the remaining supervisor objectives for the Adaptive Space-Time Cube Prototype. It builds on the working dashboard-demo foundation and completes: time slicing consistency, cube↔demo store sync, slice plane rendering in 3D, 3D STKDE on cube planes, adjacent slice comparison, burst evolution visualization, clustering, and category encoding.

Dashboard-demo is now the main app. The old dashboard route is legacy.

**Phase numbering resets** from the v1.0 roadmap (phases 1–16). These 6 phases run sequentially.

**Total requirements:** 26

**Not in scope:** User workflow / guided workflow beyond what already exists in `WorkflowSkeleton`. Can be added as a follow-up milestone if desired.

---

## Phases

### Phase 1: Foundation — Store sync + slice planes

**Goal:** Cube reads from demo stores, slice planes render in MainScene, and the granularity type gap is closed.

**Depends on:** Nothing (dashboard-demo already works)

**Requirements (7):** SLICE-01, SLICE-02, LINK-01, LINK-02, PLANE-01, PLANE-02, PLANE-03

| ID | Requirement | Notes |
|----|-------------|-------|
| SLICE-01 | Add `monthly` to `TimeslicingGranularity` type | Trivial fix — already in `ComparableWarpGranularity` and `TimeslicePreset` |
| SLICE-02 | Fix any remaining binning type inconsistencies | Ensure `TimeslicingGranularity`, `ComparableWarpGranularity`, `TimeslicePreset`, and `BinningStrategy` all agree |
| LINK-01 | Wire `CubeVisualization` to accept demo store overrides | Follow the same pattern as `MapVisualization` (filterStoreOverride, etc.) |
| LINK-02 | Timeline-to-cube selection/warp propagation | Ensure demo timeline slice + warp state reaches SimpleCrimePoints in cube |
| PLANE-01 | Render `<TimeSlices />` in `MainScene` | Component exists but is not in the scene tree |
| PLANE-02 | Slice plane interaction (drag, double-click create, resize) | Uses existing SlicePlane.tsx — wire to demo store |
| PLANE-03 | Slice plane visual polish (colors, labels, grid helpers) | Match existing palette, add time labels, clean up opacity |

**Success criteria:**
1. Cube crime points respond to demo warp factor and slice state
2. Time slice planes are visible and interactive in the 3D scene
3. Monthly granularity is available as a first-class option
4. All cube state reads come from demo stores, not global stores

---

### Phase 2: 3D STKDE on Cube Planes

**Goal:** Compute STKDE per slice and render heatmap layers on each slice plane in the 3D cube.

**Depends on:** Phase 1 (planes must exist in scene, cube must read demo state)

**Requirements (3):** KDE3D-01, KDE3D-02, KDE3D-03

| ID | Requirement | Notes |
|----|-------------|-------|
| KDE3D-01 | Multi-domain STKDE computation per slice | Extend `computeStkdeFromCrimes` to accept slice array, return slice-keyed response |
| KDE3D-02 | Render STKDE heatmap texture on slice planes | Use R3F plane geometry with heatmap texture overlay per slice |
| KDE3D-03 | Reactive STKDE updates on slice/time changes | Debounced re-computation when active slice set or time range changes |

**Success criteria:**
1. Each visible slice plane shows a heatmap overlay of its crime density
2. STKDE recomputes when slices change (add/remove/resize)
3. Heatmap color scale matches the existing 2D map STKDE convention
4. Up to 5 slice planes render simultaneously without frame drop

---

### Phase 3: Adjacent Slice Comparison + Burst Evolution

**Goal:** Users can compare adjacent slices side-by-side and see burst lifecycle across consecutive slices.

**Depends on:** Phase 2 (slices with KDE provide the density context for comparison)

**Requirements (5):** EVOL-01, EVOL-02, BURST-01, BURST-02, BURST-03

| ID | Requirement | Notes |
|----|-------------|-------|
| EVOL-01 | Adjacent slice comparison UI | Side-by-side or overlay view showing two slices' density/counts |
| EVOL-02 | Metric diff between adjacent slices | Numeric diff (count delta, type composition change, density ratio) |
| BURST-01 | Burst lifecycle visualization | Render burst intensity curve across consecutive slice planes in cube |
| BURST-02 | Burst tracking across slices | Identify same burst class appearing in adjacent slices, draw connection lines |
| BURST-03 | Burst metrics timeline | Timeline overlay showing burst scores per slice (bar/line chart in the rail) |

**Success criteria:**
1. User can select two adjacent slices and see a comparison panel
2. Burst lifecycle is visible as a curve spanning slice planes
3. Same burst across adjacent slices is visually connected
4. Burst scores are shown in the timeline or rail as a per-slice metric

---

### Phase 4: Evolution View

**Goal:** An evolution view component that shows temporal progression across all slices as an animated or stepped sequence.

**Depends on:** Phase 3 (comparison/burst logic feeds into evolution)

**Requirements (3):** EVOL-03, EVOL-04, EVOL-05

| ID | Requirement | Notes |
|----|-------------|-------|
| EVOL-03 | Evolution view component | Dedicated view (rail tab or overlay) showing all slices in temporal sequence |
| EVOL-04 | Slice-to-slice transition animation | Animated transition between slices in the cube (crossfade plane KDE) |
| EVOL-05 | Pattern flow visualization | Visualize how crime patterns flow/change across time (e.g., directional arrows or flow lines between plane positions) |

**Success criteria (what must be TRUE):**
1. User can step through slices in temporal order and see KDE update per step
2. Automatic playback mode steps through slices at configurable speed
3. Flow arrows or transition hints show how clusters move between slices
4. Evolution view is accessible from the rail tabs

**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — evolution sequence model and rail panel
- [ ] 04-02-PLAN.md — rail tab wiring, transition animation, and flow visualization

---

### Phase 5: Clustering

**Goal:** Integrate DBSCAN clustering and render cluster hulls on slice planes and in the cube volume.

**Depends on:** Phase 4 (evolution provides the temporal context for cluster movement)

**Requirements (4):** CLUS-01, CLUS-02, CLUS-03, CLUS-04

| ID | Requirement | Notes |
|----|-------------|-------|
| CLUS-01 | Integrate `density-clustering` package (DBSCAN) | Package already in package.json — wire into a clustering module |
| CLUS-02 | 3D clustering visualization on cube | Render cluster hulls (convex or alpha shapes) in the cube volume |
| CLUS-03 | Per-slice clustering | Compute DBSCAN per slice plane and render 2D hulls on each plane |
| CLUS-04 | Cluster interaction (hover/select/filter) | Hover to see cluster composition, click to filter points, style by cluster ID |

**Success criteria:**
1. DBSCAN runs on cube crime points and returns cluster assignments
2. Cluster hulls render as transparent 3D volumes or 2D polygons on slices
3. Hovering a cluster shows its member count, crime types, and time span
4. Click-to-filter isolates a cluster's points across all slices

**Plans:** 4 plans

Plans:
- [ ] 05-01-PLAN.md — shared DBSCAN cluster analysis and store model
- [ ] 05-02-PLAN.md — 3D cluster hulls and label overlays in the cube
- [ ] 05-03-PLAN.md — per-slice cluster overlays on the slice planes
- [ ] 05-04-PLAN.md — cluster hover, select, and spatial-bound filtering

---

### Phase 6: Category Encoding

**Goal:** Replace the hardcoded 6-type legend with a dynamic legend, add click-to-filter by crime category, and introduce shape encoding.

**Depends on:** Phase 5 (clustering cluster membership can filter by type)

**Requirements (3):** CAT-01, CAT-02, CAT-03

| ID | Requirement | Notes |
|----|-------------|-------|
| CAT-01 | Dynamic legend from actual data | Replace `SimpleCrimeLegend` hardcoded types with data-driven legend from `palettes.ts` |
| CAT-02 | Click-to-filter by category | Click legend item filters cube (and map) to that category |
| CAT-03 | Shape encoding for categories | Different marker shapes (sphere, cube, cone) per broad category in cube |

**Success criteria:**
1. Legend auto-populates from the crime types present in current viewport
2. Clicking a legend item toggles that type's visibility in cube and map
3. At least 3 distinct marker shapes are used for broad categories
4. Category filter state is stored in demo filter store and syncs across views

**Plans:** 3 plans

Plans:
- [ ] 06-01-PLAN.md — shared viewport legend data helper
- [ ] 06-02-PLAN.md — dynamic cube/map legends and category toggles
- [ ] 06-03-PLAN.md — cube category shape encoding

---

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Requirements | Status |
|-------|-------------|--------|
| 1. Foundation — Store sync + slice planes | 7 | Not started |
| 2. 3D STKDE on Cube Planes | 3 | Not started |
| 3. Adjacent Slice Comparison + Burst Evolution | 5 | Not started |
| 4. Evolution View | 3 | Not started |
| 5. Clustering | 4 | Not started |
| 6. Category Encoding | 3 | Not started |

## Deferred

- **User workflow:** The guided 6-step workflow in `WorkflowSkeleton.tsx` is already in place. Deeper workflow integration (tying evolution, clustering, and category analysis into the step-by-step flow) is deferred.
- **Map-to-cube 2D/3D linking:** Explicitly out of scope per user decision. Selection sync is timeline→cube only.

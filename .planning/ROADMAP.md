# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

This milestone turns the adaptive cube into a burst-volume analytical model. The timeline continues to allocate vertical space, but the 3D cube becomes the place where analysts inspect burst onset, evolution, and behavior through stacked temporal samples rather than a single decorative slice. A final STKDE-3D comparison phase makes two-interval contrast an active deliverable rather than a deferred capability.

## Phases

- [x] **Phase 1: Burst Model Foundation** - derive burst volumes and their internal temporal samples from the existing adaptive pipeline. (Baseline verified)
- [x] **Phase 2: Burst Volume Rendering** - render burst volumes as stacked contours with explicit boundaries and centroid paths. (Baseline verified)
- [x] **Phase 3: Cluster Evolution** - track correspondence between samples and expose burst behavior metrics. (Baseline verified)
- [ ] **Phase 4: STKDE-3D A/B Comparison** - compare two rendered intervals in matched absolute views and a signed KDE difference view. (Next priority)
- [ ] **Phase 5: Cube Integration** - route overlays through the shared model and finish the structural refactor. (Partial implementation; follows standalone comparison)

## Phase Details

### Phase 1: Burst Model Foundation

**Goal**: Derive a shared BurstVolumeModel from the existing burst windows, STKDE output, and adaptive warp state.
**Depends on**: Nothing
**Requirements**: BURST-01, BURST-02
**Success Criteria** (what must be TRUE):

  1. Each burst is represented as a single model object with start, peak, end, duration, count, and adaptive height.
  2. Each burst contains multiple temporal samples with centroid and spread data derived from existing analysis.
  3. The model can be computed without changing the timeline's role as the control layer.

**Plans**: 2 plans (baseline verified)

Plans:

- [x] 01-01: Define BurstVolumeModel and sample types.
- [x] 01-02: Build the burst-volume derivation path from existing burst/STKDE data.

### Phase 2: Burst Volume Rendering

**Goal**: Render each burst as a visible 3D analytical object instead of a flat slice plane.
**Depends on**: Phase 1
**Requirements**: BURST-03
**Success Criteria** (what must be TRUE):

  1. Burst volumes show start/end boundaries in the cube.
  2. Each burst renders multiple internal density contours or sample layers.
  3. A centroid path or similar evolution cue is visible inside the volume.

**Plans**: 2 plans (baseline verified)

Plans:

- [x] 02-01: Add burst-volume boundary and contour primitives.
- [x] 02-02: Wire the renderer to consume the derived model.

### Phase 3: Cluster Evolution

**Goal**: Track cluster correspondence through the burst volume and expose the resulting behavior metrics.
**Depends on**: Phase 2
**Requirements**: BURST-04, BURST-05
**Success Criteria** (what must be TRUE):

  1. Adjacent samples can be matched into persistent, split, merge, and disappearing tracks.
  2. Burst behavior metrics are computed from the sampled model.
  3. The metadata panel can summarize how the hotspot moved or changed shape during the burst.

**Plans**: 2 plans (baseline verified)

Plans:

- [x] 03-01: Implement sample-to-sample cluster correspondence.
- [x] 03-02: Derive and surface burst behavior metrics.

### Phase 4: STKDE-3D A/B Comparison

**Goal**: Let analysts select two existing STKDE intervals, compare them in matched top-and-bottom focused 2.5D views, and switch to a truthful 2D signed KDE difference view without creating duplicate slices.
**Depends on**: Phase 3 baseline; independent of Phase 5 integration
**Requirements**: BURST-06
**Success Criteria** (what must be TRUE):

  1. A and B can be selected from the existing rendered intervals as temporary references.
  2. Absolute comparison renders A above B with shared data context, color scale, and optionally linked cameras.
  3. A-B replaces the pair with one 2D signed KDE map centered at zero.
  4. Built-in presets reproduce the dataset, intervals, parameters, layer, mode, and camera state.

**Plans**: 5 plans

Plans:

- [ ] 04-01-PLAN.md — Build the temporary A/B selection tracer over existing rendered intervals.
- [ ] 04-02-PLAN.md — Preserve raw KDE fields and add tested shared/signed comparison math.
- [ ] 04-03-PLAN.md — Render matched vertical absolute panes with linked cameras.
- [ ] 04-04-PLAN.md — Add signed difference mode, exact-pair presets, and invalidation wiring.
- [ ] 04-05-PLAN.md — Harden UI states, contracts, verification, and browser behavior.

### Phase 5: Cube Integration

**Goal**: Move the cube to a shared-model architecture so overlays and inspectors read from the same burst representation.
**Depends on**: Phase 4
**Requirements**: ARCH-01, ARCH-02
**Status**: Partial baseline; follows standalone comparison. The shared burst model and renderer are available, but `TimeSlices` still owns slice-local cluster analysis and overlay mounting.
**Success Criteria** (what must be TRUE):

  1. TimeSlices is an orchestrator rather than the place where analysis and rendering are fused.
  2. Existing overlays consume shared burst-model data instead of recomputing slice-local state.
  3. The cube, map, and timeline still stay synchronized after the refactor.

**Plans**: 2 plans

Plans:

- [ ] 05-01: Split orchestration from burst analysis and rendering.
- [ ] 05-02: Rewire overlays and inspectors to the shared model.

## Progress

**Execution Order:**
Current execution order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Burst Model Foundation | 2/2 | Complete (baseline verified) | 2026-08-01 |
| 2. Burst Volume Rendering | 2/2 | Complete (baseline verified) | 2026-08-01 |
| 3. Cluster Evolution | 2/2 | Complete (baseline verified) | 2026-08-01 |
| 4. STKDE-3D A/B Comparison | 0/0 | Next priority | - |
| 5. Cube Integration | 0/2 | Partial baseline | - |

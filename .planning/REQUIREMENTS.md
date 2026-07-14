# Requirements: Adaptive Space-Time Cube Prototype

**Defined:** 2026-07-14
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## v1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Burst Model

- [ ] **BURST-01**: User can inspect a burst volume as one analytical object with start, peak, end, duration, event count, and adaptive height.
- [ ] **BURST-02**: User can inspect multiple temporal samples inside each burst and see centroid and spread evolution derived from existing burst windows and STKDE data.

### Burst Rendering

- [ ] **BURST-03**: User can view burst volumes in the cube as stacked temporal structures with start/end boundaries and internal density contours.

### Cluster Evolution

- [ ] **BURST-04**: User can see cluster correspondences across temporal samples and identify persistence, movement, split, merge, appearance, and disappearance.
- [ ] **BURST-05**: User can read burst behavior metrics such as persistence, displacement, expansion, fragmentation, and spatial entropy in the metadata panel.

### Architecture

- [ ] **ARCH-01**: TimeSlices acts as an orchestrator only, with burst-model building separated from rendering.
- [ ] **ARCH-02**: Existing cube overlays consume shared burst-model data instead of independently recomputing slice-local analysis.

## v2 Requirements

Deferred to a later milestone.

### Comparisons

- **BURST-06**: Analyst can compare two burst volumes side by side.

### Metaphor

- **BURST-07**: Analyst can switch to a temporal-gravity metaphor for burst dynamics.

## Out of Scope

Explicitly excluded from this milestone.

| Feature | Reason |
|---------|--------|
| Map/timeline redesign | The control layer already works; this milestone keeps it intact. |
| Full adaptive-engine rewrite | The current pipeline should be reused and only reorganized. |
| Direct burst comparison view | Valuable later, but not needed for the first burst-volume pass. |
| Temporal-gravity interaction system | Too speculative for the first milestone; keep the work grounded. |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BURST-01 | Phase 1 | Pending |
| BURST-02 | Phase 1 | Pending |
| BURST-03 | Phase 2 | Pending |
| BURST-04 | Phase 3 | Pending |
| BURST-05 | Phase 3 | Pending |
| ARCH-01 | Phase 4 | Pending |
| ARCH-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after milestone definition*

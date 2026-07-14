# Adaptive Space-Time Cube Prototype

## What This Is

A Next.js thesis prototype for exploring crime patterns through an adaptive space-time cube, a 2D map, and a dual timeline. The current milestone shifts the cube from a slice renderer into an analytical burst-volume model so the 3D view can explain how dense spatiotemporal periods evolve, not just display them.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## Requirements

### Validated

- ✓ Cube, map, and timeline already synchronize around selected time ranges and adaptive warp state.
- ✓ Local DuckDB + Arrow data loading keeps the prototype offline and analysis-oriented.
- ✓ Existing burst detection, STKDE, cluster overlays, and selection interactions already provide the ingredients for a burst-aware cube.

### Active

- [ ] Derive burst volumes from existing burst windows, STKDE output, and cluster signals.
- [ ] Render burst volumes as stacked temporal structures with boundaries, internal samples, and centroid paths.
- [ ] Track cluster evolution across samples and expose persistence, movement, split, and merge behavior.
- [ ] Refactor the cube so shared burst-model data feeds overlays instead of each overlay recomputing slice-local analysis.

### Out of Scope

- Map or timeline redesign - the control layer stays intact for this milestone.
- Full rewrite of the adaptive scaling or data ingestion pipeline - the existing pipeline is the source of truth.
- Direct burst-to-burst comparison - useful later, but not required to make the cube analytically distinct.
- Temporal-gravity metaphor as a separate interaction system - keep the first milestone grounded in measurable burst structure.

## Context

This milestone follows a design pivot: ATR should create vertical analytical capacity, and the cube should use that capacity to reveal spatial evolution through burst volumes. The current implementation already has the adaptive timeline as the control layer, plus slice planes, overlays, STKDE heatmaps, and cluster analysis. The missing piece is a shared analytical model that ties those pieces together.

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + the existing Three.js/MapLibre/DuckDB stack - avoid introducing a second frontend architecture.
- **Data layer**: Local DuckDB + Apache Arrow pipeline - preserve the offline analytics model.
- **Performance**: Large crime datasets must not block the UI - keep heavy burst/cluster work off the main thread where possible.
- **Scope**: Desktop-first internal thesis prototype - avoid unrelated consumer features.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Burst volumes are derived from existing burst windows, STKDE, and cluster outputs | Keeps the milestone incremental and avoids rewriting the adaptive engine first | Pending |
| The timeline remains the control layer; the cube becomes the analytical artifact | Matches the thesis framing and clarifies why the 3D view still matters | Pending |
| Stage 1 should prioritize structural clarity over metaphor-heavy rendering | Delivers a usable first pass before adding richer behavior encodings | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-14 after starting milestone v1.0 Burst Volume Analytical Model*

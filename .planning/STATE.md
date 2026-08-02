---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: STKDE-3D A/B Comparison
status: in_progress
stopped_at: Completed 04-03-PLAN.md
last_updated: "2026-08-02T06:57:03Z"
last_activity: 2026-08-02
last_activity_desc: Completed 04-03-PLAN.md.
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-14)

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** Standalone STKDE-3D A/B Comparison

## Current Position

Phase: 4 of 5 (STKDE-3D A/B Comparison)
Plan: 3 of 5 (matched vertical absolute panes and linked cameras)
Status: In progress
Last activity: 2026-08-02 — Completed 04-03-PLAN.md.

Progress: [██████░░░░] 60%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: 2h 22m
- Total execution time: 7h 07m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 4 | 3 | 5 | 2h 22m |

**Recent Trend:**

- Last 5 plans: -
- Trend: Stable

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 04-stkde-3d-a-b-comparison-mode P03 | 6h 45m | 3 tasks | 11 files |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Milestone v1.0] Burst volumes are derived from existing burst windows, STKDE output, and cluster signals.
- [Milestone v1.0] The adaptive timeline stays the control layer while the cube becomes the analytical artifact.
- [Milestone v1.0] Stage 1 should prioritize structural clarity before richer metaphor layers.
- [Milestone v1.0] Phase 1 delivered the shared BurstVolumeModel and live hook; the next step is rendering the analytical cube volume.
- [Quick 260730-ptr] Persistent columns use direct normalized KDE x/z anchors and never reuse trajectory projection coordinates.
- [Quick 260730-ptr] Persistent segment bounds resolve both actual epoch endpoints through the shared adaptive scene runtime.
- [Quick 260730-ptr] Missing or below-cutoff source slices remain temporal gaps, and the overlay stays opt-in to standalone stack view.
- [Quick 260730-ta7] Standalone trajectories are derived from separated local KDE peaks and use the normalized heatmap coordinate space.
- [Quick 260730-ta7] Tracks only connect adjacent slices and terminate immediately when the hotspot is missing.
- [Quick 260731-0nh] Adaptive matching derives tolerance from active KDE cell width and smoothing; Fixed mode preserves the legacy 3 km matcher.
- [Quick 260731-0nh] Adaptive links combine distance, intensity, and support continuity with deterministic one-to-one assignment.
- [Quick 260731-1pa] Qualified tracks are determined by KDE candidate qualification and adjacent-slice matching, not a fixed five-track display cap.
- [Quick 260731-h4m] Trajectory visibility is independently toggleable while matching controls and qualified-track counts remain available.
- [Quick 260731-i6l] The event overlay is labeled Active events because it renders only points from the currently active slice.
- [Quick 260731-juc] Dashboard trajectories already use shared adaptive epoch placement; active event points need timestamp preservation and source-slice alignment before dashboard enablement.
- [Quick 260731-juc] Active event records retain epoch-second timestamps, are keyed by source slice before brushed cube reindexing, and are clipped to the active cube domain.
- [Quick 260731-juc] Active event points remain opt-in in dashboard mode and use the shared runtime epoch resolver; brushed volume profiles use the active adaptive allocation helper.
- [Quick 260731-nsj] Standalone adaptive time derives a density warp from event timestamps and shares it with event Y placement, trajectories, slice surfaces, and volume allocation.
- [Phase 4 spec] Direct STKDE-3D comparison is active: temporary rendered-slice A/B selection, top-and-bottom matched absolute views, linked cameras, and a 2D signed KDE difference view.
- [Baseline 2026-08-01] Phases 1-3 are complete in the implementation baseline; Phase 5 remains partial and follows standalone A/B comparison.
- [Phase 4 Plan 04-02] Complete raw KDE fields remain separate from sparse thresholded display cells, and `KdeField` is consumed through the public `@/lib/kde` barrel.
- [Phase 4 Plan 04-02] Signed comparison rejects missing or mismatched fields and uses a stable positive fallback only for valid all-zero domains.
- [Phase 4 Plan 04-02] Red-neutral-blue signed colors are centralized separately from the existing sequential absolute palettes.
- [Phase 4 Plan 04-03] Absolute A/B panes share one stage-owned map capture and raw KDE domain while focused local indexes remain separate from source identity.
- [Phase 4 Plan 04-03] Full-source trajectories and timestamped events are passed explicitly into focused panes; trajectory visibility is not suppressed solely by focus mode.
- [Phase 4 Plan 04-03] Camera linking is imperative and guarded: relinking snaps B to A, unlinking preserves divergence, and reset applies one front-oblique pose to both panes.

### Roadmap Evolution

- Phase 4 added: STKDE-3D A/B Comparison.

### Pending Todos

Phase 4 Plan 04-04 is the next active task: signed difference mode, exact-pair presets, and invalidation wiring. Phase 5 shared-model refactoring follows afterward. Dashboard active-event controls are rendered after generated slices are applied; the route's initial 3D empty state remains intentional.

### Blockers/Concerns

The full test suite has four stale source-contract failures in unrelated visualization/showcase tests; targeted Phase 4 tests, typecheck, lint, and production build pass. Browser/WebGL review remains for the new fixed-height pane composition and live camera interaction.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Metaphor | Temporal-gravity interaction system | Deferred | Milestone v1.0 |

## Session Continuity

Last session: 2026-08-02T06:57:03Z
Stopped at: Completed 04-03-PLAN.md
Resume file: None

## Quick Tasks Completed

| Task | Status | Completed |
|------|--------|-----------|
| Useful adaptive 3D interactions (`260728-gh3`) | Complete | 2026-07-30 |
| Persistent spatial columns across STKDE slices (`260730-ptr`) | Complete | 2026-07-30 |
| Hotspot movement trajectories (`260730-ta7`) | Complete | 2026-07-30 |
| Adaptive hotspot matching toggle (`260731-0nh`) | Complete | 2026-07-31 |
| Remove hotspot track caps (`260731-1pa`) | Complete | 2026-07-31 |
| Toggleable hotspot trajectories (`260731-h4m`) | Complete | 2026-07-31 |
| Rename active event control (`260731-i6l`) | Complete | 2026-07-31 |
| Timestamp-safe adaptive 3D active events (`260731-juc`) | Complete | 2026-07-31 |
| Standalone adaptive temporal warp (`260731-nsj`) | Complete | 2026-07-31 |

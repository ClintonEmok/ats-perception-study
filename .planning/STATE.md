---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: STKDE-3D A/B Comparison
status: quick_task_complete
stopped_at: Completed quick task 260803-ud3
last_updated: "2026-08-03T19:58:10Z"
last_activity: 2026-08-03
last_activity_desc: Completed quick task 260803-ud3.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-14)

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** Dashboard-demo adaptive STKDE controls and case-study presets

## Current Position

Phase: 4 of 5 (STKDE-3D A/B Comparison)
Plan: Quick task 260803-tdb
Status: Quick task complete
Last activity: 2026-08-03 — Completed dashboard-demo adaptive hotspot matching defaults and Inspect renderer selector removal.

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: 2h 40m
- Total execution time: 13h 21m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 4 | 5 | 5 | 2h 40m |

**Recent Trend:**

- Last 5 plans: -
- Trend: Stable

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 04-stkde-3d-a-b-comparison-mode P03 | 6h 45m | 3 tasks | 11 files |
| Phase 04 P04 | 13min | 3 tasks | 9 files |
| Phase 04 P05 | 6h 1m | 3 tasks | 12 files |

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
- [Quick 260802-compare-ux-feedback] Comparison entry and preset-ready state use nullable activeSlot; slot activation is explicit and supports B-first assignment, partial replacement, duplicate rejection, ready locking, reset, and invalidation.
- [Quick 260802-compare-ux-feedback] Absolute comparison resolves raw KDE fields through source identity into two matched static 2D maps; difference mode uses one raw-preserving signed field with display-only gamma contrast.
- [Quick 260802-compare-ux-feedback] Comparison controls are the single native keyboard rail; visible cards show dates/counts only, while camera and overlay presentation paths remain deferred or removed from live comparison rendering.
- [Phase 4 spec] Direct STKDE-3D comparison is active: temporary rendered-slice A/B selection, top-and-bottom matched absolute views, linked cameras, and a 2D signed KDE difference view.
- [Baseline 2026-08-01] Phases 1-3 are complete in the implementation baseline; Phase 5 remains partial and follows standalone A/B comparison.
- [Phase 4 Plan 04-02] Complete raw KDE fields remain separate from sparse thresholded display cells, and `KdeField` is consumed through the public `@/lib/kde` barrel.
- [Phase 4 Plan 04-02] Signed comparison rejects missing or mismatched fields and uses a stable positive fallback only for valid all-zero domains.
- [Phase 4 Plan 04-02] Red-neutral-blue signed colors are centralized separately from the existing sequential absolute palettes.
- [Phase 4 Plan 04-03] Absolute A/B panes share one stage-owned map capture and raw KDE domain while focused local indexes remain separate from source identity.
- [Phase 4 Plan 04-03] Full-source trajectories and timestamped events are passed explicitly into focused panes; trajectory visibility is not suppressed solely by focus mode.
- [Phase 4 Plan 04-03] Camera linking is imperative and guarded: relinking snaps B to A, unlinking preserves divergence, and reset applies one front-oblique pose to both panes.
- [Phase 4 Plan 04-04] Built-in comparison presets store exact dataset/index/label identity and resolve actual epoch bounds and source IDs only after rendered surfaces exist.
- [Phase 4 Plan 04-04] Difference mode is one raw-field top-down heatmap with red-neutral-blue semantics and no temporal, event, trajectory, volume, or additive layers.
- [Phase 4 Plan 04-04] Case-study changes invalidate temporary A/B references; shared analytical setting changes recompute the existing pair through the single dataset lifecycle.
- [Phase 4 Plan 04-05] The range loader is the sole dataset request path; only case-study changes and explicit retries start a new lifecycle.
- [Phase 4 Plan 04-05] Real load failures remain visible with explicit retry copy, while configured mock data is labeled rather than presented as live data.
- [Phase 4 Plan 04-05] Stable DOM markers, deterministic fixtures, keyboard controls, and browser verification jointly cover comparison states that WebGL tests cannot fully assert.
- [Quick 260802-ab-reference-layout] Comparison presentation uses a desktop two-column white header that stacks below sm, with the mode-specific legend retained as a substantial right-side card.
- [Quick 260802-ab-reference-layout] Absolute maps use centered bounded aspect-[16/7] frames with explicit min-w-0, w-full, and 20rem minimums; analytical field resolution and map textures remain unchanged.
- [Quick 260802-ab-reference-layout] Signed comparison labels are rendered as B HIGHER, 0 / NO DIFFERENCE, and A HIGHER while retaining the existing blue-neutral-red palette semantics.
- [Quick 20260803-adaptive-temporal-allocation] Dashboard authored allocation converts normalized slices to epoch space, averages the existing density map, applies bounded manual warp hints, and uses the shared cumulative comparable-warp allocator for both timeline and 3D consumers.
- [Quick 260803-qm2] Dashboard per-slice event counts resolve only through canonical source IDs; missing keyed results remain unknown while server zero remains zero.
- [Quick 260803-qm2] Full, Fourth of July, Spring Break, and New Year's definitions live in one dependency-free shared module consumed by both standalone and dashboard routes.
- [Quick 260803-qm2] Case-study selection replaces the canonical generated-applied stack with ten ranges and synchronizes dashboard epoch/normalized time, both scale stores, applied-slices scope, pending drafts, comparison state, and screenshot-ready 3D Inspect mode.
- [Quick 260803-tdb] Dashboard-demo initial state and resetAnalysis use adaptive hotspot matching while resetTemporalSettings remains fixed; adaptive time-scale mode is unchanged.
- [Quick 260803-tdb] Dashboard Inspect keeps Fixed versus Adaptive hotspot matching and field-backed legend/API wiring while hiding the Field/Legacy renderer selector.
- [Quick 260803-ud3] Dashboard Inspect exposes only Adaptive server cell matching while preserving the fixed/adaptive matching type, state, setter, and API compatibility.
- [Quick 260803-ud3] The dashboard-only visibility change leaves renderer behavior and standalone /stkde-3d implementation untouched.

### Roadmap Evolution

- Phase 4 added: STKDE-3D A/B Comparison.

### Pending Todos

1. **Capture Chapter 6 prototype evidence and thesis demo strategy** (docs, major) — Chapter 6 has 5 PLACEHOLDER figures; demo strategy needs linear→adaptive transition and context preservation argument.

Phase 4 and quick tasks 260802-compare-ux-feedback, 260802-ab-reference-layout, and 20260803-adaptive-temporal-allocation are complete after comparison UX, reference layout, shared authored temporal allocation, and verification. Phase 5 shared-model refactoring follows next. Dashboard active-event controls are rendered after generated slices are applied; the route's initial 3D empty state remains intentional.

### Blockers/Concerns

The full test suite has four stale source-contract failures in unrelated visualization/showcase tests; targeted comparison tests, typecheck, lint, and production build pass. Browser review completed successfully for slot-first selection, reference-aligned absolute/signed layouts, fixed-height maps, presets, invalidation, responsive overflow, normal-stack recovery, and request reuse. The exact mock browser command also needs the public `NEXT_PUBLIC_USE_MOCK_DATA` alias because the route is a client component.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Metaphor | Temporal-gravity interaction system | Deferred | Milestone v1.0 |

## Session Continuity

Last session: 2026-08-03T19:58:10Z
Stopped at: Completed quick task 260803-ud3
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
| Comparison UX feedback (`260802-compare-ux-feedback`) | Complete | 2026-08-02 |
| A/B reference layout (`260802-ab-reference-layout`) | Complete | 2026-08-02 |
| Dashboard adaptive temporal allocation (`20260803-adaptive-temporal-allocation`) | Complete | 2026-08-03 |
| Dashboard STKDE accounting and case studies (`260803-qm2`) | Complete | 2026-08-03 |
| Dashboard adaptive hotspot default and Inspect renderer cleanup (`260803-tdb`) | Complete | 2026-08-03 |
| Hide Fixed hotspot matching from dashboard Inspect (`260803-ud3`) | Complete | 2026-08-03 |

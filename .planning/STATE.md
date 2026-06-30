---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: ATS Perception Study
status: executing
last_updated: "2026-06-30T15:05:00Z"
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 2
  completed_plans: 2
  percent: 50
---

# Project State
## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** Phase 89 — Experiment Flow & Trial Engine

## Current Position

Phase: 89 (v4.0 Phase 3 of 4 — Experiment Flow & Trial Engine)
Plan: —
Status: Ready to plan
Last activity: 2026-06-30 — Phase 88 committed (`08e9f61`)

Progress: [██████████░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 87 Infrastructure & Core Logic | 1 | done | — |
| 88 Stimulus Rendering & RT Measurement | 1 | done | — |
| 89 Experiment Flow & Trial Engine | TBD | — | — |
| 90 Deployment / Route Stripping / Pilot | TBD | — | — |

**Recent Trend:**
- Last 2 plans: 87 (Convex schema, counterbalancing, ATS mapping, base datasets), 88 (SVG stimulus, performance.now timing).
- Trend: on plan.

## Accumulated Context

### Decisions

- v4.0 is a custom React + Zustand + Visx experiment engine, not jsPsych.
- Study persistence is Convex-only; no DuckDB on the study branch.
- Phase order is fixed: 87 schema/mapping → 88 stimuli/RT → 89 trial engine/participant flow → 90 deployment/pilot.
- Counterbalancing uses a committed Latin square with sequential participant assignment.
- Practice trials plus post-study preference/free-text questionnaire are in scope.
- Phase 87: Convex hand-written `_generated/server.ts` stub keeps imports stable without `npx convex dev`; replace when the Convex project is provisioned.
- Phase 87: ATS interval mapper applies min/max-width bounds after the final span rescale, not before, so dense-region emphasis survives normalisation.
- Phase 88: Timing source requires an explicit `performance` argument in tests; the `useStimulusTiming` hook owns Page Visibility wiring for the participant UI.
- Phase 88: `TimelineStimulus` is a pure SVG component (no canvas) so it survives Playwright screenshot comparisons and keeps the bundle small.

### Pending Todos

- None yet.

### Blockers/Concerns

- Convex project is still not provisioned; the runtime will silently no-op until `NEXT_PUBLIC_CONVEX_URL` is set.
- Keep unrelated dashboard-demo / prototype routes out of the study branch; Phase 90 will physically strip them.

## Session Continuity

Last session: 2026-06-30
Stopped at: Phase 88 complete; Phase 89 next.
Resume file: None

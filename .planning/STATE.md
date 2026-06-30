---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: ATS Perception Study
status: planning
last_updated: "2026-06-30T12:00:00Z"
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** Phase 87 — Infrastructure & Core Logic

## Current Position

Phase: 87 (v4.0 Phase 1 of 4 — Infrastructure & Core Logic)
Plan: —
Status: Ready to plan
Last activity: 2026-06-30 — v4.0 roadmap drafted and requirements traceability populated

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 87 Infrastructure & Core Logic | TBD | — | — |
| 88 Stimulus Rendering & RT Measurement | TBD | — | — |
| 89 Experiment Flow & Trial Engine | TBD | — | — |
| 90 Deployment / Route Stripping / Pilot | TBD | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: Not yet established

## Accumulated Context

### Decisions

- v4.0 is a custom React + Zustand + Visx experiment engine, not jsPsych.
- Study persistence is Convex-only; no DuckDB on the study branch.
- Phase order is fixed: 87 schema/mapping → 88 stimuli/RT → 89 trial engine/participant flow → 90 deployment/pilot.
- Counterbalancing uses a committed Latin square with sequential participant assignment.
- Practice trials plus post-study preference/free-text questionnaire are in scope.

### Pending Todos

- None yet.

### Blockers/Concerns

- Convex is not initialized in the repo yet, so Phase 87 will need project linkage/bootstrap before schema work.
- Keep unrelated dashboard-demo / prototype routes out of the study branch.

## Session Continuity

Last session: 2026-06-30
Stopped at: v4.0 ATS Perception Study roadmap drafted and requirements traceability populated
Resume file: None

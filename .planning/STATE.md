---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: ATS Perception Study
status: executing
last_updated: "2026-06-30T15:10:00Z"
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 75
---

# Project State
## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** Phase 90 — Deployment / Route Stripping / Pilot

## Current Position

Phase: 90 (v4.0 Phase 4 of 4 — Deployment / Route Stripping / Pilot)
Plan: —
Status: Ready to plan
Last activity: 2026-06-30 — Phase 89 committed (`c9b20a3`)

Progress: [██████████████] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 87 Infrastructure & Core Logic | 1 | done | — |
| 88 Stimulus Rendering & RT Measurement | 1 | done | — |
| 89 Experiment Flow & Trial Engine | 1 | done | — |
| 90 Deployment / Route Stripping / Pilot | TBD | — | — |

**Recent Trend:**
- Last 3 plans: 87 (Convex schema, counterbalancing, ATS mapping, base datasets), 88 (SVG stimulus, performance.now timing), 89 (Zustand state machine, task components, trial runner, /experiment route).
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
- Phase 89: `ConvexClientProvider` ships as a stub that does not import `convex/react`; replaced with the real provider in Phase 90 after `pnpm add convex`.
- Phase 89: `useExperimentStore` persists everything except the `convexWrites` reference, so a refresh resumes mid-trial and we never serialize a function.

### Pending Todos

- None yet.

### Blockers/Concerns

- Convex project is still not provisioned; the runtime will silently no-op until `NEXT_PUBLIC_CONVEX_URL` is set.
- Keep unrelated dashboard-demo / prototype routes out of the study branch; Phase 90 will physically strip them.

## Session Continuity

Last session: 2026-06-30
Stopped at: Phase 89 complete; Phase 90 next.
Resume file: None

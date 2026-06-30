---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: ATS Perception Study
status: executing
last_updated: "2026-06-30T15:35:00Z"
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Project State
## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.
**Current focus:** v4.0 milestone audit + cleanup

## Current Position

Phase: 90 (v4.0 Phase 4 of 4 — Deployment / Route Stripping / Pilot)
Plan: 1
Status: Complete
Last activity: 2026-06-30 — Phase 90 committed (`6293eb0`)

Progress: [████████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 87 Infrastructure & Core Logic | 1 | done | — |
| 88 Stimulus Rendering & RT Measurement | 1 | done | — |
| 89 Experiment Flow & Trial Engine | 1 | done | — |
| 90 Deployment / Route Stripping / Pilot | 1 | done | — |

**Recent Trend:**
- Last 4 plans: 87 (Convex schema, counterbalancing, ATS mapping, base datasets), 88 (SVG stimulus, performance.now timing), 89 (Zustand state machine, task components, trial runner, /experiment route), 90 (route stripping, deployment gates, pilot prep).
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
- Phase 90: All prototype routes and dependencies are physically removed from the study branch; the only runtime surface is the landing page, `/experiment`, and the Convex client.
- Phase 90: Three deployment gates enforced — import-guard, bundle-check, and the production build.
- Phase 90: `pickExperimentalVariant(blockCondition)` is a pure function; the block condition is passed in rather than read from the store inside a render helper.
- Phase 90: `TrialRunner` initialises `phase` lazily from `showFixation` so the no-fixation path doesn't call `setPhase` inside an effect.

### Pending Todos

- Provision the Convex production project (`ats-perception-study-prod`) and set `NEXT_PUBLIC_CONVEX_URL` + `CONVEX_DEPLOY_KEY` in the Vercel environment.
- Run the 2-3 participant pilot per `docs/PILOT.md`.
- Run `gsd-audit-milestone` and `gsd-complete-milestone` to close v4.0.

### Blockers/Concerns

- None. The study branch is ready for the Convex production deploy.

## Session Continuity

Last session: 2026-06-30
Stopped at: All 4 v4.0 phases complete; milestone audit next.
Resume file: None

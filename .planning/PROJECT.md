# Adaptive Space-Time Cube Prototype

## What This Is

This is a Next.js prototype for bursty spatiotemporal crime analysis. It combines a 2D map, a 3D Space-Time Cube, and a dual timeline where users brush time, inspect points, and see bursty intervals expand or compress as the time resolution changes — with the map, cube, and timeline staying synchronized around the active slice. v3.4 shipped a parameterized adaptive signal contract (burstiness / density / contextual) with a TypeScript-ported winsorized Pearson residual metric backed by a thesis-grade Python comparison against Goh-Barabasi. v4.0 adds a controlled within-subjects web experiment (ATS Perception Study) validating Adaptive Temporal Scaling against Uniform timelines.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## Current Milestone: v4.0 (archived) → ready for next

**v4.0 goal (archived):** Deliver a controlled within-subjects web experiment comparing Adaptive Temporal Scaling vs Uniform timeline perception.

Next milestone: TBD — start with `/gsd-new-milestone` to question → research → define requirements → roadmap.

## Current Status

**v4.0 ATS Perception Study** shipped 2026-06-30 on dedicated `ats-study` branch (public repo at `ClintonEmok/ats-perception-study`). 5 phases, 17/19 requirements satisfied; 2 deployment requirements (DEPLOY-04, DEPLOY-05) are deferred pending Convex + Vercel credentials. The study is a custom React + Zustand + Visx experiment engine with Convex-only persistence, 6 base datasets, counterbalanced condition order, and a full participant flow. Pushed to GitHub as a public repo on the `ats-study` branch.

## Requirements

### Validated

- ✓ **FLOW-07** — Detect is the obvious entry point for burst scanning and slice generation — v3.1
- ✓ **FLOW-08** — Slices is the obvious review/apply surface — v3.1
- ✓ **FLOW-09** — Inspect shows active slice state and comparison controls immediately — v3.1
- ✓ **FLOW-10** — Map, cube, and timeline stay synchronized with the active slice — v3.1
- ✓ **ADP-01 through ADP-06** — Adaptive 3D warp axis, interactive slices, density strips — v3.4
- ✓ **CBP-01 through CBP-08** — Contextual burstiness vs Goh-Barabasi comparison, decision gate GO — v3.4
- ✓ **BFT-01/BFT-02** — Parameterized adaptive signal contract (burstiness default + density/contextual fallbacks) — v3.4
- ✓ **BFT-03** — Existing density-derived implementation preserved — v3.4
- ✓ **BFT-04 through BFT-09** — Histogram-based detail timeline, burst onset/ramp-up cues, stable overview — v3.4
- ✓ **BFT-11/BFT-12** — Density fallback verified, existing workflow compatibility — v3.4
- ✓ Demo presets dropdown wired to dashboard-demo stores (T1-T8 task windows + reset) — v3.4
- ✓ POI layer (police, schools, transit, parks) on dashboard-demo 2D map — v3.4

### Active

- [ ] **EXP-01** — Render synthetic event sequences as SVG timeline stimuli (event rug + allocation bands) for both Uniform and ATS conditions
- [ ] **EXP-02** — Implement 3 task types: Peak Identification (3-choice MCQ), Period Comparison (binary), Pattern Recognition (4-choice MCQ)
- [ ] **EXP-03** — Deliver 24 counterbalanced experimental trials (12 Uniform, 12 ATS) with 2 practice trials
- [ ] **EXP-04** — Record per-trial response data (accuracy, response time, confidence, condition, dataset ID, task type)
- [ ] **EXP-05** — Anonymous participant flow with unique ID assignment, instructions, trials, post-study questionnaire
- [ ] **EXP-06** — Deploy self-contained experiment route (strip unrelated prototype routes from ats-study branch)
- [ ] **EXP-07** — Compute ATS mapping in client-side JS from burstiness-derived per-interval allocation weights
- [ ] **EXP-08** — Convex schema and API for response storage and retrieval
- [ ] **BFT-10** — Expose visible toggle for switching burstiness vs density vs contextual (implemented but hidden — see v3.4-MILESTONE-AUDIT.md)
- [ ] **D-01, D-03, D-07, D-10, D-12, D-14, D-15, D-16** — Evaluation readiness: complete /evaluation route and pilot verification (Phase 80)
- [ ] **Phase 81** — Reduce dashboard memory pressure (overview/detail separation, pre-aggregated reads)
- [ ] **Phase 82** — Add POI to 2D map verification

### Out of Scope

- Authentication and accounts — this is an internal research prototype
- Real-time multi-user collaboration — not part of the exploration workflow
- Mobile-native app support — current focus is desktop web visualization
- Full case-management / incident workflow — not an operations system
- Generic BI dashboard features — would dilute the domain-specific exploration model
- Social sharing / public publishing — adds privacy and permissions complexity without core value

## Context

- Existing brownfield Next.js 16 App Router app with feature-based organization
- The active planning surface is `dashboard-demo`
- Core stack includes TypeScript, Zustand, Three.js, MapLibre, DuckDB, Apache Arrow, and Web Workers
- v3.1 phases (72-75) complete: Workflow Clarity, Inspection Speed, Coordination Polish, Presentation Cleanup
- v3.2 completed with visualization quality improvements inside the demo 3D STKDE widget
- v3.4 shipped with burstiness-first adaptive timeline, contextual z metric (CV ratio 56.7x vs Goh-Barabasi), parameterized signal contract, demo presets, and POI map layer
- v4.0 starts on dedicated `ats-study` branch for controlled ATS vs Uniform perception experiment
- Known gaps: Phase 83/84 missing VERIFICATION.md, BFT-10 Select hidden, 17 deferred items in STATE.md, uncommitted DashboardDemoRailTabs.tsx wiring
- Codebase analysis exists in `.planning/codebase/`, milestone history in `.planning/milestones/`

## Constraints

- **Tech stack**: Next.js 16, TypeScript, pnpm, and the existing visualization/data stack — avoid introducing a second frontend architecture
- **Data layer**: Local DuckDB + Apache Arrow pipeline — preserve the current offline analytics model
- **Performance**: Large crime datasets must not block the UI — keep heavy computation off the main thread where possible
- **Product scope**: Desktop-first internal prototype — avoid adding unrelated consumer features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the App Router modular monolith structure | Matches the existing codebase and keeps feature boundaries clear | ✓ Good |
| Pair 2D density with 3D STC views | Matches the paper's hybrid visualization design | ✓ Good |
| Use non-uniform temporal scaling for burst analysis | Preserves metric duration while making burst order legible | ✓ Good |
| Use shared comparable-bin warp scoring for demo previews | Keeps same-granularity warp widths visible | ✓ Good |
| Keep hotspot and guidance features as support features | They help analysis without becoming the main task model | ✓ Good |
| Run adaptive-time computation in Web Workers | Prevents expensive warp calculations from blocking interaction | ✓ Good |
| Recenter planning on `dashboard-demo` | The demo route is the actual workflow surface | ✓ Good |
| Detect-first workflow rail | Detect is the natural entry point for burst scanning | ✓ Good |
| Slices owns review/apply | Separates draft-state from applied-state actions | ✓ Good |
| Inspect immediacy | Active-slice context visible without extra clicks | ✓ Good |
| Parameterized adaptive signal contract (burstiness/density/contextual) | Burstiness becomes the default driver; density/contextual available as fallback/compare | ✓ Good |
| Winsorized Pearson residual for contextual z | Sensitivity check confirms structural equivalence to standard z (CV ratio 1.0113x) | ✓ Good |
| Decision gate on Python analysis before TypeScript wiring | Phase 83 CBP-05 verdict GO unblocked Phase 84 | ✓ Good |
| Static-first → API-fallback baseline loader | 168-cell JSON committed; DuckDB API route as fallback | ✓ Good |
| Action-bag helper pattern for preset wiring | Pure function with 6-setter interface, testable in isolation | ✓ Good |
| ATS Perception Study on dedicated `ats-study` branch | Keeps experimental code isolated from prototype; Convex-only backend avoids DuckDB dependency | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to the appropriate phase or support section
3. New requirements emerged? -> Add to the matching section
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 — v4.0 ATS Perception Study milestone archived*

<details>
<summary>v4.0 ATS Perception Study (archived 2026-06-30)</summary>

**Goal:** Deliver a controlled within-subjects web experiment comparing Adaptive Temporal Scaling vs Uniform timeline perception.

**Target features:**
- SVG timeline stimuli (event rug + allocation bands) rendered client-side
- 3 task types: Peak Identification, Period Comparison, Pattern Recognition
- 24 experimental trials + 2 practice, counterbalanced Uniform/ATS conditions
- Per-trial response recording (accuracy, RT, confidence) via Convex backend
- Anonymous participant flow with post-study questionnaire

**Outcome:** 5 phases shipped, 17/19 requirements satisfied. Code-complete and verified on the ats-study branch. Live Vercel + Convex deployment and the 2-3 participant pilot are blocked on operational credentials. See `.planning/milestones/v4.0-ROADMAP.md` and `.planning/v4.0-MILESTONE-AUDIT.md`.

</details>

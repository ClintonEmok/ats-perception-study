# Requirements: v4.0 ATS Perception Study

**Project:** Adaptive Space-Time Cube Prototype
**Milestone:** v4.0 ATS Perception Study
**Date:** 2026-06-30

## Milestone v4.0 Requirements

### EXPMT — Experiment Core
- [ ] **EXPMT-01**: Render synthetic event sequences as SVG timeline stimuli (event rug marks atop allocation bands) for both Uniform and ATS conditions
- [ ] **EXPMT-02**: Implement 3 task types — Peak Identification (3-choice MCQ: strongest burst), Period Comparison (binary choice), Pattern Recognition (4-choice MCQ: uniform / one burst / multiple bursts / gradual change)
- [ ] **EXPMT-03**: Deliver 26 trials total (2 practice + 24 experimental), with 8 trials per task type and 12 Uniform / 12 ATS experimental trials under counterbalanced condition order
- [ ] **EXPMT-04**: Compute ATS mapping client-side in TypeScript from burstiness-derived per-interval allocation weights
- [ ] **EXPMT-05**: Record per-trial response data — accuracy, RT (via `performance.now()`), confidence rating, condition, dataset ID, task type
- [ ] **EXPMT-06**: Anonymous participant flow with unique ID generation, on-screen instructions, trial blocks, post-study questionnaire (preference + free-text), and debrief screen
- [ ] **EXPMT-07**: Generate at least 6 unique base event datasets (synthetic or small real subset), each rendered in both Uniform and ATS forms to produce the study stimuli set

### DATA — Data Layer
- [ ] **DATA-01**: Convex schema with partial-trial support (`status` enum: `started` / `responded` / `completed` / `abandoned` / `timeout`) and optional nullable response columns; study persistence uses Convex only
- [ ] **DATA-02**: Two-phase write pattern — trial onset logged immediately, response logged separately — ensuring abandoned trials leave an audit trail
- [ ] **DATA-03**: Counterbalanced condition assignment from pre-computed Latin square matrix committed to the repo (not runtime randomization); sequential participant assignment
- [ ] **DATA-04**: Data export endpoint or dashboard for researcher analysis of aggregated trial results

### FLOW — Participant Flow & Guards
- [ ] **FLOW-01**: Formal state machine (Zustand) driving consent → instructions → practice → block A → block B → questionnaire → debrief, with explicit transition guards
- [ ] **FLOW-02**: Browser navigation guards — `beforeunload` confirm dialog, `popstate` block, `visibilitychange`-gated RT timing with pause accumulator — plus sessionStorage checkpointing for crash recovery
- [ ] **FLOW-03**: Practice trials (2) with correctness feedback before advancing to experimental block

### DEPLOY — Deployment & Route Stripping
- [ ] **DEPLOY-01**: Strip unrelated prototype routes and dependencies from `ats-study` branch so only the study surface ships
- [ ] **DEPLOY-02**: ESLint import guard preventing any prototype code import (`@/lib/db`, `@/store/useCoord*`, `@/components/map/`, etc.) into study routes
- [ ] **DEPLOY-03**: Bundle analysis gate — verify no DuckDB WASM, Three.js, or MapLibre in the experiment chunk
- [ ] **DEPLOY-04**: Vercel production deployment with Convex production project and environment variables configured
- [ ] **DEPLOY-05**: Pilot verification (N=2-3 participants) with full data export before open recruitment

## Future Requirements

- Participant recruitment dashboard with access codes
- Canvas fallback rendering if SVG cross-browser verification fails
- Admin panel for pre-generating/caching synthetic datasets
- Real-time Convex dashboard for monitoring incoming responses during live study

## Out of Scope

- DuckDB data pipeline (not needed — synthetic stimuli, no real crime data)
- jsPsych framework (custom React+Zustand engine is a better fit for custom SVG stimuli)
- Adaptive 3D visualization / Space-Time Cube (study is 2D SVG timelines only)
- MapLibre / POI layers (no spatial component in perception study)
- Phase 80 researcher-mediated evaluation flow (study is self-service anonymous participants)
- Mobile-native support (desktop-first prototype, consistent with PROJECT.md constraints)
- Authentication / accounts (anonymous participant flow by design)

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DATA-01 | Phase 87 | Pending |
| DATA-03 | Phase 87 | Pending |
| EXPMT-04 | Phase 87 | Pending |
| EXPMT-07 | Phase 87 | Pending |
| DATA-02 | Phase 88 | Pending |
| EXPMT-01 | Phase 88 | Pending |
| EXPMT-05 | Phase 88 | Pending |
| EXPMT-02 | Phase 89 | Pending |
| EXPMT-03 | Phase 89 | Pending |
| EXPMT-06 | Phase 89 | Pending |
| FLOW-01 | Phase 89 | Pending |
| FLOW-02 | Phase 89 | Pending |
| FLOW-03 | Phase 89 | Pending |
| DATA-04 | Phase 90 | Pending |
| DEPLOY-01 | Phase 90 | Pending |
| DEPLOY-02 | Phase 90 | Pending |
| DEPLOY-03 | Phase 90 | Pending |
| DEPLOY-04 | Phase 90 | Pending |
| DEPLOY-05 | Phase 90 | Pending |

# Requirements: v4.0 ATS Perception Study

**Project:** Adaptive Space-Time Cube Prototype
**Milestone:** v4.0 ATS Perception Study
**Date:** 2026-06-30

## Milestone v4.0 Requirements

### EXPMT — Experiment Core
- [ ] **EXPMT-01**: Render synthetic event sequences as SVG timeline stimuli (event rug marks atop allocation bands) for both Uniform and ATS conditions
- [ ] **EXPMT-02**: Implement 3 task types — Peak Identification (3-choice MCQ), Period Comparison (binary choice), Pattern Recognition (4-choice MCQ: uniform/one burst/multiple bursts/gradual change)
- [ ] **EXPMT-03**: Deliver 26 trials (2 practice + 24 experimental, balanced 12 Uniform / 12 ATS, counterbalanced condition order)
- [ ] **EXPMT-04**: Compute ATS mapping client-side in TypeScript from burstiness-derived per-interval allocation weights (no Python, no Web Worker needed for <500 events)
- [ ] **EXPMT-05**: Record per-trial response data — accuracy, RT (via `performance.now()`), confidence rating, condition, dataset ID, task type
- [ ] **EXPMT-06**: Anonymous participant flow with unique ID generation, on-screen instructions, trial blocks, post-study questionnaire, and debrief screen

### DATA — Data Layer
- [ ] **DATA-01**: Convex schema with partial-trial support (`status` enum: `started` / `responded` / `completed` / `abandoned` / `timeout`) and optional nullable response columns
- [ ] **DATA-02**: Two-phase write pattern — trial onset logged immediately, response logged separately — ensuring abandoned trials leave an audit trail
- [ ] **DATA-03**: Counterbalanced condition assignment from pre-computed Latin square matrix committed to the repo (not runtime randomization); sequential participant assignment
- [ ] **DATA-04**: Data export endpoint or dashboard for researcher analysis of aggregated trial results

### FLOW — Participant Flow & Guards
- [ ] **FLOW-01**: Formal state machine (Zustand) driving consent → instructions → practice → block A → block B → questionnaire → debrief, with explicit transition guards
- [ ] **FLOW-02**: Browser navigation guards — `beforeunload` confirm dialog, `popstate` block, `visibilitychange`-gated RT timing with pause accumulator — plus sessionStorage checkpointing for crash recovery
- [ ] **FLOW-03**: Practice trials (2) with correctness feedback before advancing to experimental block

### DEPLOY — Deployment & Route Stripping
- [ ] **DEPLOY-01**: Strip 21 prototype routes and ~35 prototype dependencies (DuckDB, Three.js, MapLibre, Web Workers) from `ats-study` branch
- [ ] **DEPLOY-02**: ESLint import guard preventing any prototype code import (`@/lib/db`, `@/store/useCoord*`, `@/components/map/`, etc.) into study routes
- [ ] **DEPLOY-03**: Bundle analysis gate — verify no DuckDB WASM, Three.js, or MapLibre in the experiment chunk; target sub-500KB gzipped
- [ ] **DEPLOY-04**: Vercel production deployment with Convex production project, environment variables configured
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
| — | — | To be populated by roadmap |

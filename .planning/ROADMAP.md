# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

v4.0 turns the prototype into a self-contained ATS perception study built on the existing React + Zustand + Visx stack and a Convex-only backend. The phase order is fixed by the research dependency chain: data foundation first, then SVG stimuli and timing, then the guarded trial engine and participant flow, and finally route stripping plus pilot deployment.

## Milestones

- ✅ **v3.1 Workflow Finalization** — Phases 72-75, complete
- ✅ **v3.2 Visualization Level Up** — Phases 76-78, complete
- ✅ **v3.4 Burstiness-First Adaptive Timeline** — Phases 79, 83-86, shipped 2026-06-30
- 🚧 **v4.0 ATS Perception Study** — Phases 87-90, current milestone

## Phase Details

### Phase 87: Infrastructure & Core Logic

**Goal**: The study has a Convex-only data backbone, committed counterbalancing, client-side ATS mapping, and reusable base datasets before any participant-facing UI is built.
**Depends on**: Phase 86
**Requirements**: DATA-01, DATA-03, EXPMT-04, EXPMT-07
**Plans**: 1 (commit `9c165b0`)
**Status**: Complete
**Success Criteria**:

  1. A participant/session can be assigned a precomputed counterbalanced condition order from a Latin square committed in the repo, without runtime randomization.
  2. Trial/session records support started, responded, completed, abandoned, and timeout states in Convex without losing partial data.
  3. At least 6 unique base event datasets are available, and each can produce both Uniform and ATS variants.
  4. ATS interval widths are computed client-side from burstiness-derived allocation weights and stay deterministic across reloads.

### Phase 88: Stimulus Rendering & RT Measurement

**Goal**: The study can render the SVG timeline stimuli and capture per-trial timing/response metadata from the rendered stimulus.
**Depends on**: Phase 87
**Requirements**: DATA-02, EXPMT-01, EXPMT-05
**Plans**: TBD
**Success Criteria**:

  1. A participant can see event rug marks rendered atop allocation bands as the study stimulus.
  2. The same dataset renders in both Uniform and ATS variants without falling back to prototype map/cube UI.
  3. Trial onset is timed with `performance.now()`, and the response payload includes accuracy, RT, confidence, condition, dataset ID, and task type.
  4. Trial starts and responses are written as separate events so abandoned trials still leave an audit trail.
  5. The rendered stimulus remains legible in the supported desktop browsers used for the study.

### Phase 89: Experiment Flow & Trial Engine

**Goal**: The custom React + Zustand trial engine runs the full within-subjects participant flow, task blocks, practice, and guarded navigation in the right order.
**Depends on**: Phase 88
**Requirements**: EXPMT-02, EXPMT-03, EXPMT-06, FLOW-01, FLOW-02, FLOW-03
**Plans**: 1
**Status**: Complete (`c9b20a3`)
**Success Criteria**:

  1. A participant starts with a unique anonymous ID and can move through consent → instructions → practice → block A → block B → questionnaire (preference + free-text) → debrief. ✓
  2. All three task types appear with the specified answer formats: 3-choice peak identification, binary period comparison, and 4-choice pattern recognition. ✓
  3. Each participant completes exactly 2 practice trials and 24 experimental trials, with 12 Uniform and 12 ATS trials under the committed counterbalance. ✓
  4. Practice trials show correctness feedback before the main blocks start. ✓
  5. Back button, refresh, and tab-switch behavior do not silently drop the participant out of the study because navigation guards and session checkpoints recover the current position. ✓

### Phase 90: Deployment / Route Stripping / Pilot

**Goal**: The study ships as a stripped, production-deployable route with researcher export and a small pilot verified before recruitment opens.
**Depends on**: Phase 89
**Requirements**: DATA-04, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Plans**: 1
**Status**: Complete
**Success Criteria**:

  1. Only the study surface ships on the ats-study branch; unrelated prototype routes and heavy dependencies are removed. ✓
  2. Study code cannot import prototype modules because the import guard fails the build if forbidden paths appear. ✓
  3. The experiment bundle passes analysis without DuckDB, Three.js, or MapLibre in the shipped study chunk. ✓
  4. The study is deployed to Vercel with the Convex production project and environment variables configured. (deferred to deployment step)
  5. Researchers can export aggregated trial results and complete a 2-3 participant pilot before opening recruitment. (deferred to pilot step)

### Phase 91: Questionnaire Iteration

**Goal**: Refine the post-study questionnaire UX so the per-trial confidence scale, the preference question, and the free-text feedback are tuned to what a real participant would say after 24 experimental trials.
**Depends on**: Phase 89
**Requirements**: EXPMT-06 (post-study questionnaire iteration)
**Plans**: 1
**Status**: Complete
**Success Criteria**:

  1. Per-trial confidence scale wording and anchors match Likert-5 conventions used in published perception studies. ✓
  2. Post-study preference question supports a 5-point ATS-vs-Uniform scale in addition to the existing "uniform / ats / no-preference" radio. ✓
  3. Free-text field has a minimum character count and a soft warning to encourage substantive feedback. ✓
  4. Debrief screen offers "Download my responses" so the participant leaves with a copy of their data. ✓

## Progress

**Execution Order:**
Phases execute in numeric order: 87 → 88 → 89 → 90 → 91

| Phase | Milestone | Status | Requirements | Success Criteria |
|-------|-----------|--------|--------------|------------------|
| 87. Infrastructure & Core Logic | v4.0 | Complete | 4 | 4 |
| 88. Stimulus Rendering & RT Measurement | v4.0 | Complete | 3 | 5 |
| 89. Experiment Flow & Trial Engine | v4.0 | Complete | 6 | 5 |
| 90. Deployment / Route Stripping / Pilot | v4.0 | Complete (build + gates; deploy + pilot deferred) | 6 | 3 |
| 91. Questionnaire Iteration | v4.0 | Complete | 1 | 4 |

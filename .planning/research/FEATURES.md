# Feature Research — ATS Perception Study

**Domain:** Web-based within-subjects perception experiment (Adaptive Temporal Scaling vs Uniform timeline)
**Researched:** 2026-06-30
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features any perception study web experiment MUST have. Missing these = study results are unpublishable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| SVG timeline stimulus rendering | Core visual stimulus — participants compare two timeline representations | HIGH | Need two render modes: **Uniform** (equal-width bins, linear time scale) and **ATS** (non-uniform bins, bursty intervals expanded). Must render from synthetic data (not DuckDB). Leverage existing @visx packages (axis, scale, shape, group) already in the stack. |
| Per-trial response recording (accuracy, RT, confidence) | Fundamental measurement — every perception study records these three metrics | MEDIUM | Each trial must capture: (a) which response option participant selected, (b) whether it matches the ground-truth answer (0/1), (c) milliseconds from stimulus onset to response click, (d) self-reported confidence on 1-5 Likert scale after each trial. RT measurement uses `performance.now()` for sub-ms precision. |
| Anonymous participant ID assignment | Ethical requirement — no personally identifiable information | LOW | Generate unique random ID (8-character alphanumeric) at session start. Store in Zustand session store. Prefix with date for traceability: `20260630-a3f8`. No email, name, or IP collection. |
| Counterbalanced condition order | Within-subjects design validity — eliminates order effects | MEDIUM | Participants randomly assigned to Uniform→ATS or ATS→Uniform block order. Adapt existing `src/lib/study/condition-order.ts` pattern (uniform/adaptive → A/B block mapping). Must be pure-function, testable assignment (not DOM-dependent). Assignment stored per-session. |
| Practice trials with feedback | Learning effect control — participants must understand task mechanics before data collection | MEDIUM | 2 practice trials BEFORE experimental block: (a) one Peak ID task with immediate correct-answer reveal, (b) one Pattern Recognition task with explanation of why answer is correct. Practice data NOT recorded in results set. Feedback shown as green/red highlight on response choice + correct answer indicator. |
| Post-study preference questionnaire | Subjective experience measurement — validates perception (not just performance) | LOW | Likert-scale questionnaire (1-5) after both blocks completed. Questions cover: (a) condition A vs B preference, (b) which felt easier to interpret, (c) which felt faster, (d) which they'd prefer for real tasks. Leverage existing `survey-likert` pattern from Phase 80 protocol. |
| Progress indicator (trial X of 24) | Orientation — participant must know where they are in the experiment | LOW | Simple progress bar + "Trial 3 of 12" text at top of each block. Distinguish between blocks (Block A: blue, Block B: orange). |
| Task-specific instructions screen | Comprehension — each task type needs its own instructions | LOW | Before each block, show instructions screen explaining the 3 task types with examples. Must include "I understand" acknowledge button before proceeding. |
| Desktop-only browser check | Dimension requirement — timeline stimuli need ≥1200px width | LOW | Check `window.innerWidth` at session start. Show warning if <1024px, block experiment if <800px. Also check for modern browser (no IE11). |
| Convex backend for response storage | Data persistence — all trial responses must be stored durably | MEDIUM | Convex schema with tables: `sessions`, `trials`, `questionnaire_responses`. Must use Convex mutations (not queries) for writes. This replaces the DuckDB storage pattern from Phase 80. Schema versioned for thesis reproducibility. |
| Data export (CSV/JSON download) | Thesis analysis — researcher needs raw data for statistical tests | LOW | "Export Data" button at end of session (researcher-facing). Downloads all trials + questionnaire as CSV with session metadata. Must include condition label, block order, accuracy, RT, confidence per trial. |
| Session timeout handling | Data integrity — if participant abandons midway, partial data is recoverable | LOW | Write each trial response to Convex on `on_finish` (not batched at end). Session can be abandoned; data up to that point is still available. No "resume" functionality — partial sessions are analyzed as-is. |
| Stimulus onset guard | RT measurement validity — prevent "preview" of stimulus before trial starts | LOW | 500ms fixation cross (+) before each stimulus appears. RT timer starts at stimulus onset, not at trial start. This matches standard psychophysics protocol (jsPsych uses same pattern). |

### Differentiators (Study-Specific Value)

Features that make this study unique — directly tied to the ATS research question.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ATS-specific Peak Identification tasks | Tests core hypothesis: does ATS make peak events more identifiable? | HIGH | Generate synthetic event sequences with known ground-truth peaks. In ATS condition, bursty intervals are visually expanded. In Uniform condition, same data shown with equal-width bins. Participant must select which of 3 intervals contains the peak. Ground truth is pre-encoded in stimulus metadata. |
| ATS-specific Period Comparison tasks | Tests whether ATS helps detect differences between two time periods | HIGH | Show two synthetic periods side-by-side. In ATS condition, burst structure is revealed; in Uniform condition, it may be hidden. Binary choice: "Are these two periods different?" Ground truth determined by burstiness delta between periods. |
| ATS-specific Pattern Recognition tasks | Tests whether burst patterns are recognizable under ATS vs Uniform | HIGH | Show synthetic event sequence with one of 4 pre-defined burst patterns (ramp-up, spike, bimodal, seasonal). Participant must identify which pattern is present. ATS condition should make pattern more legible. 4-choice MCQ. |
| Synthetic stimulus generator driven by burstiness algorithm | Enables controlled comparison — ground truth is known (not inferred from real data) | HIGH | Reuse existing burstiness computation from `src/lib/adaptive/`. Generate synthetic event timelines where ground-truth burst locations, peak counts, and pattern types are pre-encoded. Each stimulus has metadata: `{ datasetId, burstLocation, peakCount, patternType, conditionA, conditionB }`. Allows paired statistical comparison without real-data noise. |
| Within-subjects paired delta scoring | Enables statistical power — each participant is their own control | MEDIUM | For each participant, compute `accuracy_uniform` and `accuracy_ats` per task type. Paired t-test or Wilcoxon signed-rank on deltas. Store per-session summary in Convex. Thesis analysis can compute effect sizes directly. |
| Allocation band SVG visualization | Visualizes the adaptive time allocation — shows which intervals get more space | HIGH | In ATS trials, render colored bands beneath the event rug showing per-interval allocation weight. Width maps to time allocation (wider = more pixels per time unit). This makes the ATS mechanism visible to the participant. Uses @visx `@visx/shape` Bar for band rendering. |
| Condition-blind A/B labeling | Eliminates bias — participant doesn't know which is ATS vs Uniform | LOW | Both conditions labeled "Condition A" and "Condition B" — no mention of "adaptive" or "uniform" in the UI. Post-study questionnaire reveals condition names only after all trials complete. Counterbalancing ensures equal A/B assignment across participants. |
| Stimulus dataset versioning | Reproducibility — stimulus set is deterministic for thesis validation | LOW | Each stimulus dataset has a versioned ID (e.g., `peak-v1-001`). Generated from seeded random (seed = datasetId) so same stimulus is always produced. Stimulus catalog stored as JSON alongside the code. |

### Anti-Features (Explicitly Excluded)

Features that would add complexity without study value. Documented to prevent scope creep.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| DuckDB data pipeline for stimulus generation | "We already have DuckDB for real crime data" | Study stimuli are synthetic — no real data needed. DuckDB adds 500MB+ dependency and server-side complexity for something that runs in <100 lines of JS. Breaks the "Convex-only" backend decision. | Generate stimuli client-side in pure TypeScript using seeded random + burstiness algorithm from `src/lib/adaptive/`. |
| Adaptive 3D cube visualization in study | "The prototype already has a 3D cube" | Study is a 2D perception experiment. 3D rendering adds Three.js dependency, WebGL requirements, and browser compatibility issues. The spatial dimension is irrelevant to the ATS vs Uniform timeline comparison. | Keep all study stimuli as 2D SVG rendered with @visx. No Three.js, no R3F, no canvas. |
| Map/POI layers in study route | "The dashboard-demo has map layers" | MapLibre adds a heavy tile-rendering dependency. Spatial location is not a variable in the ATS perception study — the research question is purely temporal. | Strip all map components from `ats-study` branch. The study route is self-contained with no map dependency. |
| Researcher-mediated session flow (Phase 80 pattern) | "We already built the 8-step researcher flow" | The ATS study is self-service (anonymous participants); Phase 80 flow requires a researcher to control progression. Self-service flow needs auto-advance, progress indicators, and no researcher UI. | Build participant-autonomous flow with Zustand state machine. Researcher only needs data export at end. |
| Real-time collaborative features | "Multi-user would scale data collection" | Adds WebSocket/server complexity. Study is single-participant, within-subjects. Each session is isolated. | Single-participant flow. Multiple participants can run concurrently by opening separate browser tabs (each has unique session ID). |
| Demo presets (T1-T8) in study route | "We already wire preset tasks" | Demo presets load real crime data from DuckDB and modify dashboard-demo stores. They require the full dashboard-demo component tree to function. The study uses synthetic stimuli and has no crime data dependency. | Study has its own trial sequence defined by stimulus catalog. No preset dropdown. |
| Interactive tour (driver.js) in study | "We have an onboarding tour component" | driver.js tours are designed for complex dashboard UIs. The study has a simpler flow with explicit instruction screens. A guided tour adds conceptual dependency on the dashboard training model. | Instruction screens served as React components in the study flow. No driver.js dependency. |
| Mobile-responsive study layout | "We should support mobile participants" | Timeline stimuli require sufficient pixel width for legible bin rendering. Mobile screens (<400px) would compress bins beyond interpretability. Desktop-first design is intentional. | Desktop-only (≥1024px). Mobile participants blocked with clear message. |

## Feature Dependencies

```
Synthetic Stimulus Generator (burstiness algorithm)
    ├──requires──> src/lib/adaptive/ (existing burstiness computation)
    └──produces──> Stimulus Catalog (versioned JSON with ground truth)

SVG Timeline Stimulus Renderer
    ├──requires──> Synthetic Stimulus Generator (for data)
    ├──requires──> @visx/axis, @visx/scale, @visx/shape (existing deps)
    └──produces──> React component: <StudyTimeline condition={uniform|ats} />

Allocation Band Renderer
    ├──requires──> SVG Timeline Renderer (renders beneath event rug)
    └──requires──> ATS allocation weights (from stimulus metadata)

Trial Runner (task engine)
    ├──requires──> SVG Timeline Renderer (for stimulus display)
    ├──requires──> Condition Order Assignment (for block/trial sequencing)
    ├──requires──> Stimulus Catalog (for trial data)
    └──produces──> Trial Complete event (accuracy, RT, confidence)

Condition Order Assignment
    ├──requires──> Seeded random (for deterministic counterbalancing)
    └──produces──> { order: 'uniform-first' | 'ats-first', blockAssignment }

Practice Trial Flow
    ├──requires──> Trial Runner (reuses same stimulus display)
    └──enhances──> Trial Runner with feedback overlay

Response Recording (Convex mutations)
    ├──requires──> Trial Runner (receives trial-complete events)
    └──requires──> Convex schema deployment

Post-Study Questionnaire
    ├──requires──> Response Recording (for session context)
    └──requires──> Both blocks completed (trigger condition)

Participant Flow State Machine
    ├──requires──> Condition Order Assignment (initialization)
    ├──requires──> Trial Runner (experimental blocks)
    ├──requires──> Practice Trial Flow (training)
    ├──requires──> Post-Study Questionnaire (completion)
    └──requires──> Data Export (session end)

Data Export
    └──requires──> Convex query (read all session data at end)
```

### Dependency Notes

- **Trial Runner requires Condition Order Assignment before initialization:** The counterbalanced assignment determines which block (Uniform or ATS) runs first. Must be resolved at session start, before any trial renders.
- **SVG Renderer requires stimulus metadata with both conditions pre-computed:** Each stimulus dataset needs both Uniform and ATS representations pre-generated so the renderer can switch between them per-block without re-computation.
- **Response Recording must write per-trial (not batched):** Standard web experiment practice (confirmed by jsPsych docs) — write each trial immediately to prevent data loss from browser close/abandonment.
- **Post-Study Questionnaire triggers only after both blocks complete:** Cannot show condition names (Uniform/ATS) before questionnaire — participant must remain blind through both blocks.
- **Practice Trial Flow shares Trial Runner infrastructure but flags data as non-recordable:** Practice trials use the same stimulus display but responses are not written to Convex and are excluded from analysis.

## MVP Definition

### Launch With (Study-Ready Minimum)

Minimum viable experiment — what's needed to run the first pilot participant.

- [ ] **Synthetic stimulus generator** — Generate 24 unique stimulus datasets with known ground truth (burst locations, peak counts, pattern types). Must be deterministic (seeded random). — Without this, there is no experiment.
- [ ] **SVG timeline stimulus renderer** — Render event rug + allocation bands for both Uniform and ATS conditions. Must be visually distinguishable (ATS shows non-uniform bin widths). — Core stimulus without which no task can run.
- [ ] **Trial runner with 3 task types** — Peak Identification (3-choice MCQ), Period Comparison (binary), Pattern Recognition (4-choice MCQ). Each task type must capture accuracy, RT, and confidence. — The measurement apparatus.
- [ ] **Convex schema + write mutations** — Tables for sessions, trials, questionnaire_responses. Schema must include condition label, block order, accuracy, RT, confidence, dataset ID, task type. — Data is the deliverable.
- [ ] **Anonymous participant flow** — ID generation, condition order assignment, progression through blocks, post-study questionnaire trigger. — The experiment lifecycle.
- [ ] **Counterbalanced condition assignment** — Random uniform-first or ATS-first block order. — Within-subjects design requirement.
- [ ] **Practice trials with feedback** — 2 practice trials before block 1. Correct/incorrect feedback displayed. — Participant comprehension gate.
- [ ] **Post-study preference questionnaire** — 4-6 Likert items comparing condition experience. Triggered after both blocks complete. — Subjective measure.

### Add For Pilot Validation (v4.0.x)

Features to add once the minimum study runs successfully with a pilot participant.

- [ ] **Data export (CSV/JSON)** — Researcher downloads session data for thesis analysis. — Enables statistical analysis.
- [ ] **Progress indicator** — Trial X of 12 per block, block label. — Participant orientation.
- [ ] **Desktop browser check** — Minimum width enforcement. — Prevents unusable sessions.
- [ ] **Stimulus onset guard (fixation cross)** — 500ms fixation before each stimulus. — RT measurement accuracy.
- [ ] **Allocation band visualization polish** — Ensure bands are clearly visible and legend is included. — Makes ATS mechanism perceptible.

### Future Consideration (v5.0+)

Features to consider for expanded study after thesis validation.

- [ ] **Prolific/MTurk integration** — Recruit external participants via crowdsourcing platforms.
- [ ] **Between-subjects design variant** — Compare with between-subjects to control for learning effects.
- [ ] **Eye-tracking integration** — Gaze patterns during timeline inspection.
- [ ] **Additional stimulus types** — Beyond crime data, test with weather, financial, or health temporal data.
- [ ] **Multi-session retest reliability** — Same participant returns for second session to measure test-retest.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Synthetic stimulus generator | HIGH | HIGH | P1 |
| SVG timeline stimulus renderer | HIGH | HIGH | P1 |
| Trial runner (3 task types) | HIGH | HIGH | P1 |
| Convex schema + mutations | HIGH | MEDIUM | P1 |
| Anonymous participant flow | HIGH | MEDIUM | P1 |
| Counterbalanced condition assignment | HIGH | LOW | P1 |
| Practice trials with feedback | HIGH | MEDIUM | P1 |
| Post-study questionnaire | HIGH | LOW | P1 |
| Data export (CSV/JSON) | HIGH | LOW | P2 |
| Progress indicator | MEDIUM | LOW | P2 |
| Desktop browser check | MEDIUM | LOW | P2 |
| Stimulus onset guard | MEDIUM | LOW | P2 |
| Allocation band polish | MEDIUM | MEDIUM | P2 |
| Prolific/MTurk integration | LOW | HIGH | P3 |
| Between-subjects variant | LOW | HIGH | P3 |
| Eye-tracking integration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for pilot — experiment cannot run without these
- P2: Should have for analysis — adds rigor but experiment runs without them
- P3: Thesis extensions — beyond current research question scope

## Competitor / Reference Analysis

| Pattern | jsPsych Standard | This Study's Approach | Rationale |
|---------|-----------------|----------------------|-----------|
| Trial timeline | `jsPsych.run(timeline)` with nested timeline arrays | Zustand state machine driving React component tree | Already have Zustand in stack; React components allow custom SVG rendering that jsPsych survey plugins don't support |
| Response collection | `jsPsych.data.get().filter(...)` built-in collection | Per-trial Convex mutation writes + Zustand local buffer | Convex provides durable storage; no PHP/MySQL server needed. jsPsych's built-in data is in-memory only and requires server-side script for persistence. |
| RT measurement | `rt` field auto-collected by plugin (stimulus onset → response) | `performance.now()` delta between stimulus mount and click handler | Same precision model. jsPsych uses `performance.now()` internally. |
| Counterbalancing | `jsPsych.randomization.sampleWithoutReplacement()` or `randomize_order: true` | Pure function from `condition-order.ts` (existing pattern adapted) | Same logic, no library dependency needed. Tested independently. |
| Practice trials | Trials with `data: { practice: true }` flagged, filtered out in analysis | Practice trials use same Trial Runner but with `record_data: false` | Same pattern. jsPsych uses `record_data: false` parameter; we use equivalent flag in Zustand trial store. |
| Likert questionnaires | `jsPsychSurveyLikert` plugin | Custom React component (existing EvaluationQuestionnaire pattern) | Already have Radix UI radio groups + Tailwind styling. jsPsych survey plugin adds 50KB+ for a feature we can build in ~50 lines of React. |
| Stimulus rendering | HTML string or image URL (no custom SVG support) | @visx-based SVG rendering with dynamic allocation bands | jsPsych cannot render per-condition SVG timelines without custom plugin development. Using React+@visx gives full control. |

**Decision: Build custom experiment engine, do NOT adopt jsPsych.**

Rationale:
1. **SVG rendering requirement:** jsPsych has no built-in SVG timeline plugin. We'd need to build a custom jsPsych plugin anyway, which requires understanding jsPsych's plugin API — equivalent effort to building in React directly.
2. **Stack coherence:** React+Zustand already in the project. Adding jsPsych introduces a parallel framework with its own state management, styling, and event system.
3. **Customization lock-in:** jsPsych's trial lifecycle (stimulus → response → on_finish) is opinionated. Our study needs condition-specific rendering (per-trial SVG differs by condition) which jsPsych doesn't naturally support.
4. **Bundle size:** jsPsych v8 is ~200KB minified + per-plugin overhead. For 24 trials with 3 task types, we can build a lighter custom engine.
5. **Convex integration:** jsPsych's data saving model (PHP script or AJAX to server) doesn't match our Convex mutation pattern. Custom engine can call Convex directly from trial `on_finish` handlers.

## Sources

- **jsPsych v8 Documentation** — Official docs for experiment lifecycle, timeline creation, data storage, and response plugins. Source: https://www.jspsych.org/v8/ (fetched 2026-06-30). Confidence: HIGH.
- **Existing Phase 80 Evaluation Infrastructure** — `src/lib/study/` (protocol, condition-order, storage, resetTargets). Source: Codebase inspection. Confidence: HIGH.
- **PROJECT.md v4.0 ATS Perception Study** — Milestone scope, target features, constraints. Source: `.planning/PROJECT.md`. Confidence: HIGH.
- **Existing @visx library stack** — `@visx/axis`, `@visx/scale`, `@visx/shape` already in `package.json`. Source: `package.json` inspection. Confidence: HIGH.
- **Convex decision** — PROJECT.md decision gate: "Convex-only backend avoids DuckDB dependency." Source: `.planning/PROJECT.md` Key Decisions table. Confidence: HIGH.

---

*Feature research for: ATS Perception Study (within-subjects web experiment)*
*Researched: 2026-06-30*
*Confidence: HIGH (all findings verified against official jsPsych docs + existing codebase)*

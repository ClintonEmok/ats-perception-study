# Phase 80: Evaluation Readiness — Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the evaluation shell, task management UI, in-app forms, condition visibility, and structured logging needed to run a 5-participant within-subjects pilot study comparing uniform vs. adaptive temporal scaling in the dashboard-demo prototype, focused on RQ2–RQ4. RQ1 remains covered by the methodology and prototype chapters rather than the user study itself.

It does **not** add new visualization features, modify the adaptive scaling algorithm, change the data pipeline, or refactor the dashboard-demo shell. The core visualization (adaptive scaling, 3D STKDE cube, 2D map, dual timeline, burst detection pipeline) is assumed stable from prior phases (76–79).

**Key constraint:** Phase 79 (Adaptive 3D Visualization) is in progress but this phase does not depend on its completion — it only needs the warp toggle + condition state to function at the visualization level.

</domain>

<decisions>
## Implementation Decisions

### Evaluation Page Strategy
- **D-01:** Dedicated `/evaluation` route that imports `DashboardDemoShell` without modifying it. No changes to the existing `/dashboard-demo` route.
- **D-02:** StudySession controls (start/stop, participant ID) are integrated into the evaluation page header. The existing floating `StudyControls` button is replaced in this route.
- **D-03:** All dashboard-demo rail tabs remain visible but editing capabilities (slice modification, STKDE param changes, warp source switching) are disabled for participants. Configuration is researcher-only.

### Condition Visibility
- **D-04:** The condition (uniform/adaptive) is derivable from the visualization behavior, not from an explicit label. A subtle researcher-facing badge in the evaluation header shows the active condition; no participant-facing "UNIFORM" or "ADAPTIVE" text.
- **D-05:** The uniform/adaptive toggle control is visible to participants but deliberately unlabeled — they can interact with it without being told what it does. The researcher has full awareness of the condition state.
- **D-06:** Switching between uniform and adaptive modes is instantaneous (no transition animation). Participants compare end-states, not transitions.

### In-App Forms
- **D-07:** Hybrid approach — NASA-RTLX (6 dimensions × 1–20) and Likert interpretability statements (6 items × 1–5) are built as in-app React components. Printed paper copies serve as backup.
- **D-08:** Forms appear after each condition block (per EVALUATION_PROTOCOL.md Phase 4), capturing per-condition impressions before the participant experiences the next condition.
- **D-09:** The existing study logging system (`useStudyStore`, `logger.ts`, `/api/study/log`) can be fully redesigned to support structured form responses and DuckDB storage.

### Task Management + Phase Flow
- **D-10:** Four experimental tasks from the thesis (not the original 8 from EVALUATION_PROTOCOL.md), kept in fixed progressive order within each condition (`T4 -> T1 -> T2 -> T3`): T4 — Most Active Region (control / spatial baseline), T1 — Peak Activity (RQ2), T2 — Burst Detection (RQ2), T3 — Compare Time Periods (RQ2 + RQ3).
- **D-11:** Floating task card overlay in the corner of the evaluation view shows the current task text. After the participant responds, an in-app 1–5 confidence slider appears before advancing.
- **D-12:** Researcher-controlled 7-phase stepper: Welcome → Training → Tasks-A → Questionnaire-A → Tasks-B → Questionnaire-B → Interview → Done. Each phase shows the appropriate UI surface.
- **D-13:** The existing `OnboardingTour` (driver.js) is updated to cover: 3D cube rotation, timeline brushing, slice label interpretation, density coloring, and the unlabeled time-scale toggle. Provides consistent training across participants.

### Session Data
- **D-14:** In addition to per-trial task data (accuracy, completion time, confidence, condition), log every condition toggle and warp factor adjustment. Captures how participants used (or discovered) the adaptive mechanism.
- **D-15:** Study data is stored in DuckDB as a flat trials table (columns: session_id, participant_id, condition, task_id, accuracy, completion_time_ms, confidence, warp_factor, timestamp). Enables SQL-based descriptive statistics (medians, ranges, paired deltas) for thesis analysis.
- **D-16:** The study logging infrastructure (store, logger service, API route, DuckDB schema) can be rebuilt from scratch.

### the agent's Discretion
- Preferred `/evaluation` route over overlay mode (cleaner separation, no regression risk)
- Floating task card over side panel (minimal screen footprint)
- Updated OnboardingTour over researcher-led training (consistency across sessions)
- Condition + warp logging over full interaction trace (enough for RQ analysis without noise)

</decisions>

<canonical_refs>
## Canonical References

### Evaluation protocol and forms
- `EVALUATION_PROTOCOL.md` — Original 8-task protocol, procedure phases, scoring rubrics, consent/demographics templates
- `EVALUATION_FORMS.md` — NASA-RTLX scales, Likert statements, task accuracy scoring sheet, session observation log
- `chapters/07_evaluation/` (thesis LaTeX) — Refined 4-task definitions, RQ→task mapping, SUS methodology, descriptive analysis plan

### Core visualization (assumed stable)
- `.planning/ROADMAP.md` — Phase 79 goal, prior phase dependency chain
- `.planning/REQUIREMENTS.md` — ADP-01 through ADP-06 requirements (Phase 79 scope)
- `.planning/phases/79-adaptive-3d-visualization/79-CONTEXT.md` — Warp axis, slice spacing, 3D interaction decisions
- `.planning/codebase/ADAPTIVE-WARP-FLOW.md` — Full warp computation pipeline and per-view analysis
- `.planning/codebase/3D_SCENE_COMPOSITION.md` — 3D render tree (Path A: Main Cube, Path B: Demo STKDE)

### Key source files
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — Target shell for wrapping in evaluation route
- `src/store/useDashboardDemoCoordinationStore.ts` — Condition state: `timeScaleMode`, `warpFactor`, `setTimeScaleMode`, `setWarpFactor`
- `src/components/study/StudyControls.tsx` — Current study session UI (to be redesigned into evaluation header)
- `src/store/useStudyStore.ts` — Current session state (to be restructured)
- `src/lib/logger.ts` — Current log batching + flush (to be restructured for DuckDB)
- `src/app/api/study/log/route.ts` — Current NDJSON log endpoint (to be restructured)
- `src/components/onboarding/OnboardingTour.tsx` — Existing driver.js tour (to update for evaluation)

### Thesis research questions
- **RQ1:** How can a density-aware temporal scaling mechanism be designed for the Space-Time Cube?
- **RQ2:** How does non-uniform temporal scaling affect users' ability to identify and compare bursty temporal patterns?
- **RQ3:** How well do users understand the scaled temporal representation and its relation to the original timestamps?
- **RQ4:** How interpretable and usable is the resulting Space-Time Cube prototype for intended users?

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`DashboardDemoShell`** — Full demo workspace (map, 3D cube, timeline, rail tabs). Can be wrapped without modification — just import and render inside evaluation page layout.
- **`useDashboardDemoCoordinationStore`** — Already has `timeScaleMode`, `warpFactor`, setter actions. The evaluation header reads from this store for the researcher badge.
- **`OnboardingTour`** (driver.js) — Existing step-by-step highlight tour infrastructure. Update the step definitions for evaluation training content.
- **`useStudyStore`** — Session ID generation, participant ID tracking. Can be restructured or extended.
- **`LoggerService`** — Batch + flush pattern works. Can redirect to DuckDB write path instead of JSONL.

### Established Patterns
- **Zustand slices** — All state management uses Zustand. Evaluation state (phase, task, responses) follows the same pattern.
- **Dedicated routes** — `/dashboard-demo`, `/stkde-3d`, etc. are separate pages. `/evaluation` follows this convention.
- **Rail tabs** — `DashboardDemoRailTabs` pattern shows how to add/remove tab access. Evaluation mode can pass a disabled-tabs config.
- **API routes** — `/api/study/log` POST pattern for writing log data. Extend for DuckDB writes.

### Integration Points
- **`/evaluation` route** → `src/app/evaluation/page.tsx` imports `DashboardDemoShell`
- **Evaluation header** → wraps the demo shell, reads from coordination store for condition badge
- **Phase stepper** → controls which UI surface is visible (training tour, task cards, forms, or demo)
- **Study DuckDB** → existing DuckDB connection used by `/api/crime/*` routes; add study schema tables
- **Researcher panel** → condition toggle connects to `useDashboardDemoCoordinationStore.setTimeScaleMode` / `setWarpFactor`

</code_context>

<specifics>
## Specific Ideas

- The evaluation header should show: participant ID, current phase name, elapsed session time, and a subtle researcher condition badge
- Task cards should be non-blocking — participants interact with the visualization while the task text stays visible
- The confidence slider (1-5) should capture both the rating and the timestamp for per-trial analysis
- The unlabeled toggle should look like a subtle control (perhaps just an icon or a slider without text) so participants can experiment without being primed
- The DuckDB trials table should include a `trial_order` column to preserve the fixed within-condition task sequence for later paired/descriptive analysis
- SUS is collected once at session end (overall usability), while NASA-TLX is collected per-condition (workload comparison)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 80-evaluation-readiness*
*Context gathered: 2026-06-16*

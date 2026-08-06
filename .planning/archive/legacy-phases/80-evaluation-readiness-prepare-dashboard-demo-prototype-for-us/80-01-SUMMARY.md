---
phase: 80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us
plan: 01
subsystem: study
tags: [zustand, duckdb, protocol, reset, evaluation, study, nasa-rtlx]

# Dependency graph
requires:
  - phase: 79-adaptive-3d-visualization
    provides: dashboard-demo shell + coordination store with timeScaleMode / warpFactor state
provides:
  - Canonical Phase 80 study protocol (8-step flow, 4-task order, 6+6 questionnaire items)
  - Counterbalanced A->B / B->A condition-order helpers
  - Audited reset checklist with per-target outcomes
  - Bound useEvaluationStudyStore with session/phase/task/questionnaire/save-status slices
  - Acknowledged DuckDB study persistence (4 flat fact tables, 6 intent kinds)
  - Validated /api/study/log POST endpoint with explicit ok acknowledgement
affects:
  - phase: 80-02
  - phase: 80-03
  - phase: 80-04
  - chapter: 07_evaluation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single source of truth for the evaluation protocol in src/lib/study/protocol.ts"
    - "Discriminated union for study intents (kind) with exhaustive switch in the API route"
    - "Audited reset checklist that returns per-target outcomes (reset/missing/skipped/failed)"
    - "Acknowledged POST write pattern with bounded retry + keepalive fetch in logger.ts"
    - "DuckDB flat fact tables (one row per analytic unit) for SQL-based descriptive analysis"

key-files:
  created:
    - src/lib/study/protocol.ts
    - src/lib/study/protocol.test.ts
    - src/lib/study/condition-order.ts
    - src/lib/study/condition-order.test.ts
    - src/lib/study/resetTargets.ts
    - src/lib/study/resetTargets.test.ts
    - src/lib/study/storage.ts
    - src/lib/study/storage.test.ts
    - src/store/useEvaluationStudyStore.ts
    - src/app/api/study/log/route.test.ts
  modified:
    - src/store/useStudyStore.ts
    - src/lib/logger.ts
    - src/app/api/study/log/route.ts

key-decisions:
  - "Phase 80 context (D-07, D-10, D-12) overrides EVALUATION_PROTOCOL.md / EVALUATION_FORMS.md: protocol.ts locks 6 NASA-RTLX + 6 interpretability items and the 4-task T4 -> T1 -> T2 -> T3 within-condition order"
  - "Reset checklist is explicit per-target (sessionStorage + localStorage keys + coordination-store actions) instead of a single global reset; each outcome is one of reset/missing/skipped/failed"
  - "DuckDB study tables are flat (one row per analytic unit) so thesis analysis can run SQL descriptive statistics directly against DuckDB"
  - "Condition toggles and warp-factor adjustments are stored as distinct event_type rows in study_condition_events, not collapsed into implicit UI state (D-14)"
  - "API route returns explicit ok: true acknowledgement only after DuckDB insert completes; HTTP 400 on validation failure and HTTP 500 on persistence failure with the per-row error echoed back"
  - "useEvaluationStudyStore persists crash-recovery essentials to sessionStorage under evaluation-study-v1; in-progress answers and save-status flags live in memory only"

patterns-established:
  - "Pattern: Reset executor accepts optional storage handles for testability (avoids jsdom dependency in node-environment tests)"
  - "Pattern: Per-intent save-status slice in the evaluation store mirrors logger.submit results so later UI plans can block unsafe advancement"
  - "Pattern: API route validators are pure functions returning a discriminated { ok, intent | error } so they can be unit-tested without spinning up a server"

requirements-completed: []

# Metrics
duration: 14 min
completed: 2026-06-19
---

# Phase 80 Plan 01: Study Protocol, Reset, and Acknowledged Logging

**Canonical Phase 80 protocol + audited reset checklist + acknowledged DuckDB-backed study writes that replace the schema-less JSONL logger — before any `/evaluation` UI is built.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-19T09:54:49Z
- **Completed:** 2026-06-19T12:08:30Z
- **Tasks:** 2
- **Files modified:** 14 (10 created, 4 modified)

## Accomplishments

- Locked the Phase 80 study protocol in code: 8-step flow (Welcome → Training → Tasks-A → Questionnaire-A → Tasks-B → Questionnaire-B → Interview → Done), fixed within-condition task order T4 → T1 → T2 → T3, 6 NASA-RTLX + 6 interpretability items, with `STUDY_PROTOCOL_VERSION` so future thesis-driven updates can detect drift
- Added researcher-confirmed A→B / B→A condition-order helpers that derive the active condition for every step in the sequence
- Replaced the vague "global reset" with an audited per-target checklist (12 named targets across sessionStorage, localStorage, and coordination-store actions) that returns per-target outcomes (reset / missing / skipped / failed)
- Introduced `useEvaluationStudyStore` (bound Zustand store with session/phase/task/questionnaire/save-status slices) and chained `resetForNewSession()` to execute the checklist + start a new session in one call
- Replaced the schema-less JSONL logger with acknowledged DuckDB-backed writes: four flat fact tables (study_sessions, study_trials, study_questionnaire_responses, study_condition_events) and a validated `/api/study/log` POST endpoint for six intent kinds (session-start, session-end, trial-complete, questionnaire-response, condition-toggle, warp-adjustment)
- Condition toggles and warp-factor adjustments are stored as distinct `event_type` rows (D-14) so the thesis analysis can trace how participants used or discovered the adaptive mechanism
- Critical writes retry up to 4 times with keepalive fetch, and `submitStudyIntent` on the evaluation store mirrors the per-write save status so later UI plans can block unsafe advancement on persistence failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Codify protocol, condition order, audited reset checklist** — `c60e238` (feat)
2. **Task 2: Replace schema-less study logging with acknowledged DuckDB writes** — `1924cb8` (feat)

## Files Created/Modified

- `src/lib/study/protocol.ts` — canonical Phase 80 study protocol (steps, tasks, NASA-RTLX, interpretability items, version)
- `src/lib/study/protocol.test.ts` — 13 unit tests for step sequence, task order, and version metadata
- `src/lib/study/condition-order.ts` — A→B / B→A assignment helpers + per-step condition lookup
- `src/lib/study/condition-order.test.ts` — 11 unit tests for both orders + per-block/per-step helpers
- `src/lib/study/resetTargets.ts` — 12-target reset checklist + auditable outcome helpers
- `src/lib/study/resetTargets.test.ts` — 9 unit tests for the checklist shape and executor outcomes
- `src/lib/study/storage.ts` — four flat DuckDB fact tables + `insertStudy` writer with typed intent union
- `src/lib/study/storage.test.ts` — 4 unit tests covering the intent shape and table names
- `src/store/useEvaluationStudyStore.ts` — bound Zustand store with session/phase/task/questionnaire/save-status slices; `resetForNewSession` chains to the checklist + startSession
- `src/store/useStudyStore.ts` — kept as a thin shim for the existing `LoggerService`
- `src/lib/logger.ts` — `submit()` with bounded retry + keepalive, plus typed per-intent helpers
- `src/app/api/study/log/route.ts` — validated POST endpoint that returns `ok: true` only after DuckDB persistence completes
- `src/app/api/study/log/route.test.ts` — 13 unit tests covering all six intent kinds, validation errors, and persistence failure

## Decisions Made

- **Protocol source of truth:** Phase 80 context (D-07, D-10, D-12) overrides the older counts in `EVALUATION_PROTOCOL.md` and `EVALUATION_FORMS.md`. The `STUDY_PROTOCOL_VERSION` constant records this explicitly so a future protocol bump can detect schema drift in persisted study state.
- **Reset is explicit, not vague:** every persisted surface that could leak state between participants is enumerated as a named `ResetTarget` with a per-target outcome (reset/missing/skipped/failed). This is auditable and matches the locked Phase 80 context list of `evaluation-study-v1`, `study-storage`, `slice-domain-v1`, `dashboard-demo-map-layer-store-v1`, `dashboard-demo-filter-presets`, `hasSeenTour`, plus the coordination-store actions.
- **DuckDB is the new write path:** the old JSONL append is gone. Four flat fact tables (`study_sessions`, `study_trials`, `study_questionnaire_responses`, `study_condition_events`) give the thesis analysis step direct SQL access (medians, ranges, paired deltas) without parsing.
- **Warp factor events are first-class:** `study_condition_events` uses an `event_type` column so condition toggles and warp-factor adjustments are stored as separate rows, not collapsed into implicit UI state.
- **Save status is per-intent, not global:** the evaluation store tracks `pending | saved | error` per `intentId` so later UI plans (training gate, task card advance, questionnaire submit) can block advancement on persistence failure.

## Deviations from Plan

None - plan executed exactly as written. The plan's three "key constraints" (no UI surface, fixed T4→T1→T2→T3 order, explicit reset targets) and the listed must_haves are all met by the committed code.

## Issues Encountered

- The vitest config uses `environment: 'node'`, so `window` is not available for tests. The plan-required `resetTargets.test.ts` originally tried to monkey-patch `window.sessionStorage`; refactored `executeResetChecklist` to accept an optional `storage` parameter so the test runs against in-memory storage handles without relying on jsdom (which fails to load with the project's pnpm setup).
- The `createJSONStorage` zustand helper requires a `StateStorage` argument; on the server `window.sessionStorage` is null, so the evaluation store passes a typed cast through `createJSONStorage(() => storage ?? undefined)`. The runtime behavior is correct (fall back to in-memory state when storage is unavailable).

## Authentication Gates

None.

## Next Phase Readiness

- Phase 80-02 can build the `/evaluation` route that wraps `DashboardDemoShell` and the new evaluation chrome (header, stepper, task card, questionnaire) on top of `useEvaluationStudyStore`.
- The protocol/order/reset contract is test-covered; later plans can extend `protocol.ts` to add new task IDs or questionnaire items without breaking existing imports.
- The acknowledged write path is ready for the UI to call `useEvaluationStudyStore.submitStudyIntent(intentId, intent)` and surface save status to participants.

---

*Phase: 80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us*
*Completed: 2026-06-19*

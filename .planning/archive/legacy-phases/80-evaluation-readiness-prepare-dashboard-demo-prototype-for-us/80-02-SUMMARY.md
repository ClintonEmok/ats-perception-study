---
phase: 80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us
plan: 02
subsystem: ui
tags: [nextjs, zustand, driver.js, evaluation, nasa-rtlx, likert, study]

# Dependency graph
requires:
  - phase: 80-01
    provides: useEvaluationStudyStore + study protocol + condition order + reset checklist
provides:
  - Dedicated /evaluation App Router page that wraps DashboardDemoShell without modifying /dashboard-demo
  - Three-zone researcher header (session metadata, 8-step stepper, researcher utilities)
  - Centered training intro card with 5-item checklist and researcher-triggered driver.js tour
  - Floating non-blocking task card with strict T4 -> T1 -> T2 -> T3 ordering and answer -> confidence gating
  - Per-condition questionnaire overlay with 6 NASA-RTLX sliders + 6 interpretability Likert rows
  - Welcome / interview / done overlay screens
affects:
  - phase: 80-03
  - phase: 80-04
  - chapter: 07_evaluation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated /evaluation route + overlay header band that wraps an existing demo shell without modifying it"
    - "Render-time 'previous value' pattern (useState + tracked previous + conditional setState) instead of setState-in-useEffect for form resets"
    - "Window CustomEvent bridge between the global OnboardingTour and the route-specific EvaluationTrainingGate"
    - "Acknowledged DuckDB write mirroring for task completion and questionnaire responses via useEvaluationStudyStore.submitStudyIntent"

key-files:
  created:
    - src/app/evaluation/page.tsx
    - src/components/evaluation/EvaluationShell.tsx
    - src/components/evaluation/EvaluationHeader.tsx
    - src/components/evaluation/EvaluationTrainingGate.tsx
    - src/components/evaluation/EvaluationTaskCard.tsx
    - src/components/evaluation/EvaluationQuestionnaire.tsx
  modified:
    - src/components/onboarding/OnboardingTour.tsx

key-decisions:
  - "Atomically split the plan into two commits so the shell scaffold (header, training gate, page, OnboardingTour branch) lands in task 1 and the task card + questionnaire land in task 2; the shell import is updated in task 2 so the tree compiles after each commit"
  - "Use a window CustomEvent (gsd:start-evaluation-training-tour) to trigger the evaluation training tour from EvaluationTrainingGate, instead of mutating shared module state or threading refs through the layout tree"
  - "Reuse the existing driver.js infrastructure (no new tour library) but restyle popovers to the dark card language in onPopoverRender rather than fighting the upstream CSS theme"
  - "Render task card and questionnaire inside the same DashboardDemoShell wrapper; the task card is a non-blocking floating overlay while the questionnaire is a centered scrim so the visualization stays visible during task-taking but is fully dimmed during the survey"
  - "Mirror every completed task and answered questionnaire item to /api/study/log via useEvaluationStudyStore.submitStudyIntent so the study state in DuckDB advances even if the participant navigates away"

patterns-established:
  - "Pattern: Three-zone researcher header (session metadata / stepper / researcher utilities) as a reusable chrome for any researcher-driven route"
  - "Pattern: Gating 'Begin tasks' on the evaluation store's trainingCompleted flag, set only via the training gate's markTrainingComplete()"
  - "Pattern: Task card waits for an answer (length > 0) before revealing the confidence slider, then waits for the record action before advancing to the next task"

requirements-completed: []

# Metrics
duration: 12 min
completed: 2026-06-19
---

# Phase 80 Plan 02: Evaluation Shell and Task/Questionnaire Surfaces

**Dedicated `/evaluation` route, researcher header, training gate, floating task card, and per-condition questionnaire overlay on top of the Phase 80 protocol and store from 80-01.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-19T10:13:18Z
- **Completed:** 2026-06-19T10:25:22Z
- **Tasks:** 2
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- Added `src/app/evaluation/page.tsx` as a dedicated App Router entry that renders `EvaluationShell` without modifying the existing `/dashboard-demo` route
- Built `EvaluationShell` as the route chrome — header, training gate, welcome / interview / done screens, and the participant-mode CSS lock (`--evaluation-locked`) so existing demo rail tabs can opt into the locked state without modifying their internals
- Built `EvaluationHeader` with three zones: left (participant id + current step + session timer + save status), center (8-step researcher-controlled stepper with accent current / completed / future chips), right (researcher-only condition badge, unlabeled time-scale toggle wired to `useDashboardDemoCoordinationStore.setTimeScaleMode`, prev/next step navigation, start/end session, reset, and rerun-training)
- Built `EvaluationTrainingGate` as a centered intro card on a `bg-slate-950/70` scrim with the 5-item training checklist; researcher clicks "Start training tour" to dispatch the `gsd:start-evaluation-training-tour` window event which `OnboardingTour` consumes
- Built `EvaluationTaskCard` as a non-blocking 360px floating overlay that renders the 4 tasks in fixed `T4 -> T1 -> T2 -> T3` order (via `STUDY_TASK_ORDER`), reveals the confidence slider only after the researcher records an answer, and only enables the questionnaire advance once all 4 tasks in the block are completed
- Built `EvaluationQuestionnaire` as a centered modal-style overlay (`max-w 960px`, `max-h 80vh`, internal scroll) that reads the 6 NASA-RTLX items and 6 interpretability Likert rows straight from `protocol.ts` (no hardcoded question copy), gates submission on every required item being answered, and mirrors every response to `/api/study/log` via `useEvaluationStudyStore.submitStudyIntent`
- Branched `OnboardingTour` to add a researcher-triggered 5-step evaluation training tour via the window event while keeping the legacy dashboard auto-tour and the `hasSeenTour` localStorage flag intact for `/dashboard*` paths only

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the `/evaluation` overlay shell, researcher stepper header, and route-specific training entry** — `ffe28e9` (feat)
2. **Task 2: Build the task card and questionnaire surfaces with strict progression gating** — `5343a70` (feat)

## Files Created/Modified

- `src/app/evaluation/page.tsx` — dedicated evaluation route entry
- `src/components/evaluation/EvaluationShell.tsx` — overlay frame around `DashboardDemoShell`; mounts step-aware surfaces
- `src/components/evaluation/EvaluationHeader.tsx` — three-zone researcher header bound to `useEvaluationStudyStore` and `useDashboardDemoCoordinationStore`
- `src/components/evaluation/EvaluationTrainingGate.tsx` — centered intro card with 5-item checklist and training event trigger
- `src/components/evaluation/EvaluationTaskCard.tsx` — floating task card with `T4 -> T1 -> T2 -> T3` ordering and answer / confidence gating
- `src/components/evaluation/EvaluationQuestionnaire.tsx` — NASA-RTLX + interpretability Likert overlay with full-completion gating
- `src/components/onboarding/OnboardingTour.tsx` — branched to add the researcher-triggered evaluation training tour and restyle the popovers to the dark card language

## Decisions Made

- **Atomic commit split:** the plan's task 1 references `EvaluationShell.tsx` (which the task 2 components depend on) and the plan's task 2 references `EvaluationShell.tsx` (which needs to mount the new components). Committed task 1 with the shell importing only the chrome components (header + training gate), then task 2 added the `EvaluationTaskCard` + `EvaluationQuestionnaire` imports to the shell. The tree compiles after each commit, satisfying the "atomic per-task" contract from the executor protocol.
- **Window event for the training tour:** `EvaluationTrainingGate` dispatches a `CustomEvent` to trigger the tour and `OnboardingTour` listens for it. This avoids threading a ref through the root `layout.tsx` and keeps the trigger fully researcher-driven (per D-05 / D-13).
- **Driver.js kept, popovers restyled in `onPopoverRender`:** the upstream `driver.js` stylesheet is loaded once; per-popover classes are applied at render time so the dark card language from the UI spec is honored without a global stylesheet override that could leak into the legacy dashboard tour.
- **Task card is non-blocking, questionnaire is centered:** matches the UI spec — the visualization stays visible during task-taking so the participant can interact with the demo shell while reading the prompt, but is fully dimmed during the survey so the participant can focus on the form.
- **No participant-facing condition text:** the condition id (`uniform` / `adaptive`) is only visible in the researcher's right-zone condition badge. The task card, questionnaire, and welcome / interview / done screens all use condition-blind copy per D-04 / D-05.

## Deviations from Plan

None - plan executed exactly as written. The plan's three key constraints (8-step flow, T4->T1->T2->T3 within-condition order, researcher-only condition visibility) and the listed must_haves are all met by the committed code. `pnpm typecheck` and `pnpm lint` pass for the new files; the pre-existing TypeScript errors in `src/lib/queries.ts` and a handful of API routes are unrelated to Phase 80.

## Issues Encountered

- `react-hooks/set-state-in-effect` lint rule: the natural implementation of form resets is `useEffect(() => setState(...), [deps])`, but Next.js 16's ESLint config flags it as a cascading-render anti-pattern. Replaced the resets with the documented "store information from previous renders" pattern (a tracked `prevXxx` state plus a render-time `if (xxx !== prevXxx) { setPrevXxx(xxx); setState(...); }` block) in `EvaluationHeader.WelcomeActions`, `EvaluationTaskCard`, and `EvaluationQuestionnaire`. The behavior is identical and the lint passes.
- The plan references extending `OnboardingTour` for the training-gate use, but the existing tour auto-runs based on the `hasSeenTour` localStorage flag and the `pathname.startsWith('/dashboard')` check. To avoid regressing the legacy dashboard tour, the new behavior was implemented as a SEPARATE `useEffect` inside the same component that listens for the `gsd:start-evaluation-training-tour` window event and constructs a new driver instance with the 5 evaluation steps. The legacy path is unchanged.

## Authentication Gates

None.

## Next Phase Readiness

- The `/evaluation` route is fully wired: the 8-step researcher flow renders the correct surface for each phase (welcome / training / tasks-a / questionnaire-a / tasks-b / questionnaire-b / interview / done), all gating rules are enforced (training completion before tasks, answer before confidence, all 4 tasks before questionnaire, all 6+6 items before submit), and the 5-step driver.js training tour is researcher-triggered via a window event.
- Phase 80-03 can build on top of this surface without touching the shell — likely candidates include a researcher observer panel (timing per task, condition badge improvements, session export), automated condition toggles, or a post-session validation step before the `done` screen.
- The acknowledged DuckDB write path is exercised by both the task card and the questionnaire, so study state advances as the participant moves through the flow. Any persistence failure is reflected via the per-intent save status slice in the header chrome.

---

*Phase: 80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us*
*Completed: 2026-06-19*

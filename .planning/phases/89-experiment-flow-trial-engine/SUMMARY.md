# Phase 89 — Experiment Flow & Trial Engine

**Committed:** `c9b20a3e` — `feat(89): experiment flow, trial engine, and /experiment route`

## Outcome

The ATS Perception Study now has a complete participant experience: a formal Zustand state machine drives the flow, three task response components render keyboard-accessible choices, a TrialRunner wires the SVG stimulus to a timing source, the ParticipantFlow orchestrator strings it all together, and the `/experiment` route is live.

## What shipped

- **Protocol** — `src/lib/ats-study/protocol.ts` locks `PROTOCOL_VERSION=v4.0.0`, `FIXATION_MS=500`, `MIN_RESPONSE_MS=200`, `PRACTICE_TRIAL_COUNT=2`, `EXPERIMENTAL_TRIAL_COUNT=24`, `TRIALS_PER_TASK=8`, `UNIFORM_TRIAL_COUNT=12`, `ATS_TRIAL_COUNT=12`, `PROTOCOL_PHASES` (consent → instructions → practice → block-a → block-b → questionnaire → debrief), and helpers `buildExperimentalTrialOrder()` and `buildPracticeTrials()`.
- **Scoring** — `src/lib/ats-study/scoring.ts` with `scorePeak`, `scoreComparison`, `scorePattern`, and `scoreTrial(task, payload)` dispatcher.
- **State machine** — `src/store/useExperimentStore.ts` Zustand store with `persist` middleware (sessionStorage), 14 actions covering consent, session start (auto-generates session UUID and emits `startSession` to Convex with the counterbalanced order), practice, two-phase trial writes (onset + response), block A→B auto-advance, questionnaire, debrief, finish, reset.
- **Navigation guard** — `src/hooks/useNavigationGuard.ts` registers `beforeunload` + `popstate` listeners and tears them down on cleanup.
- **Task components** — `PeakIdentificationChoice`, `PeriodComparisonChoice`, `PatternRecognitionChoice` render semantic `<fieldset>`+`<button>` markup with `data-testid` and `data-choice` hooks.
- **TrialRunner** — `src/components/study/TrialRunner.tsx` orchestrates 500ms fixation cross, then the TimelineStimulus + task choice + 5-point confidence scale, capturing onset on reveal and response on click.
- **Practice feedback** — `PracticeFeedback.tsx` shows correctness and the chosen/expected values after practice trials only.
- **Participant flow** — `ParticipantFlow.tsx` is the full orchestrator.
- **Route** — `src/app/experiment/page.tsx` mounts the flow inside the ConvexClientProvider.

## Verification

- `pnpm test src/lib/ats-study src/store` — **133/133 vitest tests pass across 26 files**.
- `pnpm typecheck` — **zero new Phase 89 errors** (the only `convex/*` errors are the `convex` package not yet installed; fixed in Phase 90).
- Store actions verified: `startSession` calls `writes.startSession` with the counterbalanced order, `recordTrialResponse` calls `writes.completeTrial`, `submitQuestionnaire` calls `writes.submitQuestionnaire`, `finishSession` calls `writes.completeSession`.
- Phase transitions verified end-to-end: `consent → instructions → practice → block-a → block-b → questionnaire → debrief`.
- Practice trials (2) emit feedback; experimental trials (24, 8 per task) do not.
- sessionStorage checkpoints: `persist` middleware partializes everything except the `convexWrites` reference so the same store restores across refreshes.

## Decisions recorded

- `ConvexClientProvider` is shipped as a stub provider that does not import `convex/react`. It is replaced with the real `ConvexProvider` in Phase 90 once the package is installed.
- `PatternRecognitionChoice.LABELS` now includes `"single-burst-heavy": "One heavy burst"` to satisfy the `Record<PatternKind, string>` contract even though that value is not a button choice.

## What's next

Phase 90 — Deployment / Route Stripping / Pilot. Install Convex, strip unrelated prototype routes, add ESLint import guard, run the bundle analysis gate, deploy to Vercel, and run the 2-3 participant pilot.

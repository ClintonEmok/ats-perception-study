---
phase: 89
plan: 1
wave: 1
files_modified:
  - src/lib/ats-study/protocol.ts
  - src/lib/ats-study/scoring.ts
  - src/lib/ats-study/protocol.test.ts
  - src/lib/ats-study/scoring.test.ts
  - src/store/useExperimentStore.ts
  - src/store/useExperimentStore.test.ts
  - src/hooks/useNavigationGuard.ts
  - src/components/study/PeakIdentificationChoice.tsx
  - src/components/study/PeriodComparisonChoice.tsx
  - src/components/study/PatternRecognitionChoice.tsx
  - src/components/study/TrialRunner.tsx
  - src/components/study/PracticeFeedback.tsx
  - src/components/study/ParticipantFlow.tsx
  - src/app/experiment/page.tsx
must_haves:
  truths:
    - Zustand state machine moves through consent -> practice -> block A -> block B -> questionnaire -> debrief.
    - 3 task types render their response choices with stable, keyboard-accessible controls.
    - Onset and response are emitted as separate events to Convex (via the store).
    - sessionStorage checkpoints the participant state so a refresh resumes mid-trial.
    - Browser navigation guard (beforeunload + popstate) prevents accidental data loss.
    - 2 practice trials deliver feedback; 24 experimental trials do not.
    - Counterbalanced condition order comes from the committed Latin square.
  artifacts:
    - src/store/useExperimentStore.ts
    - src/lib/ats-study/protocol.ts
    - src/lib/ats-study/scoring.ts
    - src/app/experiment/page.tsx
    - src/components/study/ParticipantFlow.tsx
  key_links:
    - useExperimentStore -> convex/study.ts (Convex mutations)
    - useExperimentStore -> src/lib/ats-study/assignment.ts (counterbalancing)
    - ParticipantFlow -> TimelineStimulus + task response components
    - useNavigationGuard -> window beforeunload + history popstate
---

<objective>
Wire the participant experience for the ATS Perception Study: a formal Zustand state machine, three task response components, the practice + experimental trial flow, browser navigation guards, and a working `/experiment` route.

Locked decisions from Phase 87/88 and the PRD:
- 26 total trials = 2 practice + 8 Peak Identification + 8 Period Comparison + 8 Pattern Recognition.
- 12 Uniform + 12 ATS, counterbalanced per the committed Latin square.
- Practice trials show immediate feedback; experimental trials do not.
- Trial structure: fixation cross (500ms) -> onset capture -> stimulus reveal -> response capture.
- Two-phase Convex writes (`startTrial` followed by `completeTrial`).
- sessionStorage checkpointing so a refresh resumes in place.
- `beforeunload` + `popstate` warnings.
</objective>

<execution_context>
- React 19 + Next.js 16 client components for every study component.
- Zustand 5 with `subscribeWithSelector` and `persist` (sessionStorage) middleware.
- The store owns phase transitions; component code dispatches intent actions.
- Convex mutations from Phase 87 are called from the store via `useConvex()`/`useMutation`; for now the store keeps a `convexWrites` field so unit tests can stub it.
</execution_context>

<context>
Phase 89 — Experiment Flow & Trial Engine.
Maps to requirements: EXPMT-02, EXPMT-03, EXPMT-06, FLOW-01, FLOW-02, FLOW-03.
Builds on Phase 87 (Convex, counterbalancing, datasets) and Phase 88 (stimulus, timing).
</context>

<tasks>
1. `src/lib/ats-study/protocol.ts` — frozen protocol constants (trial counts, condition balance, fixation ms, trial order template).
2. `src/lib/ats-study/scoring.ts` — pure scoring helpers per task type.
3. Unit tests for protocol + scoring.
4. `src/store/useExperimentStore.ts` — Zustand state machine with consent/practice/block/questionnaire/debrief phases, persistence middleware to sessionStorage, intent actions for every transition.
5. Unit tests for the store (phase transitions, practice vs experimental flow, refresh recovery).
6. `src/hooks/useNavigationGuard.ts` — `beforeunload` + `popstate` warnings during the experiment.
7. `src/components/study/PeakIdentificationChoice.tsx`, `PeriodComparisonChoice.tsx`, `PatternRecognitionChoice.tsx` — keyboard-accessible task response components.
8. `src/components/study/TrialRunner.tsx` — wires TimelineStimulus + task choice + timing source.
9. `src/components/study/PracticeFeedback.tsx` and `src/components/study/ParticipantFlow.tsx` — full flow orchestrator.
10. `src/app/experiment/page.tsx` — route entry; wraps ConvexClientProvider + ParticipantFlow.
11. Run `pnpm test src/lib/ats-study src/store` and fix any breakage.
12. Run `pnpm typecheck` and fix any new errors.
</tasks>

<verification>
- All Phase 89 tests pass.
- Store advances through all 6 phases in order; refresh resumes in place.
- Practice trials emit feedback; experimental trials do not.
- `useNavigationGuard` returns a cleanup function that removes the listeners.
- `/experiment` page mounts the flow with the Convex provider.
</verification>

<success_criteria>
- Phase 89 roadmap success criteria satisfied:
  - Zustand state machine handles consent -> debrief.
  - 26 total trials with 8 per task.
  - Browser navigation guard and session checkpoints.
  - Practice trials with feedback.
  - Convex writes are two-phase.
  - Counterbalanced order from committed Latin square.
- `/experiment` route renders the flow and the provider chain.
</success_criteria>

<output>
- Updated `.planning/STATE.md` and `.planning/ROADMAP.md`.
- One atomic commit covering Phase 89.
</output>

---
phase: 91
plan: 1
wave: 1
files_modified:
  - src/lib/ats-study/questionnaire.ts
  - src/lib/ats-study/questionnaire.test.ts
  - src/components/study/PostStudyQuestionnaire.tsx
  - src/components/study/PostStudyQuestionnaire.test.tsx
  - src/components/study/ParticipantFlow.tsx
  - src/lib/ats-study/protocol.ts
  - src/store/useExperimentStore.ts
  - src/store/useExperimentStore.test.ts
must_haves:
  truths:
    - Per-trial confidence scale is a 5-point Likert with published-study wording.
    - Post-study preference question supports a 5-point ATS-vs-Uniform scale.
    - Free-text feedback has a 10-character soft minimum and a soft warning.
    - Debrief screen offers "Download my responses" so the participant leaves with a copy.
  artifacts:
    - src/lib/ats-study/questionnaire.ts
    - src/components/study/PostStudyQuestionnaire.tsx
    - src/components/study/PostStudyQuestionnaire.test.tsx
  key_links:
    - PostStudyQuestionnaire -> useExperimentStore.setQuestionnaireAnswer
    - PostStudyQuestionnaire -> exportSessionData
    - ParticipantFlow -> PostStudyQuestionnaire (replaces the inline questionnaire view)
---

<objective>
Iterate on the post-study questionnaire UX so the per-trial confidence scale, the preference question, and the free-text feedback match what a real participant would say after 24 experimental trials. Add a debrief "Download my responses" affordance.

Locked decisions from the v4.0 audit + user direction:
- The per-trial confidence scale (in `TrialRunner`) is already a 5-point Likert; the iteration is to make the wording match published perception studies ("very unconfident" → "very confident") instead of just "1…5" buttons.
- The post-study preference question gets a 5-point ATS-vs-Uniform scale, in addition to the existing 3-way radio. Both go into the same `preference` slot so the schema doesn't change.
- The free-text field has a 10-character soft minimum. Empty or short submissions show a soft warning before submit.
- The debrief screen has a "Download my responses" button that calls `exportSessionDataAsJson` and triggers a download.
</objective>

<execution_context>
React 19 + Next.js 16 client components. The post-study questionnaire is rendered from `ParticipantFlow` inside the `useExperimentStore` FSM. New files: `src/lib/ats-study/questionnaire.ts` (pure helpers), `src/components/study/PostStudyQuestionnaire.tsx` (the form).
</execution_context>

<context>
Phase 91 — Questionnaire Iteration.
Builds on Phase 89 (FSM, store, trial engine) and Phase 90 (export helpers).
This phase was inserted after the v4.0 audit found DEPLOY-04/05 credential-blocked.
</context>

<tasks>
1. `src/lib/ats-study/questionnaire.ts` — pure helpers: `CONFIDENCE_ANCHORS`, `PREFERENCE_LABELS`, `MIN_FREE_TEXT_CHARS = 10`, `validateFreeText(text)`, `isPreferenceLikert(value)`.
2. Unit tests for the helpers.
3. `src/components/study/PostStudyQuestionnaire.tsx` — full form: confidence anchors, 5-point preference scale, free-text with soft warning, "Submit" button.
4. Component test for the form.
5. `src/lib/ats-study/protocol.ts` — add `CONFIDENCE_ANCHORS` constant export.
6. `src/store/useExperimentStore.ts` — extend `QuestionnaireAnswers` to keep the legacy `preference` slot compatible; add `confidenceAnchors: { perTrial: number; postStudy: number }` if needed.
7. Update `ParticipantFlow` to use `PostStudyQuestionnaire` instead of the inline form.
8. Update the debrief screen to add a "Download my responses" button.
9. Add store + flow tests for the new questionnaire behavior.
10. Run `pnpm typecheck`, `pnpm test`, and the import guard.
</tasks>

<verification>
- Per-trial confidence buttons show "Very unconfident" / "Unconfident" / "Neutral" / "Confident" / "Very confident" with aria-pressed state.
- The 5-point preference scale has "Strongly Uniform", "Uniform", "Neutral", "ATS", "Strongly ATS" with the legacy 3-way option preserved in the same fieldset as fallback.
- Free-text with < 10 chars shows "Please write at least 10 characters" soft warning; submit is still allowed.
- The debrief button triggers a JSON download named `ats-study-<sessionId>.json`.
- All existing tests still pass; new tests cover the anchors, the warning, and the download.
</verification>

<success_criteria>
- Phase 91 roadmap success criteria satisfied:
  - Per-trial confidence anchors match Likert-5 wording.
  - Post-study preference supports the 5-point scale.
  - Free-text has a 10-character soft minimum and warning.
  - Debrief offers "Download my responses".
- All gates pass: typecheck 0, tests 62 + new, import-guard 0/24.
</success_criteria>

<output>
- Updated `.planning/STATE.md` and `.planning/ROADMAP.md`.
- One atomic commit covering Phase 91.
</output>

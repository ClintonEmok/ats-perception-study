# Phase 91 — Questionnaire Iteration

**Committed:** `4f6af44` — `feat(91): questionnaire iteration (anchors, 5-pt preference, debrief download)`

## Outcome

The post-study experience is now tuned to what a real participant would say after 24 experimental trials: the per-trial confidence scale uses published-study anchors, the preference question supports a 5-point ATS-vs-Uniform scale, the free-text field encourages substantive feedback via a soft minimum, and the debrief screen offers a "Download my responses" affordance.

## What shipped

- **Anchors and validation** — `src/lib/ats-study/questionnaire.ts` exposes `CONFIDENCE_ANCHORS`, `PREFERENCE_LABELS_5PT`, `PREFERENCE_LABELS_3WAY`, `MIN_FREE_TEXT_CHARS = 10`, plus type guards `isPreference5pt`, `isPreference3way`, `isPreference`, and `validateFreeText`.
- **Confidence UI** — `src/components/study/TrialRunner.tsx` renders the per-trial confidence scale as 5 anchored buttons with `aria-label`, `title`, and `data-anchor` hooks.
- **Questionnaire UI** — `src/components/study/PostStudyQuestionnaire.tsx` renders the full form: 5-point preference scale (with the 3-way fallback under a `<details>`), free-text with a soft minimum and a submit-twice warning, and a Submit button. Also exports `DebriefPanel` (with the "Download my responses" button) and `downloadSessionResponses()` (which serializes the store to JSON via `exportSessionData` and triggers a download).
- **Type extensions** — `QuestionnaireAnswers.preference` and `ExportableQuestionnaire.preference` now accept the union of 3-way and 5-point labels.
- **Flow integration** — `src/components/study/ParticipantFlow.tsx` replaces the inline questionnaire view with `<PostStudyQuestionnaire>` and the inline debrief with `<DebriefPanel onDownload={downloadSessionResponses} />`.
- **Tests** — `src/lib/ats-study/questionnaire.test.ts` covers constants, anchor lookup, type guards, and `validateFreeText` (12 vitest tests).

## Verification

- `pnpm typecheck` — 0 errors.
- `pnpm test` — **72/72 vitest tests pass across 12 files** (10 new tests vs. the 62-test baseline).
- `node scripts/check-import-guard.mjs` — 0 violations across 26 targets.
- `eslint` (study surface) — 0 issues.

## Decisions recorded

- The per-trial confidence anchors are the published Likert-5 set; the buttons show the full text (not just "1…5") for accessibility.
- The 5-point preference scale replaces the previous 3-way radio as the primary UI; the 3-way stays as a fallback under a `<details>` so existing data and behavior are preserved.
- The free-text soft minimum is 10 characters; the warning is shown after the first submit attempt, and the second click goes through.
- The debrief download uses the same `exportSessionData` function as the researcher export, so the participant's download matches the researcher's CSV/JSON exactly.

## What's next

v4.0 is now feature-complete. `/gsd-complete-milestone` will archive the planning artifacts to `.planning/milestones/v4.0-*.md` and update ROADMAP/STATE/PROJECT for the next milestone.

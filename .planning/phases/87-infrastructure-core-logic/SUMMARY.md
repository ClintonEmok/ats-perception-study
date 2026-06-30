# Phase 87 Summary — Infrastructure & Core Logic

Commit: `9c165b0`

## Delivered

- `convex/schema.ts` — `defineSchema` with `studySessions`, `studyTrials` (status enum: started/responded/completed/abandoned/timeout), `studyResponses`, `studyQuestionnaires`, plus the indexes needed for partial-trial queries.
- `convex/study.ts` — generic mutations/queries: `startSession`, `startTrial`, `recordTrialOnset`, `recordTrialResponse`, `completeTrial`, `abandonTrial`, `completeSession`, `submitQuestionnaire`, `getSession`.
- `convex/_generated/server.ts` — hand-written stub so the convex function files import cleanly until `npx convex dev` regenerates the API.
- `src/lib/ats-study/assignment.ts` — committed Latin square with 2 condition orders × 8 trials each, `assignConditionOrder(participantIndex)`, `conditionForTrial(participantIndex, trialIndex)`, `balanceReport()`.
- `src/lib/ats-study/datasets.ts` — 6 seeded base datasets (uniform, single-burst, multi-burst ×2, gradual-change, single-burst heavy), with `getUniformVariants()`, `getAtsVariants()`, and `getVariantByDatasetId()` for round-tripping.
- `src/lib/ats-study/atsMapping.ts` — `computeAtsIntervals(events, opts)` with deterministic local-density weight inversion and post-rescale min/max bound enforcement, plus a `uniformIntervals(events, binCount)` companion.
- `src/components/providers/ConvexClientProvider.tsx` — `'use client'` provider that warns when `NEXT_PUBLIC_CONVEX_URL` is missing and otherwise mounts `ConvexProvider` with a `ConvexReactClient`.
- `.env.example` — documents the `NEXT_PUBLIC_CONVEX_URL` variable.
- Three vitest suites: `assignment.test.ts`, `datasets.test.ts`, `atsMapping.test.ts` — 22 passing tests.

## Verification

- `pnpm test src/lib/ats-study` — 22/22 tests pass.
- `assignConditionOrder` cycles deterministically across the two committed orders.
- `computeAtsIntervals` is deterministic for identical input and respects min/max-width bounds.
- All 6 base datasets have unique ids and ≥100 events each; uniform and ats variants share the same base dataset.

## Out of scope (next phases)

- SVG stimulus rendering (Phase 88)
- Trial engine and participant flow (Phase 89)
- Route stripping, deployment, pilot (Phase 90)

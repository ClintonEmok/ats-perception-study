---
phase: 87
plan: 1
wave: 1
files_modified:
  - convex/schema.ts
  - convex/study.ts
  - convex/_generated/server.ts
  - src/lib/ats-study/assignment.ts
  - src/lib/ats-study/datasets.ts
  - src/lib/ats-study/atsMapping.ts
  - src/components/providers/ConvexClientProvider.tsx
  - .env.example
  - src/lib/ats-study/assignment.test.ts
  - src/lib/ats-study/datasets.test.ts
  - src/lib/ats-study/atsMapping.test.ts
must_haves:
  truths:
    - Convex schema supports partial trial lifecycle (started/responded/completed/abandoned/timeout).
    - Counterbalanced condition order is committed to the repo (Latin square) and assigned sequentially.
    - ≥6 base datasets exist and each yields both Uniform and ATS renderable variants.
    - ATS interval widths are computed client-side from burstiness weights, deterministic across reloads.
    - ConvexClientProvider wires ConvexReactClient via NEXT_PUBLIC_CONVEX_URL.
  artifacts:
    - convex/schema.ts
    - convex/study.ts
    - src/lib/ats-study/assignment.ts
    - src/lib/ats-study/datasets.ts
    - src/lib/ats-study/atsMapping.ts
    - src/components/providers/ConvexClientProvider.tsx
    - .env.example
  key_links:
    - src/lib/ats-study/assignment.ts -> convex/study.ts (sequential assignment)
    - src/lib/ats-study/datasets.ts -> src/lib/ats-study/atsMapping.ts (variant generation)
---

<objective>
Build the ATS Perception Study infrastructure: Convex-only data backbone, counterbalancing, ATS mapping, and base datasets.

Locked decisions (from PROJECT.md / REQUIREMENTS.md / research SUMMARY):
- Stack additions: `convex@1.42.1`, `@visx/tooltip`, `@visx/text`, `@visx/annotation` (all pinned to 3.12.0).
- Convex is the only backend; DuckDB/Three.js/MapLibre stay out of the study path.
- Custom React + Zustand + Visx engine, not jsPsych.
- Within-subjects design: each participant sees both Uniform and ATS, counterbalanced.
- 6+ base datasets, each rendered in both Uniform and ATS forms.
- 24 experimental trials = 8 per task × 3 task types, balanced 12 Uniform / 12 ATS.
- 2 practice trials with feedback.
- Anonymous IDs via `crypto.randomUUID()`.
- Convex partial-trial writes (onset first, response second).
</objective>

<execution_context>
- Convex docs: ConvexProvider + ConvexReactClient in a 'use client' wrapper, defineSchema/defineTable default-exported from convex/schema.ts.
- Use generic exports from convex/server to avoid codegen at install time; the hand-written convex/_generated/server.ts stub keeps the import surface stable.
- Pure-function helpers under src/lib/ats-study/ with colocated vitest tests.
- Reuse crypto.randomUUID() for participant IDs (no new ID library).
</execution_context>

<context>
Phase 87 — Infrastructure & Core Logic.
Maps to requirements: DATA-01, DATA-03, EXPMT-04, EXPMT-07.
Builds on prior v3.4 prototype patterns (Zustand stores, vitest, Convex-style providers) but stays isolated to the ATS study surface.
</context>

<tasks>
1. Author `convex/schema.ts` with tables: studySessions, studyTrials (status enum), studyResponses, studyQuestionnaires.
2. Author `convex/study.ts` with generic mutations/queries (startSession, recordTrialOnset, recordTrialResponse, submitQuestionnaire, getSession).
3. Author `convex/_generated/server.ts` stub so imports resolve without `npx convex dev`.
4. Author `src/lib/ats-study/assignment.ts`: 8x Latin square (2 condition orders × 4 reps) with sequential `assignConditionOrder(index)`.
5. Author `src/lib/ats-study/datasets.ts`: 6+ seeded base datasets, `getDataset(id)`, `getUniformVariants()`, `getAtsVariants()`.
6. Author `src/lib/ats-study/atsMapping.ts`: pure function `computeAtsIntervals(events, opts)` that returns adaptive bin widths from local density weights.
7. Author `src/components/providers/ConvexClientProvider.tsx` ('use client') wrapping `ConvexProvider` with `ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)`.
8. Author `.env.example` documenting `NEXT_PUBLIC_CONVEX_URL`.
9. Author three vitest test files: assignment, datasets, atsMapping.
10. Run `pnpm typecheck` and `pnpm test` for the new files.
</tasks>

<verification>
- `pnpm typecheck` exits 0.
- `pnpm test src/lib/ats-study` runs and all suites pass.
- `convex/schema.ts` exports a default schema with the 4 tables.
- `assignConditionOrder` returns the two ABBA-counterbalanced orders deterministically.
- `computeAtsIntervals` is deterministic for the same input.
</verification>

<success_criteria>
- Phase 87 roadmap success criteria satisfied:
  - Counterbalanced orders committed.
  - Partial-trial Convex states defined.
  - 6+ base datasets with Uniform/ATS variants.
  - ATS mapping library is client-side TypeScript.
  - All Phase 87 tests pass.
- Files committed atomically with a single Phase 87 commit.
</success_criteria>

<output>
- Updated `.planning/STATE.md` (current_focus -> Phase 87 done, next -> Phase 88).
- Updated `.planning/ROADMAP.md` (Phase 87 progress).
- One atomic commit covering all Phase 87 deliverables.
</output>

# Phase 87 — Infrastructure & Core Logic

**Status:** Planned
**Requirements covered:** DATA-01, DATA-03, EXPMT-04, EXPMT-07

## What this phase delivers

1. Convex-only data backbone (schema + generic mutations/queries) supporting the full partial-trial lifecycle.
2. A committed Latin-square counterbalancing matrix with sequential participant assignment.
3. ≥6 seeded base datasets, each yielding a Uniform and an ATS renderable variant.
4. A client-side ATS mapping library that computes adaptive interval widths from local density weights.

## Locked decisions

- Stack additions: `convex@1.42.1`, plus `@visx/tooltip`, `@visx/text`, `@visx/annotation` (3.12.0). No ID library — `crypto.randomUUID()` is already used in the repo.
- Schema tables: `studySessions`, `studyTrials` (with `status` enum), `studyResponses`, `studyQuestionnaires`.
- Counterbalancing: 2 condition orders × 4 repetitions = 8 cells, sequential assignment.
- Base datasets: 6+ seeded synthetic event sequences with burstiness-driven structure, each rendered in both Uniform and ATS forms.
- ATS mapping: pure TS function, no Web Worker (datasets are small).

## Files

- `convex/schema.ts` — schema definition
- `convex/study.ts` — generic mutations/queries
- `convex/_generated/server.ts` — codegen stub
- `src/lib/ats-study/assignment.ts` — counterbalancing
- `src/lib/ats-study/datasets.ts` — base datasets + variants
- `src/lib/ats-study/atsMapping.ts` — ATS interval widths
- `src/components/providers/ConvexClientProvider.tsx` — Convex client provider
- `.env.example` — `NEXT_PUBLIC_CONVEX_URL`
- `src/lib/ats-study/{assignment,datasets,atsMapping}.test.ts` — vitest suites

## Out of scope (later phases)

- Stimulus SVG rendering (Phase 88)
- Trial engine and participant flow (Phase 89)
- Deployment, route stripping, pilot (Phase 90)

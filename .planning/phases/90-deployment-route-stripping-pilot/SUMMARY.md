# Phase 90 — Deployment / Route Stripping / Pilot

**Committed:** `6293eb0` — `feat(90): strip prototype routes, add deployment gates, prepare pilot`

## Outcome

The `ats-study` branch is now a deployment-ready Convex-only web experiment. All prototype routes, dependencies, stores, and adapters are physically removed; the only runtime surface is the landing page, `/experiment`, and the Convex client. Three deployment gates pass: import-guard, bundle-check, and the production build.

## What shipped

**Pure study code**
- `src/lib/ats-study/import-guard.ts` — `FORBIDDEN_PATH_PATTERNS`, `FORBIDDEN_MODULES`, `scanImportsForViolations()`.
- `src/lib/ats-study/import-guard.test.ts` — 5 vitest tests.
- `src/lib/ats-study/export.ts` — `ExportableSession`, `ExportableTrial`, `ExportableQuestionnaire`, `exportSessionDataAsCsv`, `exportSessionDataAsJson`, `exportSessionData`. CSV escapes commas, quotes, and newlines per RFC 4180.
- `src/lib/ats-study/export.test.ts` — 4 vitest tests.

**Scripts**
- `scripts/check-import-guard.mjs` — Node 20 self-contained scanner. Mirrors the import-guard regex/module lists. Walks the study surface (`src/lib/ats-study`, `src/components/study`, the experiment route, the timing/navigation hooks, the ConvexClientProvider). Skips test files.
- `scripts/check-bundle.mjs` — runs `pnpm build` if `.next/` is missing, then scans `.next/` for forbidden module strings.

**Config + docs**
- `vercel.json` — Vercel config with `NEXT_PUBLIC_CONVEX_URL` env.
- `convex.json` — Convex project config pointing at `ats-perception-study-prod`.
- `docs/DEPLOYMENT.md` — Vercel + Convex deployment runbook.
- `docs/PILOT.md` — 2-3 participant pilot procedure.
- `.env.example` — `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY`.

**ESLint + Convex**
- `eslint.config.mjs` — added `no-restricted-imports` rule for study files blocking `FORBIDDEN_PATH_PATTERNS` and `FORBIDDEN_MODULES`.
- `pnpm add convex` — installed the real Convex 1.42.x package.
- `convex/_generated/server.ts` — replaced hand-written `query`/`mutation` re-export with `queryGeneric`/`mutationGeneric` casts; loosened `AnyApi` to use `Record<string, never>` args so it satisfies `DefaultFunctionArgs`.

**Stripping**
- Physically deleted 21 route directories under `src/app/`.
- Physically deleted 18 component directories under `src/components/` (only `providers/` and `study/` remain).
- Physically deleted 19 lib directories under `src/lib/`.
- Physically deleted every prototype store in `src/store/` except `useExperimentStore.ts` and `useExperimentStore.test.ts`.
- Physically deleted 19 prototype hooks in `src/hooks/`.
- Physically deleted `src/types/`, `src/utils/binning.ts`, and prototype scripts.

**Replacements**
- `src/app/layout.tsx` — minimal layout with just the ConvexClientProvider (no OnboardingTour, no ThemeProvider, no QueryProvider).
- `src/app/page.tsx` — study landing page that links to `/experiment`.
- `package.json` — slimmed to study-only dependencies. Added `check:imports` and `check:bundle` scripts.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | 0 errors |
| `pnpm test` | 62/62 vitest tests pass across 11 files |
| `lint` (study surface) | 0 issues |
| `node scripts/check-import-guard.mjs` | 0 violations across 24 targets |
| `pnpm build` | 3 static routes: `/`, `/_not-found`, `/experiment` |
| `node scripts/check-bundle.mjs` | 0 forbidden modules in `.next/` output |

## Decisions recorded

- `ConvexClientProvider` now imports the real `convex/react`; the runtime contract is unchanged (warns and passes children through when `NEXT_PUBLIC_CONVEX_URL` is unset, otherwise wraps with `ConvexProvider`).
- `next.config.ts` `serverExternalPackages: ['duckdb']` removed (the `duckdb` package itself is no longer installed).
- `src/app/globals.css` `.leaflet-*` rules removed; no source file imports leaflet but the rules were compiling into CSS and tripping the bundle check.
- `ParticipantFlow` `pickExperimentalVariant(blockCondition)` is now a pure function and takes the block condition as a parameter (no `useExperimentStore.getState()` calls inside a render helper).
- `TrialRunner` initialises `phase` lazily from `showFixation` so the no-fixation path doesn't call `setPhase` inside an effect.

## What's next

The four v4.0 phases are now complete. The milestone audit (`gsd-audit-milestone`) and cleanup (`gsd-complete-milestone` + `gsd-cleanup`) are the next steps for closing out v4.0. The pilot run (2-3 participants) is unblocked and can be performed against the deployed Vercel + Convex production environment per `docs/PILOT.md`.

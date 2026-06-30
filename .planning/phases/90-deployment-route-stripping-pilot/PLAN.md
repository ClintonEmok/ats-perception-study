---
phase: 90
plan: 1
wave: 1
files_modified:
  - .gitignore
  - .eslintrc.json (created; merged with existing eslint.config.mjs)
  - eslint.config.mjs (no-restricted-imports for prototype paths)
  - package.json (removed: duckdb, three, maplibre, leaflet, deck.gl)
  - src/lib/ats-study/export.ts (NEW)
  - src/lib/ats-study/export.test.ts (NEW)
  - src/lib/ats-study/import-guard.ts (NEW)
  - src/lib/ats-study/import-guard.test.ts (NEW)
  - scripts/check-bundle.mjs (NEW)
  - scripts/check-import-guard.mjs (NEW)
  - convex.json (NEW)
  - vercel.json (NEW)
  - docs/PILOT.md (NEW)
  - docs/DEPLOYMENT.md (NEW)
  - .env.example
must_haves:
  truths:
    - Unrelated prototype routes are physically deleted from the ats-study branch.
    - The experiment build produces no DuckDB / Three.js / MapLibre / Leaflet / Deck.gl chunks.
    - The ESLint import guard fails the build if prototype paths appear in study code.
    - Researchers can export session/trial/questionnaire data as CSV or JSON.
    - The Vercel + Convex production config files exist with documented env vars.
    - A pilot checklist documents how to run 2-3 participants and capture results.
  artifacts:
    - src/lib/ats-study/export.ts
    - src/lib/ats-study/import-guard.ts
    - scripts/check-bundle.mjs
    - scripts/check-import-guard.mjs
    - convex.json
    - vercel.json
    - docs/PILOT.md
    - docs/DEPLOYMENT.md
  key_links:
    - export.ts -> Convex studySessions/studyTrials/studyQuestionnaires queries
    - check-bundle.mjs -> pnpm build output
    - check-import-guard.mjs -> pnpm lint output + import-guard module
    - vercel.json + convex.json -> Vercel + Convex production environments
---

<objective>
Ship the v4.0 ATS Perception Study as a production-deployable, branch-isolated web experiment: physically strip unrelated prototype routes, drop heavy dependencies, add import guard + bundle analysis checks, wire researcher export, configure Vercel + Convex deployment, and document the pilot procedure.

Locked decisions from Phase 87-89 and the PRD:
- Convex is the only persistence layer.
- The study branch ships only the `/experiment` route plus `/` landing page.
- No DuckDB WASM, Three.js, MapLibre, Leaflet, or Deck.gl in the bundle.
- Researcher export ships as CSV + JSON for downstream stats analysis.
- 2-3 pilot participants verified before recruitment opens.
</objective>

<execution_context>
- Next.js 16.2.9 with the existing Tailwind v4 + Visx + Zustand stack.
- Convex 1.42.x installed in this phase.
- No new third-party state libraries; use what is already in package.json after the strip.
</execution_context>

<context>
Phase 90 — Deployment / Route Stripping / Pilot.
Maps to requirements: DATA-04, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05.
Builds on Phase 87 (Convex + counterbalancing + datasets), 88 (stimulus + timing), 89 (state machine + flow + /experiment route).
</context>

<tasks>
1. Drop unrelated prototype route directories under `src/app/` and `src/app/api/` (algorithms, api, cube-sandbox, dashboard-demo, demo, docs, evaluation, figures, hotspot-evolution, stats, stkde, stkde-3d, timeline-test, timeline-test-3d, timeslicing, timeslicing-algos). Keep only `src/app/experiment` and `src/app/page.tsx` (replaced with a study landing page that links to `/experiment`).
2. Replace `src/app/page.tsx` with a study landing page (`/`) and `src/app/layout.tsx` with the ConvexClientProvider + minimal providers.
3. Remove `src/lib/study/*`, `src/store/useStudyStore.ts`, `src/store/useEvaluationStudyStore.ts`, and any other Phase 80 / Phase 86 study code paths. Keep only what `src/lib/ats-study/*` and `src/store/useExperimentStore.ts` need.
4. Remove unused dependencies: `duckdb`, `three`, `@react-three/*`, `maplibre-gl`, `react-map-gl`, `leaflet*`, `@deck.gl/*`, `react-leaflet*`, `apache-arrow`, `density-clustering`, `lodash.debounce`, `cmdk`, `driver.js`. Update `package.json` accordingly.
5. Add ESLint `no-restricted-imports` for forbidden paths: `src/app/(algorithms|api|cube-sandbox|...)`, `src/lib/study`, `src/store/useStudyStore`, `src/store/useEvaluationStudyStore`, and forbidden npm modules (`duckdb`, `three`, `maplibre-gl`, etc.). Wire into existing `eslint.config.mjs`.
6. Add `src/lib/ats-study/import-guard.ts` — exported `FORBIDDEN_PATH_PATTERNS` and `FORBIDDEN_MODULES` consumed by both ESLint and the runtime check.
7. Add `scripts/check-import-guard.mjs` — Node script that greps `src/lib/ats-study/**` and `src/components/study/**` for forbidden imports; CI failure on hit.
8. Add `scripts/check-bundle.mjs` — runs `pnpm build` (or reads an existing build log) and verifies no `duckdb`, `three`, `maplibre-gl`, `react-map-gl`, `leaflet`, or `@deck.gl` strings appear in the `.next/` output.
9. Add `src/lib/ats-study/export.ts` — pure function `exportSessionDataAsCsv(sessions, trials, questionnaires)` and `exportSessionDataAsJson(sessions, trials, questionnaires)` returning strings. Convex consumer (admin query) is out of scope for the prototype but the pure export function is testable.
10. Add tests for `export.ts` and `import-guard.ts`.
11. Add `convex.json` and `vercel.json` for Convex + Vercel deployment.
12. Add `docs/DEPLOYMENT.md` and `docs/PILOT.md`.
13. Update `.env.example` with the production env vars (`CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`).
14. Run `pnpm test` and `pnpm typecheck` to verify nothing broke.
</tasks>

<verification>
- Only `/experiment` and `/` (landing) routes survive in `src/app/`.
- `pnpm test` — 100% pass including new export + import-guard tests.
- `pnpm typecheck` — zero errors in study code (prototype errors are gone because the code is gone).
- `node scripts/check-import-guard.mjs` — exits 0.
- `node scripts/check-bundle.mjs` — exits 0 once `pnpm build` succeeds.
- `pnpm lint` — exits 0.
</verification>

<success_criteria>
- Phase 90 roadmap success criteria satisfied:
  - Study surface ships alone on the ats-study branch.
  - Study code cannot import prototype modules.
  - Bundle analysis excludes DuckDB, Three.js, MapLibre, Leaflet, Deck.gl.
  - Vercel + Convex production deployment configuration exists.
  - Pilot verification (N=2-3) is documented.
- Researcher export is available as CSV + JSON.
- Branch passes `pnpm test`, `pnpm typecheck`, `pnpm lint`, and the new bundle/import-guard checks.
</success_criteria>

<output>
- Updated `.planning/STATE.md` and `.planning/ROADMAP.md`.
- One atomic commit covering Phase 90.
- Milestone audit + cleanup hooks ready for `/gsd-complete-milestone` once the user signs off.
</output>

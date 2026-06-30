# Deployment — ATS Perception Study (v4.0)

This branch (`ats-study`) ships a stripped experiment bundle. The production deployment is a Vercel project pointing at a Convex production deployment.

## One-time setup

1. Create a Convex project for the study.
   ```bash
   pnpm add convex
   pnpm exec convex init --project ats-perception-study
   pnpm exec convex dev --once --configure
   ```
   Note the production URL (`https://ats-perception-study-prod.convex.cloud`).

2. Provision the Convex **production** deployment.
   ```bash
   pnpm exec convex deploy --prod
   ```

3. Create a Vercel project.
   - Import this repository at the `ats-study` branch.
   - Set the build command to `pnpm build` (the default Next.js preset works once the `vercel.json` framework is recognised).
   - Add the env var `NEXT_PUBLIC_CONVEX_URL` with the production Convex URL.
   - Add the env var `CONVEX_DEPLOY_KEY` with the deploy key from step 2 (used by `npx convex deploy --prod` in CI, not at runtime).

4. Run the pre-deploy verification.
   ```bash
   pnpm install --frozen-lockfile
   pnpm test
   pnpm typecheck
   pnpm lint
   node scripts/check-import-guard.mjs
   node scripts/check-bundle.mjs
   ```

## Build profile after stripping

After the Phase 90 strip, only the following surface ships:

- `/` — study landing page
- `/experiment` — full participant flow

Everything else under `src/app/` is removed. Heavy prototype modules (`duckdb`, `three`, `maplibre-gl`, `react-map-gl`, `leaflet`, `react-leaflet`, `apache-arrow`, `density-clustering`, `driver.js`, `cmdk`, `@deck.gl/*`, `@loaders.gl/*`, `@math.gl/*`) are uninstalled. The bundle check verifies they do not reappear in `.next/`.

## CI

The recommended Vercel preview flow:

1. Push to a feature branch → Vercel creates a preview build.
2. Preview builds use a Convex dev deployment set per branch (configure via `CONVEX_DEPLOY_KEY` per-branch).
3. The pre-deploy verification script is the source of truth: any failed check blocks the merge.

## Researcher data export

The study records into Convex. Run the export locally to pull a session's data:

```bash
pnpm exec convex run study:listSessions --prod
# then in the participant flow, use the "Download my data" button (Phase 90 ships a stub)
# or call `exportSessionData` from src/lib/ats-study/export.ts in a script.
```

The export format is documented in `docs/PILOT.md`.

## Rollback

Reverting is `git revert <last-deploy-commit>` on the `ats-study` branch — no schema migration is required because Convex schema versioning is additive.

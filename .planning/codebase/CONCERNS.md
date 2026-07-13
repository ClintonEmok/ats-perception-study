# Codebase Concerns

**Analysis Date:** 2026-07-14

## Security Considerations

**SQL Injection in `duckdb-aggregator.ts`:**
- Risk: Direct string interpolation of `startTs`, `endTs`, `types`, and `districts` into SQL queries without parameterized placeholders
- Files: `src/lib/duckdb-aggregator.ts` (lines 50-66, 71-76)
- Current mitigation: Values are server-controlled integers/strings from the API layer, not user input directly
- Recommendation: Refactor to use parameterized queries (`?` placeholders) like `src/lib/queries/filters.ts` already does

**SQL Injection in `readOverviewBins`:**
- Risk: Crime type filter strings are interpolated directly into SQL via string concatenation
- Files: `src/lib/db.ts` (lines 378-383)
- Current mitigation: Manual escaping with `.replace(/'/g, "''")` — fragile single-quote escaping
- Recommendation: Use parameterized `IN (?)` clauses with array parameters, matching the pattern in `src/lib/queries/filters.ts`

**SQL Injection in `stats-summary` route:**
- Risk: `filters.sql` is interpolated into `read_csv_auto('${dataPath}')` queries — though `dataPath` comes from `getDataPath()` which is server-controlled
- Files: `src/app/api/crime/stats-summary/route.ts` (line 149)
- Current mitigation: `dataPath` is constructed from `process.cwd()` + hardcoded filename
- Low risk — `dataPath` is not user-controllable

**Exposed Convex Credentials in `.env.local`:**
- Risk: Convex deployment URL and deployment key are committed to the repository
- Files: `.env.local` (lines 2-6)
- Current mitigation: `.gitignore` includes `.env*.local` — verify this file is not tracked in git
- Recommendation: Confirm `.env.local` is not in git history; rotate keys if it was ever committed

## Tech Debt

**DuckDB Binding Hack (`postinstall` script):**
- Issue: Manual symlink creation for duckdb native binding (`ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node`)
- Files: `package.json` (line 12)
- Impact: Fragile — breaks on clean install or node_modules rebuild; depends on specific duckdb native binding path
- Fix approach: Track upstream duckdb-node fix or use a more stable monkey-patch approach

**DuckDB `patch-package` Usage:**
- Issue: Patches `duckdb/package.json` to fix binding path (`module_path`, `napi_versions`)
- Files: `patches/duckdb+1.4.4.patch`
- Impact: Must be re-applied after every `pnpm install`; will break if duckdb changes its package structure
- Fix approach: Monitor upstream for NAPI 3 support; consider pinning to a working version

**Mock Data Silent Fallback:**
- Issue: API routes catch errors and return mock data with `X-Data-Warning` header instead of failing with proper error responses
- Files: `src/app/api/crime/stream/route.ts` (lines 155-172), `src/app/api/crimes/range/route.ts`, `src/app/api/stkde/hotspots/route.ts`, `src/app/api/crime/overview/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/adaptive/global/route.ts`, `src/app/api/adaptive/bursts/route.ts`
- Impact: Production errors are silently swallowed; client receives fake data without visible error state; debugging is harder
- Fix approach: Return proper HTTP error codes (500) with structured error responses; let client handle fallback logic explicitly

**`@types/*` Packages in `dependencies` Instead of `devDependencies`:**
- Issue: `@types/d3-brush`, `@types/d3-selection`, `@types/d3-zoom`, `@types/geojson`, `@types/three` are in `dependencies`
- Files: `package.json` (lines 33-36)
- Impact: Unnecessarily increases install size in production; type packages are only needed at build time
- Fix approach: Move all `@types/*` packages to `devDependencies`

**Excessive `eslint-disable` Comments:**
- Issue: 10 explicit `eslint-disable` directives across the codebase, plus file-level rule overrides in `eslint.config.mjs`
- Files: `src/app/stkde/lib/StkdeRouteShell.tsx` (line 200), `src/app/api/crime/stream/route.ts` (line 120), `src/components/viz/DataPoints.tsx` (line 493), `src/components/map/MapHeatmapOverlay.tsx` (line 12), `eslint.config.mjs` (lines 21-51)
- Impact: Masks real type-safety and hook-rules violations; makes it harder to catch genuine issues
- Fix approach: Type the DuckDB callback overloads properly; fix React hook violations instead of disabling rules

**Duplicate Map Libraries (Leaflet + MapLibre + deck.gl):**
- Issue: Three separate mapping libraries are dependencies: `leaflet`/`react-leaflet`, `maplibre-gl`/`react-map-gl`, and `deck.gl`
- Files: `package.json` (lines 57-67, 62-65, 15-16)
- Impact: Increases bundle size; different components use different map backends, creating inconsistent behavior
- Fix approach: Standardize on one map rendering engine; deprecate the others

## Type Safety Issues

**Explicit `any` Types in Production Code:**
- Files: `src/components/viz/shaders/ghosting.ts` (line 15 — `shader: any`), `src/components/viz/DataPoints.tsx` (line 493 — `shader: any`), `src/components/viz/Trajectory.tsx` (lines 80, 144, 153 — `_state: any`, `e: any`), `src/components/viz/TrajectoryLayer.tsx` (line 38 — `points: any[]`)
- Impact: Defeats TypeScript's type checking in critical visualization code; runtime errors possible
- Fix approach: Type shader parameter as `THREE.Shader` or `THREE.WebGLProgramParameters`; use R3F event types for trajectory handlers

**ESLint `no-explicit-any` Disabled Globally for Test Files:**
- Files: `eslint.config.mjs` (lines 15-19)
- Impact: Test files can use `any` freely, reducing test reliability
- Fix approach: Type test mocks properly; use `unknown` instead of `any` where possible

**ESLint `no-explicit-any` Disabled for Specific Components:**
- Files: `src/components/ui/map.tsx` (lines 33-39), `src/components/viz/SimpleCrimePoints.tsx`, `src/components/viz/Trajectory.tsx`, `src/components/viz/TrajectoryLayer.tsx`, `src/components/viz/shaders/ghosting.ts` (lines 42-51)
- Impact: Complex visualization components lack type safety
- Fix approach: Incrementally add proper types; Three.js and R3F have type definitions available

**`skipLibCheck: true` in TypeScript Config:**
- Files: `tsconfig.json` (line 10)
- Impact: Type errors in node_modules (including duckdb, leaflet) are silently ignored
- Fix approach: Enable `skipLibCheck: false` after fixing known type issues; at minimum, verify critical dependencies type-check

## Performance Concerns

**Excessive `useEffect` Usage:**
- Issue: 100+ `useEffect` calls across components, many with complex dependency arrays
- Files: `src/components/ui/map.tsx` (13 effects), `src/app/stkde-3d/components/StkdeSliceStack.tsx` (5 effects), `src/components/dashboard-demo/DemoInspectPanel.tsx` (5 effects), `src/app/dashboard-v2/page.tsx` (6 effects)
- Impact: Complex side-effect chains; hard to reason about execution order; potential for cascading re-renders
- Fix approach: Consolidate related effects; use `useMemo`/`useCallback` more aggressively; consider state machine patterns for complex state transitions

**Large Component Files:**
- Files: `src/components/ui/map.tsx` (1553 lines), `src/app/demo/non-uniform-time-slicing/showcase.tsx` (891 lines), `src/components/timeline/DemoDualTimeline.tsx` (812 lines), `src/app/timeslicing/components/SuggestionPanel.tsx` (765 lines), `src/components/timeline/DualTimeline.tsx` (742 lines), `src/components/dashboard-demo/DemoSlicePanel.tsx` (728 lines)
- Impact: Hard to maintain; difficult to test; high cognitive load
- Fix approach: Extract sub-components, hooks, and utility functions; split into smaller focused modules

**DuckDB Global Singleton with Promise Caching:**
- Issue: DuckDB instance is cached in `globalThis.__quietTigerDuckDb` with a promise-based initialization pattern
- Files: `src/lib/db.ts` (lines 13-16, 151-192)
- Impact: First request blocks on database initialization; subsequent requests reuse the singleton; no connection pooling
- Fix approach: Consider connection pooling for concurrent requests; add initialization timeout

**Shader String Manipulation in `applyGhostingShader`:**
- Issue: GLSL shader code is built via string replacement on template strings — fragile and hard to debug
- Files: `src/components/viz/shaders/ghosting.ts` (lines 48-292)
- Impact: Shader compilation errors are cryptic; no syntax highlighting or type checking for GLSL
- Fix approach: Consider using Three.js shader chunks or a GLSL template system

## Testing Gaps

**Test Coverage Ratio:**
- Total source files: 577
- Total test files: 119
- Coverage ratio: ~20.6% of source files have corresponding tests

**Untested API Route Handlers:**
- `src/app/api/crime/stream/route.ts` — no tests
- `src/app/api/crimes/range/route.ts` — no tests
- `src/app/api/neighbourhood/poi/route.ts` — no tests
- `src/app/api/crime/facets/route.ts` — no tests
- `src/app/api/crime/stats-summary/route.ts` — no tests (has `page.stats.test.ts` but for the stats page, not the API route)
- `src/app/api/adaptive/contextual-baseline/route.ts` — no tests
- `src/app/api/adaptive/bursts/route.ts` — no tests
- Impact: Critical data layer is untested; regressions in query building or DuckDB interactions are undetectable

**No E2E or Integration Tests:**
- No Playwright, Cypress, or similar E2E framework detected
- Impact: Cross-component interactions (cube ↔ map ↔ timeline sync) are untested end-to-end

**Mock Data Tests May Not Reflect Real Behavior:**
- Issue: Most tests use mock data paths; DuckDB-dependent logic may behave differently with real data
- Impact: Tests pass but production breaks
- Fix approach: Add integration tests that exercise the full DuckDB pipeline with a small test dataset

## Code Quality

**Inconsistent Error Handling in API Routes:**
- Issue: Some routes throw errors that bubble up; others catch and return mock data; others catch and return empty arrays
- Files: `src/app/api/crime/stream/route.ts` (returns mock on error), `src/app/api/crime/overview/route.ts` (returns empty array on error), `src/app/api/adaptive/global/route.ts` (returns mock on error)
- Impact: Client code cannot reliably distinguish between "no data" and "error occurred"
- Fix approach: Standardize on returning proper HTTP error responses with structured error bodies

**Commented-Out Code:**
- Issue: Extensive commented-out `console.log` statements across stores
- Files: `src/store/slice-domain/createSliceCoreSlice.ts` (lines 107, 155, 379, 382, 464, 535), `src/store/useDashboardDemoTimeslicingModeStore.ts` (lines 349, 359, 365, 373, 380, 391, 402, 428, 431, 439, 453, 457, 460, 467)
- Impact: Code noise; reduced readability; suggests debugging was not cleaned up
- Fix approach: Remove commented-out debug logs; use the `LoggerService` pattern for structured logging

**Hardcoded Chicago Coordinate Bounds:**
- Issue: Chicago geographic bounds (`-87.9` to `-87.5` lon, `41.6` to `42.1` lat) are hardcoded in multiple files
- Files: `src/lib/duckdb-aggregator.ts` (lines 47, 61-62, 71-73), `src/lib/coordinate-normalization.ts`
- Impact: Cannot adapt to other cities without code changes; values duplicated across files
- Fix approach: Centralize bounds in a single config constant; reference from all files

**Hardcoded Time Constants:**
- Issue: Unix epoch constants (`978307200` for 2001-01-01, `1767225600` for 2026-01-01) are hardcoded in multiple query files
- Files: `src/lib/duckdb-aggregator.ts` (lines 61-62), `src/lib/queries/aggregations.ts` (lines 215-216)
- Impact: Must be updated when dataset date range changes
- Fix approach: Derive bounds from dataset metadata at query time

## Scalability Risks

**Single-Threaded DuckDB with 2 Thread Limit:**
- Issue: DuckDB is configured with `threads=2` by default
- Files: `src/lib/db.ts` (line 19 — `DEFAULT_DUCKDB_THREADS = '2'`)
- Impact: Query performance degrades with large datasets (8.5M+ crime records); concurrent requests serialize on the single DuckDB instance
- Fix approach: Increase thread count for production; consider read replicas or connection pooling

**No Request Rate Limiting on API Routes:**
- Issue: API routes have no rate limiting or request queuing
- Files: All routes under `src/app/api/`
- Impact: Concurrent requests can exhaust DuckDB resources or memory
- Fix approach: Add request queuing middleware; limit concurrent DuckDB queries

**In-Memory Data Materialization:**
- Issue: `ensureSummaryMaterialization` creates and populates DuckDB tables on first request
- Files: `src/lib/db.ts` (lines 246-327)
- Impact: First request after startup takes significantly longer; blocks all other requests
- Fix approach: Run materialization at startup (e.g., in a serverless cold start or dedicated init script)

**Global DuckDB Instance Without Connection Limits:**
- Issue: Single `globalThis.__quietTigerDuckDb` instance shared across all API route handlers
- Files: `src/lib/db.ts` (lines 13-16, 151-192)
- Impact: Under high concurrency, DuckDB may run out of memory or file descriptors
- Fix approach: Implement connection pooling or semaphore-based query limiting

## Dependencies at Risk

**`patch-package` for `duckdb`:**
- Risk: Patch modifies duckdb's `package.json` to fix NAPI binding paths; will break if duckdb updates its packaging
- Impact: Build fails after `pnpm install` until patch is updated
- Migration plan: Monitor duckdb releases for NAPI 3 support; consider forking duckdb or using `@duckdb/duckdb-wasm` as alternative

**`react-leaflet-markercluster` (Release Candidate):**
- Risk: Using `5.0.0-rc.0` — a release candidate, not a stable version
- Files: `package.json` (line 75)
- Impact: May have undocumented breaking changes or bugs
- Migration plan: Pin to a stable version or find alternative clustering solution

**Multiple D3 Package Versions:**
- Risk: Mix of D3 v3 (`d3-selection`, `d3-zoom`, `d3-brush`) and D4+ (`d3-array`, `d3-scale`, `d3-time`) packages
- Files: `package.json` (lines 50-55)
- Impact: Inconsistent APIs; potential bundle bloat from duplicate utilities
- Migration plan: Standardize on D3 v7 for all D3 dependencies

---

*Concerns audit: 2026-07-14*

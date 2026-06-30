# Codebase Concerns

**Analysis Date:** 2026-06-27

## Tech Debt

### Synthetic data drift between TypeScript and Python implementations

- Issue: The Goh-Barabási generator is implemented twice — `src/lib/synthetic/goh-barabasi.ts` (TypeScript) and `scripts/synthetic/generate_bursty.py` (Python). Both must agree on CHICAGO bounds, `ACTIVE_TYPES`, `CHICAGO_TYPE_WEIGHTS`, per-type alpha profiles, IET cap (30 days), CSV column order, and PRNG state. The two are connected only by code comments and visual review — there is no test that compares their output byte-for-byte.
- Files: `src/lib/synthetic/goh-barabasi.ts`, `scripts/synthetic/generate_bursty.py`, `src/lib/synthetic/csv-export.ts`
- Impact: If a constant is updated on one side and not the other, the Python output will not match the TS output for the same seed, and downstream evaluation/ground-truth pipelines will silently disagree.
- Fix approach: Add a small cross-language parity test (Vitest for TS, stdlib unittest for Python) that hashes `(first event timestamp, first event type, B metric)` for seed=42 and 2000 events. Expose it via a shared `npm run` / `python -m unittest` target. Alternatively, drop the Python implementation and call the TS via `npx tsx scripts/synthetic/...`.

### Type key normalization is implicit and fragile

- Issue: `goh-barabasi.ts` does `type.replace(/ /g, '_')` to look up `CHICAGO_TYPE_WEIGHTS`. The Python script docstring claims "underscores in place of spaces and hyphens" but the code only replaces spaces. A new type name containing a hyphen would silently get the 0.001 fallback.
- Files: `src/lib/synthetic/goh-barabasi.ts:80-82`, `scripts/synthetic/generate_bursty.py:80-116,206-208`
- Impact: New crime types added to `CRIME_TYPE_MAP` (uppercase) with hyphens would get effectively-zero weight, making the type never fire under `weighted` strategy.
- Fix approach: Either normalize the keys in both files via a single shared function, or assert that the resolved weight is above a floor for every active type.

### Mock data generators are inline and divergent

- Issue: At least six API routes carry their own private `generateMockData` / `generateMockBins` / `generateMockCrimes` / `generateMockBurstBin` helpers (`src/app/api/crime/stream/route.ts:11`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/around/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/adaptive/bursts/route.ts:121`, `src/lib/duckdb-aggregator.ts:15`). They use `Math.random()` (non-deterministic), pick from inconsistent crime-type pools, and produce different distributions for the same query parameters. There's also `useTimelineDataStore.generateMockData()` and a separate `MOCK_HOTSPOTS` list with `MOTOR_VEHICLE_THEFT` and `MOTOR VEHICLE THEFT` keys in the same array (line 54).
- Files: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/around/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/adaptive/bursts/route.ts`, `src/lib/duckdb-aggregator.ts`, `src/lib/queries.ts:32-58`, `src/store/useTimelineDataStore.ts`
- Impact: When `USE_MOCK_DATA=true`, identical requests return different answers on different runs and different endpoints return divergent mock distributions. Developers accidentally leave the flag on, see inconsistent UI, and either ship it or spend time debugging the wrong layer. Study-mode demos become non-reproducible.
- Fix approach: Replace the per-route helpers with a single seeded mock factory (use the same `createSeededRandom` from `src/lib/synthetic/prng.ts`) keyed on request parameters, and consolidate the crime-type/district pools in `src/lib/mock-data.ts`. Add an `X-Data-Warning` header to every mock response — currently only some routes emit it (`stream`, `meta`).

### String-interpolated SQL in duckdb-aggregator

- Issue: `src/lib/duckdb-aggregator.ts:48-66` builds the WHERE clause via template-literal interpolation of `types` and `districts` (no parameter binding). `src/lib/db.ts:376,379` (`readOverviewBins`) and `src/lib/queries.ts:51-57` apply the same pattern. The `crimes_sorted` table itself is created via `read_csv_auto('${dataPath}')` string interpolation in `db.ts:224` and used in `stream/route.ts:112` and `duckdb-aggregator.ts:75`.
- Files: `src/lib/duckdb-aggregator.ts`, `src/lib/db.ts`, `src/lib/queries.ts`, `src/app/api/crime/stream/route.ts`
- Impact: Not directly user-exploitable (these values come from internal filter store, not raw request input), but the pattern is unsafe by default — adding a new caller that reads a user-controlled string would silently inject SQL. A filter with a single quote would currently break.
- Fix approach: Migrate to the parameterized query builder used in `src/lib/queries/builders.ts` and `filters.ts` (which already do it correctly).

### Web Worker return path does not use transferables

- Issue: `src/workers/adaptiveTime.worker.ts:246` calls `self.postMessage({ requestId, ...maps })` with no transfer list. The four output `Float32Array` maps (~16KB total) are copied via structured clone on every response.
- Files: `src/workers/adaptiveTime.worker.ts:242-247`, `src/store/useAdaptiveStore.ts:60-78`
- Impact: Modest (16KB) per response, but combined with the postMessage happening on a singleton worker that's reused for every user interaction, the structured-clone cost shows up in micro-benchmarks. Already documented in `.planning/codebase/WEBWORKER_MEMORY_AUDIT.md` as Concern #2.
- Fix approach: Pass `[densityMap.buffer, burstinessMap.buffer, warpMap.buffer, countMap.buffer]` as the second arg to `self.postMessage`.

### Workers never terminated; singleton created at module import

- Issue: `useAdaptiveStore.ts:52-55` creates the adaptive worker at module load time. `useStkdeStore.ts` and the KDE slice worker follow the same pattern. No `worker.terminate()` is ever called.
- Files: `src/store/useAdaptiveStore.ts:49-55`, `src/workers/`
- Impact: A single-page prototype, so the leak is invisible in practice. Becomes a problem if a future change mounts/unmounts the store on route changes (e.g., lazy-loading routes), or if HMR accumulates workers in dev.
- Fix approach: Track workers in a `useEffect` cleanup and terminate on unmount, or document the assumption in the store JSDoc.

### No automatic columnar downsampling in render pipeline

- Issue: `src/lib/downsample.ts` provides `downsampleByStride` for `ColumnarData`, but the 3D pipeline uploads the full 8.5M-row `ColumnarData` to the GPU via `InstancedMesh` attributes unconditionally. No LOD-based downsample is applied based on camera distance.
- Files: `src/lib/downsample.ts`, `src/components/viz/DataPoints.tsx`, `src/store/useTimelineDataStore.ts`
- Impact: Memory pressure on mid-range GPUs; frame-time spikes when the user pans over dense regions. Already flagged in `.planning/codebase/WEBWORKER_MEMORY_AUDIT.md` (memory section) and acknowledged in `.planning/STATE.md` as the Phase 81 driver.
- Fix approach: Schedule as Phase 81 ("Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries...").

### HeatmapOverlay scene/camera never disposed

- Issue: `src/components/viz/HeatmapOverlay.tsx` creates `aggregationScene` and `aggregationCamera` once via `useMemo` and holds them for the component lifetime with no explicit `dispose()`. `aggregationMaterial` and `heatmapMaterial` rely on Three.js's own GC.
- Files: `src/components/viz/HeatmapOverlay.tsx`, `src/components/viz/DataPoints.tsx:155-159` (correct pattern for comparison)
- Impact: Memory leak on HMR / route changes; in production the component is mostly mounted, so it's a slow leak rather than an immediate issue.
- Fix approach: Add a `useEffect` cleanup that calls `aggregationMaterial?.dispose()`, `heatmapMaterial?.dispose()`, plus a `THREE.Scene` clear pass.

## Known Bugs

### `isComputing` flag can flicker when switching densityScope

- Symptom: `setDensityScope` increments `activeRequestId` and immediately sets `isComputing: false`, even if a worker is still running on the old scope.
- Files: `src/store/useAdaptiveStore.ts:111-114`
- Trigger: Rapid toggling between `viewport` and `global` density scopes.
- Workaround: None currently; consumers can use `activeRequestId` to detect freshness.
- Fix approach: Only clear `isComputing` when the worker response for the new requestId arrives.

### `ensureSummaryMaterialization` blocks the first API request

- Symptom: First call to `/api/crime/meta` (or any route that touches `readDatasetMetadata` / `readOverviewBins`) takes 30-90 seconds because DuckDB is scanning the 2.2GB CSV to build `crimes_sorted` and the overview bins table. Subsequent calls are fast (fingerprint check short-circuits).
- Files: `src/lib/db.ts:243-324`, especially `ensureSummaryMaterialization` and the `CREATE TABLE crimes_sorted AS SELECT * FROM read_csv_auto(...)` at line 222
- Trigger: First request after a fresh `data/cache/crime.duckdb` is deleted, or after the source CSV is replaced.
- Workaround: Run a warm-up script on dev-server start (none currently exists).
- Fix approach: Pre-materialize `crimes_sorted` in a `predev` / `prebuild` script, or stream the materialization as a background job and return a 202 Accepted while it's running.

### `db.ts:204` queries `sqlite_master` from DuckDB

- Symptom: `ensureSortedCrimesTable` checks `SELECT name FROM sqlite_master WHERE type='table' AND name='crimes_sorted'`. DuckDB emulates this table, but its behavior is best-effort. If the emulation is ever removed or the schema is altered, this check silently returns no rows and falls into the slow re-create path.
- Files: `src/lib/db.ts:198-241`
- Impact: A future DuckDB update could double the materialization cost.
- Fix approach: Use `SELECT 1 FROM duckdb_tables() WHERE table_name = 'crimes_sorted'` (the DuckDB-native equivalent) or store the existence flag in a `crime_dataset_state` row that's already being written.

### `useTimelineDataStore.generateMockData` produces no spatial structure

- Symptom: When DuckDB is disabled, `useTimelineDataStore.generateMockData()` produces uniform random points within the Chicago bounding box. Adaptive scaling and STKDE features that depend on burstiness or clustering will show flat signals.
- Files: `src/store/useTimelineDataStore.ts:181` (referenced via `set({ isLoading: false, isMock: true })`), `src/lib/queries.ts:32-58` (MOCK_HOTSPOTS)
- Impact: Devs running with `USE_MOCK_DATA=true` and testing adaptive scaling see no signal changes — the warp map looks linear regardless of slider.
- Fix approach: Route mock data through `generateBurstySequence` (default seed) so dev sessions reproduce the documented "burstiness-driven" UX. Caveat: this would slow first-paint by ~50-200ms for 10k events.

## Security Considerations

### Single env var controls both fallbacks and is checkable via header

- Risk: `USE_MOCK_DATA` and `DISABLE_DUCKDB` both flip `isMockDataEnabled()` to true. If either is accidentally set in `.env` (currently `.env` contains only `USE_MOCK_DATA=false`), the entire API surface returns synthetic data. There's no startup log that loudly announces "RUNNING IN MOCK MODE".
- Files: `src/lib/db.ts:38-44`, `.env`
- Current mitigation: UI shows an "isMock" badge in `TopBar.tsx:47` and `SandboxContextPanel.tsx:58`. Not shown on the public `/api/crime/...` routes, only the `/api/crime/meta` route returns `isMock: true` in its body.
- Recommendations: (1) Add a startup `console.warn` when mock mode is active. (2) Make `mock-data` mode opt-in only at build time (or require a positive boolean env, not a missing-env fallback). (3) Add a top-banner on every page that renders in mock mode (currently only some pages check `isMock`).

### Path alias `@/*` is configured in three places, must stay in sync

- Risk: `tsconfig.json:22`, `vitest.config.mts:13-15`, and the implicit Next.js default. If someone migrates to a monorepo or adds `tsconfig.json` per-package, the alias can drift between Next.js (which uses tsconfig.json paths) and Vitest (which has its own resolve.alias).
- Files: `tsconfig.json`, `vitest.config.mts`
- Current mitigation: Both currently point to `./src/*`.
- Recommendations: Add a Vitest check that asserts the alias is non-empty, or move to a single `tsconfig-paths` package that both consumers read.

### patch-package symlink in `postinstall` is fragile

- Risk: `package.json:12` runs `patch-package && mkdir -p node_modules/duckdb/lib/binding/3 && ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node`. The patch (`patches/duckdb+1.4.4.patch`) modifies the duckdb `package.json` to add `napi_versions: [3]`. If duckdb is bumped to a version where NAPI 3 is the default and the upstream `package.json` no longer needs the patch, the symlink creation runs anyway and may link a missing file. If the upstream is ever distributed with `napi_build_version` already 3, the patch is a no-op but the symlink step still runs.
- Files: `package.json:12`, `patches/duckdb+1.4.4.patch`
- Current mitigation: None — silent failure on pnpm install.
- Recommendations: Add a `postinstall` guard: skip the symlink step if `node_modules/duckdb/lib/binding/3/duckdb.node` already exists. Add a smoke test that `pnpm install && pnpm dev` works clean.

### 8.5M-row CSV re-parsed on every stream request

- Risk: `src/app/api/crime/stream/route.ts:103-115` uses `read_csv_auto('${dataPath}')` against the 2.2GB CSV on every request, not against the materialized `crimes_sorted` table. Each request re-parses 8.5M rows. This is by design (so stream doesn't depend on the materialization step), but it means the first request is slow and the route is fragile if `data/sources/Crimes_-_2001_to_Present_20260114.csv` is missing.
- Files: `src/app/api/crime/stream/route.ts:103-115`, `src/lib/duckdb-aggregator.ts:75` (same pattern)
- Current mitigation: `getDataPath()` returns the literal filename; if the file is missing, `getDb()` succeeds but the query throws and the route falls through to mock data.
- Recommendations: Migrate the stream query to read from `crimes_sorted` and add a fast-path that filters by date first, then samples, then materializes.

## Performance Bottlenecks

### `ensureSummaryMaterialization` reads 8.5M rows synchronously

- Problem: On cold cache, `read_csv_auto` of the 2.2GB CSV into `crimes_sorted` (line 222-227 of `db.ts`) plus the `crime_overview_bins_medium` `NTILE(120) OVER (ORDER BY "Date")` window (line 296-316) takes 30-90s on a dev machine. All API routes that call `readDatasetMetadata` or `readOverviewBins` wait for this.
- Files: `src/lib/db.ts:198-324`
- Cause: Single-threaded, single-pass, no progress reporting, no cancellation.
- Improvement path: Run materialization as a background `next dev` warm-up step. Add a "warming up" status page. Cache the CSV fingerprint hash so subsequent boots are instant.

### Singleton DuckDB instance is the only concurrency model

- Problem: `globalThis.__quietTigerDuckDb` is a single database connection. Concurrent API requests share it. DuckDB itself is thread-safe, but the node-pre-gyp binding serializes query execution. Heavy queries (overview, STKDE) block the event loop.
- Files: `src/lib/db.ts:148-189`
- Cause: Single connection, no pool, no query queue.
- Improvement path: Use `duckdb-async` (a promise wrapper) and a connection pool, or move all heavy computation into a dedicated worker process that streams results back via a queue. For the current 8.5M-row scale the current model is fine; will become a bottleneck when adding per-district adaptive cache precomputation (already partially done via `adaptive_global_cache`).

### `computeRollingBurstiness` recomputes over the full event array per call

- Problem: `src/lib/synthetic/goh-barabasi.ts:246-299` iterates over `sorted` once per window, but also re-sorts `events` via `[...events].sort(...)` on every call. For 100k events this is fine, but if it's called multiple times (e.g., per-page rendering), it re-allocates a full copy and re-sorts.
- Files: `src/lib/synthetic/goh-barabasi.ts:246-299`
- Improvement path: For the API endpoint, sort once on the way in (the route already has `numEvents` in URL params), or memoize on a (events-hash, window) key.

## Fragile Areas

### Pre-aggregated overview table rebuild triggered by CSV fingerprint change

- Files: `src/lib/db.ts:54-62,243-324`
- Why fragile: A new download of the source CSV (timestamp 20260114 → 20260301) will change `mtimeMs` and trigger a full rebuild, but the dev server will not surface this — it will just start hanging on the next overview call.
- Safe modification: Always read `currentFingerprint` first; surface the build state via a `/api/crime/meta?buildStatus=1` endpoint or a startup log.
- Test coverage: `src/app/api/crime/overview/route.test.ts` mocks the query layer, so the actual materialization is untested.

### Mock-data fallback path bypasses query sanitization

- Files: `src/app/api/crime/stream/route.ts:51-65,159-171`, `src/app/api/crime/bins/route.ts:45-93`, `src/app/api/adaptive/bursts/route.ts:157-159`
- Why fragile: When `isMockDataEnabled()` is true, the `buildCrimesInRangeQuery` / `buildCrimeCountQuery` parameter builders are not exercised. A regression in the query builder would only be caught by integration tests, which there are none of.
- Safe modification: Run a single integration test against a real DuckDB instance (currently the test suite mocks the entire `db` module, see `src/app/api/crime/overview/route.test.ts:5-13`).
- Test coverage: Gaps — no test runs against an actual `.duckdb` file.

### Synthetic CSV column schema is duplicated in three files

- Files: `src/lib/synthetic/csv-export.ts:12-22`, `scripts/synthetic/generate_bursty.py:169-179`, `src/types/crime.ts`
- Why fragile: Adding a new field to `CrimeRecord` requires a coordinated edit in all three, plus the `escapeField` rules, plus the Python `write_events_csv` writer. Easy to miss one.
- Safe modification: Generate the column list from `CrimeRecord` keys (TypeScript side) and a shared JSON schema (Python side).
- Test coverage: `goh-barabasi.test.ts:288-320` and `test_generate_bursty.py:331-376` lock the header strings, but they assert the literal string. If the header string changes, the assertion fails and the test must be updated in lock-step.

### Singleton workers (adaptive, KDE, STKDE) on `useXStore` modules

- Files: `src/store/useAdaptiveStore.ts:49-55`, `src/store/useStkdeStore.ts`, `src/store/...` (KDE slice worker)
- Why fragile: HMR re-evaluates the module, may create a new worker, the old one is leaked. In production this is fine; in dev it accumulates per save.
- Safe modification: Move worker creation into a `useEffect` inside a top-level component, or wrap in a HMR-aware `import.meta.hot?.dispose()`.
- Test coverage: `src/workers/adaptiveTime.worker.test.ts` tests the pure function in isolation; no test exercises the worker boundary.

## Scaling Limits

### Bursty API endpoint cap at 100k events per request

- Current capacity: 100,000 events per `GET /api/synthetic/bursty` call (`MAX_EVENTS` constant in `src/app/api/synthetic/bursty/route.ts:27`). Response includes the full event array, rolling-burstiness series, and global metrics.
- Limit: Response body is roughly `100k × ~200 bytes = 20MB` JSON. At 100k events the route takes ~1-2s on a developer laptop and is borderline for a default 30s timeout.
- Scaling path: Stream events as JSONL (newline-delimited), drop the rolling-burstiness series from the response (clients can recompute), or use the Python script (`scripts/synthetic/generate_bursty.py --count N`) for bulk generation. The Python script has a matching `--max-count 100000` default for symmetry.

### Web Worker memory ceiling for adaptive compute

- Current capacity: Adaptive worker holds a `Float32Array` of timestamps (8.5M × 4B = 34MB at full dataset), plus 4 output maps (16KB) plus temporaries (~50KB). Per the `WEBWORKER_MEMORY_AUDIT.md`, the per-run allocation is bounded and won't OOM the worker on a normal browser tab.
- Limit: Browsers cap a single WebWorker at ~1-2GB heap depending on the engine. A user who loads the full 8.5M-row dataset AND keeps the adaptive worker running AND triggers multiple `computeMaps` calls (each posting 34MB) could OOM Chrome on a 4GB device.
- Scaling path: The `src/lib/downsample.ts` `downsampleByStride` is the documented mitigation (see WEBWORKER_MEMORY_AUDIT.md recommendation #4). Implementation deferred to Phase 81 per `.planning/STATE.md`.

## Dependencies at Risk

### `duckdb@1.4.4` patched via patch-package

- Risk: The patch (`patches/duckdb+1.4.4.patch`) modifies duckdb's `package.json` to add `napi_versions: [3]`. The postinstall step then symlinks the binary into the expected `binding/3` directory. If a security advisory lands on duckdb@1.4.4 and the user bumps to 1.4.5, the patch may not apply cleanly (the surrounding `package.json` may have changed), and the dev server will fail to start with a confusing "Cannot find module duckdb.node" error.
- Files: `patches/duckdb+1.4.4.patch`, `package.json:12`
- Impact: Bumping duckdb becomes a multi-hour forensic exercise.
- Migration plan: Track upstream `duckdb-node` issue about NAPI build path resolution. When fixed, drop the patch and the symlink step in one commit.

### `patch-package` itself is unmaintained-feeling

- Risk: `patch-package` has had low release cadence. If it breaks under a future pnpm major, the `postinstall` hook will fail and `pnpm install` will exit non-zero.
- Files: `package.json:12`
- Impact: New contributors can't bootstrap the project without manual intervention.
- Migration plan: Monitor for `pnpm patch` (built-in) support for the same workflow. Document a `pnpm install --ignore-scripts` workaround as a temporary escape hatch.

## Missing Critical Features

### No integration tests against real DuckDB

- Problem: The full Vitest suite mocks the `db` module (`src/lib/crime-api.test.ts:14-19`, `src/app/api/crime/overview/route.test.ts:5-13`, `src/app/api/crime/meta/route.test.ts:5-12`, `src/app/api/crimes/range/route.test.ts:7-13`, `src/app/api/study/log/route.test.ts:99-102`). This means the SQL builders, fingerprint logic, and materialization are exercised only by hand.
- Impact: A regression in `buildCrimesInRangeQuery` or `ensureSummaryMaterialization` would only be caught by a user hitting the dev server.
- Block: Need a way to spin up a sandboxed DuckDB in CI without committing a 1GB `.duckdb` file. Options: download a fixture CSV in `pretest`, or commit a tiny (1k row) fixture CSV and run real queries against it.

### No tests for synthetic generator cross-language parity

- Problem: The Python and TypeScript generators can produce different output for the same seed if any constant drifts.
- Impact: A constant change in `src/lib/synthetic/goh-barabasi.ts` that doesn't propagate to `scripts/synthetic/generate_bursty.py` will silently break the offline ground-truth pipeline.
- Fix approach: Add a small `npm run parity-test` that runs both with seed=42, 1000 events, and compares the first 10 event timestamps and types.

## Test Coverage Gaps

### Pre-existing test failures (~6 unrelated, as of last run)

- What's not tested: As of the most recent test run noted in the project context (528 pass / 6 pre-existing unrelated failures), 6 tests fail. They are unrelated to the synthetic generator and duckdb mock paths. Likely candidates are the adaptive store contract tests and the timeslicing mode tests that depend on `jsdom` and `react-test-renderer` 19.x — both have known compat issues with React 19.2.7.
- Files: `src/store/useAdaptiveStore.contract.test.ts`, `src/store/useDashboardDemoTimeslicingModeStore.persist.test.ts`, and the remaining shell-style tests around `src/app/dashboard-demo/page.shell.test.tsx` / STKDE route coverage
- Risk: A regression in those modules would land without test signal. The 6 failing tests are noise that masks real new failures.
- Priority: Medium. Recommend either fixing the 6 or marking them as `.skip` with a comment so the test count is honest.

### Web Worker boundaries are not tested

- What's not tested: The `adaptiveTime.worker.ts`, `kdeSlice.worker.ts`, and `stkdeHotspot.worker.ts` workers are tested in isolation as pure functions (`adaptiveTime.worker.test.ts`, `stkdeHotspot.worker.test.ts`). The actual `postMessage` boundary (request/response ID matching, stale response dropping, transfer-list behavior) is not covered.
- Files: `src/workers/`, `src/store/useAdaptiveStore.ts:60-78`
- Risk: A refactor that breaks the requestId handshake would land without test signal.
- Priority: Low — the pattern is short and the test count is high.

### Mock-data branch of every API route is not tested

- What's not tested: The `if (isMockDataEnabled()) return generateMockData(...)` branch of every crime API route. Tests cover the DuckDB path (via mock) and the catch-all path that falls back to mock on error, but not the `isMockDataEnabled() === true` happy path.
- Files: `src/app/api/crime/stream/route.ts:51-65`, `src/app/api/crime/bins/route.ts:45-93`, `src/app/api/crime/around/route.ts:64-72`, `src/app/api/adaptive/bursts/route.ts:157-159`
- Risk: Mock generators are duplicated inline (see "Mock data generators are inline and divergent" above) and have drifted.
- Priority: High for the consistency issue, low for the test gap itself.

### Python generator end-to-end CLI is not covered

- What's not tested: `scripts/synthetic/test_generate_bursty.py` covers the helper functions and the pure generator, but does not exercise `main()` itself. The CLI argument parsing, file output paths, summary JSON on stdout, and `--max-count` clamping are untested.
- Files: `scripts/synthetic/generate_bursty.py:511-659`
- Risk: A refactor of `main()` (e.g., adding a new flag) could silently break the file-naming convention.
- Priority: Low — the CLI is dev-only tooling, not part of the user-facing app.

## Confirmed Non-Issues (for the next planner)

These were raised as concerns but verified to be safe:

- **IET cap at 30 days** (`src/lib/synthetic/goh-barabasi.ts:153-159`, `scripts/synthetic/generate_bursty.py:160-162`): Deliberate trade-off, documented in JSDoc. Both implementations use the same `IET_CAP_SEC = 30 * 24 * 60 * 60`. Not a bug.
- **Python script is stdlib-only** (`scripts/synthetic/generate_bursty.py:57-63`, `scripts/synthetic/test_generate_bursty.py:10-15`): Verified — only `argparse`, `csv`, `json`, `math`, `os`, `sys`, `datetime`, `tempfile`, `unittest`. No hidden dependencies.
- **`createSeededRandom` LCG parity** (`src/lib/synthetic/prng.ts:10-16`, `scripts/synthetic/generate_bursty.py:214-222`): Both implement the Lehmer / Park-Miller LCG with the same constants (1664525, 1013904223) and the same 32-bit truncation. Float-rounding differences are expected and noted in the Python docstring.
- **Bursty endpoint cap at 100k** (`src/app/api/synthetic/bursty/route.ts:27`): Documented in route JSDoc, mirrors the Python script's `--max-count 100000` default. No concurrency protection, but the route is stateless and Node.js handles connection concurrency.
- **Web Worker memory** (`.planning/codebase/WEBWORKER_MEMORY_AUDIT.md`): Already audited on 2026-06-25. Current allocations are within browser limits; the main remaining item (downsampling) is scheduled as Phase 81.
- **`@/*` path alias** (`tsconfig.json:22`, `vitest.config.mts:13-15`): Both currently aligned on `./src/*`. No drift detected.

---

*Concerns audit: 2026-06-27*

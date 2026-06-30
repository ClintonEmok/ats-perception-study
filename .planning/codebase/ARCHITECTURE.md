# Architecture

**Analysis Date:** 2026-06-27

## Pattern Overview

**Overall:** Client-heavy Next.js 16 App Router SPA with a server-side DuckDB/Arrow data layer and a Web Worker compute layer. The frontend is a *coordinated multi-view visualization*: three independent views (2D MapLibre map, 3D R3F cube, dual visx timeline) are kept synchronized through a shared Zustand coordination store, while a separate slice-domain store owns the editable time-slices that all three views react to.

**Key Characteristics:**

- **App Router pages as shells.** Each `src/app/<route>/page.tsx` is a thin composition of feature components — most logic lives in `src/components/` and `src/lib/`. Pages rarely own data fetching directly.
- **Server route handlers own the data plane.** All crime data, STKDE, adaptive scaling, and synthetic generation flow through Next.js Route Handlers under `src/app/api/`. The handlers always return JSON (or Arrow IPC for the stream endpoint) and fall back to mock data on DuckDB failure with an `X-Data-Warning` header.
- **Zustand slices, not Redux.** Global state is split into ~25 small Zustand stores; the most complex one (`useSliceDomainStore`) uses a four-slice composition pattern (`src/store/slice-domain/`) and is `persist`-ed to local storage.
- **Pure-function lib for analytics.** All heavy math lives in `src/lib/` (binning, stkde, adaptive, interval detection, synthetic generator) so the same code can run on the server (in route handlers), in Web Workers, and in client stores.
- **Web Workers for client-side heavy work.** Adaptive time scaling and STKDE hotspot projection run in dedicated Web Workers (`src/workers/`), instantiated lazily by stores.
- **Synthetic data has a sibling Python implementation.** `src/lib/synthetic/` (TypeScript) and `scripts/synthetic/` (Python) implement the same Goh-Barabási bursty generator for cross-language validation against the adaptive scaling algorithm.

## Layers

**Routes (pages):**
- Purpose: Composes feature components into a view.
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, route-local `components/`, `hooks/`, `lib/`
- Depends on: Components, stores, hooks
- Used by: Browser

**API Routes (server):**
- Purpose: Server-side data access (DuckDB), heavy compute, synthetic data generation, study log ingestion.
- Location: `src/app/api/`
- Contains: Route Handlers (`route.ts`) per resource, organized by domain (`crime/`, `stkde/`, `adaptive/`, `synthetic/`, `crimes/`, `neighbourhood/`, `study/`, `evaluation/`)
- Depends on: `src/lib/db.ts`, `src/lib/synthetic/`, `src/lib/queries/`, `src/lib/stkde/`, `src/lib/adaptive/`, `src/lib/study/`
- Used by: Client hooks (`useCrimeData`, `useAdaptiveScale`, etc.) and dashboards

**Components (UI):**
- Purpose: React UI for views, overlays, controls, and reusable primitives.
- Location: `src/components/`
- Contains: Feature folders (`dashboard/`, `dashboard-demo/`, `map/`, `timeline/`, `viz/`, `stkde/`, `binning/`, `layout/`, `onboarding/`, `study/`, `settings/`, `evaluation/`) and shared `ui/` (shadcn primitives).
- Depends on: Stores, hooks, lib utilities, `@/types/`
- Used by: Pages

**Stores (client state):**
- Purpose: Cross-component UI state, persisted user state, slice domain, adaptive settings, study progress.
- Location: `src/store/`
- Contains: ~25 Zustand stores. The slice domain uses a subfolder pattern under `src/store/slice-domain/`.
- Depends on: Types, lib utilities, workers
- Used by: Components, hooks, route handlers (server-side data prep)

**Hooks (client orchestration):**
- Purpose: Glue between components, stores, and API routes. TanStack Query wrappers and worker spawners live here.
- Location: `src/hooks/`
- Contains: `useCrimeData`, `useCrimeStream`, `useAdaptiveScale`, `useDebouncedDensity`, `useViewportCrimeData`, `useSuggestionGenerator`, `useHotspotEvolution`, `useSelectionSync`, `useLogger`, `useMeasure`, etc.
- Depends on: `@tanstack/react-query`, stores, API routes, types
- Used by: Components

**Lib (pure logic + server-side DB):**
- Purpose: Domain logic, query building, DuckDB access, synthetic generation, math, geometry, logging.
- Location: `src/lib/`
- Contains: `db.ts` (DuckDB), `synthetic/` (Goh-Barabási generator), `queries/` (SQL builders), `binning/` (time bin engine + warp scaling), `stkde/` (hotspot pipeline), `adaptive/` (route-mode resolution), `interval-detection.ts`, `confidence-scoring.ts`, `full-auto-orchestrator.ts`, `coordinate-normalization.ts`, `date-normalization.ts`, `logger.ts`, plus math/formatting utilities.
- Depends on: Types, `duckdb`, `apache-arrow`
- Used by: API routes, stores, workers, components

**Workers (off-main-thread compute):**
- Purpose: Heavy numeric compute that would otherwise block the UI thread.
- Location: `src/workers/`
- Contains: `adaptiveTime.worker.ts` (density/burstiness/warp map computation), `stkdeHotspot.worker.ts` (post-filter + project hotspot rows), `kdeSlice.worker.ts`.
- Depends on: Lib utilities
- Used by: Stores via `new Worker(new URL('../workers/<x>.worker.ts', import.meta.url))`

**Types:**
- Purpose: Single source of truth for shared data shapes.
- Location: `src/types/`
- Contains: `crime.ts` (canonical `CrimeRecord`), `autoProposalSet.ts`, `adaptive.ts`, `data.ts`, `suggestion.ts`.
- Depends on: None
- Used by: All layers

**Synthetic sibling (Python):**
- Purpose: Cross-language reference implementation and ground-truth generator.
- Location: `scripts/synthetic/` (`generate_bursty.py`, `test_generate_bursty.py`)
- Depends on: numpy, scipy
- Used by: External validation against the TS generator; produces CSV consumed by `scripts/verify_showcase_windows.py` etc.

## Data Flow

**1. Crime range query (most common path):**

1. User pans/zooms the map or drags the timeline brush. `useCoordinationStore` records `lastInteractionAt` and `brushRange`.
2. `useCrimeData` (TanStack Query) at `src/hooks/useCrimeData.ts` paginates against `/api/crimes/range?startEpoch&endEpoch&bufferDays&crimeTypes&districts&pageSize&cursor`.
3. `src/app/api/crimes/range/route.ts` calls `getDb()` from `src/lib/db.ts`, which lazily initializes a singleton DuckDB at `data/cache/crime.duckdb` from the CSV at `data/sources/Crimes_-_2001_to_Present_20260114.csv` (~2.2 GB).
4. `src/lib/queries/builders.ts` builds parameterized SQL (with `sanitizeTableName` allowlist) and executes it.
5. Rows are normalized to `CrimeRecord` (lat/lon → `x`/`z` in [-50, +50] via `coordinate-normalization.ts`).
6. Response streams back as JSON paginated by cursor; TanStack Query dedupes and caches with a 5-minute `staleTime` set in `src/providers/QueryProvider.tsx`.
7. Consumers (`MapEventLayer`, `CubeVisualization/DataPoints`, `DualTimeline`) read from the hook's result; they do not re-fetch independently.

**2. Adaptive scaling (worker path):**

1. `useAdaptiveStore` (`src/store/useAdaptiveStore.ts`) instantiates `adaptiveTime.worker.ts` at module load.
2. The store posts a `WorkerInput` payload (`{ requestId, timestamps: Float32Array, domain, config }`) to the worker.
3. The worker (`src/workers/adaptiveTime.worker.ts`) computes density, burstiness, and warp maps with `binCount`, `kernelWidth`, and `binningMode` (`uniform-time` | `uniform-events`).
4. The store receives `WorkerOutput` and sets `densityMap`, `burstinessMap`, `warpMap`, `countMap` on the global state. The `mapDomain` field is the canonical "what time range am I scaling for" reference.
5. `useSliceStore` / `useAutoBurstSlices` react to new burst windows and call `addBurstSlice` on the slice domain.

**3. STKDE (server + worker):**

1. A request hits `/api/stkde/hotspots?mode=...` (server route).
2. The server route runs the full-population STKDE pipeline (`src/lib/stkde/full-population-pipeline.ts` → `compute.ts` → `burst-evolution.ts`).
3. Returned `StkdeWorkerHotspot[]` flows into `useStkdeStore` and is passed to `stkdeHotspot.worker.ts` for client-side filtering and projection by `minIntensity`, `minSupport`, `temporalWindow`, and `spatialBbox`.
4. `MapStkdeHeatmapLayer` and `BurstEvolutionOverlay` render the result.

**4. Synthetic bursty generation:**

1. Client or test calls `/api/synthetic/bursty?alpha=1.5&delta=1&count=10000&startEpoch=...&endEpoch=...&seed=42`.
2. `src/app/api/synthetic/bursty/route.ts` parses and validates the config, then calls `generateBurstySequence` from `src/lib/synthetic/goh-barabasi.ts`.
3. The generator runs in-memory: a priority queue selects the next event TYPE (Goh-Barabási mechanism); inter-event TIMESTAMPS are sampled from a power-law distribution via inverse transform sampling, seeded by `createSeededRandom` (`prng.ts`, Lehmer LCG) for reproducibility.
4. The response includes `{ data: CrimeRecord[], meta: { config, metrics, rollingBurstiness } }`. `?format=csv` returns a CSV download via `csv-export.ts`.
5. `/api/synthetic/bursty/burstiness` returns the rolling window B(t) series used as ground truth for evaluating the adaptive scaling algorithm.

**State Management:**

- **Per-store Zustand instances** with `create<T>((set, get) => ...)` (no global reducer). State changes are direct mutations through setters.
- **Slice domain composition** in `src/store/slice-domain/` — `useSliceDomainStore` (in `src/store/useSliceDomainStore.ts`) merges four creators (`createSliceCoreSlice`, `createSliceSelectionSlice`, `createSliceCreationSlice`, `createSliceAdjustmentSlice`) and persists `slices` to `localStorage` under the key `slice-domain-v1`.
- **Coordinated cross-view sync** flows through `useCoordinationStore` (`src/store/useCoordinationStore.ts`): `selectedIndex`, `selectedSource`, `brushRange`, `selectedBurstWindows`, `workflowPhase`, `syncStatus`, `panelNoMatch` — all map/cube/timeline reads/writes for shared state.
- **Demonstration stores** for the dashboard-demo route: `useDashboardDemoCoordinationStore`, `useDashboardDemoFilterStore`, `useDashboardDemoMapLayerStore`, `useDashboardDemoTimeStore`, `useDashboardDemoTimeslicingModeStore`. These intentionally do not share state with the main dashboard.

## Key Abstractions

**`CrimeRecord` (canonical crime data):**
- Purpose: Single shape used by all components, hooks, and the synthetic generator.
- Examples: `src/types/crime.ts`, consumed in `src/lib/synthetic/goh-barabasi.ts:22`, all API routes, all components.
- Pattern: Includes both lat/lon and normalized `x`/`z` in [-50, +50]; epoch seconds timestamp; `type`, `district`, `iucr`, `year`. Inputs to APIs use `CrimeRecordInput = Partial<CrimeRecord>`.

**`TimeSlice` (slice domain):**
- Purpose: Represents a single editable time selection (point or range) on the timeline.
- Examples: `src/store/slice-domain/types.ts:7-33`
- Pattern: Normalized 0–100 coordinates (mapped to epoch via `useTimelineDataStore`); carries `isLocked`, `isVisible`, burst taxonomy metadata (`burstClass`, `burstRuleVersion`, `burstScore`, `burstConfidence`, `burstProvenance`, `tieBreakReason`, `thresholdSource`, `neighborhoodSummary`), and `warpEnabled`/`warpWeight` for non-uniform slicing.

**`AutoProposalSet` (auto-generated slicing proposal):**
- Purpose: Container for a complete suggested slicing solution.
- Examples: `src/types/autoProposalSet.ts:38-64`
- Pattern: Combines `AutoProposalIntervalSet[]` (boundaries + method + confidence) with `AutoProposalWarpProfile[]` (intervals + strength + emphasis). Scored via `src/lib/full-auto-orchestrator.ts` with `SCORE_WEIGHTS = { relevance: 0.4, continuity: 0.3, overlapMin: 0.2, coverage: 0.1 }` (asserts the sum equals 1.0).

**`BurstyGeneratorConfig` / `BurstySequence` (synthetic generator):**
- Purpose: Reproducible bursty crime event stream.
- Examples: `src/lib/synthetic/types.ts:20-82`
- Pattern: `alpha > 1` (power-law exponent), `delta > 0` (priority increment), `numEvents`, `startTime`/`endTime` (epoch seconds), `typeStrategy` ('weighted' | 'uniform'), optional `perTypeAlpha` overrides, `rollingWindowSec`, optional `seed`. Output: `events: CrimeRecord[]`, global `metrics` (B, memory coefficient, mean/std IET, fitted alpha), and `rollingBurstiness: RollingBurstinessPoint[]`.

**`QueryFragment` (SQL builder output):**
- Purpose: Type-safe SQL + params pair.
- Examples: `src/lib/queries/types.ts:1-4`, used in `src/lib/queries/builders.ts` and `filters.ts`.
- Pattern: `{ sql: string, params: unknown[] }` — sanitization happens via `sanitizeTableName` allowlist (`crimes_sorted`, `adaptive_global_cache`) and `clampPositiveInt`.

**`TimeBin` (binning output):**
- Purpose: One time window produced by the binning engine.
- Examples: `src/lib/binning/types.ts:9-63`
- Pattern: `{ startTime, endTime, count, crimeTypes[], isModified?, mergedFrom?, burstClass?, burstScore?, burstinessCoefficient?, warpWeight?, isNeutralPartition? }`. Bursts have a full taxonomy attached; neutral fallback partitions get `isNeutralPartition: true` and `warpWeight: 1`.

**Coordination store pattern:**
- Purpose: Synchronize map/cube/timeline without prop drilling.
- Examples: `src/store/useCoordinationStore.ts`
- Pattern: `SelectionSource = 'cube' | 'timeline' | 'map' | null`; `WorkflowPhase = 'generate' | 'review' | 'applied' | 'refine'`; `SyncStatusToken = 'syncing' | 'synchronized' | 'partial'`. `reconcileSelection` resolves conflicts when one panel can't match what another requested.

## Entry Points

**`src/app/layout.tsx`:**
- Location: `src/app/layout.tsx`
- Triggers: All page routes (root layout)
- Responsibilities: Loads Geist + Geist Mono fonts, wraps in `ThemeProvider` → `QueryProvider` (TanStack Query) → renders children + global `<Toaster />` (Sonner) + `<OnboardingTour />` (driver.js).

**`src/app/page.tsx`:**
- Location: `src/app/page.tsx`
- Triggers: `/` route
- Responsibilities: Landing page that links to the various dashboards and algorithm views.

**`src/app/dashboard-demo/page.tsx`:**
- Location: `src/app/dashboard-demo/page.tsx`
- Triggers: `/dashboard-demo` route
- Responsibilities: Primary dashboard shell with rail tabs and three viewports (Map / 3D / Compare). Uses `DashboardDemoShell` (`src/components/dashboard-demo/DashboardDemoShell.tsx`).

**`src/app/timeline-test/page.tsx`:**
- Location: `src/app/timeline-test/page.tsx`
- Triggers: `/timeline-test` route
- Responsibilities: Dual-timeline testing surface with route-local `components/`, `hooks/`, `lib/`.

**`src/app/stkde/page.tsx` / `src/app/stkde-3d/page.tsx`:**
- Location: `src/app/stkde/page.tsx`, `src/app/stkde-3d/page.tsx`
- Triggers: `/stkde`, `/stkde-3d`
- Responsibilities: STKDE hotspot analysis views (2D map and 3D cube).

**`src/app/timeslicing/page.tsx` / `src/app/timeslicing-algos/page.tsx`:**
- Triggers: `/timeslicing`, `/timeslicing-algos`
- Responsibilities: Time-slicing controls. The `binningMode` (`uniform-time` | `uniform-events`) is route-derived in `src/lib/adaptive/route-binning-mode.ts` (any `/timeslicing-algos/*` route forces `uniform-events`).

**`src/app/api/crime/stream/route.ts`:**
- Location: `src/app/api/crime/stream/route.ts`
- Triggers: `GET /api/crime/stream`
- Responsibilities: Streams crime rows in Apache Arrow IPC format (`Content-Type: application/vnd.apache.arrow.stream`). Falls back to mock data with `X-Data-Warning` header.

**`src/app/api/crime/overview/route.ts`:**
- Triggers: `GET /api/crime/overview`
- Responsibilities: Returns 1000-bin overview of the dataset's temporal extent; used by the timeline brush.

**`src/app/api/crime/bins/route.ts` / `src/app/api/crime/facets/route.ts` / `src/app/api/crime/meta/route.ts` / `src/app/api/crime/stats-summary/route.ts` / `src/app/api/crime/around/route.ts`:**
- Triggers: `GET /api/crime/{bins,facets,meta,stats-summary,around}`
- Responsibilities: Server-side aggregates for the timeline, filter facets, dataset metadata, statistical summaries, and point-proximity queries.

**`src/app/api/crimes/range/route.ts`:**
- Triggers: `GET /api/crimes/range?startEpoch&endEpoch&...`
- Responsibilities: Paginated raw crime rows used by `useCrimeData`. This is the hot path for the dashboard.

**`src/app/api/stkde/hotspots/route.ts`:**
- Triggers: `GET /api/stkde/hotspots?mode=...`
- Responsibilities: Full-population STKDE hotspot detection (server-side; off the main thread).

**`src/app/api/adaptive/global/route.ts` / `src/app/api/adaptive/bursts/route.ts`:**
- Triggers: `GET /api/adaptive/global`, `GET /api/adaptive/bursts`
- Responsibilities: Global adaptive maps (precomputed density/burstiness/warp) and detected burst windows.

**`src/app/api/synthetic/bursty/route.ts` / `src/app/api/synthetic/bursty/burstiness/route.ts`:**
- Triggers: `GET /api/synthetic/bursty`, `GET /api/synthetic/bursty/burstiness`
- Responsibilities: Goh-Barabási bursty crime generator (JSON or CSV download). The burstiness subroute returns the rolling B(t) ground-truth series.

**`src/app/api/study/log/route.ts`:**
- Triggers: `POST /api/study/log`
- Responsibilities: Acknowledged study event ingestion; consumed by `LoggerService` in `src/lib/logger.ts` with requeue-on-failure (max 4 attempts, 750ms backoff).

## Error Handling

**Strategy:** Server routes always fall back to mock data with a warning header; the UI never breaks when DuckDB is unavailable.

**Patterns:**

- **API routes catch all errors and return mock data** with `X-Data-Warning: Using demo data - <reason>` header. See `src/app/api/crime/overview/route.ts:55-60`, `src/app/api/crime/meta/route.ts:54-67`, `src/app/api/crime/stream/route.ts:51-64`.
- **DuckDB singleton with lazy init** in `src/lib/db.ts` (`__quietTigerDuckDb`, `__quietTigerDuckDbInitPromise` global promises). The CSV→DuckDB load is a fingerprint check (`size:mtimeMs`); only reloads when the source CSV changes.
- **SQL sanitization allowlist** in `src/lib/queries/sanitization.ts`: only `crimes_sorted` and `adaptive_global_cache` are accepted table names; numeric params are clamped via `clampPositiveInt(value, min, max)`.
- **Client hook error state** through TanStack Query: `isLoading`, `isFetching`, `error` on every `useCrimeData` / `useAdaptiveScale` / `useStkde` return.
- **Logger retry queue** in `src/lib/logger.ts` (`LoggerService`): single-write helpers (`sessionStart`, `sessionEnd`, `trialComplete`, `questionnaireResponse`, `conditionToggle`, `warpAdjustment`) re-queue failed `POST /api/study/log` writes up to 4 times before giving up; `beforeunload` does a `navigator.sendBeacon` best-effort drain.
- **Worker `requestId` correlation** in `src/workers/adaptiveTime.worker.ts` and `stkdeHotspot.worker.ts` so a slow response from an earlier request can't overwrite a newer one.

## Cross-Cutting Concerns

**Logging:**
- `src/lib/logger.ts` exports the `LoggerService` class. Batches study-intent events, posts to `/api/study/log` with acknowledgement, requeues on failure, uses `sendBeacon` on unload.
- `src/hooks/useLogger.ts` exposes a per-component log surface.
- Backend study persistence through `/api/study/log`.

**Validation:**
- `src/lib/queries/sanitization.ts` — table-name allowlist and parameter clamping for SQL.
- `src/lib/synthetic/goh-barabasi.ts:resolveConfig` — validates `alpha > 1`, `delta > 0`, `numEvents >= 1`, `endTime > startTime`.
- `src/lib/queries/filters.ts` — build WHERE-clause fragments.
- Type guards inside `src/lib/queries/builders.ts`.

**Authentication:**
- No application-level auth — this is a desktop-first internal prototype running against local DuckDB and local CSV data.

**Coordinate normalization:**
- `src/lib/coordinate-normalization.ts` — `lonLatToNormalized`, `buildNormalizedSqlExpression`, `NORMALIZED_COORDINATE_RANGE`. The same constants are used in SQL builders (server) and on the client so x/z values are identical on both sides.

**Date normalization:**
- `src/lib/date-normalization.ts` and `src/lib/time-domain.ts` — `epochSecondsToNormalized`, `normalizedToEpochSeconds`, `toEpochSeconds`. Slices and views use a normalized 0–100 range; conversion to absolute time happens at the boundary (`useTimelineDataStore.minTimestampSec`/`maxTimestampSec`).

**State machine:**
- `src/lib/state-machine.ts` — generic `createStateMachine<S extends string>(initialState, transitions)` for lifecycle enums. Used by the auto-run orchestrator (`src/lib/full-auto-orchestrator.ts`) with states `idle | running | paused | completed | error`.

**Onboarding:**
- `src/components/onboarding/OnboardingTour.tsx` — driver.js guided tour of the dashboard, mounted at the root layout.

**Theming:**
- `src/components/layout/ThemeProvider.tsx` — `next-themes` wrapper, exposes the theme to all components.

---

*Architecture analysis: 2026-06-27*

# Codebase Structure

**Analysis Date:** 2026-06-27

## Directory Layout

```
[project-root]/
├── .planning/              # GSD planning artifacts (roadmap, phases, research)
├── data/                   # Local data files (NOT committed; gitignored)
│   ├── sources/            # Raw CSV inputs (Chicago crime dataset, IUCR codes, police stations)
│   ├── cache/              # Generated DuckDB database files
│   ├── crime.parquet       # 5.3 MB sample parquet
│   └── source.csv          # 9.9 MB sample CSV
├── scripts/                # Python and Node analysis/visualization scripts
│   ├── synthetic/          # Python Goh-Barabási generator (sibling to src/lib/synthetic/)
│   ├── spatial-formula-experiment/
│   ├── map_figures/        # Generated matplotlib figures
│   ├── output/             # Generated analysis output
│   └── *.py / *.mjs / *.js # One-off analysis scripts (per-experiment)
├── docs/                   # Long-form design docs (TEMPORAL_SCALING, METHODOLOGY, etc.)
├── screenshots/            # PNG snapshots used in evaluation
├── burst_aware_experiment_output/
├── datapreprocessing/
├── extractions/
├── logs/                   # Runtime + dev server logs
├── patches/                # patch-package overrides for node_modules
├── public/                 # Static assets
├── src/                    # Application code (see detailed layout below)
├── .opencode/              # Opencode config
├── components.json         # shadcn registry config
├── eslint.config.mjs       # Flat ESLint config (Next core-web-vitals + TS)
├── next.config.ts          # Next.js config (serverExternalPackages: ['duckdb'])
├── next-env.d.ts
├── package.json            # pnpm workspace root
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── tsconfig.json           # `@/*` path alias → `./src/*`
├── vitest.config.mts
└── AGENTS.md / CLAUDE.md   # Project + GSD agent context
```

## `src/` Directory Layout

```
src/
├── app/                    # Next.js App Router (pages + API)
│   ├── layout.tsx          # Root layout (ThemeProvider + QueryProvider + Toaster + OnboardingTour)
│   ├── page.tsx            # Landing page
│   ├── globals.css
│   ├── favicon.ico
│   ├── dashboard-demo/     # /dashboard-demo — final synchronized dashboard shell
│   ├── timeline-test/      # /timeline-test — dual-timeline testing
│   ├── timeline-test-3d/   # /timeline-test-3d — 3D timeline view
│   ├── timeslicing/        # /timeslicing — binning controls
│   ├── timeslicing-algos/  # /timeslicing-algos — algorithm catalogue
│   ├── stkde/              # /stkde — hotspot analysis (2D)
│   ├── stkde-3d/           # /stkde-3d — hotspot analysis (3D)
│   ├── hotspot-evolution/  # /hotspot-evolution
│   ├── cube-sandbox/       # /cube-sandbox — 3D scene playground
│   ├── burstiness-vs-density/
│   ├── figures/            # /figures — paper-figure generation views
│   ├── algorithms/         # /algorithms — algorithm reference
│   ├── demo/               # /demo — non-uniform time slicing demo
│   ├── docs/               # /docs — in-app documentation
│   ├── evaluation/         # /evaluation
│   ├── stats/              # /stats — statistics dashboard
│   └── api/                # Route Handlers (server)
│       ├── crime/          # /api/crime/{stream,bins,facets,meta,overview,around,stats-summary}
│       ├── crimes/         # /api/crimes/range
│       ├── stkde/          # /api/stkde/hotspots
│       ├── adaptive/       # /api/adaptive/{global,bursts}
│       ├── synthetic/      # /api/synthetic/bursty + /api/synthetic/bursty/burstiness
│       ├── neighbourhood/  # /api/neighbourhood/poi
│       ├── study/          # /api/study/log
│       └── evaluation/
├── components/             # React UI
│   ├── ui/                 # shadcn primitives (button, dialog, popover, etc.)
│   ├── layout/             # DashboardLayout, TopBar, ThemeProvider
│   ├── dashboard/          # DashboardHeader
│   ├── dashboard-demo/     # Demo shell + compare/stats/inspect panels + lib/ helpers
│   ├── map/                # MapLibre wrappers (MapBase, MapEventLayer, MapStkdeHeatmapLayer, MapClusterHighlights, MapPoiLayer, MapTypeLegend, etc.)
│   ├── timeline/           # DualTimeline, DensityHeatStrip, TimelineContainer, TimelinePanel, plus hooks/ layers/ lib/ qa/ subfolders
│   ├── viz/                # 3D cube scene (CubeVisualization, MainScene, DataPoints, SlicePlane, ClusterManager, SelectedWarpSliceOverlay, shaders/)
│   ├── stkde/              # DashboardStkdePanel
│   ├── binning/            # BinningControls
│   ├── study/              # StudyControls
│   ├── settings/           # User settings UI
│   ├── evaluation/         # Evaluation study widgets
│   └── onboarding/         # OnboardingTour (driver.js)
├── hooks/                  # Client-side data hooks and behaviors
│   ├── useCrimeData.ts             # TanStack Query wrapper for /api/crimes/range
│   ├── useCrimeStream.ts           # /api/crime/stream consumer
│   ├── useViewportCrimeData.ts     # Viewport-bounded crime fetcher
│   ├── useAdaptiveScale.ts         # Adaptive scaling driver
│   ├── useDebouncedDensity.ts      # Debounced density computations
│   ├── useCrimePointCloud.ts
│   ├── useHotspotEvolution.ts
│   ├── useSuggestionGenerator.ts   # Auto-suggest slicing proposals
│   ├── useLogger.ts                # LoggerService client wrapper
│   ├── useSelectionSync.ts         # Cross-view selection sync
│   ├── useDualTimelineScales.ts
│   ├── useDebounce.ts
│   ├── useDraggable.ts
│   ├── useMeasure.ts
│   ├── useSmartProfiles.ts
│   ├── useURLFeatureFlags.ts
│   └── useContextExtractor.ts
├── lib/                    # Pure logic + server-side DB access
│   ├── db.ts                       # DuckDB singleton + readDatasetMetadata / readOverviewBins
│   ├── duckdb-aggregator.ts        # Bulk aggregate helpers
│   ├── queries.ts                  # Re-exports /lib/queries/index
│   ├── queries/                    # SQL builder subsystem
│   ├── binning/                    # Time-binning engine + warp scaling + rules + burst taxonomy
│   ├── stkde/                      # Full-population STKDE pipeline (compute, contracts, heatmap-scale, burst-evolution, adjacent-slice-comparison)
│   ├── adaptive/                   # route-binning-mode resolution
│   ├── clustering/                 # DBSCAN / density-clustering wrappers
│   ├── kde/                        # KDE helpers
│   ├── neighbourhood/              # POI / neighbourhood aggregations
│   ├── stats/                      # Statistical helpers
│   ├── motion/                     # Animation/interpolation helpers
│   ├── evolution/                  # Burst/hotspot evolution utilities
│   ├── synthetic/                  # Goh-Barabási generator (TypeScript)
│   ├── context-diagnostics/        # Debug contexts
│   ├── study/                      # Study log server-side
│   ├── stores/                     # Smaller utility stores (viewportStore, etc.)
│   ├── logger.ts                   # LoggerService (acknowledged study writes)
│   ├── coordinate-normalization.ts # lon/lat ↔ normalized x/z
│   ├── date-normalization.ts
│   ├── time-domain.ts              # epoch ↔ normalized
│   ├── time-range.ts
│   ├── slice-utils.ts              # range tolerance, range match
│   ├── slice-geometry.ts
│   ├── slice-allocator.ts
│   ├── slice-geometry.ts
│   ├── state-machine.ts            # generic FSM
│   ├── full-auto-orchestrator.ts   # Auto-proposal generator
│   ├── interval-detection.ts
│   ├── confidence-scoring.ts
│   ├── hotspot-evolution.ts
│   ├── adaptive-scale.ts
│   ├── adaptive-utils.ts
│   ├── bounds.ts
│   ├── burst-detection.ts
│   ├── category-legend.ts
│   ├── category-maps.ts            # CRIME_TYPE_MAP, IUCR lookup
│   ├── category-shapes.ts
│   ├── palettes.ts
│   ├── projection.ts
│   ├── formatting.ts
│   ├── date-formatting.ts
│   ├── math.ts
│   ├── constants.ts
│   ├── feature-flags.ts
│   ├── selection.ts
│   ├── stats.ts
│   ├── trajectories.ts
│   ├── downsample.ts
│   ├── poi-data.ts
│   └── *.test.ts                   # Co-located Vitest tests
├── store/                  # Zustand stores
│   ├── ui.ts                       # Misc UI flags
│   ├── useCoordinationStore.ts     # Cross-view sync (selectedIndex, brushRange, workflowPhase, syncStatus)
│   ├── useSliceStore.ts            # Backwards-compatible re-export of useSliceDomainStore
│   ├── useSliceDomainStore.ts      # Composes the four slice slices + persist
│   ├── slice-domain/               # Slice subsystem
│   ├── useAdaptiveStore.ts         # Warp factor, density/burstiness/warp maps, worker
│   ├── useTimelineDataStore.ts     # minTimestampSec / maxTimestampSec / data loaders
│   ├── useTimeStore.ts
│   ├── useFilterStore.ts
│   ├── useMapLayerStore.ts
│   ├── useBinningStore.ts
│   ├── useClusterStore.ts
│   ├── useStkdeStore.ts
│   ├── useHeatmapStore.ts
│   ├── useIntervalProposalStore.ts
│   ├── usePresetStore.ts
│   ├── useLayoutStore.ts           # Resizable panel sizes
│   ├── useThemeStore.ts
│   ├── useStatsStore.ts
│   ├── useSuggestionStore.ts
│   ├── useSuggestionHistoryStore.ts
│   ├── useSuggestionComparisonStore.ts
│   ├── useStudyStore.ts            # Session/participant IDs for study logging
│   ├── useEvaluationStudyStore.ts
│   ├── useContextProfileStore.ts
│   ├── useFeatureFlagsStore.ts
│   ├── useSliceCreationStore.ts
│   ├── useSliceSelectionStore.ts
│   ├── useSliceAdjustmentStore.ts
│   ├── useCubeSpatialConstraintsStore.ts
│   ├── useDashboardDemoCoordinationStore.ts
│   ├── useDashboardDemoFilterStore.ts
│   ├── useDashboardDemoMapLayerStore.ts
│   ├── useDashboardDemoTimeStore.ts
│   ├── useDashboardDemoTimeslicingModeStore.ts
│   ├── useAggregationStore.ts
│   └── *.test.ts
├── workers/                # Web Workers (off-main-thread compute)
│   ├── adaptiveTime.worker.ts     # Density/burstiness/warp map computation
│   ├── stkdeHotspot.worker.ts     # Post-filter and project hotspot rows
│   ├── kdeSlice.worker.ts         # KDE per slice
│   └── *.test.ts
├── types/                  # Canonical types (no runtime code)
│   ├── index.ts                   # Re-exports
│   ├── crime.ts                   # CrimeRecord, CrimeDataMeta, CrimeOverviewBin
│   ├── adaptive.ts                # AdaptiveBinningMode
│   ├── autoProposalSet.ts         # Auto-proposal container + scoring
│   ├── suggestion.ts
│   └── data.ts
├── providers/
│   └── QueryProvider.tsx          # TanStack Query client (5 min staleTime, 10 min gcTime, no refetch on focus)
└── utils/                  # Misc utilities
```

## Directory Purposes

**`src/app/` — App Router pages and API routes:**
- Purpose: Next.js routing; pages compose feature components, API routes own the data plane.
- Contains: `page.tsx`, `layout.tsx`, route-local folders (`components/`, `hooks/`, `lib/`), and `api/` route handlers.
- Key files:
  - `src/app/layout.tsx` — root layout
  - `src/app/dashboard-demo/page.tsx` — final dashboard shell
  - `src/app/api/crime/stream/route.ts` — Arrow IPC stream
  - `src/app/api/crimes/range/route.ts` — paginated raw rows
  - `src/app/api/synthetic/bursty/route.ts` — synthetic generator
  - `src/app/api/study/log/route.ts` — study event ingestion

**`src/components/` — UI components:**
- Purpose: All React UI; organized by feature.
- Contains: Feature folders + `ui/` (shadcn primitives) + `layout/` (app shell pieces).
- Key files:
  - `src/components/layout/DashboardLayout.tsx` — resizable panels shell
  - `src/components/map/MapVisualization.tsx` — MapLibre entry
  - `src/components/viz/CubeVisualization.tsx` — R3F cube entry
  - `src/components/timeline/DualTimeline.tsx` — dual-timeline entry
  - `src/components/dashboard-demo/DashboardDemoShell.tsx` — demo shell

**`src/hooks/` — Client-side orchestration:**
- Purpose: Glue between stores, API routes, workers, and components.
- Key files: `useCrimeData.ts`, `useAdaptiveScale.ts`, `useCrimeStream.ts`, `useViewportCrimeData.ts`, `useLogger.ts`.

**`src/lib/` — Pure logic + server DB:**
- Purpose: Domain logic, SQL builders, DuckDB access, synthetic generation, math.
- Key files: `db.ts`, `synthetic/goh-barabasi.ts`, `queries/builders.ts`, `binning/engine.ts`, `stkde/full-population-pipeline.ts`, `interval-detection.ts`, `full-auto-orchestrator.ts`, `logger.ts`, `coordinate-normalization.ts`.

**`src/store/` — Zustand stores:**
- Purpose: All client-side state.
- Key files: `useCoordinationStore.ts`, `useSliceDomainStore.ts`, `useAdaptiveStore.ts`, `useTimelineDataStore.ts`, plus `slice-domain/` subsystem.

**`src/store/slice-domain/` — Slice subsystem:**
- Purpose: Splits the slice domain into four composable slices.
- Contains:
  - `types.ts` — `TimeSlice`, `SliceCoreState`, `SliceSelectionState`, `SliceCreationState`, `SliceAdjustmentState`, `SliceDomainState`
  - `createSliceCoreSlice.ts` — `addSlice`, `addBurstSlice`, `findMatchingSlice`, `mergeSlices`, `updateSlice`, `addSliceFromBin`, `replaceSlicesFromBins`, etc.
  - `createSliceSelectionSlice.ts`
  - `createSliceCreationSlice.ts` — `startCreation`, `updatePreview`, `commitCreation`
  - `createSliceAdjustmentSlice.ts` — `beginDrag`, `updateDrag`, `endDrag`, snap handling
  - `selectors.ts` — pre-bound `select<T>` helpers for ergonomic access

**`src/workers/` — Web Workers:**
- Purpose: Off-main-thread compute for the adaptive scaling algorithm and STKDE post-filtering.
- Key files: `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`, `kdeSlice.worker.ts`.

**`src/types/` — Canonical types:**
- Purpose: Single source of truth for data shapes.
- Key files: `crime.ts`, `autoProposalSet.ts`, `adaptive.ts`.

**`src/providers/` — React providers:**
- Purpose: App-wide context providers.
- Key files: `QueryProvider.tsx`.

**`scripts/synthetic/` — Python sibling:**
- Purpose: Cross-language reference implementation of the Goh-Barabási generator and CSV exports.
- Contains: `__init__.py`, `generate_bursty.py`, `test_generate_bursty.py`.

**`data/` — Local data (gitignored):**
- Purpose: Source CSV and generated DuckDB cache.
- Contains:
  - `data/sources/` — raw input CSVs (Chicago crime data ~2.2 GB, IUCR codes, police stations)
  - `data/cache/crime.duckdb` — generated DuckDB (~1 GB) + WAL
  - `data/crime.parquet` — small sample
  - `data/source.csv` — small sample
  - `data/README.md` — data directory docs

## Key File Locations

**Entry points:**
- `src/app/layout.tsx` — root layout (theme, query, toaster, onboarding)
- `src/app/page.tsx` — landing
- `src/app/dashboard-demo/page.tsx` — final dashboard route
- `src/app/timeline-test/page.tsx` — dual-timeline test
- `src/app/stkde/page.tsx` — STKDE view
- `src/app/timeslicing/page.tsx` — time-slicing controls

**API route entry points:**
- `src/app/api/crime/stream/route.ts` — Arrow IPC stream
- `src/app/api/crime/overview/route.ts` — temporal extent
- `src/app/api/crime/bins/route.ts` — server-binned data
- `src/app/api/crime/facets/route.ts` — filter facets
- `src/app/api/crime/meta/route.ts` — dataset metadata
- `src/app/api/crime/around/route.ts` — proximity query
- `src/app/api/crime/stats-summary/route.ts` — stats summary
- `src/app/api/crimes/range/route.ts` — paginated raw rows
- `src/app/api/stkde/hotspots/route.ts` — STKDE hotspots
- `src/app/api/adaptive/global/route.ts` — precomputed global maps
- `src/app/api/adaptive/bursts/route.ts` — burst windows
- `src/app/api/synthetic/bursty/route.ts` — synthetic generator (JSON/CSV)
- `src/app/api/synthetic/bursty/burstiness/route.ts` — rolling B(t) ground truth
- `src/app/api/neighbourhood/poi/route.ts` — POI lookup
- `src/app/api/study/log/route.ts` — study event log

**Configuration:**
- `next.config.ts` — `serverExternalPackages: ['duckdb']`, `turbopack.root: process.cwd()`
- `tsconfig.json` — strict TS, `@/*` → `./src/*`
- `postcss.config.mjs` — Tailwind v4 PostCSS
- `eslint.config.mjs` — flat config with `eslint-config-next/core-web-vitals` and `typescript`
- `vitest.config.mts` — Vitest setup with jsdom
- `components.json` — shadcn config
- `package.json` — pnpm scripts: `dev`, `build` (with `NEXT_DISABLE_TURBOPACK=1`), `start`, `lint`, `typecheck`, `test`, `postinstall` (patch-package + duckdb binding symlink)

**Core logic:**
- `src/lib/db.ts` — DuckDB singleton, dataset fingerprint, `readDatasetMetadata`, `readOverviewBins`, `isMockDataEnabled`
- `src/lib/queries/builders.ts` — SQL builders (`buildCrimesInRangeQuery`, `buildCrimeCoordinateSelectColumns`)
- `src/lib/queries/filters.ts` — WHERE-clause fragments
- `src/lib/queries/aggregations.ts` — global adaptive map aggregation
- `src/lib/queries/sanitization.ts` — table allowlist + clamping
- `src/lib/synthetic/goh-barabasi.ts` — bursty generator core
- `src/lib/synthetic/types.ts` — generator config + result types
- `src/lib/synthetic/prng.ts` — Lehmer LCG + `weightedPick`
- `src/lib/synthetic/csv-export.ts` — CSV serialization
- `src/lib/binning/engine.ts` — bin computation
- `src/lib/binning/rules.ts` — binning strategies + constraints
- `src/lib/binning/burst-taxonomy.ts` — burst classification
- `src/lib/binning/warp-scaling.ts` — `ComparableWarpGranularity`, `clampComparableWarpWeight`
- `src/lib/binning/types.ts` — `TimeBin`, `BinGroup`, `BinningState`
- `src/lib/stkde/full-population-pipeline.ts` — end-to-end STKDE
- `src/lib/stkde/compute.ts` — STKDE math
- `src/lib/stkde/contracts.ts` — STKDE input/output contracts
- `src/lib/interval-detection.ts` — boundary detection (peak, change-point, rule-based)
- `src/lib/full-auto-orchestrator.ts` — auto-proposal ranking
- `src/lib/state-machine.ts` — generic FSM
- `src/lib/logger.ts` — `LoggerService` with acknowledged writes
- `src/lib/coordinate-normalization.ts` — `CHICAGO_BOUNDS`, `lonLatToNormalized`, `buildNormalizedSqlExpression`, `NORMALIZED_COORDINATE_RANGE`
- `src/lib/date-normalization.ts` — date helpers
- `src/lib/time-domain.ts` — epoch ↔ normalized conversions
- `src/lib/adaptive/route-binning-mode.ts` — derives binning mode from pathname

**State:**
- `src/store/useCoordinationStore.ts` — cross-view sync
- `src/store/useSliceDomainStore.ts` — slice subsystem root, persisted
- `src/store/slice-domain/createSliceCoreSlice.ts` — slice CRUD
- `src/store/slice-domain/createSliceSelectionSlice.ts` — selection
- `src/store/slice-domain/createSliceCreationSlice.ts` — creation flow
- `src/store/slice-domain/createSliceAdjustmentSlice.ts` — drag/handle logic
- `src/store/slice-domain/types.ts` — slice type system
- `src/store/slice-domain/selectors.ts` — pre-bound selector helpers
- `src/store/useAdaptiveStore.ts` — warp factor + worker management
- `src/store/useTimelineDataStore.ts` — min/max timestamp refs

**Workers:**
- `src/workers/adaptiveTime.worker.ts` — density/burstiness/warp maps
- `src/workers/stkdeHotspot.worker.ts` — filter + project
- `src/workers/kdeSlice.worker.ts` — per-slice KDE

**Testing:**
- Vitest co-located tests across all layers (`*.test.ts` / `*.test.tsx` next to source).
- Run: `pnpm test` (vitest).

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` — e.g. `DualTimeline.tsx`, `SuggestionPanel.tsx`, `DashboardHeader.tsx`, `MapBase.tsx`, `CubeVisualization.tsx`.
- Hooks: `useCamelCase.ts` — e.g. `useCrimeData.ts`, `useAdaptiveScale.ts`, `useLogger.ts`.
- Stores: `usePascalCaseStore.ts` — e.g. `useSliceStore.ts`, `useAdaptiveStore.ts`, `useCoordinationStore.ts`.
- Utilities / pure functions: `kebab-case.ts` — e.g. `slice-utils.ts`, `date-normalization.ts`, `coordinate-normalization.ts`, `time-domain.ts`, `full-auto-orchestrator.ts`, `interval-detection.ts`, `confidence-scoring.ts`.
- API route handlers: `route.ts` (mandatory Next.js convention).
- Workers: `*.worker.ts` — e.g. `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`.
- Test files: `*.test.ts` or `*.test.tsx` co-located with source. Vitest discovers both `.test.ts` and `.test.tsx`.

**Directories:**
- Single-word lowercase: `src/components/`, `src/lib/`, `src/hooks/`, `src/store/`, `src/types/`, `src/workers/`, `src/providers/`, `src/utils/`.
- Feature folders: `src/components/<feature>/` — e.g. `dashboard-demo/`, `timeline/`, `viz/`, `map/`, `stkde/`, `binning/`, `study/`, `onboarding/`, `settings/`, `evaluation/`.
- Slice subsystem: `src/store/slice-domain/` with a subfolder for the four creators + `types.ts` + `selectors.ts`.
- API route subfolders mirror URL paths: `src/app/api/crime/stream/route.ts` for `/api/crime/stream`.

**Variables and functions:**
- Functions and methods: `camelCase` — e.g. `addBurstSlice`, `findMatchingSlice`, `toNormalizedStoreRange`, `generateBurstySequence`, `createSeededRandom`, `weightedPick`, `fireHighestPriority`.
- React components: `PascalCase` — `DualTimeline`, `CubeVisualization`, `DashboardDemoShell`.
- Constants: `UPPER_SNAKE_CASE` — e.g. `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BATCH_SIZE`, `BURST_TOLERANCE_RATIO`, `MERGE_TOUCH_TOLERANCE`, `MAX_EVENTS`, `MAX_ATTEMPTS`, `RETRY_BACKOFF_MS`, `SCORE_WEIGHTS`, `MIN_CONFIDENCE_THRESHOLD`, `TOP_SET_LIMIT`, `EPSILON`, `OVERVIEW_SUMMARY_BIN_COUNT`, `TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS`, `TABLE_NAME_ALLOWLIST`, `CHICAGO_TYPE_WEIGHTS`, `DEFAULT_ROLLING_WINDOW_SEC`.
- TypeScript types/interfaces: `PascalCase` — `CrimeRecord`, `TimeSlice`, `BurstyGeneratorConfig`, `BurstySequence`, `AutoProposalSet`, `QueryFragment`, `TimeBin`, `SyncStatus`, `CoordinationState`.

## Where to Add New Code

**New page route:**
- Primary code: `src/app/<route-name>/page.tsx` (the page itself; layout is inherited from `src/app/layout.tsx`).
- Route-local components: `src/app/<route-name>/components/` (if the components are not reusable).
- Route-local hooks: `src/app/<route-name>/hooks/`.
- Route-local lib: `src/app/<route-name>/lib/`.
- For shared logic, put it under `src/lib/` instead and import via `@/lib/<name>`.

**New API endpoint:**
- Handler: `src/app/api/<resource>/<subroute>/route.ts` (the `route.ts` filename is mandatory).
- Add the path to the `src/app/api/` directory; mirror the URL structure.
- Shared SQL/logic goes under `src/lib/queries/`, `src/lib/<domain>/`, or `src/lib/synthetic/`.
- Always include the `X-Data-Warning` mock-fallback pattern if the endpoint depends on DuckDB.

**New React component (shared):**
- Implementation: `src/components/<feature>/<ComponentName>.tsx`.
- If the component is generic/atomic: `src/components/ui/<ComponentName>.tsx` (shadcn primitive) and register it via `components.json`.
- If the component is a hook: `src/hooks/use<HookName>.ts`.
- Add co-located test: `src/components/<feature>/<ComponentName>.test.tsx` or `src/hooks/use<HookName>.test.ts`.

**New Zustand store:**
- Implementation: `src/store/use<DomainName>Store.ts` (one store per file).
- For multi-slice stores: `src/store/<domain>/create<Slicename>Slice.ts` + `src/store/<domain>/types.ts` + `src/store/<domain>/selectors.ts` + `src/store/use<DomainName>Store.ts` as the composer.
- Persisted stores wrap with `zustand/middleware` `persist` (see `useSliceDomainStore.ts`).
- Stores that need a Web Worker instantiate it lazily in module scope (`useAdaptiveStore.ts:49-55`).

**New Web Worker:**
- File: `src/workers/<name>.worker.ts` exporting `WorkerInput`, `WorkerOutput`, and a pure compute function (so it can be tested in isolation).
- Instantiate from a store: `worker = new Worker(new URL('../workers/<name>.worker.ts', import.meta.url))`.
- Correlate requests with `requestId` so a slow response can't overwrite a newer one.
- Co-locate test in `src/workers/<name>.worker.test.ts` that imports the pure function directly.

**New pure utility:**
- Shared helpers: `src/lib/<name>.ts` (kebab-case).
- Co-locate unit test: `src/lib/<name>.test.ts`.

**New synthetic data generator (or generator variant):**
- Core: `src/lib/synthetic/<name>.ts`.
- Types: extend `src/lib/synthetic/types.ts` (or add a sibling `types.ts` for a new generator family).
- API route: `src/app/api/synthetic/<name>/route.ts` (and nested for sub-resources, e.g. `bursty/burstiness/`).
- CSV export helper: extend `src/lib/synthetic/csv-export.ts`.
- Python sibling (optional, for cross-validation): `scripts/synthetic/<name>.py`.

**New type:**
- Single file: `src/types/<name>.ts`.
- Re-export from `src/types/index.ts`.

**New provider:**
- `src/providers/<Name>Provider.tsx`.
- Wire it into `src/app/layout.tsx` (after `ThemeProvider`, before children).

## Special Directories

**`data/` — Local data (not committed):**
- Purpose: Source CSV inputs and generated DuckDB cache for the Chicago crime dataset.
- Generated: Yes (DuckDB cache from CSV).
- Committed: No — gitignored. Sample `crime.parquet` (5.3 MB) and `source.csv` (9.9 MB) may be committed for quick local spin-up.
- Path constants: `src/lib/db.ts` resolves `data/sources/Crimes_-_2001_to_Present_20260114.csv` and `data/cache/crime.duckdb` (both relative to `process.cwd()`).

**`scripts/` — Python and ad-hoc analysis scripts:**
- Purpose: One-off analysis, paper figure generation, cross-language validation of the synthetic generator.
- Generated: Outputs land in `scripts/map_figures/`, `scripts/output/`, `burst_aware_experiment_output/`, `logs/`.
- Committed: Source scripts yes, generated outputs no.

**`patches/` — patch-package overrides:**
- Purpose: Patches to `node_modules` applied automatically by `pnpm install` via the `postinstall` script.
- Generated: No.
- Committed: Yes.

**`docs/` — Long-form design docs:**
- Purpose: Methodology, algorithm analysis, evaluation protocol, etc.
- Generated: No.
- Committed: Yes.
- Key files: `ALGORITHM_ANALYSIS.md`, `METHODOLOGY.md`, `EVALUATION_PROTOCOL.md`, `TEMPORAL_SCALING_CHARACTERIZATION.md`, `TEMPORAL_INTERPOLATION_DECISION.md`, `Space_time_cube_V36.md`.

**`.planning/` — GSD planning artifacts:**
- Purpose: Roadmap, phases, research notes, and **codebase analysis** (where this document lives).
- Contains: `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `MILESTONES.md`, `phases/`, `codebase/`, `research/`, `seeds/`, `tmp/`, `todos/`, `vision/`, `quick/`, `archive/`, `debug/`, `milestones/`.
- Generated: Mixed (some committed, some produced at runtime by GSD commands).
- Committed: Yes for planning artifacts (see `.gitignore` for exclusions).

**`burst_aware_experiment_output/`, `datapreprocessing/`, `extractions/`, `logs/`, `screenshots/`:**
- Purpose: Generated artifacts from specific phases / experiments.
- Generated: Yes.
- Committed: Mostly no (verify per file).

**`screenshots/`:**
- Purpose: PNGs referenced in evaluation and research docs.
- Committed: Yes.

---

*Structure analysis: 2026-06-27*

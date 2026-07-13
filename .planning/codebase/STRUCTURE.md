# Codebase Structure

**Analysis Date:** 2026-07-14

## Directory Layout

```
adaptive-space-time-cube/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # Server-side Route Handlers
│   │   ├── dashboard/          # Primary dashboard (Map + Cube + Timeline)
│   │   ├── dashboard-v2/       # Extended dashboard with STKDE
│   │   ├── demo/               # Standalone demos
│   │   ├── stkde/              # STKDE exploration
│   │   ├── stkde-3d/           # 3D STKDE visualization
│   │   ├── hotspot-evolution/  # Hotspot evolution over time
│   │   ├── timeline-test/      # Timeline testing
│   │   ├── timeline-test-3d/   # 3D timeline testing
│   │   ├── timeslicing/        # Time slicing controls
│   │   ├── timeslicing-algos/  # Algorithm comparison
│   │   ├── cube-sandbox/       # 3D cube experimentation
│   │   ├── stats/              # Statistics dashboard
│   │   ├── evaluation/         # Evaluation study
│   │   ├── figures/            # Research figure generation
│   │   ├── study/              # Study management
│   │   ├── algorithms/         # Algorithm visualization
│   │   └── docs/               # Documentation
│   ├── components/             # React components by feature domain
│   │   ├── map/                # MapLibre GL map + overlays
│   │   ├── viz/                # Three.js cube + 3D rendering
│   │   ├── timeline/           # DualTimeline + brush + density
│   │   ├── dashboard/          # Dashboard chrome
│   │   ├── dashboard-demo/     # Self-contained demo shell
│   │   ├── evaluation/         # Evaluation study UI
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/             # Dashboard layout + theme
│   │   ├── onboarding/         # Driver.js tour
│   │   ├── settings/           # Feature flag toggles
│   │   ├── study/              # Study controls
│   │   ├── stkde/              # STKDE panel
│   │   └── binning/            # Binning controls
│   ├── store/                  # Zustand state management
│   │   └── slice-domain/       # Slice domain slice creators
│   ├── lib/                    # Pure business logic
│   │   ├── queries/            # SQL query builders
│   │   ├── stkde/              # STKDE algorithms
│   │   ├── binning/            # Time binning engine
│   │   ├── clustering/         # Spatial clustering
│   │   ├── kde/                # 2D kernel density
│   │   ├── signal-sources/     # Adaptive signal sources
│   │   ├── context-diagnostics/# Context comparison
│   │   ├── evolution/          # Hotspot evolution
│   │   ├── stats/              # Aggregation + pulses
│   │   ├── neighbourhood/      # Chicago neighborhoods + POI
│   │   ├── synthetic/          # Synthetic data generation
│   │   ├── demo/               # Demo preset windows
│   │   ├── motion/             # Easing functions
│   │   ├── data/               # Columnar data types
│   │   ├── stores/             # Viewport store
│   │   └── study/              # Study protocol + storage
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # Canonical type definitions
│   ├── workers/                # Web Worker scripts
│   ├── providers/              # React context providers
│   └── utils/                  # Legacy utility (single file)
├── data/                       # Crime data CSV + DuckDB cache
├── public/                     # Static assets
├── patches/                    # patch-package patches
├── scripts/                    # Build/utility scripts
├── docs/                       # Project documentation
├── convex/                     # Convex configuration (unused?)
├── agent/                      # Agent configuration
├── logs/                       # Application logs
├── output/                     # Generated output
├── extractions/                # Data extractions
├── datapreprocessing/          # Data preprocessing
├── burst_aware_experiment_output/ # Experiment results
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # Codebase analysis documents
├── package.json                # Dependencies and scripts
├── pnpm-lock.yaml              # Lockfile
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── vitest.config.mts           # Vitest test configuration
├── postcss.config.mjs          # PostCSS + Tailwind config
├── eslint.config.mjs           # ESLint configuration
├── components.json             # shadcn/ui component config
└── .env / .env.local           # Environment variables
```

## Directory Purposes

### `src/app/`
- **Purpose:** Next.js App Router pages and API routes
- **Contains:** `page.tsx` files (routes), `layout.tsx` files, API `route.ts` files, co-located tests
- **Key files:** `layout.tsx` (root layout), `page.tsx` (home), `dashboard/page.tsx` (primary)

### `src/app/api/`
- **Purpose:** Server-side Route Handlers for data processing
- **Contains:** `route.ts` files organized by domain
- **Key files:** `crimes/range/route.ts` (crime data), `adaptive/global/route.ts` (adaptive maps), `stkde/hotspots/route.ts` (STKDE), `study/log/route.ts` (logging)

### `src/components/`
- **Purpose:** React components organized by feature domain
- **Contains:** `.tsx` component files, co-located test files, subdirectories per domain
- **Key files:** `viz/CubeVisualization.tsx`, `map/MapVisualization.tsx`, `timeline/DualTimeline.tsx`

### `src/components/ui/`
- **Purpose:** shadcn/ui primitive components (Radix UI wrappers)
- **Contains:** 29 reusable UI primitives
- **Key files:** `button.tsx`, `dialog.tsx`, `select.tsx`, `slider.tsx`, `tabs.tsx`, `tooltip.tsx`

### `src/store/`
- **Purpose:** Zustand state management stores
- **Contains:** Store definitions, test files, slice-domain subdirectory
- **Key files:** `useCoordinationStore.ts`, `useFilterStore.ts`, `useAdaptiveStore.ts`, `useSliceDomainStore.ts`, `useTimeStore.ts`

### `src/store/slice-domain/`
- **Purpose:** Slice domain pattern implementation for complex slice state
- **Contains:** Slice creator functions, types, selectors
- **Key files:** `createSliceCoreSlice.ts`, `types.ts`, `selectors.ts`

### `src/lib/`
- **Purpose:** Pure business logic, algorithms, and data processing
- **Contains:** Subdirectories for each algorithm domain, utility files, test files
- **Key files:** `db.ts`, `queries.ts`, `coordinate-normalization.ts`, `time-domain.ts`, `logger.ts`

### `src/lib/queries/`
- **Purpose:** Type-safe SQL query construction
- **Contains:** Builder functions, filter logic, sanitization, type definitions
- **Key files:** `builders.ts`, `filters.ts`, `sanitization.ts`, `types.ts`

### `src/hooks/`
- **Purpose:** Custom React hooks for data fetching and derived state
- **Contains:** Hook files with co-located tests
- **Key files:** `useCrimeData.ts`, `useViewportCrimeData.ts`, `useCrimeStream.ts`, `useAdaptiveScale.ts`

### `src/types/`
- **Purpose:** Canonical type definitions shared across all layers
- **Contains:** Interface and type files
- **Key files:** `crime.ts` (canonical CrimeRecord), `adaptive.ts`, `data.ts`

### `src/workers/`
- **Purpose:** Web Worker scripts for heavy computation
- **Contains:** Worker files with co-located tests
- **Key files:** `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`, `kdeSlice.worker.ts`

### `data/`
- **Purpose:** Crime data and DuckDB cache
- **Contains:** `sources/Crimes_-_2001_to_Present_20260114.csv` (8.5M rows), `cache/crime.duckdb`
- **Generated:** DuckDB cache is regenerated from CSV on first run

### `patches/`
- **Purpose:** patch-package patches for node_modules
- **Contains:** Patch files applied via `postinstall` script
- **Key files:** DuckDB binding symlink patch

## Key File Locations

### Entry Points
- `src/app/layout.tsx` — Root layout (ThemeProvider, QueryProvider, Toaster, OnboardingTour)
- `src/app/page.tsx` — Home page (links to demo, 3D STKDE, hotspot evolution)
- `src/app/dashboard/page.tsx` — Primary dashboard (Map + Cube + Timeline)

### Configuration
- `package.json` — Dependencies, scripts, metadata
- `tsconfig.json` — TypeScript config (`@/*` → `./src/*`)
- `next.config.ts` — Next.js config (serverExternalPackages: duckdb)
- `vitest.config.mts` — Vitest config (node env, `@/*` alias)
- `postcss.config.mjs` — PostCSS + Tailwind v4
- `eslint.config.mjs` — ESLint with Next.js rules
- `components.json` — shadcn/ui component registry
- `.env` — USE_MOCK_DATA, optional DUCKDB_PATH, DISABLE_DUCKDB
- `.env.local` — Local overrides

### Core Logic
- `src/lib/db.ts` — DuckDB initialization, table management, dataset metadata
- `src/lib/queries.ts` — High-level query functions (crime range, adaptive maps)
- `src/lib/queries/builders.ts` — SQL query construction
- `src/lib/coordinate-normalization.ts` — Chicago bounds ↔ normalized coordinates
- `src/lib/time-domain.ts` — Epoch seconds ↔ normalized time
- `src/lib/stkde/compute.ts` — STKDE computation
- `src/lib/binning/engine.ts` — Time binning engine

### Testing
- `src/**/*.test.ts` — Unit tests (co-located)
- `src/**/*.test.tsx` — Component tests (co-located)
- `vitest.config.mts` — Test configuration
- Test patterns: `*.test.ts`, `*.phase*.test.tsx`, `*.contract.test.ts`

## Naming Conventions

### Files
- **Components:** `PascalCase.tsx` (e.g., `SuggestionPanel.tsx`, `DualTimeline.tsx`)
- **Hooks:** `usePascalCase.ts` (e.g., `useCrimeData.ts`, `useAdaptiveScale.ts`)
- **Stores:** `usePascalCaseStore.ts` (e.g., `useSliceStore.ts`, `useAdaptiveStore.ts`)
- **Lib modules:** `camelCase.ts` (e.g., `slice-utils.ts`, `date-normalization.ts`)
- **Types:** `camelCase.ts` (e.g., `crime.ts`, `adaptive.ts`)
- **Tests:** `*.test.ts` or `*.test.tsx` suffix (e.g., `slice-utils.test.ts`)
- **Workers:** `*.worker.ts` suffix (e.g., `adaptiveTime.worker.ts`)
- **API routes:** `route.ts` inside directory (e.g., `src/app/api/crimes/range/route.ts`)
- **Pages:** `page.tsx` inside directory (e.g., `src/app/dashboard/page.tsx`)

### Directories
- **Feature domains:** lowercase with hyphens (e.g., `dashboard-demo/`, `context-diagnostics/`)
- **UI components:** lowercase (e.g., `ui/`, `viz/`, `map/`)
- **Store slices:** lowercase with hyphens (e.g., `slice-domain/`)

### Code
- **Functions:** camelCase (e.g., `normalizeToPercent()`, `generateBins()`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAutoBurstSlices()`, `useViewportCrimeData()`)
- **Components:** PascalCase (e.g., `DualTimeline`, `SuggestionPanel`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BATCH_SIZE`)
- **Types/Interfaces:** PascalCase (e.g., `CrimeRecord`, `TimeSlice`, `AdaptiveBinningMode`)
- **Variables:** camelCase (e.g., `realTime`, `minTime`, `mapDomain`)

## Where to Add New Code

### New Feature (Page/Route)
- Route page: `src/app/{feature-name}/page.tsx`
- Route components: `src/app/{feature-name}/components/`
- Route lib: `src/app/{feature-name}/lib/`
- Route tests: `src/app/{feature-name}/*.test.ts`

### New Component
- Feature component: `src/components/{domain}/ComponentName.tsx`
- Shared UI primitive: `src/components/ui/component-name.tsx`
- Test: `src/components/{domain}/ComponentName.test.tsx`

### New Zustand Store
- Store: `src/store/use{Name}Store.ts`
- Test: `src/store/use{Name}Store.test.ts`
- Slice (if complex): `src/store/slice-domain/create{Name}Slice.ts`

### New Hook
- Hook: `src/hooks/use{Name}.ts`
- Test: `src/hooks/use{Name}.test.ts`

### New Lib Module
- Module: `src/lib/{domain}/{module-name}.ts`
- Test: `src/lib/{domain}/{module-name}.test.ts`
- Types: `src/lib/{domain}/types.ts`

### New API Route
- Route: `src/app/api/{domain}/{endpoint}/route.ts`
- Test: `src/app/api/{domain}/{endpoint}/route.test.ts`

### New Web Worker
- Worker: `src/workers/{name}.worker.ts`
- Test: `src/workers/{name}.worker.test.ts`

### New Type Definition
- Shared type: `src/types/{domain}.ts`
- Re-export: `src/types/index.ts`
- Local type: `src/lib/{domain}/types.ts`

## Special Directories

### `.planning/`
- **Purpose:** GSD workflow artifacts (roadmaps, phases, plans, codebase analysis)
- **Generated:** By GSD commands
- **Committed:** Yes (for cross-session context)

### `data/`
- **Purpose:** Crime data CSV and DuckDB cache
- **Generated:** DuckDB cache regenerated from CSV on first run
- **Committed:** CSV committed, DuckDB cache gitignored

### `.next/`
- **Purpose:** Next.js build output
- **Generated:** By `next build` / `next dev`
- **Committed:** No

### `node_modules/`
- **Purpose:** Installed dependencies
- **Generated:** By `pnpm install`
- **Committed:** No

### `patches/`
- **Purpose:** patch-package patches for node_modules
- **Generated:** Manually created
- **Committed:** Yes

### `convex/`
- **Purpose:** Convex configuration (appears unused in current architecture)
- **Generated:** By Convex CLI
- **Committed:** Yes

### `logs/`
- **Purpose:** Application log output
- **Generated:** At runtime
- **Committed:** No

### `output/`
- **Purpose:** Generated output files
- **Generated:** By scripts/experiments
- **Committed:** No

---

*Structure analysis: 2026-07-14*

# Architecture

**Analysis Date:** 2026-07-14

## Pattern Overview

**Overall:** Dashboard-centric multi-panel SPA with server-side data processing

**Key Characteristics:**
- Three synchronized views (Map, Cube, Timeline) coordinated through Zustand stores
- Server-side DuckDB analytics with client-side 3D rendering (Three.js/R3F)
- Adaptive time warping pipeline: data → density analysis → warp maps → visual stretching
- Web Workers for heavy computation (STKDE, adaptive time scaling) to keep UI responsive
- Multiple independent "app" routes within the same Next.js instance (dashboard, demo, stkde, stats, evaluation)
- Local-first architecture: no external database, no cloud services, all data from local CSV/DuckDB

## Layers

### Presentation Layer (Components)
- **Purpose:** Render UI for each panel (map, cube, timeline, settings, evaluation)
- **Location:** `src/components/`
- **Contains:** React components organized by feature domain
- **Depends on:** Stores, hooks, lib utilities
- **Used by:** Pages/routes

Sub-domains within `src/components/`:
- `map/` — MapLibre GL map with event overlay, heatmap, trajectories, STKDE, POI, clustering
- `viz/` — Three.js cube scene, data points, time slices, slice planes, grid, legends, shader wiring
- `timeline/` — DualTimeline (overview + detail), brush interaction, density strips, adaptive controls
- `dashboard/` — DashboardHeader, theme sync
- `dashboard-demo/` — Self-contained demo shell with its own compare/inspect/detect/stats panels
- `evaluation/` — Evaluation study shell, questionnaire, training gate
- `ui/` — shadcn/ui primitives (button, dialog, select, slider, tabs, tooltip, etc.)
- `layout/` — DashboardLayout (resizable panels), ThemeProvider, TopBar
- `onboarding/` — Driver.js tour overlay
- `settings/` — Feature flag toggles, settings panel
- `study/` — StudyControls for evaluation sessions
- `stkde/` — DashboardStkdePanel
- `binning/` — BinningControls

### State Management Layer (Stores)
- **Purpose:** Manage all client-side state with Zustand
- **Location:** `src/store/`
- **Contains:** Zustand stores using slices pattern for complex domains
- **Depends on:** Types, lib utilities
- **Used by:** Components, hooks, workers

Key stores and their responsibilities:
- `useCoordinationStore.ts` — Cross-panel selection sync (which panel initiated, sync status, brush range)
- `useFilterStore.ts` — Crime type/district/time/spatial filter selections with presets
- `useTimeStore.ts` — Current time cursor, playback, time range, resolution
- `useAdaptiveStore.ts` — Warp factor, density/burstiness maps, warp maps, active signal source (persisted)
- `useSliceDomainStore.ts` — Time slices (created, selected, adjusted) with persisted slice data
- `useWarpSliceStore.ts` — Warp-specific slices with weight/label/range
- `useTimelineDataStore.ts` — Loaded crime data columns, overview bins, temporal bounds
- `useStkdeStore.ts` — STKDE parameters, run status, hotspot results
- `useClusterStore.ts` — Spatial cluster analysis results
- `useLayoutStore.ts` — Panel visibility and split ratios (persisted)
- `useThemeStore.ts` — Theme (light/dark) selection
- `ui.ts` — Abstract/map mode, context overlay, reset trigger
- `useStudyStore.ts` — Evaluation session state (participant, session, trial progress)
- `useFeatureFlagsStore.ts` — Feature flag overrides
- `usePresetStore.ts` — Saved filter presets
- `useBinningStore.ts` — Binning configuration
- `useHeatmapStore.ts` — Heatmap layer settings
- `useMapLayerStore.ts` — Map layer visibility toggles
- `useAggregationStore.ts` — LOD aggregation settings
- `useTrajectoryStore.ts` — Trajectory display settings
- `useIntervalProposalStore.ts` — Auto-generated interval proposals
- `useWarpProposalStore.ts` — Warp adjustment proposals
- `useSuggestionStore.ts`, `useSuggestionComparisonStore.ts`, `useSuggestionHistoryStore.ts` — Suggestion pipeline
- `useSliceCreationStore.ts`, `useSliceSelectionStore.ts`, `useSliceAdjustmentStore.ts` — Slice interaction state machines
- `useDashboardDemoCoordinationStore.ts`, `useDashboardDemoFilterStore.ts`, etc. — Dashboard-demo-specific stores (isolated from main dashboard)

Slice domain pattern (in `src/store/slice-domain/`):
- `createSliceCoreSlice.ts` — Core slice CRUD operations
- `createSliceCreationSlice.ts` — Creation mode/preview state machine
- `createSliceSelectionSlice.ts` — Multi-select, hover, drag state
- `createSliceAdjustmentSlice.ts` — Snap-to-grid, boundary adjustment
- `types.ts` — SliceDomainState type combining all slices
- `selectors.ts` — Memoized selectors for slice state

### Business Logic Layer (Lib)
- **Purpose:** Pure functions for data processing, algorithms, and domain logic
- **Location:** `src/lib/`
- **Contains:** Query builders, adaptive scaling, STKDE, clustering, binning, coordinate normalization
- **Depends on:** Types only (mostly pure functions)
- **Used by:** Stores, API routes, workers, hooks

Key lib modules:
- `queries/` — Type-safe SQL query builders (`builders.ts`, `filters.ts`, `sanitization.ts`, `aggregations.ts`)
- `queries.ts` — High-level query functions (crime range, count, adaptive maps, density bins)
- `db.ts` — DuckDB initialization, table management, dataset metadata, overview bins
- `adaptive-scale.ts` — Client-side adaptive scale computation (d3-based)
- `adaptive-utils.ts` — Constants for adaptive binning (BIN_COUNT, KERNEL_WIDTH, BURST_INFLUENCE)
- `coordinate-normalization.ts` — Chicago bounds ↔ normalized [-50, +50] coordinate transform
- `time-domain.ts` — Epoch seconds ↔ normalized [0, 100] time transform
- `stkde/` — Spatio-temporal kernel density estimation (`compute.ts`, `contracts.ts`, `full-population-pipeline.ts`, `burst-evolution.ts`)
- `binning/` — Time binning engine (`engine.ts`, `rules.ts`, `types.ts`, `burst-taxonomy.ts`, `warp-scaling.ts`)
- `clustering/cluster-analysis.ts` — Spatial clustering (density-clustering library)
- `kde/` — 2D kernel density estimation (`compute-slice-kde.ts`)
- `signal-sources/` — Adaptive signal source implementations (density, burstiness, contextual)
- `context-diagnostics/` — Temporal/spatial context comparison and profiling
- `evolution/evolution-flow.ts` — Hotspot evolution flow computation
- `stats/` — Aggregation and temporal pulse analysis
- `category-maps.ts` — Crime type ID ↔ string mapping
- `category-legend.ts`, `category-shapes.ts` — Visual encoding for crime types
- `slice-utils.ts` — Slice geometry and overlap calculations
- `slice-geometry.ts` — 3D slice plane geometry
- `confidence-scoring.ts` — Proposal confidence scoring
- `interval-detection.ts` — Automatic interval boundary detection
- `selection.ts` — Index → lat/lon/timestamp resolution
- `projection.ts` — Geographic ↔ 3D projection
- `bounds.ts` — Spatial/temporal bounds calculations
- `logger.ts` — LoggerService with acknowledged writes, retry queue, sendBeacon fallback
- `feature-flags.ts` — Feature flag definitions and helpers
- `palettes.ts` — Color palette definitions (light/dark/colorblind)
- `downsample.ts` — Timeline data downsampling
- `formatting.ts` — Display formatting utilities
- `date-formatting.ts`, `date-normalization.ts` — Date manipulation
- `motion/easing.ts` — Animation easing functions
- `synthetic/` — Synthetic data generation (PRNG, Goh-Barabasi burst model, CSV export)
- `neighbourhood/` — Chicago neighborhood and POI data
- `demo/preset-windows.ts` — Demo preset time windows
- `stores/viewportStore.ts` — Viewport date range and filter state (used by map and timeline hooks)
- `data/types.ts`, `data/selectors.ts` — Columnar data types and accessors

### Data Layer (API Routes + DuckDB)
- **Purpose:** Server-side data processing with DuckDB, exposed via Next.js Route Handlers
- **Location:** `src/app/api/`
- **Contains:** Route handlers that query DuckDB and return JSON or Arrow IPC
- **Depends on:** DuckDB, lib modules
- **Used by:** Client hooks (useCrimeData, useViewportCrimeData, etc.)

API route structure:
- `src/app/api/crimes/range/route.ts` — Crime records by time range (JSON with cursor-based pagination)
- `src/app/api/crime/stream/route.ts` — Crime data streaming (Arrow IPC format)
- `src/app/api/crime/bins/` — Time-binned crime counts
- `src/app/api/crime/overview/` — Overview summary bins
- `src/app/api/crime/around/` — Crime records around a point
- `src/app/api/crime/facets/` — Crime type/district facets
- `src/app/api/crime/meta/` — Dataset metadata
- `src/app/api/crime/stats-summary/` — Statistics summary
- `src/app/api/adaptive/global/route.ts` — Global adaptive density/burstiness/warp maps (cached in DuckDB)
- `src/app/api/adaptive/bursts/route.ts` — Burst window detection
- `src/app/api/adaptive/contextual-baseline/route.ts` — Contextual baseline comparison
- `src/app/api/stkde/hotspots/route.ts` — STKDE hotspot computation (full-population or sampled)
- `src/app/api/neighbourhood/poi/route.ts` — Point-of-interest data
- `src/app/api/synthetic/bursty/route.ts` — Synthetic bursty data generation
- `src/app/api/study/log/route.ts` — Evaluation study event logging

### Workers Layer
- **Purpose:** Offload heavy computation to Web Workers to avoid blocking the main thread
- **Location:** `src/workers/`
- **Contains:** Web Worker scripts for STKDE and adaptive time scaling
- **Depends on:** Lib modules
- **Used by:** Stores via worker instantiation

Workers:
- `adaptiveTime.worker.ts` — Computes density maps, burstiness maps, and warp maps from timestamps
- `stkdeHotspot.worker.ts` — Client-side STKDE computation
- `kdeSlice.worker.ts` — Per-slice KDE computation

### Hooks Layer
- **Purpose:** Encapsulate data fetching, derived state, and side effects
- **Location:** `src/hooks/`
- **Contains:** Custom React hooks for data access and synchronization
- **Depends on:** Stores, lib utilities, API routes
- **Used by:** Components

Key hooks:
- `useCrimeData.ts` — Unified crime data fetching (TanStack Query wrapper)
- `useViewportCrimeData.ts` — Crime data for current viewport bounds
- `useCrimeStream.ts` — Arrow IPC streaming for large datasets
- `useCrimePointCloud.ts` — Point cloud data for cube visualization
- `useAdaptiveScale.ts` — Adaptive scale derivation from store state
- `useDualTimelineScales.ts` — D3 scales for overview/detail timeline
- `useSelectionSync.ts` — Cross-panel selection synchronization
- `useSliceStats.ts` — Per-slice statistics computation
- `useHotspotEvolution.ts` — Hotspot evolution over time
- `useSuggestionGenerator.ts` — Auto-generate time slice suggestions
- `useSmartProfiles.ts` — Context-aware profile extraction
- `useContextExtractor.ts` — Spatial/temporal context extraction
- `useDebounce.ts`, `useDebouncedDensity.ts` — Debounced value hooks
- `useMeasure.ts` — Element size measurement
- `useDraggable.ts` — Drag interaction state
- `useLogger.ts` — Component-level logging hook
- `useURLFeatureFlags.ts` — Feature flags from URL parameters

### Types Layer
- **Purpose:** Canonical type definitions shared across all layers
- **Location:** `src/types/`
- **Contains:** Interface and type definitions
- **Depends on:** None
- **Used by:** All layers

Key type files:
- `crime.ts` — CrimeRecord, CrimeViewport, UseCrimeDataOptions, CrimeDataMeta (canonical crime types)
- `adaptive.ts` — AdaptiveBinningMode
- `autoProposalSet.ts` — Auto-proposal set types
- `data.ts` — ColumnarData type
- `suggestion.ts` — Suggestion types
- `index.ts` — Re-exports from canonical locations + legacy CrimeEvent/Bin types

## Data Flow

### Primary Data Flow (Crime Data → Visualization)
1. DuckDB loads Chicago crime CSV on server (`src/lib/db.ts`)
2. API routes query DuckDB with time/type/district filters (`src/app/api/crimes/range/route.ts`)
3. `useCrimeData` hook fetches via TanStack Query (`src/hooks/useCrimeData.ts`)
4. `useTimelineDataStore` processes into columnar format (Float32Array columns)
5. Components consume from stores (MapVisualization, CubeVisualization, DualTimeline)

### Adaptive Time Warping Flow
1. `useTimelineDataStore` loads crime timestamps
2. `useAdaptiveStore.computeMaps()` posts timestamps to `adaptiveTime.worker.ts`
3. Worker computes density map (smoothed event counts), burstiness map (Goh-Barabasi), warp map
4. Results stored in `useAdaptiveStore` as Float32Array maps
5. Vertex shader applies warp via 1D data texture on cube geometry
6. Timeline bins are warped by non-uniform time scaling

### Selection Synchronization Flow
1. User interacts with one panel (map click, timeline brush, cube raycast)
2. Panel calls `useCoordinationStore.commitSelection(index, source)`
3. Other panels observe selection via store subscription
4. Each panel reconciles whether the selection is valid for its domain
5. `useCoordinationStore.reconcileSelection()` tracks sync status

### STKDE Flow
1. User triggers STKDE computation (or auto-triggered by slice change)
2. `useStkdeStore` posts parameters to `/api/stkde/hotspots`
3. API queries crimes in range, computes KDE grid, identifies hotspots
4. Response includes hotspot polygons, density values, metadata
5. `MapStkdeHeatmapLayer` renders heatmap overlay on map
6. `CubeVisualization` shows hotspot highlights in 3D

### Slice Creation Flow
1. User enters creation mode via `useSliceCreationStore`
2. Preview boundary tracks cursor in normalized [0, 100] space
3. On confirm, `useSliceDomainStore.addSlice()` creates TimeSlice
4. Slice boundary snaps to grid if snap mode enabled
5. Components observe slices and render SlicePlane overlays in cube + timeline highlights

## Key Abstractions

### CrimeRecord
- **Purpose:** Canonical crime data format across all components
- **Examples:** `src/types/crime.ts`, `src/lib/queries/types.ts`
- **Pattern:** Normalized coordinates (x, z ∈ [-50, +50]) alongside geographic (lat, lon)
- **Note:** Both `src/types/crime.ts` and `src/lib/queries/types.ts` define `CrimeRecord` — canonical source is `src/types/crime.ts`

### TimeSlice
- **Purpose:** Represents a time selection (point or range) with metadata
- **Examples:** `src/store/slice-domain/types.ts`
- **Pattern:** Has `type: 'point' | 'range'`, `range: [number, number]`, `isLocked`, `isVisible`, `isBurst` flags

### AdaptiveBinningMode
- **Purpose:** Controls how time bins are computed (uniform-time or uniform-events)
- **Examples:** `src/types/adaptive.ts`
- **Pattern:** String union type, persisted in store

### GlobalAdaptiveMaps
- **Purpose:** Precomputed density, burstiness, and warp maps for the full dataset
- **Examples:** `src/lib/queries/types.ts`
- **Pattern:** Contains Float32Array maps, domain, binCount, kernelWidth — cached in DuckDB

### CoordinationStore Pattern
- **Purpose:** Client state management with cross-panel synchronization
- **Examples:** `src/store/useCoordinationStore.ts`, `src/store/useSliceStore.ts`
- **Pattern:** Single store with multiple slices via `slice-domain/` helper functions, persisted where needed

### Query Builder Pattern
- **Purpose:** Type-safe SQL construction with sanitization
- **Examples:** `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts`
- **Pattern:** Fluent API: `buildCrimesInRangeQuery(table, start, end, options)` returns `{ sql, params }`

### ColumnarData
- **Purpose:** GPU-friendly columnar storage for point rendering
- **Examples:** `src/lib/data/types.ts`
- **Pattern:** Float32Array columns (x, y, z, r, g, b, a, timestamp, typeId, districtId) for instanced rendering

## Entry Points

### App Layout
- **Location:** `src/app/layout.tsx`
- **Triggers:** All page routes
- **Responsibilities:** ThemeProvider, QueryProvider, Toaster, OnboardingTour

### Home Page
- **Location:** `src/app/page.tsx`
- **Triggers:** `/` route
- **Responsibilities:** Landing page with links to demo, 3D STKDE, hotspot evolution

### Dashboard (Primary)
- **Location:** `src/app/dashboard/page.tsx`
- **Triggers:** `/dashboard` route
- **Responsibilities:** Main visualization layout with Map (left), Cube (top-right), Timeline (bottom)

### Dashboard V2
- **Location:** `src/app/dashboard-v2/page.tsx`
- **Triggers:** `/dashboard-v2` route
- **Responsibilities:** Extended dashboard with STKDE integration, flow consolidation

### Demo (Non-Uniform Time Slicing)
- **Location:** `src/app/demo/non-uniform-time-slicing/page.tsx`
- **Triggers:** `/demo/non-uniform-time-slicing` route
- **Responsibilities:** Standalone demo of adaptive time warping

### STKDE Page
- **Location:** `src/app/stkde/page.tsx`
- **Triggers:** `/stkde` route
- **Responsibilities:** Standalone STKDE exploration with map and hotspot panel

### STKDE 3D
- **Location:** `src/app/stkde-3d/page.tsx`
- **Triggers:** `/stkde-3d` route
- **Responsibilities:** 3D STKDE visualization with cube and map

### Hotspot Evolution
- **Location:** `src/app/hotspot-evolution/page.tsx`
- **Triggers:** `/hotspot-evolution` route
- **Responsibilities:** Hotspot evolution over time visualization

### Timeline Test
- **Location:** `src/app/timeline-test/page.tsx`
- **Triggers:** `/timeline-test` route
- **Responsibilities:** Timeline component testing interface

### Timeline Test 3D
- **Location:** `src/app/timeline-test-3d/page.tsx`
- **Triggers:** `/timeline-test-3d` route
- **Responsibilities:** 3D timeline visualization testing

### Time Slicing
- **Location:** `src/app/timeslicing/page.tsx`
- **Triggers:** `/timeslicing` route
- **Responsibilities:** Time slicing controls and full-auto acceptance testing

### Time Slicing Algorithms
- **Location:** `src/app/timeslicing-algos/page.tsx`
- **Triggers:** `/timeslicing-algos` route
- **Responsibilities:** Algorithm comparison for time slicing approaches

### Cube Sandbox
- **Location:** `src/app/cube-sandbox/page.tsx`
- **Triggers:** `/cube-sandbox` route
- **Responsibilities:** 3D cube experimentation sandbox

### Stats
- **Location:** `src/app/stats/page.tsx`
- **Triggers:** `/stats` route
- **Responsibilities:** Statistics dashboard with hooks and lib modules

### Evaluation
- **Location:** `src/app/evaluation/page.tsx`
- **Triggers:** `/evaluation` route
- **Responsibilities:** Evaluation study interface with questionnaire, training gate, task cards

### Figures
- **Location:** `src/app/figures/page.tsx`
- **Triggers:** `/figures` route
- **Responsibilities:** Research figure generation with sub-components for cube, map, timeline, overview, controls

### Study
- **Location:** `src/app/study/page.tsx`
- **Triggers:** `/study` route
- **Responsibilities:** Study management interface

### Algorithms
- **Location:** `src/app/algorithms/page.tsx`
- **Triggers:** `/algorithms` route
- **Responsibilities:** Algorithm visualization/testing

### Docs
- **Location:** `src/app/docs/page.tsx`
- **Triggers:** `/docs` route
- **Responsibilities:** Documentation page

## Error Handling

**Strategy:** Graceful degradation with mock data fallback

**Patterns:**
- API routes catch errors and return mock data with `X-Data-Warning` header (e.g., `src/app/api/crime/stream/route.ts`)
- DuckDB failures trigger mock data generation in `src/lib/queries.ts`
- `isMockDataEnabled()` checks `USE_MOCK_DATA` / `DISABLE_DUCKDB` env vars
- Store async operations track `isLoading`, `isFetching`, `error` states
- `src/lib/logger.ts` — Centralized logging utility with retry queue for study events
- `useLogger` hook for component-level logging
- Backend logging via `/api/study/log` endpoint
- Web Worker errors caught via `worker.onmessage` with `requestId` staleness checks

## Cross-Cutting Concerns

### State Management
- **Approach:** Zustand stores with slice pattern
- **Persistence:** `zustand/middleware/persist` for key stores (adaptive, slice domain, layout, theme)
- **Coordination:** `useCoordinationStore` as the central sync hub
- **Feature flags:** `useFeatureFlagsStore` + URL parameter overrides

### Styling
- **Framework:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix UI primitives)
- **Theming:** `next-themes` via ThemeProvider, custom ThemeStore
- **Animations:** Tailwind transitions + GSAP-style easing (`src/lib/motion/easing.ts`)

### Data Fetching
- **Client:** TanStack Query (React Query) v5
- **Cache:** 5-minute stale time default, placeholder data during refetch
- **Streaming:** Apache Arrow IPC via `@loaders.gl/arrow` for large datasets

### Logging
- **Client:** `LoggerService` class (`src/lib/logger.ts`)
- **Study events:** Acknowledged POST writes to `/api/study/log` with retry queue
- **Debug:** Console debug in development mode

### Validation
- **Query sanitization:** `src/lib/queries/sanitization.ts` — table name sanitization, positive int clamping
- **Type guards:** Query builder input validation
- **STKDE contracts:** `src/lib/stkde/contracts.ts` — request/response validation with clamping

### Testing
- **Framework:** Vitest 4.x
- **Location:** Co-located test files (`*.test.ts`, `*.test.tsx`)
- **Config:** `vitest.config.mts` with `@/*` alias, node environment

### Onboarding
- **Library:** Driver.js
- **Component:** `src/components/onboarding/OnboardingTour.tsx`
- **Triggered:** In root layout for all pages

---

*Architecture analysis: 2026-07-14*

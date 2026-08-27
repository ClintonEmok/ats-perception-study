<!-- generated-by: gsd-doc-writer -->

# Architecture

**Quiet Tiger** — an adaptive space-time cube prototype for exploring crime patterns in Chicago. It keeps a 3D cube, a 2D map, and a dual timeline synchronized so that users can brush time, inspect individual crime points, and watch bursty intervals expand or compress as the time resolution adapts.

---

## System Overview

The application is a desktop-first Next.js 16 prototype with a client-heavy visualization architecture and server-side data processing. Its primary input is an ~8.5M-record crime dataset (Chicago, 2001–2026) stored as CSV and queried through a local DuckDB in-process OLAP database. The system streams crime records and computed density maps to three coordinated view panels — a MapLibre GL 2D map, a Three.js 3D space-time cube, and an @visx dual timeline — all synchronized through Zustand stores with a cross-panel coordination pattern. Heavy computation (adaptive time scaling, STKDE hotspot analysis) runs in Web Workers to keep the UI responsive.

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16.1.6 (App Router) | Pages, API routes, SSR/SSG |
| UI Runtime | React 19.2.3 + React DOM | Component rendering |
| State Management | Zustand 5.0.10 (~35 stores) | Client state, cross-view coordination |
| Server State | TanStack Query 5.90.21 | Data fetching, caching, refetching |
| 3D Rendering | Three.js 0.182.0 + React Three Fiber 9.5.0 + Drei 10.7.7 | Space-time cube visualization |
| Map Rendering | MapLibre GL 5.17.0 + React Map GL 8.1.0 | 2D crime map |
| SVG/Chart | @visx 3.12.0 (axis, brush, scale, shape) | Dual timeline, density charts |
| Data Processing | DuckDB 1.4.4 | In-process OLAP queries over CSV |
| Data Transport | Apache Arrow 21.1.0 + @loaders.gl/arrow 4.3.4 | Columnar streaming from API |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix UI 1.4.3 | Utility-first CSS, accessible primitives |
| Testing | Vitest 4.0.18 + jsdom 28.0.0 + React Test Renderer 19.1.0 | Unit and component tests |
| Language | TypeScript 5.9.3 (strict mode) | All application code |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── page.tsx            # Dashboard demo root
│   ├── layout.tsx          # Root layout (ThemeProvider, QueryProvider, Toaster)
│   ├── dashboard-demo/     # Direct alias for the dashboard demo
│   ├── stkde/               # Shared STKDE view models
│   ├── stkde-3d/            # Shared 3D STKDE components and math
│   ├── stats/               # Shared statistics view model
│   ├── timeline-test/       # Shared slice-adjustment math
│   └── api/                # Route Handlers
│       ├── crime/          # Crime data endpoints (stream, bins, facets, meta, overview, stats-summary)
│       ├── crimes/range/   # Viewport-based crime range query
│       ├── adaptive/       # Adaptive scaling (global maps, bursts)
│       ├── stkde/hotspots/ # STKDE hotspot computation
│       ├── neighbourhood/poi/ # Neighbourhood points of interest
│       └── study/log/      # Study session logging
│
├── components/             # React components
│   ├── dashboard-demo/     # Demo workflow panels and shell
│   ├── layout/             # ThemeProvider
│   ├── map/                # MapBase, MapVisualization, overlay layers (heatmap, STKDE, trajectory, cluster, POI)
│   ├── timeline/           # DemoDualTimeline, shared timeline surface, density tracks
│   ├── viz/                # Three.js scene primitives, data points, slice planes, grids
│   ├── ui/                 # shadcn/ui primitives (button, card, slider, select, dialog, etc.)
│   ├── study/              # StudyControls
│   └── stkde/              # STKDE-specific visualization components
│
├── store/                  # Zustand state stores (~35 stores)
│   ├── slice-domain/       # Slice state slices (core, creation, selection, adjustment)
│   ├── useDashboardDemoCoordinationStore.ts # Demo cross-view coordination
│   ├── useDashboardDemoTimeStore.ts         # Demo time range and resolution
│   ├── useDashboardDemoFilterStore.ts       # Demo filters
│   ├── useSliceDomainStore.ts               # Demo time slice CRUD
│   ├── useTimelineDataStore.ts  # Timeline series data
│   ├── useDashboardDemoTimeslicingModeStore.ts # Demo slice generation state
│   ├── useDashboardDemoMapLayerStore.ts        # Demo map layer toggles
│   └── ...                                     # Supporting study and visualization stores
│
├── lib/                    # Business logic and data layer
│   ├── db.ts               # DuckDB initialization, CSV path resolution, mock data detection
│   ├── queries/            # DuckDB query builders with SQL sanitization
│   ├── binning/            # Time binning engine (strategies, rules, burst taxonomy, warp scaling)
│   ├── stkde/              # STKDE computation (grid config, heatmap, hotspots, burst evolution, contracts)
│   ├── kde/                # Slice-level KDE computation
│   ├── adaptive/           # Adaptive scaling helpers
│   ├── clustering/         # DBSCAN cluster analysis
│   ├── neighbourhood/      # Chicago neighbourhood data, OSM integration
│   ├── context-diagnostics/ # Spatial/temporal profile comparison
│   ├── stats/              # Temporal pulse series, aggregation helpers
│   ├── suggestion/         # Suggestion event types
│   ├── evolution/          # Evolution flow computation
│   ├── motion/             # Easing functions, animation aging
│   ├── data/               # Data selector types
│   ├── stores/             # Viewport store
│   ├── adaptive-scale.ts   # Adaptive Y-scale computation (d3-compatible)
│   ├── burst-detection.ts  # Temporal, spatial, and combined burst detection
│   ├── interval-detection.ts # Natural breakpoint boundary detection
│   ├── confidence-scoring.ts  # Confidence scoring for proposed intervals
│   ├── coordinate-normalization.ts  # Chicago ↔ normalized coordinate mapping
│   ├── date-normalization.ts        # Date/time formatting utilities
│   ├── duckdb-aggregator.ts         # 3D spatial bin aggregation
│   ├── full-auto-orchestrator.ts    # Interval auto-proposal orchestration
│   ├── logger.ts           # LoggerService (batch/flush via sendBeacon)
│   ├── time-range.ts       # Time range utilities and validation
│   ├── time-domain.ts      # Domain bounds computation
│   ├── warp-generation.ts  # Warp map boundary generation
│   ├── slice-utils.ts      # Slice math helpers (range matching, tolerance)
│   ├── slice-allocator.ts  # Automatic slice positioning
│   ├── slice-geometry.ts   # Slice geometry computation
│   ├── projection.ts       # Coordinate system bridging
│   ├── selection.ts        # Point selection utilities
│   ├── trajectories.ts     # Trajectory pillar construction
│   ├── downsample.ts       # Spatial/temporal downsampling
│   ├── formatting.ts       # Display formatting utilities
│   ├── mockData.ts         # Synthetic crime data generation
│   ├── bounds.ts           # Geographic bounds computation
│   ├── stats.ts            # Statistical helpers
│   ├── math.ts             # Shared math utilities
│   ├── palettes.ts         # Color palette definitions
│   ├── constants.ts        # Shared constants
│   ├── feature-flags.ts    # Feature flag definitions
│   ├── category-maps.ts    # Crime category color/shape maps
│   ├── category-legend.ts  # Legend label generation
│   ├── category-shapes.ts  # Category shape definitions
│   ├── state-machine.ts    # Workflow state machine
│   └── utils.ts            # General-purpose utilities
│
├── hooks/                  # Custom React hooks
│   ├── useCrimeData.ts     # TanStack Query wrapper for /api/crimes/range
│   ├── useCrimeStream.ts   # Arrow IPC streaming hook
│   ├── useViewportCrimeData.ts # Viewport-aware crime data fetching
│   ├── useCrimePointCloud.ts   # 3D point cloud data preparation
│   ├── useAdaptiveScale.ts # Adaptive scale computation
│   ├── useDualTimelineScales.ts # Timeline d3 scale computation
│   ├── useDebouncedDensity.ts  # Debounced density computation
│   ├── useSelectionSync.ts # Cross-panel selection synchronization
│   ├── useSuggestionGenerator.ts  # Interval proposal generation
│   ├── useSmartProfiles.ts # Smart profile data hooks
│   ├── useContextExtractor.ts   # Context extraction for selections
│   ├── useSliceStats.ts    # Per-slice statistics
│   ├── useDraggable.ts     # Drag interaction hook
│   ├── useDebounce.ts      # Generic debounce hook
│   ├── useMeasure.ts       # Element measurement hook
│   ├── useLogger.ts        # LoggerService wrapper
│   └── useURLFeatureFlags.ts   # URL-based feature flag overrides
│
├── types/                  # TypeScript type definitions
│   ├── crime.ts            # CrimeRecord (canonical), CrimeViewport, UseCrimeDataOptions
│   ├── autoProposalSet.ts  # Auto-proposal interval set types
│   ├── adaptive.ts         # AdaptiveBinningMode
│   ├── data.ts             # ColumnarData
│   ├── suggestion.ts       # Suggestion-related types
│   └── index.ts            # Re-exports
│
├── workers/                # Web Workers
│   ├── adaptiveTime.worker.ts   # Density, burstiness, warp map computation
│   ├── stkdeHotspot.worker.ts   # STKDE hotspot filtering/sorting
│   └── kdeSlice.worker.ts       # Slice-level KDE computation
│
├── providers/              # React context providers
│   └── QueryProvider.tsx   # TanStack QueryClient provider
│
└── utils/                  # Utilities
    └── binning.ts          # Binning utility functions
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW PIPELINE                          │
│                                                                     │
│  ┌──────────────┐   ┌──────────┐   ┌──────────────────┐            │
│  │  CSV Files    │   │  DuckDB  │   │  Next.js API     │            │
│  │  data/sources/│──▶│  (in-    │──▶│  Route Handlers  │            │
│  │  Crimes_...csv│   │  process │   │  /api/*          │            │
│  │  8.5M records │   │  OLAP)   │   │                  │            │
│  └──────────────┘   └──────────┘   └────────┬─────────┘            │
│                                              │                      │
│                                     ┌────────▼─────────┐           │
│                                     │  TanStack React   │           │
│                                     │  Query Hooks      │           │
│                                     │  useCrimeData()   │           │
│                                     │  useCrimeStream() │           │
│                                     │  useViewportData()│           │
│                                     └────────┬─────────┘           │
│                                              │                      │
│                              ┌───────────────▼────────────────┐    │
│                              │        Zustand Stores          │    │
│                              │  (filter, time, coordination,  │    │
│                              │   adaptive, slice, STKDE, etc.)│    │
│                              └───────────────┬────────────────┘    │
│                                              │                      │
│         ┌────────────────────────────────────┼────────────────┐     │
│         │                                    │                │     │
│  ┌──────▼──────┐  ┌──────────▼──────────┐  ┌──▼───────────┐  │     │
│  │ Map View    │  │ 3D Cube View       │  │ Dual Timeline │  │     │
│  │ (MapLibre   │  │ (Three.js / R3F)  │  │ (@visx SVG)  │  │     │
│  │  + overlays)│  │                    │  │              │  │     │
│  └─────────────┘  └────────────────────┘  └──────────────┘  │     │
└──────────────────────────────────────────────────────────────┘     │
                                                                     │
  ▶ All API routes serve JSON (default) or Apache Arrow streams
  ▶ Mock data fallback: every API route detects DuckDB availability
    and returns plausible synthetic data if the database is disabled.
  ▶ Web Workers (adaptiveTime, stkdeHotspot, kdeSlice) run
    computations off the main thread via postMessage.
```

### DuckDB → API Routes

DuckDB loads the raw CSV file (`data/sources/Crimes_-_2001_to_Present_20260114.csv`) in-process. A zone-map-optimized sorted table (`crimes_sorted`) is created on startup for efficient time-range queries. All API routes use `force-dynamic` and `runtime: 'nodejs'` to ensure DuckDB compatibility.

Key API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/crime/stream` | GET | Arrow-streaming crime data with filters |
| `/api/crime/bins` | GET | 3D spatial bin aggregation |
| `/api/crime/facets` | GET | Crime type and district facet counts |
| `/api/crime/meta` | GET | Dataset metadata (time range, bounds, types) |
| `/api/crime/overview` | GET | Sampled timeline overview data |
| `/api/crime/stats-summary` | GET | Statistical summaries (hour, day, month, etc.) |
| `/api/crimes/range` | GET | Viewport-based crime data with buffering |
| `/api/adaptive/global` | GET | Precomputed global density/burstiness/warp maps |
| `/api/adaptive/bursts` | POST | Burst detection computation |
| `/api/stkde/hotspots` | POST | STKDE hotspot computation (sampled or full-population) |
| `/api/neighbourhood/poi` | GET | Neighbourhood points of interest |
| `/api/study/log` | POST | Study session log ingestion (NDJSON) |

### API Routes → React Query → Components

The client uses TanStack React Query hooks (primarily `useCrimeData`) to fetch from API routes. Hooks pass viewport bounds and filters as query parameters, and the API applies buffering (default 30 days) for smooth panning. React Query provides caching, deduplication, and stale-while-revalidate behavior (5-minute stale time, no refetch on window focus).

---

## Cross-View Coordination

The three primary visualization panels — map, cube, and timeline — are synchronized through a coordination architecture built on Zustand stores.

```
┌──────────────────────────────────────────────────┐
│              COORDINATION ARCHITECTURE           │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │         useCoordinationStore                 │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │ selectedIndex / selectedSource         │  │ │
│  │  │ brushRange                             │  │ │
│  │  │ workflowPhase (generate→review→applied)│  │ │
│  │  │ syncStatus (syncing/synced/partial)   │  │ │
│  │  │ selectedBurstWindows                   │  │ │
│  │  │ panelNoMatch (per-panel error state)   │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │ useFilterStore│  │ useTimeStore │  │ useSlice ││
│  │              │  │              │  │ Store    ││
│  │ selectedTypes│  │ currentTime  │  │ slices[] ││
│  │ districts    │  │ timeRange    │  │ (time    ││
│  │ timeRange    │  │ isPlaying    │  │  ranges) ││
│  │ spatialBounds│  │ resolution   │  │          ││
│  └──────┬───────┘  └──────┬───────┘  └─────┬────┘│
│         │                 │                 │     │
│         ▼                 ▼                 ▼     │
│  ┌──────────────────────────────────────────┐    │
│  │         useAdaptiveStore                 │    │
│  │  warpFactor, densityMap, burstinessMap,  │    │
│  │  warpMap, mapDomain, burstThreshold,     │    │
│  │  binningMode (uniform-time/events)       │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  Selection flows:                                  │
│  1. User clicks a point in any panel               │
│  2. setSelectedIndex(source) fires                 │
│  3. commitSelection() notifies other panels        │
│  4. Each panel reconciles via reconcileSelection() │
│  5. syncStatus tracks synchronization state        │
│  6. panelNoMatch records failed lookups            │
└──────────────────────────────────────────────────┘
```

**Register-based selection pattern:** When a user selects a crime point in any panel (map click, cube raycast, timeline hover), the store records the index and source. Other panels listen to `selectedIndex` and reconcile — if a panel cannot find the matching point (e.g., due to different filter scope), it records a `panelNoMatch` entry and the coordination store sets `syncStatus: 'partial'` with a descriptive reason.

**Burst window selection:** The `useCoordinationStore` maintains `selectedBurstWindows[]` (max 3). The `useAutoBurstSlices` hook (in `useSliceStore`) automatically creates time slices from detected burst intervals, and `useSliceStore` normalizes burst slice ranges from epoch timestamps to the store's 0–100 normalized coordinate system.

---

## Key Abstractions

### 1. CrimeRecord (Canonical Data Type)
- **File:** `src/types/crime.ts`
- Purpose: Single source of truth for all crime data across components, hooks, and API responses. Includes `timestamp` (epoch seconds), `lat`/`lon` (geographic), `x`/`z` (normalized to -50..+50 for the 3D cube), `type`, `district`, `year`, `iucr`.

### 2. Time Slice (`useSliceDomainStore`)
- **File:** `src/store/slice-domain/`
- Purpose: Represents a time selection (point or range) with `isLocked`, `isVisible` flags. Slices are stored in a normalized 0–100 coordinate system and are created manually, from bursts, or from proposals.

### 3. Adaptive Time Scaling
- **Files:** `src/store/useAdaptiveStore.ts`, `src/lib/adaptive-scale.ts`, `src/workers/adaptiveTime.worker.ts`
- Purpose: Computes density, burstiness, and warp maps from timestamp arrays. The warp map redistributes visual space so dense time intervals get more screen space and sparse intervals compress. Supports two binning modes: `uniform-time` (equal-width bins) and `uniform-events` (equal-count bins). Computation runs in a Web Worker for large datasets.

### 4. STKDE (Space-Time Kernel Density Estimation)
- **Files:** `src/lib/stkde/`, `src/workers/stkdeHotspot.worker.ts`, `src/app/api/stkde/hotspots/route.ts`
- Purpose: Detects crime hotspots across space and time. Supports two computation modes: `sampled` (optimized for viewport-scale data) and `full-population` (scans all rows via DuckDB aggregation). Falls back gracefully between modes. Full-population mode has configurable timeouts and span caps.

### 5. DuckDB Query Builders
- **Files:** `src/lib/queries/`
- Pattern: Fluent API with parameterized SQL and sanitization. `buildCrimeRangeFilters()` constructs WHERE clauses from filter state. `buildCrimesInRangeQuery()` produces complete SELECT statements with zone-map-optimized table references. All dynamic values use parameterized `?` placeholders to prevent injection.

### 6. LoggerService
- **File:** `src/lib/logger.ts`
- Purpose: Batches log events and flushes periodically (every 5 seconds or every 50 events). Uses `navigator.sendBeacon` for reliability during page unload, with a fetch POST fallback. Logs are sent to `/api/study/log` and persisted as NDJSON.

### 7. Dashboard Layout (Resizable Panels)
- **File:** `src/components/layout/DashboardLayout.tsx`
- Purpose: Three-panel layout using `react-resizable-panels`. Left panel (map), top-right panel (3D cube), bottom panel (timeline). Layout state persisted in `useLayoutStore`.

---

## Web Worker Integration

```
┌─────────────────────────────────────────────────────┐
│                   WEB WORKERS                        │
│                                                      │
│  adaptiveTime.worker.ts                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Input: timestamps (Float32Array), domain,    │   │
│  │        config (binCount, kernelWidth, mode)  │   │
│  │ Output: densityMap, burstinessMap,           │   │
│  │         warpMap, countMap                    │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│  stkdeHotspot.worker.ts                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Input: hotspots array + filters              │   │
│  │        (minIntensity, minSupport,            │   │
│  │         temporalWindow, spatialBbox)         │   │
│  │ Output: filtered + sorted hotspots           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  kdeSlice.worker.ts                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │ Slice-level KDE computation                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Workers are instantiated by stores and hooks        │
│  when heavy computation is needed. Results are       │
│  returned via postMessage and committed to stores.   │
└─────────────────────────────────────────────────────┘
```

---

## MapLibre + Three.js Integration

The dashboard combines a 2D MapLibre GL map and a Three.js 3D space-time cube in a synchronized layout:

- **Map (left panel):** `MapVisualization` renders a MapLibre base map with optional overlay layers: heatmap (`MapHeatmapOverlay`), STKDE heatmap (`MapStkdeHeatmapLayer`), trajectory lines (`MapTrajectoryLayer`), event points (`MapEventLayer`), cluster highlights (`MapClusterHighlights`), district boundaries (`MapDistrictLayer`), and POI markers (`MapPoiLayer`). A Deck.gl heatmap overlay (`DeckGlHeatmapOverlay`) provides GPU-accelerated heatmap rendering.

- **Cube (top-right panel):** `CubeVisualization` renders a Three.js 3D scene via React Three Fiber (`MainScene`, `Scene`). It visualizes crime points as a 3D point cloud (`DataPoints`, `SimpleCrimePoints`, `SliceCrimePoints`) with time on the Y-axis, spatial coordinates on X/Z axes. The cube supports slice planes (`SlicePlane`), animated time planes (`TimePlane`), burst visualization, cluster highlights, STKDE overlays, and point inspection via raycasting.

- **Coordination:** When a user selects a point or brushes a time range in either panel, the `useCoordinationStore` propagates the selection to the other panel. The cube uses normalized coordinates (x, z) mapped from geographic (lon, lat) via `coordinate-normalization.ts`, while the map uses raw geographic coordinates — the `projection.ts` utility bridges the two coordinate systems.

---

## Adaptive Time Scaling Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                  ADAPTIVE TIME SCALING PIPELINE                  │
│                                                                  │
│  1. Raw timestamps (all crime events in viewport or globally)    │
│     │                                                            │
│     ▼                                                            │
│  2. Binning (uniform-time or uniform-events)                     │
│     │  → countMap: event count per bin                          │
│     ▼                                                            │
│  3. Density smoothing (kernel width = 3 by default)              │
│     │  → densityMap: normalized 0..1 density per bin             │
│     ▼                                                            │
│  4. Burstiness computation (coefficient of variation of          │
│     inter-event intervals per bin)                               │
│     │  → burstinessMap: normalized 0..1 burstiness per bin       │
│     ▼                                                            │
│  5. Warp map (weight = 1 + density * 5, then cumulative          │
│     distribution → redistributes screen space)                   │
│     │  → warpMap: boundary timestamps for each bin               │
│     ▼                                                            │
│  6. Application: d3.scaleLinear uses adaptive domain/range       │
│     arrays to warp the timeline axis                             │
│                                                                  │
│  Steps 1–5 run in adaptiveTime.worker.ts for large datasets.     │
│  Step 6 is applied in the DualTimeline component via             │
│  useAdaptiveScale() and useDualTimelineScales() hooks.           │
└──────────────────────────────────────────────────────────────────┘
```

Users control adaptive behavior through `useAdaptiveStore`:
- **warpFactor:** 0 (fully linear) to 1 (fully adaptive)
- **binningMode:** `uniform-time` (equal-width bins) or `uniform-events` (equal-count bins)
- **densityScope:** `viewport` (compute from visible data) or `global` (use precomputed global maps from `/api/adaptive/global`)
- **burstMetric:** `density` or `burstiness`
- **warpGranularity:** Controls the number of warp segments

---

## DuckDB Optimization

The application uses DuckDB as a local, in-process OLAP database to query ~8.5M crime records from a CSV file:

1. **Zone map optimization:** On first launch, the data is loaded into a sorted table (`crimes_sorted`) ordered by the `Date` column. DuckDB's zone maps allow it to skip irrelevant row groups when querying a time range, reducing scan overhead by up to 90% for narrow time windows.

2. **Runtime configuration:** DuckDB runs in Node.js (`next.config.ts` → `serverExternalPackages: ["duckdb"]`). The database path defaults to `data/cache/crime.duckdb` and can be overridden via `DUCKDB_PATH` environment variable.

3. **Mock data fallback:** If DuckDB is unavailable (controlled by `USE_MOCK_DATA`, `DISABLE_DUCKDB` env vars), every API route returns plausible synthetic crime data. This allows frontend development without the full dataset.

4. **Apache Arrow streaming:** The `/api/crime/stream` endpoint serializes query results to Apache Arrow IPC format using `tableFromJSON` / `tableToIPC`, enabling efficient columnar data transfer for large result sets. Other API endpoints use standard JSON.

---

## Error Handling

- **API routes:** Catch errors and return mock data with `X-Data-Warning` response header indicating the fallback reason.
- **API routes:** Use `NextResponse.json` with appropriate status codes (400 for invalid input, 500 for server errors).
- **Stores:** Handle loading and error states for async operations (`isLoading`, `isFetching`, `error` in hook results).
- **Coordination:** The coordination store tracks `panelNoMatch` states per panel when a selection cannot be resolved, with descriptive reason strings.
- **STKDE pipeline:** Full-population mode has timeout handling (configurable via `fullPopulationTimeoutMs`) with graceful fallback to sampled mode.
- **Logging:** Centralized `LoggerService` in `src/lib/logger.ts` with batch-and-flush pattern and `sendBeacon` for page unload reliability.

---

## References

- See [GETTING-STARTED.md](./GETTING-STARTED.md) for prerequisites and first run.
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development setup, build commands, and code style.

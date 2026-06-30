<!-- GSD:project-start source:PROJECT.md -->
## Project

**Adaptive Space-Time Cube Prototype**

This is a Next.js prototype for exploring crime patterns with an adaptive space-time cube. It connects a 3D cube, a 2D map, and a dual timeline so users can brush time, inspect points, and see bursty intervals expand or compress as the time resolution changes.

**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

### Constraints

- **Tech stack**: Next.js 16, TypeScript, pnpm, and the existing visualization/data stack — avoid introducing a second frontend architecture
- **Data layer**: Local DuckDB + Apache Arrow pipeline — preserve the current offline analytics model
- **Performance**: Large crime datasets must not block the UI — keep heavy computation off the main thread where possible
- **Product scope**: Desktop-first internal prototype — avoid adding unrelated consumer features
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All application code (React components, hooks, stores, API routes)
- JavaScript/ES2017 - Configuration files, build tooling
## Runtime
- Node.js 20+ (development)
- Next.js 16.1.6 (React framework runtime)
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` (present)
## Frameworks
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3
- Zustand 5.0.10 - Lightweight state management with slices pattern
- TanStack Query (React Query) 5.90.21 - Server state management, data fetching/caching
- Three.js 0.182.0 - 3D rendering
- React Three Fiber 9.5.0 - React renderer for Three.js
- React Three Drei 10.7.7 - Helper components for R3F
- @visx packages 3.12.0 - SVG-based visualization primitives (axis, brush, scale, shape, gradient, group, event, curve)
- MapLibre GL 5.17.0 - Map rendering
- React Map GL 8.1.0 - React wrapper for MapLibre
- Radix UI 1.4.3 - Unstyled, accessible primitives (dialog, popover, select, slider, switch, tabs, tooltip, alert-dialog, scroll-area)
- shadcn/ui - Component library built on Radix (via components.json)
- Tailwind CSS 4 - Utility-first CSS framework
- Tailwind CSS PostCSS 4 - CSS processing
- Lucide React 0.563.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- date-fns 4.1.0 - Date formatting/manipulation
- React Day Picker 9.13.0 - Date picker component
- React Resizable Panels 4.5.6 - Resizable panel layout
- Class Variance Authority 0.7.1 - Component variant management
- DuckDB 1.4.4 - In-process OLAP database for crime data queries
- Apache Arrow 21.1.0 - Columnar data format
- @loaders.gl/arrow 4.3.4 - Arrow data loading
- @loaders.gl/core 4.3.4 - Generic data loading framework
- @math.gl/web-mercator 4.1.0 - Web Mercator projection utilities
- @types/geojson 7946.0.16 - GeoJSON type definitions
- D3 libraries 3.x/4.x - Data manipulation (d3-array, d3-scale, d3-time, d3-brush, d3-selection, d3-zoom)
- density-clustering 1.3.0 - Clustering algorithms for hotspot detection
- lodash.debounce 4.0.8 - Debounce utility
- clsx 2.1.1 - Conditional classNames
- tailwind-merge 3.4.0 - Tailwind class merging
- driver.js 1.4.0 - Interactive tour/guide library
- Vitest 4.0.18 - Unit testing framework
- React Test Renderer 19.1.0 - Component testing
- jsdom 28.0.0 - DOM environment for tests
- ESLint 9 - Linting
- eslint-config-next 16.1.6 - Next.js ESLint configuration
- TypeScript - Static type checking
- patch-package 8.0.1 - Patching node_modules
## Key Dependencies
- `duckdb` 1.4.4 - Local OLAP database for processing 8.5M+ crime records; serverExternalPackages configured in next.config.ts
- `next` 16.1.6 - Core framework; handles routing, API routes, SSR/SSG
- `react`/`react-dom` 19.2.3 - UI rendering
- `zustand` 5.0.10 - Global state management across views
- DuckDB for local data processing (no external database)
- Local CSV files for crime data (no cloud storage)
## Configuration
- `.env` file with `USE_MOCK_DATA=false` (DuckDB enabled by default)
- Optional: `DUCKDB_PATH` env var for custom database location
- Optional: `DISABLE_DUCKDB` env var to force mock data
- `next.config.ts` - Next.js configuration (serverExternalPackages for duckdb)
- `tsconfig.json` - TypeScript with `@/*` path alias
- `postcss.config.mjs` - PostCSS with Tailwind
- `vitest.config.mts` - Vitest configuration
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript rules
- `@/*` maps to `./src/*`
## Platform Requirements
- Node.js 20+
- pnpm 9.x
- 8GB+ RAM recommended for DuckDB operations
- Node.js server (Next.js standalone or Node server)
- ~500MB disk space for crime dataset + DuckDB cache
- 8GB+ RAM for optimal DuckDB performance
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & Tooling
- TypeScript 5.9.3 - Strict mode enabled in `tsconfig.json`
- React 19.2.3 with Next.js 16.1.6
- Tailwind CSS v4 for styling
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript strict mode: `"strict": true` in `tsconfig.json`
## Naming Conventions
- Components: `PascalCase.tsx` (e.g., `SuggestionPanel.tsx`, `DualTimeline.tsx`)
- Utilities/Hooks: `camelCase.ts` (e.g., `slice-utils.ts`, `date-normalization.ts`)
- Stores: `usePascalCaseStore.ts` (e.g., `useSliceStore.ts`, `useAdaptiveStore.ts`)
- Tests: `*.test.ts` or `*.test.tsx` suffix (e.g., `slice-utils.test.ts`)
- Workers: `*.worker.ts` suffix (e.g., `adaptiveTime.worker.ts`)
- camelCase for regular functions: `normalizeToPercent()`, `generateBins()`
- camelCase for hooks: `useAutoBurstSlices()`, `useViewportCrimeData()`
- PascalCase for React components: `DualTimeline`, `SuggestionPanel`
- Factory helper functions: `buildPackage()` for test data builders
- camelCase: `realTime`, `minTime`, `mapDomain`
- UPPER_SNAKE_CASE for constants: `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BATCH_SIZE`
- Descriptive names preferred over abbreviations
## Import Organization
- `@/*` maps to `./src/*` - use consistently for internal imports
## Code Style
- 2-space indentation (inferred from examples)
- Semicolons at end of statements
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Arrow functions for callbacks
- Explicit return types for complex functions
## JSDoc Documentation
## Error Handling
- Custom `LoggerService` class in `src/lib/logger.ts`
- Batches events and flushes periodically
- Uses `navigator.sendBeacon` for reliability during page unload
- Fallback to fetch POST
## React Component Patterns
## Module Patterns
## Special Patterns
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Pages/Routes**: Dashboard-centric with multiple specialized views (`/dashboard-demo`, `/timeline-test`, `/timeslicing`, `/stkde`, `/stats`)
- **State Management**: Zustand stores with slice-domain pattern for complex state
- **Business Logic**: Pure functions in `src/lib/` modules
- **Data Layer**: API routes + DuckDB for analytics, Apache Arrow for streaming
- Client-heavy visualization with server-side data processing
- Coordination store pattern for cross-component synchronization
- Web Workers for heavy computation (STKDE, adaptive time)
- Multiple independent "apps" within the same Next.js instance
## Layers
- Location: `src/components/`
- Contains: React components organized by feature (`map/`, `timeline/`, `viz/`, `ui/`)
- Depends on: Stores, hooks, lib utilities
- Used by: Pages
- Location: `src/store/`
- Contains: Zustand stores for UI state, filters, slice management, adaptive settings
- Depends on: Types, lib utilities
- Used by: Components, other stores
- Location: `src/lib/`
- Contains: `queries/` (data fetching), `binning/` (time binning), `stkde/` (hotspot detection), `adaptive/` (time scaling), `interval-detection.ts`, `confidence-scoring.ts`
- Depends on: Types, database
- Used by: Stores, API routes, workers
- Location: `src/app/api/`
- Contains: Next.js Route Handlers for `/api/crime/*`, `/api/stkde/*`, `/api/adaptive/*`, `/api/neighbourhood/*`
- Depends on: DuckDB, external data files
- Used by: Client hooks (`useCrimeData`, etc.)
- Location: `src/workers/`
- Contains: Web Workers for heavy computation (`adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- Depends on: Lib modules
- Used by: Stores via worker instantiation
- Location: `src/types/`
- Contains: Canonical type definitions (`crime.ts`, `autoProposalSet.ts`)
- Depends on: None
- Used by: All layers
## Data Flow
## Key Abstractions
- Purpose: Canonical crime data format across all components
- Examples: `src/types/crime.ts`
- Pattern: Normalized coordinates (x, z) alongside geographic (lat, lon)
- Purpose: Represents a time selection (point or range)
- Examples: `src/store/slice-domain/types.ts`
- Pattern: Immutable-ish with `isLocked`, `isVisible` flags
- Purpose: Container for adaptive time proposals
- Examples: `src/types/autoProposalSet.ts`
- Pattern: Includes ranking, confidence scoring, and reason metadata
- Purpose: Client state management
- Examples: `src/store/useCoordinationStore.ts`, `src/store/useSliceStore.ts`
- Pattern: Single store with multiple slices via `slice-domain/` helper functions
- Purpose: Build type-safe database queries
- Examples: `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts`
- Pattern: Fluent API with sanitization
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: All page routes
- Responsibilities: Theme provider, query provider, toaster, onboarding tour
- Location: `src/app/dashboard-demo/page.tsx`
- Triggers: `/dashboard-demo` route
- Responsibilities: Main synchronized workspace with map, 3D inspection, compare view, timeline, and workflow rail
- `src/app/timeline-test/page.tsx` - Timeline testing interface
- `src/app/timeline-test-3d/page.tsx` - 3D timeline visualization
- `src/app/timeslicing/page.tsx` - Time slicing controls
- `src/app/stkde/page.tsx` - STKDE hotspot analysis
- `src/app/stats/page.tsx` - Statistics dashboard
- `src/app/api/crime/stream/route.ts` - Crime data streaming
- `src/app/api/crime/bins/route.ts` - Binned crime data
- `src/app/api/stkde/hotspots/route.ts` - STKDE computation
- `src/app/api/adaptive/global/route.ts` - Adaptive scaling data
## Error Handling
- API routes catch errors and return mock data with `X-Data-Warning` header
- DuckDB failures trigger mock data generation
- Stores handle loading/error states for async operations
- `isLoading`, `isFetching`, `error` properties in hook results
- `src/lib/logger.ts` - Centralized logging utility
- `useLogger` hook for component-level logging
- Backend logging via `/api/study/log` endpoint
## Cross-Cutting Concerns
- Query sanitization in `src/lib/queries/sanitization.ts`
- Type guards in query builders
- `src/lib/logger.ts` exports logging functions
- `useLogger` hook in `src/hooks/useLogger.ts`
- Coordinate normalization in `src/lib/coordinate-normalization.ts`
- Date normalization in `src/lib/date-normalization.ts`
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-Codex-profile` -- do not edit manually.
<!-- GSD:profile-end -->

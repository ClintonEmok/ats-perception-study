# Technology Stack

**Analysis Date:** 2026-07-14

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (React components, hooks, stores, API routes, lib modules)
- JavaScript/ES2017 - Configuration files (`postcss.config.mjs`, `eslint.config.mjs`, `next.config.ts`)

**Secondary:**
- SQL - DuckDB queries embedded in `src/lib/db.ts`, `src/lib/queries.ts`, `src/lib/study/storage.ts`
- CSS - Tailwind CSS v4 via `src/app/globals.css`

## Runtime

**Environment:**
- Node.js 20+ (development and production)
- Next.js 16.2.9 (React framework runtime with App Router)
- Turbopack available (configured in `next.config.ts`, disabled in build via `NEXT_DISABLE_TURBOPACK=1`)

**Package Manager:**
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` (only built dependencies for duckdb)

## Frameworks

**Core:**
- Next.js 16.2.9 - Full-stack React framework with App Router (`src/app/`)
- React 19.2.3 - UI library
- React DOM 19.2.7

**State Management:**
- Zustand 5.0.14 - Lightweight state management with 57 stores in `src/store/`
- TanStack React Query 5.101.0 - Server state management, data fetching/caching (`src/providers/QueryProvider.tsx`)

**3D Visualization:**
- Three.js 0.182.0 - 3D rendering
- React Three Fiber 9.6.1 - React renderer for Three.js
- React Three Drei 10.7.7 - Helper components for R3F

**2D Visualization:**
- @visx packages 3.12.0 - SVG-based visualization primitives (axis, brush, scale, shape, gradient, group, event, curve, responsive)
- D3 libraries 3.x/4.x - Data manipulation (d3-array, d3-scale, d3-time, d3-brush, d3-selection, d3-zoom)

**Map Rendering:**
- MapLibre GL 5.24.0 - Map rendering engine
- React Map GL 8.1.1 - React wrapper for MapLibre
- deck.gl 9.3.4 - WebGL-powered data visualization layers
- @deck.gl/aggregation-layers 9.3.4 - Heatmap/grid layers
- @deck.gl/mapbox 9.3.4 - Mapbox integration
- Leaflet 1.9.4 + React Leaflet 5.0.0 - Alternative map rendering (used in some views)

**UI Components:**
- Radix UI 1.x - Unstyled, accessible primitives (dialog, popover, select, slider, switch, tabs, tooltip, alert-dialog, scroll-area)
- shadcn/ui (new-york style) - Component library built on Radix (`components.json`)
- Lucide React 0.563.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- cmdk 1.1.1 - Command palette
- driver.js 1.4.0 - Interactive tour/guide library

**Data Processing:**
- DuckDB 1.4.4 - In-process OLAP database (server-only, patched via `patches/duckdb+1.4.4.patch`)
- Apache Arrow 21.1.0 - Columnar data format for streaming
- @loaders.gl/arrow 4.4.3 - Arrow data loading
- @loaders.gl/core 4.4.3 - Generic data loading framework
- @math.gl/web-mercator 4.1.0 - Web Mercator projection utilities

**Testing:**
- Vitest 4.1.9 - Unit testing framework
- React Test Renderer 19.2.7 - Component testing
- jsdom 28.1.0 - DOM environment for tests

**Build/Dev:**
- ESLint 9.39.4 - Linting with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript 5.9.3 - Static type checking (strict mode)
- Tailwind CSS 4.3.1 - Utility-first CSS framework
- @tailwindcss/postcss 4.3.1 - CSS processing
- tw-animate-css 1.4.0 - Animation utilities
- patch-package 8.0.1 - Patching node_modules (duckdb patch)

## Key Dependencies

**Critical:**
- `duckdb` 1.4.4 - Local OLAP database for processing 8.5M+ crime records; serverExternalPackages configured in `next.config.ts`; requires postinstall script for binding symlinks
- `next` 16.2.9 - Core framework; handles routing, API routes, SSR/SSG; build disabled turbopack
- `react`/`react-dom` 19.2.7 - UI rendering
- `zustand` 5.0.14 - Global state management across 57 stores; slice-domain pattern for complex state
- `@tanstack/react-query` 5.101.0 - Server state management; used in `useCrimeData`, `useViewportCrimeData`, and all data-fetching hooks

**Infrastructure:**
- `apache-arrow` 21.1.0 - Columnar data format for streaming crime data between API routes and client
- `@loaders.gl/arrow` 4.4.3 - Arrow data loading for client-side consumption
- `three` 0.182.0 - 3D rendering for space-time cube visualization
- `maplibre-gl` 5.24.0 - Map rendering engine for 2D map view
- `deck.gl` 9.3.4 - WebGL data visualization layers (heatmaps, grids)
- `density-clustering` 1.3.0 - Clustering algorithms for hotspot detection
- `d3-scale` 4.0.2 - Data scaling for visualizations
- `date-fns` 4.4.0 - Date formatting/manipulation
- `lodash.debounce` 4.0.8 - Debounce utility for UI interactions
- `clsx` 2.1.1 + `tailwind-merge` 3.6.0 + `class-variance-authority` 0.7.1 - Tailwind class management

## Configuration

**Environment:**
- `.env` - `USE_MOCK_DATA=false`, `NEXT_PUBLIC_API_BASE_URL=` (empty)
- `.env.local` - Convex deployment config (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`)
- Optional: `DUCKDB_PATH` - Custom database location
- Optional: `DISABLE_DUCKDB` - Force mock data mode
- Optional: `DUCKDB_THREADS` - Thread count (default: 2)
- Optional: `STKDE_QA_FULL_POP_ENABLED` - Enable full-population STKDE

**Build:**
- `next.config.ts` - Next.js configuration (serverExternalPackages: ['duckdb'], turbopack root)
- `tsconfig.json` - TypeScript with `@/*` path alias mapping to `./src/*`, strict mode, ES2017 target
- `postcss.config.mjs` - PostCSS with `@tailwindcss/postcss`
- `vitest.config.mts` - Vitest with node environment, `@/*` alias
- `eslint.config.mjs` - ESLint 9 with next core-web-vitals + typescript rules
- `components.json` - shadcn/ui configuration (new-york style, neutral base color, css variables)
- `pnpm-workspace.yaml` - Only built dependencies for duckdb

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- 8GB+ RAM recommended for DuckDB operations
- ~500MB disk space for crime dataset + DuckDB cache

**Production:**
- Node.js server (Next.js standalone or Node server)
- 8GB+ RAM for optimal DuckDB performance
- DuckDB binding symlinks (handled by postinstall script)

**Build Notes:**
- Build command: `NEXT_DISABLE_TURBOPACK=1 next build` (turbopack explicitly disabled)
- DuckDB requires `serverExternalPackages` to avoid bundling issues
- Postinstall script patches duckdb and creates binding symlinks

---

*Stack analysis: 2026-07-14*

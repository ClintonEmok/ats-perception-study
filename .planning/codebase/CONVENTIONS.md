# Code Conventions

**Analysis Date:** 2026-07-14

## Language & Tooling

- **TypeScript 5.9.3** with strict mode enabled (`"strict": true` in `tsconfig.json`)
- **React 19.2.7** with Next.js 16.2.9 (App Router)
- **ESLint 9** with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No Prettier or Biome — formatting is handled by ESLint and editor defaults
- Target: `ES2017`, module: `esnext`, moduleResolution: `bundler`
- Path alias: `@/*` maps to `./src/*` — use consistently for all internal imports

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `DualTimeline.tsx`, `CubeVisualization.tsx`, `MapVisualization.tsx`)
- Stores: `usePascalCaseStore.ts` (e.g., `useCoordinationStore.ts`, `useFilterStore.ts`, `useTimeStore.ts`)
- Lib utilities: `camelCase.ts` (e.g., `slice-utils.ts`, `date-normalization.ts`, `adaptive-scale.ts`)
- Types: `camelCase.ts` in `src/types/` (e.g., `crime.ts`)
- Workers: `camelCase.worker.ts` (e.g., `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- Tests: `*.test.ts` or `*.test.tsx` suffix, co-located with source
- Phase-specific tests: `*.phase{N}.test.ts` suffix (e.g., `CubeVisualization.phase13.test.ts`)
- Custom hooks: `usecamelCase.ts` in `src/hooks/` or colocated in component directories

**Functions:**
- camelCase: `normalizeToPercent()`, `generateBins()`, `computeAdaptiveY()`
- Hooks: `use` prefix — `useAutoBurstSlices()`, `useViewportCrimeData()`, `usePointSelection()`
- Boolean getters: `is`/`has`/`should` prefix — `isValid`, `isComputing`, `hasOverlap`
- Event handlers: `handle` prefix or `on` prefix — `handleBrushChange`, `onPointerEnter`

**Variables:**
- camelCase: `realTime`, `minTime`, `mapDomain`, `warpFactor`
- UPPER_SNAKE_CASE for constants: `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BURST_TOLERANCE_RATIO`
- Boolean state: `is` prefix — `isPlaying`, `isComputing`, `isLoading`, `isMock`
- Tuple ranges: `[start, end]` pattern — `timeRange`, `mapDomain`, `range`

**Types:**
- PascalCase for interfaces and type aliases: `CrimeRecord`, `TimeSlice`, `CoordinationState`
- Prefixed with domain context: `SliceCoreState`, `SliceSelectionState`, `SliceCreationState`
- Props interfaces: `ComponentNameProps` (e.g., `CubeVisualizationProps`, `MapVisualizationProps`)
- Export type inline at top of file when simple: `export type SelectionSource = 'cube' | 'timeline' | 'map' | null`

## Import Organization

**Order (observed in practice):**
1. React / framework imports: `import React, { useCallback } from 'react'`
2. Third-party libraries: `import { useStore } from 'zustand'`, `import { bin } from 'd3-array'`
3. Internal hooks: `import { useMeasure } from '@/hooks/useMeasure'`
4. Internal stores: `import { useFilterStore } from '@/store/useFilterStore'`
5. Internal lib utilities: `import { normalizedToEpochSeconds } from '@/lib/time-domain'`
6. Types: `import type { CrimeRecord } from '@/types/crime'`
7. Relative imports for same-directory: `import { DualTimelineSurface } from './DualTimelineSurface'`

**Path Aliases:**
- `@/*` for all `src/` imports — use this consistently, never use relative paths that traverse up more than one level
- Relative imports (`./`) only for same-directory or sibling files

## Code Style

**Formatting:**
- 2-space indentation
- Semicolons at end of statements
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Arrow functions for callbacks and inline functions
- Explicit return types for complex public functions (not enforced everywhere)

**Component Patterns:**
- `"use client"` directive at top of client components
- Default exports for page components, named exports for reusable components
- Destructured props with defaults in function signature
- Store access via `useStore(store, selector)` pattern for performance (not direct hook calls)
- `useMemo` / `useCallback` for expensive computations and stable references
- `useRef` for mutable values that shouldn't trigger re-renders

**Store Patterns:**
- Zustand `create` with typed state interfaces
- Actions defined inline in the store (not separate action creators)
- Slice-domain pattern for complex stores: separate `createSliceCoreSlice.ts`, `createSliceSelectionSlice.ts`, etc.
- `persist` middleware with `createJSONStorage` for localStorage-backed stores
- Noop localStorage shim for test environments (see `useAdaptiveStore.ts`)

## JSDoc Documentation

- Used sparingly — primarily on complex functions or non-obvious logic
- Example from `src/lib/logger.ts`: multi-line JSDoc explaining Phase 80 semantics
- Example from `src/types/crime.ts`: per-field documentation on canonical types
- Most functions rely on descriptive naming and type signatures instead of JSDoc

## Error Handling

- API routes return mock data with `X-Data-Warning` header on DuckDB failures
- Stores manage `isLoading`, `isFetching`, `error` states for async operations
- `LoggerService` class (`src/lib/logger.ts`) for client-side logging with retry queue
- `useLogger` hook for component-level logging
- Try/catch around async operations with graceful fallbacks
- Null/undefined checks with optional chaining (`?.`) and nullish coalescing (`??`)

## React Component Patterns

**Structure:**
- `"use client"` at top for client components
- Interface for props defined above component
- Default export for page-level components
- Named exports for reusable UI components
- Hooks called at top, early returns for loading/error states
- JSX return at bottom

**State Access:**
- Zustand stores accessed via `useStore(store, selector)` for granular subscriptions
- Multiple store selectors destructured individually (not one big selector)
- `useEffect` for side effects with proper dependency arrays
- `useMemo` for derived data computations
- `useRef` for values that persist across renders without causing re-renders

**Composition:**
- Container/presentational split (e.g., `TimelineContainer` + `DualTimelineSurface`)
- Layer-based composition for complex visualizations (e.g., `AxisLayer`, `MarkerLayer`, `HistogramLayer`)
- Store override pattern for testing: `filterStoreOverride`, `coordinationStoreOverride` props

## Module Patterns

- Pure functions in `src/lib/` — no React dependencies, easily testable
- Store slices composed via `StateCreator` pattern in `src/store/slice-domain/`
- Query builders with fluent API in `src/lib/queries/`
- Type definitions centralized in `src/types/`
- Custom hooks in `src/hooks/` for shared React logic
- Workers in `src/workers/` for heavy computation off main thread

## Special Patterns

**Contract Tests:**
- Phase-specific tests read source files with `readFileSync` and assert on string patterns
- Used to lock in UI text, component composition, and store shape across phases
- Example: `src/components/viz/CubeVisualization.phase13.test.ts` asserts source contains specific strings

**Store Override Pattern:**
- Components accept `*StoreOverride` props for testability
- Enables injecting mock stores without modifying component internals
- Pattern: `const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore`

**Normalized Coordinates:**
- Crime data uses dual coordinate system: geographic (`lat`, `lon`) and normalized (`x`, `z`)
- Normalization helpers in `src/lib/coordinate-normalization.ts` and `src/lib/date-normalization.ts`
- Time normalized to 0-100 range for visualization, epoch seconds for storage/comparison

---

*Convention analysis: 2026-07-14*

<!-- generated-by: gsd-doc-writer -->
# Development Guide

This document describes the project's development conventions, architecture patterns, and workflows for contributors working on the Adaptive Space-Time Cube Prototype ("Quiet Tiger").

## Local Setup

1. **Prerequisites**: Node.js 20+, pnpm 9.x, 8GB+ RAM (recommended for DuckDB operations).
2. **Fork and clone** the repository:
   ```bash
   git clone <repo-url>
   cd adaptive-space-time-cube
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
   The `postinstall` script runs `patch-package` and creates a DuckDB native binding symlink automatically.
4. **Environment configuration**:
   A `.env` file is already present at the project root with `USE_MOCK_DATA=false` by default. Set `USE_MOCK_DATA=true` or `DISABLE_DUCKDB=true` to use mock data instead.
5. **Data setup** (required for DuckDB mode):
   Place the Chicago crime dataset CSV at `data/sources/Crimes_-_2001_to_Present_20260114.csv`. DuckDB will create its cache database at `data/cache/crime.duckdb` on first query.
6. **Start the dev server**:
   ```bash
   pnpm dev
   ```
   The application is available at `http://localhost:3000`.

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Next.js development server with hot reload |
| `pnpm build` | Production build (turbopack disabled via `NEXT_DISABLE_TURBOPACK=1`) |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint with Next.js core-web-vitals and TypeScript rules |
| `pnpm typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `pnpm test` | Run all tests with Vitest |

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── page.tsx      # Dashboard demo root
│   ├── dashboard-demo/ # Direct dashboard demo alias
│   ├── stkde/        # Shared STKDE view models
│   ├── stkde-3d/     # Shared 3D STKDE components and math
│   ├── stats/        # Shared statistics view model
│   ├── api/          # Route handlers (crime, stkde, adaptive, neighbourhood, study)
│   ├── layout.tsx    # Root layout (theme, query client, toaster)
│   └── globals.css   # Tailwind CSS v4 + shadcn/ui theme variables
├── components/       # React components organized by feature
│   ├── dashboard-demo/ # Dashboard demo shell and workflow panels
│   ├── layout/       # ThemeProvider
│   ├── map/          # MapLibre GL components (MapBase, layers, overlays)
│   ├── timeline/     # Demo timeline and shared density surface
│   ├── viz/          # Shared 3D scene primitives and overlays
│   ├── ui/           # shadcn/ui primitives (button, dialog, slider, etc.)
│   ├── stkde/        # STKDE-specific components
│   ├── study/        # Study controls and logging
│   └── ui/            # shadcn/ui primitives
├── store/            # Zustand state stores
│   ├── slice-domain/ # Slice domain state slices (core, selection, creation, adjustment)
│   ├── useXxxStore.ts # Individual stores by domain
│   └── ui.ts         # UI mode/reset store
├── hooks/            # Custom React hooks
├── lib/              # Pure functions and utilities
│   ├── queries/      # Query builders, filters, sanitization
│   ├── binning/      # Time binning engine, burst taxonomy, warp scaling
│   ├── stkde/        # STKDE computation, heatmap scaling, burst evolution
│   ├── adaptive/     # Adaptive binning mode resolution
│   ├── stores/       # Standalone Zustand stores (e.g., viewportStore)
│   ├── db.ts         # DuckDB connection and initialization
│   └── logger.ts     # LoggerService for study event logging
├── types/            # Canonical TypeScript type definitions
├── workers/          # Web Workers (adaptive time, STKDE hotspot, KDE slice)
├── providers/        # React context providers
└── utils/            # Shared utility functions
```

## Code Conventions

### Naming

| Category | Convention | Example |
|----------|-----------|---------|
| React components | PascalCase | `DashboardHeader.tsx`, `DualTimeline.tsx` |
| Hooks | camelCase prefix `use` | `useCrimeData.ts`, `useDebounce.ts` |
| Stores | PascalCase prefix `use` suffix `Store` | `useFilterStore.ts`, `useAdaptiveStore.ts` |
| Workers | camelCase suffix `.worker` | `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts` |
| Pure functions | camelCase | `normalizeToPercent()`, `generateBins()` |
| Constants | UPPER_SNAKE_CASE | `OVERVIEW_HEIGHT`, `BATCH_SIZE`, `DETAIL_HEIGHT` |
| Types/Interfaces | PascalCase | `CrimeRecord`, `UseCrimeDataResult` |
| Test files | Same as source with `.test` suffix | `slice-utils.test.ts`, `useSliceStore.test.ts` |

### Imports

- Use the `@/*` path alias (maps to `./src/*`):
  ```typescript
  import { useFilterStore } from '@/store/useFilterStore';
  import { CrimeRecord } from '@/types/crime';
  ```
- Group imports: React → third-party → internal modules.
- Use `import type` for type-only imports where possible:
  ```typescript
  import type { CrimeRecord } from '@/types/crime';
  ```

### Code Style

- 2-space indentation.
- Semicolons at end of statements.
- Single quotes for strings.
- Trailing commas in multi-line objects and arrays.
- Arrow functions for callbacks.
- Explicit return types for complex functions.

### TypeScript

- Strict mode enabled (`"strict": true` in `tsconfig.json`).
- `moduleResolution: "bundler"` for optimal Next.js and modern bundler compatibility.
- Use the `unknown` type instead of `any` for type-unsafe values; use `as` casts only when necessary.

## Component Patterns

### Client Components

All interactive components use the `"use client"` directive:

```tsx
"use client";

import React from 'react';
import { useFilterStore } from '@/store/useFilterStore';

interface MyComponentProps {
  className?: string;
}

export function MyComponent({ className = '' }: MyComponentProps) {
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  // ...
}
```

### Props Interface Pattern

Define a `ComponentNameProps` interface above the component, with all optional props having defaults:

```tsx
interface DashboardHeaderProps {
  className?: string;
}
```

### 3D Components (React Three Fiber)

Three.js scenes use R3F's `Canvas` component via the `Scene` wrapper. Sub-components are children rendered inside the canvas context:

```tsx
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';

<Scene>
  <CameraControls ref={controlsRef} />
  <DataPoints />
  <Grid />
  <TimePlane />
</Scene>
```

### Map Components (MapLibre GL)

Map rendering wraps `react-map-gl/maplibre`. The `MapBase` component handles the base map while overlay components (heatmap, layers, selection) are rendered as children:

```tsx
<MapBase ref={mapRef}>
  <MapHeatmapOverlay />
  <MapSelectionOverlay />
  <MapClusterHighlights />
</MapBase>
```

### shadcn/ui Components

Reusable UI primitives live in `src/components/ui/` and follow the shadcn/ui pattern with `cva` (class-variance-authority) for variant management. They use Radix UI under the hood for accessibility.

## State Management Patterns

### Zustand Stores

Most state is managed via Zustand stores following a consistent pattern:

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Fine-Grained Selectors

To prevent cascade re-renders, components subscribe to specific slices of state rather than the entire store:

```tsx
// Good — only re-renders when selectedTypes changes
const selectedTypes = useFilterStore((state) => state.selectedTypes);

// Good — fine-grained selector for coordination state
const workflowPhase = useCoordinationStore((state) => state.workflowPhase);
const syncStatus = useCoordinationStore((state) => state.syncStatus);
```

### useShallow for Object Selectors

When selecting derived data that returns a new reference each time, use `useShallow` from `zustand/react/shallow`:

```tsx
import { useShallow } from 'zustand/react/shallow';

const appliedSlices = useSliceDomainStore(
  useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
);
```

### Slice Domain Pattern

The slice domain (`src/store/slice-domain/`) uses Zustand's `StateCreator` type to compose multiple slice concerns into a single store. Each slice (core, selection, creation, adjustment) is defined as a separate file with its own state and actions, then combined in the domain store:

```
src/store/slice-domain/
├── types.ts                    # Combined SliceDomainState type
├── createSliceCoreSlice.ts     # CRUD operations for slices
├── createSliceSelectionSlice.ts # Multi-select and toggle
├── createSliceCreationSlice.ts  # Click/drag creation with snap
├── createSliceAdjustmentSlice.ts # Drag handle adjustment
└── selectors.ts                # Derived data selectors
```

### Store Override Pattern

For testing and sandbox views, stores accept optional override props that allow injecting mock stores:

```tsx
interface Props {
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
}

// Inside component:
const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
```

### External Store Integration

Some stores live in `src/lib/stores/` (e.g., `viewportStore.ts`) when they function as standalone utility stores shared across component layers.

## Data Fetching

### API Routes

Next.js Route Handlers in `src/app/api/` process crime data queries using DuckDB:

```typescript
// src/app/api/crime/bins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBins } from '@/lib/duckdb-aggregator';
import { isMockDataEnabled } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Parse query params, query DuckDB or mock, return JSON
}
```

API routes that use DuckDB must export `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. DuckDB is configured as a `serverExternalPackage` in `next.config.ts`.

### TanStack Query Integration

Data fetching uses TanStack Query (React Query) via custom hooks:

```typescript
// src/hooks/useCrimeData.ts
import { useQuery } from '@tanstack/react-query';
import { CrimeRecord, UseCrimeDataOptions, UseCrimeDataResult } from '@/types/crime';

export function useCrimeData(options: UseCrimeDataOptions): UseCrimeDataResult {
  const queryKey = ['crimes', 'viewport', start, end, bufferDays, limit, crimeTypes, districts];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCrimesInRange(/* ... */),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: shouldEnableQuery,
  });

  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    // ...
  };
}
```

### QueryProvider Configuration

The `QueryProvider` at `src/providers/QueryProvider.tsx` wraps the application with default settings:

- `staleTime`: 5 minutes
- `gcTime`: 10 minutes (formerly `cacheTime`)
- `refetchOnWindowFocus`: false
- `retry`: 1 for queries, 0 for mutations

## Testing Approach

### Framework

- **Vitest** for unit and integration tests.
- **jsdom** for DOM environment when testing React components.
- **React Test Renderer** for component-level snapshot/render tests.

### Test Configuration

Vitest is configured in `vitest.config.mts`:
- Test files match `src/**/*.test.ts` and `src/**/*.test.tsx`.
- The `@/` alias resolves to `./src/`.
- Default environment is `node`.

### Test Organization

Tests are **co-located** next to their source files:

```
src/lib/slice-utils.ts
src/lib/slice-utils.test.ts

src/store/useAdaptiveStore.ts
src/store/useAdaptiveStore.test.ts
src/store/useAdaptiveStore.contract.test.ts

src/workers/adaptiveTime.worker.ts
src/workers/adaptiveTime.worker.test.ts
```

### Test Patterns

**Store tests** use `vi.fn()` for mocks and test via `getState()`:

```typescript
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useSliceStore } from './useSliceStore';

beforeEach(() => {
  useSliceStore.getState().clearSlices();
});

describe('slice store actions', () => {
  test('supports CRUD operations for point and range slices', () => {
    const store = useSliceStore.getState();
    store.addSlice({ time: 50 });
    expect(useSliceStore.getState().slices.length).toBe(1);
  });
});
```

**Worker tests** mock `globalThis.Worker` to avoid actual worker instantiation:

```typescript
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'Worker', { value: MockWorker, configurable: true });
});
```

**Component tests** follow the same pattern with React test renderer when needed.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific file
pnpm test -- src/lib/slice-utils.test.ts

# Run tests in watch mode
pnpm test -- --watch
```

## Linting and Type Checking

- **ESLint 9** with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` rules.
  Config: `eslint.config.mjs`.
  ```bash
  pnpm lint
  ```
- **TypeScript** type checking (strict mode):
  ```bash
  pnpm typecheck
  ```
- Both are enforced in CI.

## Adding New Features

### File Organization Guide

1. **Page/Route**: Add a new directory under `src/app/` for a new route. For API endpoints, add under `src/app/api/`.
2. **Component**: Create a new `.tsx` file in the appropriate feature directory under `src/components/`. If the component spans multiple features, create a new feature directory.
3. **Store**: Add a new `useXxxStore.ts` in `src/store/`. Use the Zustand `create` function with a typed interface.
4. **Hook**: Add a new `useXxx.ts` in `src/hooks/`. Prefer custom hooks over inline logic in components.
5. **Library code**: Pure functions and business logic go in `src/lib/`. Group related functions into subdirectories.
6. **Type**: Add to `src/types/`. Define interfaces and types with JSDoc comments explaining each field.
7. **Worker**: Add a new `.worker.ts` file in `src/workers/` for heavy computation that must run off the main thread.
8. **Test**: Create a `*.test.ts` or `*.test.tsx` file co-located with the source file being tested.

### Decision Flow

When adding a new feature:

1. Ask: Does this need server-side data processing? → Add an API route in `src/app/api/`.
2. Ask: Does this need persistent state across components? → Add a Zustand store.
3. Ask: Is this computationally expensive? → Offload to a Web Worker.
4. Ask: Does this need to be cached? → Use TanStack Query in a custom hook.
5. Ask: Is this a reusable UI pattern? → Add a shadcn/ui component or a component in the appropriate feature folder.

### DuckDB Notes

- DuckDB is a `serverExternalPackage` in `next.config.ts` — it only runs on the server.
- API routes using DuckDB must have `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- The database file is cached at `data/cache/crime.duckdb` after the first query.
- Mock data is returned when DuckDB is disabled (via env vars) or when queries fail, with an `X-Data-Warning` header set on the response.

## Branch Conventions

Branch naming follows standard descriptive patterns:

```text
feat/my-feature-name
fix/issue-description
refactor/what-is-changed
docs/what-is-documented
```

The project has no formal CONTRIBUTING.md. See [DEVELOPMENT.md](DEVELOPMENT.md) for code conventions and build commands.

## Error Handling

- **API routes**: Catch errors and return mock data with an `X-Data-Warning` header.
- **Stores**: Track `isLoading`, `isFetching`, and `error` properties for async operations.
- **Logger**: `LoggerService` in `src/lib/logger.ts` batches events and flushes periodically using `navigator.sendBeacon` for reliability during page unload.
- **useLogger hook**: Wraps `LoggerService` for component-level logging.

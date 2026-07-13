# Testing Approach

**Analysis Date:** 2026-07-14

## Framework

- **Vitest 4.1.9** — unit testing framework
- **Config:** `vitest.config.mts` at project root
- **Environment:** `node` (default), some tests use `/* @vitest-environment node */` pragma
- **React Testing:** `react-test-renderer` 19.2.7 (not React Testing Library)
- **DOM Environment:** `jsdom` 28.1.0 (available but not default)
- **Assertion Library:** Vitest's built-in `expect` (Chai-compatible)

## Test Location

**Pattern:** Co-located with source files, same directory, `.test.ts` / `.test.tsx` suffix

**Examples:**
- `src/store/useFilterStore.ts` → `src/store/useFilterStore.test.ts`
- `src/lib/slice-utils.ts` → `src/lib/slice-utils.test.ts`
- `src/components/viz/CubeVisualization.tsx` → `src/components/viz/CubeVisualization.phase13.test.ts`
- `src/app/api/crime/overview/route.ts` → `src/app/api/crime/overview/route.test.ts`

**Total test files:** ~119

## Test Structure

**Basic pattern:**
```typescript
import { describe, expect, test } from 'vitest';
import { functionName } from './module';

describe('functionName', () => {
  test('does expected behavior', () => {
    expect(functionName(input)).toBe(expected);
  });
});
```

**Store test pattern:**
```typescript
import { beforeEach, describe, expect, test } from 'vitest';
import { useFilterStore } from './useFilterStore';

beforeEach(() => {
  useFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
  });
});

describe('useFilterStore', () => {
  test('saves presets with current filter state', () => {
    useFilterStore.setState({ selectedTypes: [1, 2] });
    const preset = useFilterStore.getState().savePreset('Test');
    expect(preset).not.toBeNull();
  });
});
```

**Contract test pattern (phase-specific):**
```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 13 / CubeVisualization contract', () => {
  test('keeps relational shell language', () => {
    const source = readFileSync(
      new URL('./CubeVisualization.tsx', import.meta.url), 'utf8'
    );
    expect(source).toMatch(/Relational mode/);
    expect(source).not.toMatch(/raw browser/);
  });
});
```

## Test Patterns

**Mocking with `vi.hoisted`:**
```typescript
const { getDbMock, isMockDataEnabledMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
  isMockDataEnabled: isMockDataEnabledMock,
}));

import { queryCrimesInRange } from './queries';
```

**Mocking localStorage (for stores with persist):**
```typescript
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
};

vi.stubGlobal('localStorage', createLocalStorageMock());
```

**Hook testing with react-test-renderer:**
```typescript
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

const HookProbe = ({ options, onUpdate }) => {
  const result = useCrimeData(options);
  useEffect(() => { onUpdate(result); }, [onUpdate, result]);
  return null;
};

// Create renderer, update with new options, wait for settled result
const renderer = TestRenderer.create(React.createElement(App));
await act(async () => {
  renderer.update(React.createElement(App));
  await Promise.resolve();
});
```

**API route testing:**
```typescript
// @vitest-environment node
const { GET } = await import('./route');

test('returns bins from DuckDB', async () => {
  const response = await GET(new Request('http://localhost/api/crime/overview'));
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ... });
});
```

## Coverage

**Requirements:** None enforced (no coverage thresholds in vitest config)

**View Coverage:**
```bash
pnpm vitest --coverage
```

## Running Tests

```bash
pnpm test                    # Run all tests (watch mode)
pnpm vitest run              # Run all tests once
pnpm vitest <pattern>        # Run tests matching pattern
pnpm vitest --reporter=verbose  # Verbose output
```

## Test Types

**Unit Tests (majority):**
- Pure function testing in `src/lib/` — no mocking needed
- Store state management testing — direct state manipulation via `setState`/`getState`
- Type validation and contract tests

**Integration Tests:**
- API route tests with mocked DuckDB (`src/app/api/*/route.test.ts`)
- Hook tests with mocked query client (`src/hooks/useCrimeData.test.ts`)
- Store tests with mocked localStorage

**Contract/Phase Tests:**
- Read source files and assert on string patterns
- Lock in UI text, component composition, store shape
- Named with `.phase{N}.test.ts` suffix
- Prevent regression across development phases

**E2E Tests:** Not used — no Playwright, Cypress, or similar

## Common Patterns

**Before Each Cleanup:**
```typescript
beforeEach(() => {
  useFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
  });
});
```

**Store State Assertion:**
```typescript
expect(useFilterStore.getState().selectedTypes).toEqual([1, 2]);
```

**Async Store Operations:**
```typescript
const store = useFilterStore.getState();
const preset = store.savePreset('Test');
expect(useFilterStore.getState().presets).toHaveLength(1);
```

**Mock Reset:**
```typescript
beforeEach(() => {
  vi.restoreAllMocks();
  hoisted.getDbMock.mockReset();
  hoisted.getDbMock.mockReturnValue(false);
});
```

**Source File Assertion (contract tests):**
```typescript
const source = readFileSync(
  new URL('./Component.tsx', import.meta.url), 'utf8'
);
expect(source).toMatch(/expected text/);
expect(source).not.toMatch(/forbidden text/);
```

## Key Files

**Test Config:**
- `vitest.config.mts` — Vitest configuration, path aliases, environment settings

**Test Directories:**
- `src/store/*.test.ts` — Store unit tests
- `src/lib/*.test.ts` — Pure function unit tests
- `src/app/api/*/route.test.ts` — API route integration tests
- `src/components/**/*.test.ts(x)` — Component contract and unit tests
- `src/hooks/*.test.ts` — Hook integration tests
- `src/workers/*.test.ts` — Web Worker tests

---

*Testing analysis: 2026-07-14*

# Testing Patterns

**Analysis Date:** 2026-06-27

## Test Stack

### TypeScript — Vitest

| Tool | Version | Purpose |
|---|---|---|
| **Vitest** | 4.0.18 | Test runner, configured in `vitest.config.mts` |
| **React Test Renderer** | 19.1.0 | Component testing in `jsdom` environment |
| **jsdom** | 28.0.0 | DOM environment for hook / component tests |

Config (`vitest.config.mts`):

```ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(rootDir, './src') },
  },
});
```

The default environment is `node`; tests that need `window`/`document` (Zustand persist, browser globals) opt in with the file-level pragma:

```typescript
/* @vitest-environment node */
// or
// @vitest-environment node
```

For example: `src/store/useFilterStore.test.ts`, `src/store/useTimeStore.test.ts`, `src/app/api/crime/overview/route.test.ts`, `src/app/api/study/log/route.test.ts`, and `src/app/cube-sandbox/lib/intervalProposalEngine.test.ts` all carry the `// @vitest-environment node` pragma.

### Python — stdlib `unittest`

The sibling under `scripts/synthetic/` uses **only the Python standard library** (no pytest, no ruff, no pyproject.toml in the repo). It supports two run modes:

```bash
# Direct execution (script-style)
python scripts/synthetic/test_generate_bursty.py

# unittest discovery (imports the module path)
python -m unittest scripts.synthetic.test_generate_bursty
```

The script ends with `if __name__ == "__main__": unittest.main(verbosity=2)` so it runs as a script with `verbosity=2` and also imports cleanly under `unittest` discovery.

### Commands

```bash
# TypeScript / Vitest
pnpm test                  # vitest (default: run mode, all tests)
pnpm test --watch          # vitest --watch (manual)
pnpm test -- path/to/foo.test.ts   # single-file run
pnpm test -- --coverage    # if @vitest/coverage is added (not currently)

# Python sibling
python scripts/synthetic/test_generate_bursty.py
python -m unittest scripts.synthetic.test_generate_bursty
```

There is **no coverage tool** in the repo today (no `@vitest/coverage` dep, no `coverage` config in `vitest.config.mts`, no `--coverage` script in `package.json`). Coverage is not enforced.

## Test File Organization

### Location: co-located

Tests live next to the source they cover. The Vitest config only picks up `src/**/*.test.{ts,tsx}`.

```
src/
├── lib/
│   ├── slice-utils.ts
│   ├── slice-utils.test.ts          # co-located
│   ├── date-normalization.ts
│   ├── date-normalization.test.ts
│   ├── synthetic/
│   │   ├── goh-barabasi.ts
│   │   ├── goh-barabasi.test.ts     # co-located
│   │   ├── csv-export.ts
│   │   ├── prng.ts
│   │   └── types.ts
│   └── study/
│       ├── storage.test.ts
│       ├── protocol.test.ts
│       ├── condition-order.test.ts
│       └── resetTargets.test.ts
├── store/
│   ├── useSliceStore.ts
│   ├── useSliceStore.test.ts        # co-located
│   ├── useCoordinationStore.test.ts
│   └── ... (16 store tests)
├── workers/
│   ├── adaptiveTime.worker.ts
│   └── adaptiveTime.worker.test.ts  # co-located
├── hooks/
│   ├── useCrimeData.ts
│   ├── useCrimeData.test.ts
│   └── useSuggestionGenerator.test.ts
├── components/
│   ├── timeline/
│   │   ├── DualTimeline.tsx
│   │   ├── DualTimeline.tick-rollout.test.ts        # topic-suffixed
│   │   ├── DualTimeline.refactor.test.tsx
│   │   ├── DualTimeline.detailBins.test.ts
│   │   ├── DemoDualTimeline.refactor.test.tsx
│   │   └── DemoTimelinePanel.phase13.test.ts
│   ├── dashboard-demo/lib/
│   │   ├── demo-burst-generation.ts
│   │   ├── demo-burst-generation.test.ts
│   │   ├── useDemoStkde.phase2.test.ts
│   │   └── useDemoEvolutionSequence.test.ts
│   └── viz/
│       ├── CubeVisualization.tsx
│       ├── CubeVisualization.phase13.test.ts
│       ├── CubeVisualization.stkde.test.ts
│       ├── stkde-overlay.phase2.test.ts
│       └── cluster-interaction.phase5.test.tsx
└── app/
    ├── api/
    │   ├── crime/overview/route.ts
    │   ├── crime/overview/route.test.ts            # co-located with route
    │   ├── crimes/range/route.test.ts
    │   ├── stkde/hotspots/route.test.ts
    │   └── study/log/route.test.ts
    ├── dashboard/page.shell.test.tsx                # page-level shell contract
    ├── dashboard-demo/page.shell.test.tsx
    ├── stkde/page.stkde.test.ts
    ├── stkde-3d/page.stkde.test.ts
    └── demo/non-uniform-time-slicing/showcase.test.tsx
```

> **Naming detail.** Some test files use a `<unit>.<topic>.test.ts` suffix to mark phase-scoped or topic-scoped test sets, e.g. `CubeVisualization.phase13.test.ts`, `useDemoStkde.phase2.test.ts`, `demo-burst-generation.test.ts`, `page.shell.test.tsx`. Pure unit tests stay `*.test.ts`.

### Python: sibling layout

```
scripts/
├── synthetic/
│   ├── __init__.py                  # empty (treats dir as package)
│   ├── generate_bursty.py           # 659 lines
│   └── test_generate_bursty.py      # 397 lines, 38 tests
```

The Python `test_generate_bursty.py` mirrors `src/lib/synthetic/goh-barabasi.test.ts` (the 26-test Vitest suite) and intentionally keeps its own helper layout to stay self-contained.

## Test Structure

### Vitest describe / test / expect

The standard shape is `describe('unit or topic')` → `it('behavior')` or `test('behavior')` (both are used interchangeably). The `test` alias is slightly more common in store tests; `it` shows up more in component / hook tests. There is **no BDD-style `describe.each` or `it.each` in the current suite** — table tests are inlined with `for` loops.

```typescript
// src/lib/slice-utils.test.ts
import { describe, expect, test } from 'vitest';
import { withinTolerance, calculateRangeTolerance, rangesMatch, slicesOverlapWithinTolerance } from './slice-utils';

describe('withinTolerance', () => {
  test('accepts values inside tolerance', () => {
    expect(withinTolerance(10.1, 10, 0.2)).toBe(true);
  });

  test('rejects values outside tolerance', () => {
    expect(withinTolerance(10.3, 10, 0.2)).toBe(false);
  });
});

describe('calculateRangeTolerance', () => {
  test('calculates tolerance from span using default percent', () => {
    expect(calculateRangeTolerance([20, 40])).toBeCloseTo(0.1);
  });
});
```

```typescript
// src/lib/date-normalization.test.ts
describe('normalizeToPercent', () => {
  const minTime = 978307200; // 2001-01-01
  const maxTime = 1767571200; // 2026-01-01

  test('returns 0 for minTime', () => {
    expect(normalizeToPercent(minTime, minTime, maxTime)).toBe(0);
  });

  test('clamps values over max to 100', () => {
    expect(normalizeToPercent(maxTime + 1000, minTime, maxTime)).toBe(100);
  });
});
```

### Assertions

Common Vitest matchers used in this codebase:

| Matcher | Used for |
|---|---|
| `expect(x).toBe(y)` | Strict equality (`null`, `undefined`, primitives) |
| `expect(x).toEqual(y)` | Deep equality for objects / arrays |
| `expect(x).toBeCloseTo(y, 6)` | Float comparisons (`lat`/`lon`, normalized coords) |
| `expect(x).toBeGreaterThan(y)` / `toBeLessThan` / `toBeGreaterThanOrEqual` | Range checks on timestamps, counts, metrics |
| `expect(x).toMatchObject({ ... })` | Partial structural match (legend entries, hotspots) |
| `expect(x).toContain(y)` | Array / string contains |
| `expect(x).toHaveLength(n)` | Length check |
| `expect(x).toHaveBeenCalledTimes(n)` | Mock call count |
| `expect(x).toHaveBeenCalledWith(...)` | Mock call args |
| `expect(fn).toThrow()` | Error path (e.g. `resolveConfig({ alpha: 1 })`) |
| `expect(() => fn()).rejects.toThrow('msg')` | Async error path (rare; mostly `.resolves.toBe(...)`) |
| `expect(arr).not.toEqual(other)` | Negative case (different seeds → different sequences) |

### Setup / teardown

```typescript
// src/store/useSliceStore.test.ts
import { beforeEach, describe, expect, test } from 'vitest';
import { useSliceStore } from './useSliceStore';

beforeEach(() => {
  useSliceStore.getState().clearSlices();
});
```

```typescript
// src/store/useCoordinationStore.test.ts
beforeEach(() => {
  useCoordinationStore.setState({
    selectedIndex: null,
    selectedSource: null,
    lastInteractionAt: null,
    // ... full state reset to baseline
    workflowPhase: 'generate',
    syncStatus: { status: 'synchronized' },
  });
});
```

```typescript
// src/hooks/useCrimeData.test.ts
afterEach(() => {
  vi.restoreAllMocks();
  cleanup?.();
  cleanup = null;
});
```

`beforeEach`/`afterEach` are the standard hooks — there is no `beforeAll`/`afterAll` in the current suite.

## Mocking

### Module mocks with `vi.mock`

DuckDB and Node-only modules are mocked at the module level. Two patterns are used:

**Pattern 1 — hoisted mocks** (preferred when the mock needs a shared reference):

```typescript
// src/lib/queries.test.ts
const {
  ensureSortedCrimesTableMock,
  getDbMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  ensureSortedCrimesTableMock: vi.fn(),
  getDbMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('./db', () => ({
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
  getDb: getDbMock,
  isMockDataEnabled: isMockDataEnabledMock,
}));
```

**Pattern 2 — inline mock factory** (for one-off stubs):

```typescript
// src/lib/crime-api.test.ts
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn().mockRejectedValue(new Error('DuckDB not available in tests')),
  };
});
```

### Global stubs

```typescript
// src/hooks/useCrimeData.test.ts — stub fetch
vi.stubGlobal('fetch', fetchMock);

// src/workers/adaptiveTime.worker.test.ts — replace Worker
Object.defineProperty(globalThis, 'Worker', { value: MockWorker, configurable: true });
```

### API route tests

Route tests dynamically import the route after mocks are in place (so the `getDb` call inside the route resolves to the fake):

```typescript
// src/app/api/crime/overview/route.test.ts
vi.mock('@/lib/db', () => ({ ... }));
vi.mock('fs', () => ({ existsSync: hoisted.existsSyncMock }));

const { GET } = await import('./route');

test('returns mock overview when DuckDB read fails', async () => {
  hoisted.readOverviewBinsMock.mockRejectedValue(new Error('boom'));
  const response = await GET(new Request('http://localhost/api/crime/overview'));
  expect(response.status).toBe(200);
  expect(response.headers.get('X-Data-Warning')).toContain('database unavailable');
});
```

`/api/study/log/route.test.ts` uses the same `vi.mock('@/lib/study/storage', ...)` pattern and asserts both validation rejects (400) and validation accepts (200 + `ok: true`).

### What gets mocked

| Domain | Mock with | Reason |
|---|---|---|
| `@/lib/db`, `duckdb` | `vi.mock` with `vi.hoisted` | DuckDB can't open a file in CI / unit context |
| `fs.existsSync`, `fs.readFileSync` | `vi.mock('fs', ...)` | Tests for missing-dataset fallback path |
| `apache-arrow` (`RecordBatchReader`, `Table`) | `vi.mock('apache-arrow', ...)` | Test the streaming pipeline without real Arrow data |
| `globalThis.fetch` | `vi.stubGlobal('fetch', fetchMock)` | Test hook behavior end-to-end against fake API |
| `globalThis.Worker` | `Object.defineProperty(globalThis, 'Worker', ...)` | Test worker-instantiation paths |
| `localStorage` | `vi.stubGlobal('localStorage', localStorageMock)` | Test Zustand `persist` middleware |
| `navigator.sendBeacon` | direct property on a fake navigator | Logger unload path |
| `@/lib/study/storage.insertStudy` | `vi.mock` with `importOriginal` | Drive validator happy / sad paths |

### What does **not** get mocked

Pure utility functions (`normalizeToPercent`, `withinTolerance`, `buildCategoryLegendEntries`, `resolveCategoryShape`, `deriveBoundsFromCrimes`, `computeBurstinessMetrics`) are tested directly without mocks. Web-worker message contracts are sometimes tested via `MockWorker` (see `src/store/useAdaptiveStore.test.ts`).

## Fixtures and Factories

There are **no global fixture files** — every test inlines its own data via a `build*` factory. The pattern is documented in `CONVENTIONS.md`; here is the test-specific take:

```typescript
// In-file factory — typically a `const buildX = (...) => ({ ...defaults, ...overrides })`
const buildPoint = (
  overrides: Partial<FilteredPoint> & { typeId: number; districtId: number }
): FilteredPoint => ({
  x: 0, y: 0, z: 0,
  typeId: 1, districtId: 1, originalIndex: 0,
  ...overrides,
});

const buildSlice = (overrides: Partial<EvolutionFlowSliceInput> = {}): EvolutionFlowSliceInput => ({
  id: overrides.id ?? 'slice-a',
  label: overrides.label ?? overrides.id ?? 'slice-a',
  type: overrides.type ?? 'point',
  time: overrides.time ?? 10,
  range: overrides.range,
  isVisible: overrides.isVisible ?? true,
});

const buildCrimeRows = (count: number, start = 1_000_000) =>
  Array.from({ length: count }, (_, index) => ({
    timestamp: start + index, lat: 41.8, lon: -87.6, x: 1, z: 2,
    type: 'THEFT', district: '1', year: 2001, iucr: '0820',
  }));
```

For API route tests, the request body is built via a small helper:

```typescript
// src/app/api/study/log/route.test.ts
const buildRequest = (body: unknown): Request => new Request('http://localhost/api/study/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
```

For the loader pattern, see also:
- `buildGeometry` in `src/components/timeline/lib/burst-score-series.test.ts`
- `buildSnapshot` in `src/lib/stkde/adjacent-slice-comparison.phase3.test.ts`
- `buildStoreContract` in `src/components/timeline/hooks/useBrushZoomSync.test.ts`
- `makeSurface` / `hotspot` in `src/lib/hotspot-evolution.test.ts`
- `buildRequest` in `src/app/api/study/log/route.test.ts`

## Hook / Component Testing

### Hook test with React Test Renderer

`src/hooks/useCrimeData.test.ts` is the canonical harness:

```typescript
const HookProbe = ({ options, onUpdate }) => {
  const result = useCrimeData(options);
  useEffect(() => { onUpdate(result); }, [onUpdate, result]);
  return null;
};

const createRenderer = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // ...pendingResolve / pendingReject pattern with a 3000ms timeout
  const renderAndWait = async (options) => { /* ... */ };
  return { renderAndWait, cleanup };
};

describe('useCrimeData', () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => { vi.restoreAllMocks(); cleanup?.(); cleanup = null; });

  it('applies default 30-day buffering and forwards API meta fields', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ... }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await harness.renderAndWait({ startEpoch: 978307200, endEpoch: 978393600 });
    expect(result.bufferedRange).toEqual({ start: 975715200, end: 980985600 });
  });
});
```

The pattern: build a `createRenderer` factory that returns `{ renderAndWait, cleanup }`; each `it` block creates a harness, sets the cleanup, and awaits the settled result.

### Component test with readFileSync (contract tests)

Several component tests assert **structural** invariants by reading the source file rather than rendering. This is the dominant pattern for "did the refactor actually wire this up" tests:

```typescript
// src/components/timeline/DualTimeline.tick-rollout.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

it('keeps DualTimeline wired to the shared timeline surface and view model', () => {
  const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');
  expect(source).toMatch(/DualTimelineSurface/);
  expect(source).toMatch(/useDualTimelineViewModel/);
  expect(source).not.toMatch(/useDualTimelineScales/);
  expect(source).toMatch(/formatDateByResolution|buildSpanAwareTicks/); // negative form
});

it('keeps the wrapper materially smaller than the original monolith', () => {
  const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');
  expect(source.split('\n').length).toBeLessThan(1150);
});
```

The same contract pattern is used by `page.shell.test.tsx` files, `CubeVisualization.phase13.test.ts`, `cube-store-overrides.phase1.test.ts`, `time-slices-polish.phase1.test.ts`, and the burst-evolution / evolution-flow / slice-cluster-overlay / category-shapes / category-legend phase tests.

## Asynchronous Testing

Vitest's async tests use plain `async` / `await` plus `expect(...).resolves.*` / `expect(...).rejects.*` matchers:

```typescript
// src/hooks/useCrimeData.test.ts
const result = await harness.renderAndWait({ startEpoch: 978307200, endEpoch: 978393600 });
expect(result.error?.message).toContain('HTTP error: 404');

// src/lib/burst-detection.test.ts
it('fetches and preserves burst bins across multiple partitions', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({ ... }));
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  const result = await fetchBurstBins({ ... });
  expect(result.bins).toHaveLength(3);
});
```

The `pendingResolve` / `pendingReject` pattern (from `useCrimeData.test.ts`) is the only place a manual promise + `setTimeout` is used; everywhere else, `await` is enough.

## File-source contract tests

`*.shell.test.tsx` and `*.tick-rollout.test.ts` style tests read the source file once and assert against a set of positive/negative regex patterns. The intent is to catch wiring regressions in refactors (e.g. "Phase 13 must keep the `selectionStory` references; it must not include the old `WorkflowSkeleton`"). See:

- `src/app/dashboard-demo/page.shell.test.tsx`
- `src/app/stkde/page.stkde.test.ts`
- `src/app/stkde-3d/page.stkde.test.ts`
- `src/app/timeslicing/page.timeline-qa.test.ts`
- `src/app/timeslicing/page.binning-mode.test.ts`
- `src/components/timeline/DualTimeline.tick-rollout.test.ts`
- `src/components/timeline/DualTimeline.detailBins.test.ts`
- `src/components/viz/CubeVisualization.phase13.test.ts`
- `src/components/viz/CubeVisualization.stkde.test.ts`
- `src/components/viz/burst-evolution.phase3.test.tsx`
- `src/components/viz/evolution-flow.phase4.test.tsx`
- `src/components/viz/cluster-interaction.phase5.test.tsx`
- `src/components/viz/slice-cluster-overlay.phase5.test.tsx`
- `src/components/viz/category-legend.phase6.test.tsx`
- `src/components/viz/category-shapes.phase6.test.tsx`
- `src/components/viz/stkde-overlay.phase2.test.ts`
- `src/components/viz/time-slices-polish.phase1.test.ts`
- `src/components/viz/cube-store-overrides.phase1.test.ts`
- `src/components/viz/spatialConstraintGeometry.test.ts`
- `src/components/dashboard-demo/DashboardHeader.flow-consolidation.test.tsx`

The pattern is `expect(source).toMatch(/Needle/)` and `expect(source).not.toMatch(/Forbidden/)`. These tests are intentionally cheap — they don't need a renderer, a fetch mock, or a DuckDB stub.

## Python Test Patterns (`scripts/synthetic/test_generate_bursty.py`)

### Class-based `unittest`

```python
import unittest

class TestPrng(unittest.TestCase):
    def test_deterministic_for_same_seed(self):
        a = create_seeded_random(42)
        b = create_seeded_random(42)
        for _ in range(100):
            self.assertEqual(a(), b())

    def test_values_in_unit_interval(self):
        rng = create_seeded_random(7)
        for _ in range(1000):
            v = rng()
            self.assertGreaterEqual(v, 0.0)
            self.assertLess(v, 1.0)


class TestBurstinessMetrics(unittest.TestCase):
    def test_degenerate_input(self):
        m = compute_burstiness_metrics([])
        self.assertEqual(m["burstinessParam"], 0)
        self.assertEqual(m["meanIET"], 0)
        self.assertEqual(m["fittedAlpha"], 1)

    def test_highly_bursty_input_positive_b(self):
        bursty = [1] * 29 + [1_000_000]
        bursty *= 70
        m = compute_burstiness_metrics(bursty)
        self.assertGreater(m["burstinessParam"], 0.5)
```

### Class naming

Each suite is `Test<UnitName>`. Methods are `test_<behavior>`. The 8 classes cover the 8 modules being exercised:

| Class | Targets |
|---|---|
| `TestPrng` | `create_seeded_random` |
| `TestFireHighestPriority` | `fire_highest_priority` |
| `TestPowerLawIet` | `sample_power_law_iet` (cap + zero-u guard) |
| `TestBurstinessMetrics` | `compute_burstiness_metrics` (degenerate, bursty, uniform, fitted alpha) |
| `TestHelpers` | `iucr_for_type`, `lon_lat_to_normalized`, `ACTIVE_TYPES` length |
| `TestGenerateBurstySequence` | `generate_bursty_sequence` (count, shape, ranges, determinism, per-type alpha, rolling burstiness) |
| `TestRollingBurstiness` | `compute_rolling_burstiness` (invalid window, one point per window) |
| `TestCsvWriters` | `write_events_csv`, `write_burstiness_csv` (header, roundtrip, JSON typeBreakdown) |
| `TestParsePerTypeAlpha` | `parse_per_type_alpha` (empty, single, multi, invalid raises) |

### Python fixtures

The Python file uses **method-local fixtures** (e.g. `_events()` returning a list of dicts) and an in-class `_config()` builder:

```python
class TestGenerateBurstySequence(unittest.TestCase):
    def _config(self, **overrides):
        cfg = {
            "seed": 42, "count": 500, "alpha": 1.5, "delta": 1.0,
            "start": DEFAULT_START_EPOCH, "end": DEFAULT_END_EPOCH,
            "typeStrategy": "weighted", "perTypeAlpha": {},
            "windowSec": 7 * 24 * 60 * 60,
        }
        cfg.update(overrides)
        return cfg

    def test_event_count_matches_request(self):
        events, _, _ = generate_bursty_sequence(self._config(count=500))
        self.assertEqual(len(events), 500)
```

Temporary-file tests use `tempfile.TemporaryDirectory()` as a context manager:

```python
class TestCsvWriters(unittest.TestCase):
    def test_events_csv_roundtrip_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "events.csv")
            write_events_csv(self._events(), path)
            with open(path) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["type"], "THEFT")
```

### Python assertion style

Uses the stdlib `unittest.TestCase` assertions exclusively: `assertEqual`, `assertNotEqual`, `assertTrue`, `assertFalse`, `assertIsNone`, `assertGreater`, `assertGreaterEqual`, `assertLess`, `assertLessEqual`, `assertAlmostEqual(x, y, places=6)`, `assertIn`, `assertNotIn`, `assertRaises(ValueError)`. **No `pytest.mark.parametrize`, no `assert` statement** — the suite is meant to run under stdlib `unittest` only.

### Python entry point

```python
if __name__ == "__main__":
    unittest.main(verbosity=2)
```

`verbosity=2` prints the dotted name of every test method on its own line, so a failed test gives the exact method path.

## Test Counts at a Glance

Approximate counts (one `it`/`test` per case; the `*.shell.test.tsx` files often pack 5–30 positive/negative assertions into 1–2 tests):

- **TypeScript / Vitest**: 90+ co-located `*.test.ts` and `*.test.tsx` files across `src/`. The `src/lib/synthetic/goh-barabasi.test.ts` file alone has 26 tests; `src/lib/synthetic/` mirrors 38 in the Python sibling.
- **Python**: 38 tests in 8 classes in `scripts/synthetic/test_generate_bursty.py`.

## Test Types in the Suite

| Type | Where | Approach |
|---|---|---|
| **Unit (pure)** | `src/lib/**/*.test.ts` | Direct calls, no mocks beyond what the unit itself needs |
| **Module mock** | `src/lib/queries.test.ts`, `src/store/useAdaptiveStore.test.ts`, `src/lib/db.test.ts` | `vi.mock` + `vi.hoisted` |
| **Hook** | `src/hooks/useCrimeData.test.ts`, `src/hooks/useSuggestionGenerator.test.ts` | React Test Renderer + `vi.stubGlobal('fetch', ...)` + `QueryClientProvider` |
| **Store** | `src/store/use*.test.ts` | `useStore.setState({...})` + `useStore.getState()` + `beforeEach` reset |
| **Worker contract** | `src/workers/adaptiveTime.worker.test.ts`, `src/store/useAdaptiveStore.test.ts` | `MockWorker` class + `Object.defineProperty(globalThis, 'Worker', ...)` |
| **API route** | `src/app/api/**/route.test.ts` | `vi.mock('@/lib/db', ...)` then dynamic `await import('./route')` |
| **File contract** | `src/components/**/*.phase*.test.ts`, `src/app/**/page.shell.test.tsx`, `DualTimeline.tick-rollout.test.ts` | `readFileSync` + positive/negative `toMatch` |
| **Component render** | `src/components/timeline/DualTimeline.detailBins.test.ts`, `src/components/timeline/DualTimeline.tick-rollout.test.ts` (data flow), `src/app/dashboard-demo/page.shell.test.tsx` | Lightweight render + assertion; React Test Renderer for most `*.tsx` tests |
| **Python (stdlib)** | `scripts/synthetic/test_generate_bursty.py` | `unittest.TestCase` subclasses, `tempfile.TemporaryDirectory` for file output |

## Common Patterns and Anti-Patterns

### Do

- Co-locate the test next to the source.
- Use `vi.hoisted(() => ({ ...vi.fn() }))` whenever the mock must be referenced both inside `vi.mock` and outside (e.g. to assert on call args).
- Use `@vitest-environment node` as a top-of-file pragma for tests that don't need `jsdom` — it's faster and removes a class of DOM-related flakes.
- Use `toBeCloseTo` for floating-point comparisons (lat/lon, normalized coords, burstiness scores).
- Use `toMatchObject` for partial structural matches.
- Reset store state in `beforeEach` (e.g. `useSliceStore.getState().clearSlices()`).
- Stub `fetch` / `Worker` / `localStorage` via `vi.stubGlobal` rather than monkey-patching the module.
- Use `_` underscore prefix for "this is the test fixture" method names (`_events()`, `_config()`, `_buildGeometry()`).

### Don't

- Don't put fixtures in shared `__fixtures__` / `__mocks__` directories — the convention is in-file factories. The codebase has none of those.
- Don't use `pytest`-style features in the Python sibling; the constraint is stdlib `unittest` only.
- Don't mock pure functions; if the unit is pure, test it directly.
- Don't `expect(console.error).toHaveBeenCalled()` unless the test is specifically about a logger contract — most suites let `console.error` fall through.

---

*Testing analysis: 2026-06-27*

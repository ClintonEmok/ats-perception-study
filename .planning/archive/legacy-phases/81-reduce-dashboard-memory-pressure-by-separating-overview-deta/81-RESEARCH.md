# Phase 81: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or persisted DuckDB-backed reads - Research

**Researched:** 2026-06-19
**Domain:** Dashboard startup/data-loading architecture, DuckDB persisted analytics tables, progressive exact-detail APIs
**Confidence:** HIGH

## Summary

Phase 81 should be planned as a summary-first data-flow refactor, not a small query tweak. The current dashboard already has a natural summary entry point in `DashboardDemoShell -> useTimelineDataStore.loadSummaryData()`, but that benefit is undone by eager full-detail loading elsewhere and by request-time CSV scans in `/api/crime/overview` and `/api/crime/meta`. The worst startup pressure comes from loading Arrow-backed full detail into `useTimelineDataStore.columns` and then deriving overview/density client-side from that full array.

The standard implementation for this phase is: keep dashboard boot summary-only, move overview and metadata reads onto persisted DuckDB tables built once from CSV, and redesign `/api/crimes/range` around exact progressive paging instead of `count + sampled rows`. The detail path should only activate after explicit narrowing intent (brush/zoom), load a bounded working window, and remain replaceable instead of accumulating a global full dataset cache.

For persisted storage, use one-time CSV ingest into a canonical DuckDB table plus derived persisted tables for metadata and medium-resolution overview bins. For exact detail, use the persisted base table and a stable sort key to support keyset paging (`LIMIT pageSize + 1` -> `hasMore`). Do not keep serving overview/meta from repeated `read_csv_auto(...)` scans, and do not keep sampling exact-detail slice workflows.

**Primary recommendation:** Plan Phase 81 around three concrete deliverables: persisted DuckDB summary tables, intent-gated working-window detail loading, and an exact paged `/api/crimes/range` contract with `hasMore`/cursor semantics.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DuckDB | 1.4.4 | Persisted analytical base + derived tables | Already the project’s canonical analytics engine; supports persisted CTAS tables and repeated low-latency reads |
| Next.js Route Handlers | 16.1.6 | API contracts for overview/meta/detail | Preserves current layering and avoids introducing a second server architecture |
| Zustand | 5.0.10 | Summary/detail loading state and working-window cache | Existing coordination boundary for dashboard data lifecycle |
| TanStack Query | 5.90.21 | Paged exact-detail server-state orchestration | Existing cache/invalidation layer for `/api/crimes/range` consumers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Apache Arrow | 21.1.0 | Large full-detail transport | Keep for explicit full-detail or non-dashboard flows only; not for dashboard boot |
| d3-array / visx | existing | Client rendering of overview/detail bins | Use after server returns already-binned overview payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Persisted DuckDB tables | Parquet-first overview artifacts | Deferred by Phase 81 context; useful later, but out of scope now |
| Keyset paging | OFFSET paging | OFFSET is simpler but weaker for large exact-detail scans and unstable around equal timestamps |
| Server-binned overview counts | Sampled raw timestamps | Sampled timestamps are already the main mismatch with locked decision D-01 |

**Installation:**
```bash
# No new packages required for Phase 81.
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── app/api/crime/             # Summary endpoints (/meta, /overview) backed by persisted tables
├── app/api/crimes/            # Exact detail paging endpoint
├── lib/
│   ├── db.ts                  # Canonical persisted-table bootstrap + invalidation
│   ├── queries.ts             # High-level query helpers for summary/detail reads
│   └── queries/               # SQL builders for paged exact detail + summary reads
├── hooks/                     # Query hooks for working-window detail loads
└── store/                     # Summary/detail split state and replaceable working-window cache
```

### Pattern 1: Summary-first dashboard boot
**What:** Mount the dashboard with metadata + pre-binned overview only. Do not load Arrow/full-detail on mount.
**When to use:** `dashboard-demo` startup and any non-focused timeline view.
**Codebase evidence:**
- `DashboardDemoShell` already calls `loadSummaryData()` on mount.
- `CubeVisualization` currently defeats this by eagerly calling `loadRealData()` when `columns` is empty.
- `useTimelineDataStore.loadSummaryData()` already stores domain bounds, crime types, and overview series separately from `columns`.

**Plan direction:**
- Keep `loadSummaryData()` as the first boot path.
- Make dashboard detail views tolerate `columns === null`.
- Introduce an explicit detail status/working-window state instead of treating `columns` absence as “must preload everything”.

### Pattern 2: Persisted summary read model in DuckDB
**What:** Build persisted tables once from CSV, then serve overview/meta from those tables only.
**When to use:** `/api/crime/meta`, `/api/crime/overview`, and any startup summary reads.
**Use these tables:**
- `crimes_base` or upgraded `crimes_sorted` as the canonical persisted fact table
- `crime_dataset_meta` as a one-row metadata table
- `crime_overview_bins_medium` as a fixed-resolution aggregate table keyed by time bin + filter dimensions

**Recommended aggregate shape:**
```sql
-- Source: DuckDB CTAS pattern verified via Context7 (/websites/duckdb_current)
CREATE OR REPLACE TABLE crime_overview_bins_medium AS
SELECT
  bin_id,
  bin_start_epoch,
  bin_end_epoch,
  "Primary Type" AS primary_type,
  "District" AS district,
  COUNT(*) AS crime_count
FROM ...
GROUP BY 1, 2, 3, 4, 5;
```

**Why this shape fits locked decisions:**
- D-01/D-18: payload is pre-binned counts, not sampled timestamps.
- D-02: filter-aware for crime type and district.
- D-03/D-16/D-20: request-time CSV scans disappear.
- D-04: fixed medium resolution can be materialized once.

### Pattern 3: Working-window exact detail cache
**What:** Client holds only the currently focused exact-detail window and replaces it when the user narrows somewhere else.
**When to use:** After brush/zoom, slice inspection, burst generation, and manual-draft computation.
**Implementation shape:**
- Store current detail window metadata separately from summary metadata.
- Keep `pages` or `recordsByCursor` only for the active working window.
- Evict/replace when focus changes materially.

**Why:** This matches D-08/D-09 and prevents “progressively load the whole dataset by accident”.

### Pattern 4: Exact keyset paging for detail
**What:** Return exact rows ordered by `(timestamp, stable_row_id)` with `pageSize + 1` probing to derive `hasMore`.
**When to use:** `/api/crimes/range` for exact slice/detail workflows.
**Example:**
```sql
-- Source: DuckDB LIMIT/OFFSET docs verified via Context7 (/websites/duckdb_current)
SELECT ...
FROM crimes_base
WHERE event_epoch BETWEEN ? AND ?
  AND (
    event_epoch > ?
    OR (event_epoch = ? AND crime_row_id > ?)
  )
ORDER BY event_epoch, crime_row_id
LIMIT ?; -- pageSize + 1
```

**Why keyset over OFFSET:**
- More stable for exact paging on large ordered ranges.
- Avoids deep OFFSET costs as users inspect more slices.
- Preserves exact rows without sampling.

### Anti-Patterns to Avoid
- **Eager full-detail preload on mount:** `CubeVisualization` currently calls `loadRealData()` as soon as `columns` is empty.
- **Request-time CSV scans in hot APIs:** `/api/crime/overview` and `/api/crime/meta` both scan CSV directly; `meta` does it multiple times.
- **Count-before-fetch on hot exact path:** `/api/crimes/range` currently runs `queryCrimeCount()` then the real query.
- **Sampling exact slice workflows:** `sampleStride` and `sampled` conflict with D-11/D-12.
- **Per-slice 50k row fetch storms:** `Demo3dSpatialView`, `DemoInspectPanel`, and timeslicing store all independently fetch large exact windows.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persisted ingest pipeline | Custom JSON cache beside DuckDB | DuckDB persisted tables via `CREATE TABLE AS SELECT` / `CREATE OR REPLACE TABLE` | Already in-stack; avoids cache drift and duplicate storage logic |
| Overview densification | Client-side rebucketing from millions of timestamps | Server-side pre-binned aggregate table | Cuts memory transfer and aligns with D-01 |
| “Can I load more?” check | Separate `COUNT(*)` hot-path query | `LIMIT pageSize + 1` with `hasMore` | Satisfies D-13 and avoids second heavy query |
| Large exact-detail browsing | One giant response or sampled response | Keyset-paged exact rows | Keeps exactness while bounding payloads |
| Dataset freshness tracking | Ad hoc boolean flags | Persisted source fingerprint/version table in DuckDB | Needed to rebuild once per dataset change, not per request |

**Key insight:** Phase 81 is not blocked by missing technology. The needed primitives already exist in DuckDB and in the codebase; the problem is contract design and hot-path discipline.

## Common Pitfalls

### Pitfall 1: Summary path silently falls back to full detail
**What goes wrong:** Startup looks summary-first in one component, but another component eagerly requests the entire Arrow stream.
**Why it happens:** `DashboardDemoShell` loads summary on mount, but `CubeVisualization` immediately calls `loadRealData()` when `columns` is null.
**How to avoid:** Make detail-capable components support preview mode; gate all detail loading behind explicit user narrowing intent.
**Warning signs:** `/api/crime/stream` fires before any brush/zoom; browser heap jumps on first mount.

### Pitfall 2: Overview route still ships raw timestamps
**What goes wrong:** Memory pressure moves from CSV scan to network payload or client rebucketing instead of disappearing.
**Why it happens:** Current overview contract returns `timestampsSec[]`; `DemoDualTimeline` re-bins them client-side with fixed thresholds.
**How to avoid:** Change the canonical overview payload to fixed bins with counts and explicit domain.
**Warning signs:** Large `overviewTimestampSec` arrays or client-side `bin(...thresholds(50))` remaining on the hot path.

### Pitfall 3: Metadata endpoint remains multi-scan
**What goes wrong:** Startup still pays repeated CSV aggregate cost even after overview improves.
**Why it happens:** `/api/crime/meta` currently does one scan for min/max/count, one for crime types, and one for year range.
**How to avoid:** Read from a one-row `crime_dataset_meta` table and, if needed, a small persisted facet table.
**Warning signs:** `read_csv_auto(...)` remains in `/api/crime/meta`.

### Pitfall 4: Paging exact rows without a stable cursor
**What goes wrong:** Rows duplicate or disappear between pages when many crimes share a timestamp.
**Why it happens:** Timestamp alone is not a sufficient page cursor.
**How to avoid:** Persist a stable row identifier during ingest and order by `(event_epoch, crime_row_id)`.
**Warning signs:** Page boundaries based only on timestamp or OFFSET.

### Pitfall 5: Exact-detail consumers each invent their own fetch policy
**What goes wrong:** Dashboard still triggers many redundant large requests even if `/api/crimes/range` is improved.
**Why it happens:** `Demo3dSpatialView`, `DemoInspectPanel`, and `useDashboardDemoTimeslicingModeStore` each fetch slice detail independently.
**How to avoid:** Define one shared exact-detail contract and migrate consumers to it in sequence.
**Warning signs:** Multiple 50k requests for overlapping windows during inspect/slice flows.

### Pitfall 6: Narrowing guardrails are enforced too late
**What goes wrong:** The app starts paging a huge broad range that product policy says should be rejected.
**Why it happens:** Guardrails are implemented only after the first expensive query.
**How to avoid:** Validate requested detail window before executing broad detail reads; return a structured `requiresNarrowing` response.
**Warning signs:** Broad “all time” exact-detail requests still return page 1 instead of prompting the user.

## Code Examples

Verified patterns from official sources and codebase-adapted usage:

### Persist CSV once into DuckDB
```sql
-- Source: https://duckdb.org/docs/current/data/csv/overview.html
CREATE TABLE crimes_base AS
SELECT *
FROM read_csv_auto('data/sources/Crimes_-_2001_to_Present_20260114.csv');
```

### Rebuild a derived aggregate table deterministically
```sql
-- Source: https://duckdb.org/docs/current/sql/statements/create_table.html
CREATE OR REPLACE TABLE crime_dataset_meta AS
SELECT
  MIN(event_epoch) AS min_time,
  MAX(event_epoch) AS max_time,
  MIN(lat) AS min_lat,
  MAX(lat) AS max_lat,
  MIN(lon) AS min_lon,
  MAX(lon) AS max_lon,
  COUNT(*) AS row_count
FROM crimes_base;
```

### Page exact rows with `hasMore`
```typescript
// Codebase-adapted pattern for /api/crimes/range
const pageSize = 5000;
const rows = await queryExactCrimePage({
  startEpoch,
  endEpoch,
  cursor,
  pageSize: pageSize + 1,
  crimeTypes,
  districts,
});

const hasMore = rows.length > pageSize;
const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
const nextCursor = hasMore
  ? {
      timestamp: pageRows[pageRows.length - 1]!.timestamp,
      rowId: pageRows[pageRows.length - 1]!.id!,
    }
  : null;
```

### Narrow detail only after explicit user focus
```typescript
// Codebase-adapted interaction policy
if (interaction.type === 'brush' || interaction.type === 'zoom') {
  replaceWorkingWindow({
    startEpoch: interaction.startEpoch,
    endEpoch: interaction.endEpoch,
    mode: 'exact',
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Request-time CSV scans for summary endpoints | Persisted DuckDB tables queried repeatedly | Current DuckDB docs support CTAS / `CREATE OR REPLACE TABLE` | Removes repeated CSV parsing and aggregate recomputation |
| Sampled overview timestamps | Server-binned counts | Locked by Phase 81 D-01 | Smaller payloads, less client rebucketing, better startup behavior |
| `COUNT(*)` + data query for detail | `LIMIT + 1` / `hasMore` paging | Locked by Phase 81 D-13 | Eliminates one hot-path query per detail request |
| Full-dataset preload for “detail-ready” UI | Intent-gated working-window exact detail | Locked by D-05 through D-09 | Reduces browser heap and mount latency |

**Deprecated/outdated:**
- `overview.timestampsSec` as the canonical overview payload: replaced by fixed pre-binned counts.
- `sampled` exact-detail responses for slice workflows: incompatible with D-11.
- `/api/crimes/range` defaulting to broad buffered queries with 50k sample-oriented semantics: should become focused exact paging.

## Hot Path Findings

### 1) Dashboard boot currently has two conflicting loading models
- `DashboardDemoShell` correctly calls `loadSummaryData()` on mount.
- `CubeVisualization` eagerly calls `loadRealData()` whenever `columns` is absent.
- `loadRealData()` streams Arrow, materializes all batches into an Arrow `Table`, copies columns into typed arrays, and stores them in Zustand.

**Impact:** The dashboard pretends to be summary-first but still pays full-detail memory cost on mount. **Confidence: HIGH**

### 2) Overview/meta APIs are still CSV-scan hot paths
- `/api/crime/overview` runs `read_csv_auto(dataPath)` with `NTILE(maxPoints)` per request.
- `/api/crime/meta` performs three separate CSV scans: global metadata, distinct crime types, and year range.

**Impact:** Startup latency and CPU remain tied to repeated CSV parsing instead of persisted reads. **Confidence: HIGH**

### 3) `DemoDualTimeline` still derives overview/density client-side from raw timestamps
- If `columns` exists, `timestampSeconds` becomes `Array.from(columns.timestampSec)`.
- It computes density maps and overview bins locally.
- It currently uses fixed threshold `bin(...).thresholds(50)` for overview.

**Impact:** Full-detail presence turns timeline derivation into a memory-heavy client path. **Confidence: HIGH**

### 4) `/api/crimes/range` is optimized for capped/sampled returns, not exact progressive detail
- Defaults: `bufferDays=30`, `limit=50000`.
- Runs `queryCrimeCount()` first.
- Uses `sampleStride` to downsample when result count exceeds limit.

**Impact:** This directly conflicts with D-11, D-12, and D-13. **Confidence: HIGH**

### 5) Detail consumers independently request large exact windows
- `Demo3dSpatialView` loops visible slices and fetches up to `50000` rows per slice.
- `DemoInspectPanel` uses `useCrimeData(...limit: 50000)` for active slice and also has a manual refetch loop over every visible slice.
- `useDashboardDemoTimeslicingModeStore` fetches partitions at `50000` and manual bins at `100000`.

**Impact:** Even after API improvement, planning must account for redundant consumer pressure and migration order. **Confidence: HIGH**

## Recommended API / Storage Design

### Overview + metadata storage

**Use one canonical persisted ingest step**
1. Ingest CSV once into a persisted DuckDB fact table.
2. During the same bootstrap/rebuild pass, compute derived tables.
3. Store source fingerprint metadata so rebuild only happens when the CSV changes.

**Recommended persisted objects**
- `crimes_base` (or upgraded `crimes_sorted`): canonical detail table with normalized read columns and stable row id.
- `crime_dataset_meta`: one-row dataset/domain summary.
- `crime_overview_bins_medium`: fixed medium-resolution counts grouped by `bin_id`, `primary_type`, and `district`.
- Optional: `crime_filter_facets` if startup UI needs precomputed filter lists/counts.

**Recommended read contracts**
- `/api/crime/meta` -> single-row metadata + filter facets from persisted tables.
- `/api/crime/overview` -> `{ domain, binResolution, bins: [{startEpoch, endEpoch, count}] }`, with filters for crime type and district only.

### `/api/crimes/range` evolution

**Recommended new contract**
- Required: `startEpoch`, `endEpoch`
- Optional: `crimeTypes`, `districts`
- Optional: `pageSize`, `cursor`, `target` (`active-slice | focus-window | comparison | generation`)
- Remove `sampleStride` behavior from exact mode.
- Keep exact rows only.

**Recommended response shape**
```ts
{
  data: CrimeRecord[];
  meta: {
    range: { start: number; end: number };
    pageSize: number;
    returned: number;
    hasMore: boolean;
    nextCursor: { timestamp: number; rowId: string | number } | null;
    requiresNarrowing?: boolean;
    narrowingReason?: 'range-too-broad' | 'result-pressure';
    isMock?: boolean;
  };
}
```

**Policy rules to lock into planning**
- First detail request must use the user’s narrowed working window, not full-domain defaults.
- If the requested window violates guardrails, return `requiresNarrowing` instead of loading anyway.
- When paging is needed, fetch the active/visible slice first (D-15).

## Migration Steps

1. **Persisted storage foundation**
   - Extend `src/lib/db.ts` beyond `ensureSortedCrimesTable()` to manage canonical persisted base + derived tables.
   - Add dataset fingerprint/invalidation logic.

2. **Summary API cutover**
   - Rebuild `/api/crime/meta` and `/api/crime/overview` on persisted tables.
   - Keep current route names, change internals first.

3. **Summary payload contract cutover**
   - Move `useTimelineDataStore.loadSummaryData()` from `timestampsSec[]` assumptions to overview bins.
   - Update `DemoDualTimeline` to consume server bins directly for overview rendering.

4. **Intent-gated detail loading**
   - Remove dashboard eager `loadRealData()` mount behavior.
   - Add preview state for detail-heavy surfaces before focus intent.

5. **Exact paged detail API**
   - Replace `queryCrimeCount()` + `sampleStride` with `pageSize + 1` probing.
   - Add stable cursor support.

6. **Consumer migration in dependency order**
   - `useCrimeData` first
   - `DemoInspectPanel` second
   - `Demo3dSpatialView` third
   - `useDashboardDemoTimeslicingModeStore` fourth

7. **Cleanup**
   - Remove old sampled assumptions and any UI messaging that tolerates truncated exact rows.

## Sequencing Constraints

1. **Do storage before API contract changes.** Otherwise new endpoints still pay CSV scan cost.
2. **Do summary cutover before removing eager detail preload.** Otherwise startup may lose overview usability.
3. **Do `/api/crimes/range` contract before migrating slice consumers.** Existing consumers depend on current `data[]`/`sampled` semantics.
4. **Do stable row-id design before paging implementation.** Cursor safety depends on it.
5. **Do preview states before hard-gating detail loads.** Otherwise UI will feel broken before the first brush/zoom.

## Verification Points

### Functional
- Opening `dashboard-demo` does **not** call `/api/crime/stream` or any full-detail endpoint before brush/zoom.
- Overview renders from summary-only data.
- Crime-type and district filters update overview bins without viewport dependence.
- First detail fetch after brush/zoom targets only the narrowed window.
- Slice workflows still receive exact rows, never sampled rows.
- Broad exact-detail requests prompt narrowing instead of returning huge payloads.

### Performance
- `/api/crime/meta` and `/api/crime/overview` contain no `read_csv_auto(...)` hot-path scans.
- `/api/crimes/range` contains no hot-path `queryCrimeCount(...)` call.
- Browser heap at dashboard boot is materially lower than current full-Arrow preload path.
- Repeated dashboard reloads do not rebuild derived DuckDB tables unless the CSV changed.

### Observability
- Log whether detail was triggered by `brush`, `zoom`, or another explicit focus action.
- Log `requiresNarrowing` rejections separately from real errors.
- Log detail page counts and whether requests hit `hasMore`.

## Open Questions

1. **What stable row identifier should exact paging use?**
   - What we know: current `CrimeRecord` shape does not expose a canonical row id.
   - What's unclear: whether the source CSV already has a stable unique incident identifier suitable for paging tie-breaks.
   - Recommendation: plan a bootstrap-time synthetic `crime_row_id` if no safe source id is guaranteed.

2. **How much existing dashboard logic still implicitly expects `columns`?**
   - What we know: `DemoDualTimeline` can render from summary timestamps, but other timeline/cube components may still assume full columns for some interactions.
   - What's unclear: full blast radius outside the required files.
   - Recommendation: include a planning audit task for all `useTimelineDataStore().columns` consumers in the dashboard-demo surface.

3. **Should overview aggregate dimensions live in one table or more than one?**
   - What we know: CONTEXT allows either.
   - What's unclear: best tradeoff between simpler queries and smaller table size for this dataset.
   - Recommendation: default to one fact-style aggregate table unless profiling shows it is too large.

## Sources

### Primary (HIGH confidence)
- `/websites/duckdb_current` - CTAS from CSV, `CREATE OR REPLACE TABLE`, `LIMIT/OFFSET`, indexing overview
- Codebase sources required by Phase 81 brief:
  - `src/store/useTimelineDataStore.ts`
  - `src/components/viz/CubeVisualization.tsx`
  - `src/components/timeline/DemoDualTimeline.tsx`
  - `src/app/api/crime/overview/route.ts`
  - `src/app/api/crime/meta/route.ts`
  - `src/app/api/crimes/range/route.ts`
  - `src/lib/queries.ts`
  - `src/lib/queries/builders.ts`
  - `src/lib/queries/filters.ts`
  - `src/lib/db.ts`
  - `src/hooks/useCrimeData.ts`
  - `src/store/useDashboardDemoTimeslicingModeStore.ts`
  - `src/components/dashboard-demo/Demo3dSpatialView.tsx`
  - `src/components/dashboard-demo/DemoInspectPanel.tsx`
  - `src/components/dashboard-demo/DashboardDemoShell.tsx`

### Secondary (MEDIUM confidence)
- None needed.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing stack is explicit and DuckDB capabilities were verified via Context7.
- Architecture: HIGH - recommendations map directly to required code paths and locked phase decisions.
- Pitfalls: HIGH - derived from concrete current hot paths and contract mismatches in the codebase.

**Research date:** 2026-06-19
**Valid until:** 2026-07-19

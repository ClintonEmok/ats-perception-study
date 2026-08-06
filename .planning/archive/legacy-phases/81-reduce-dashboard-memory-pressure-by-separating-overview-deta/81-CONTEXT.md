# Phase 81: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Reduce dashboard memory pressure and request-time cost by splitting summary and detail data flows, replacing overview/meta hot-path CSV scans with persisted DuckDB-backed structures, and tightening the detail query contract so exact detail is loaded progressively only after explicit user focus.

This phase covers dashboard startup behavior, overview and metadata API shape, range-query behavior for exact detail, and persistence strategy for analytical data served to the dashboard.

</domain>

<decisions>
## Implementation Decisions

### Overview payload
- **D-01:** The canonical overview payload is pre-binned counts, not sampled raw timestamps.
- **D-02:** Overview bins are filter-aware for crime-type and district filters, but should not change with map viewport movement.
- **D-03:** The backend source for overview bins is a DuckDB aggregated table, not a raw CSV scan.
- **D-04:** Phase 81 should optimize for a fixed medium default overview bin resolution.

### Detail load trigger
- **D-05:** The dashboard must not eagerly load full detail data on mount.
- **D-06:** The first full detail load is triggered only by explicit user narrowing intent, specifically brush or zoom interaction.
- **D-07:** Before full detail is loaded, detail-heavy surfaces should render a summary-backed preview state.
- **D-08:** The first detail fetch should target a narrowed working window, not the whole dataset stream.
- **D-09:** The client should retain detail data as a replaceable working-window cache rather than accumulate the full dataset.

### Range query policy
- **D-10:** The default detail query policy should use a tight default window around the user's focus.
- **D-11:** Detail and slice workflows require exact rows; overflow sampling is not acceptable for those paths.
- **D-12:** Exact detail under result pressure should use progressive paging rather than a single huge response.
- **D-13:** The hot-path exact `queryCrimeCount(...)` call should be removed in favor of lighter `hasMore` or `limit + 1` semantics.
- **D-14:** When a requested detail range is too broad, the product should prompt the user to narrow the range instead of loading the broad query anyway.
- **D-15:** When detail fetches page, the client should prioritize the actively visible or selected slice window first.

### Storage strategy
- **D-16:** The canonical analytical source for overview, metadata, and detail queries in this phase is persisted DuckDB tables.
- **D-17:** Persisted analytical structures should be built once and reused until the underlying dataset changes.
- **D-18:** Overview startup data should come from a materialized aggregate table.
- **D-19:** Metadata endpoints such as `/api/crime/meta` should use a precomputed metadata table rather than repeated scans.
- **D-20:** The persisted DuckDB tables should be populated by one-time CSV ingest, after which hot paths should stop serving from repeated CSV scans.

### the agent's Discretion
- The planner may choose the exact page size, overview bin count, and invalidation mechanism as long as they preserve the locked summary/detail split and exact-detail guarantees above.
- The planner may decide whether overview and metadata aggregates live in one or multiple derived DuckDB tables as long as request-time CSV scans are removed from hot startup paths.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning context
- `.planning/PROJECT.md` - Project goals and product constraints for the adaptive space-time cube prototype.
- `.planning/REQUIREMENTS.md` - Current milestone requirements and requirement vocabulary.
- `.planning/ROADMAP.md` - Phase ordering, dependencies, and the new Phase 81 entry.
- `.planning/STATE.md` - Current milestone status and roadmap evolution.

### Codebase architecture
- `.planning/codebase/STACK.md` - Current stack and dependency constraints, including Next.js, DuckDB, Arrow, Zustand, and visualization libraries.
- `.planning/codebase/ARCHITECTURE.md` - Layer boundaries, data flow, workers, and API route responsibilities.
- `.planning/codebase/INTEGRATIONS.md` - External and internal integration points relevant to data loading and API boundaries.

### Timeline and startup loading
- `src/store/useTimelineDataStore.ts` - Summary loading via `loadSummaryData()` and heavy full-data loading via `loadRealData()`.
- `src/components/viz/CubeVisualization.tsx` - Current eager dashboard-mount call to `loadRealData()` that Phase 81 should eliminate or defer.
- `src/components/timeline/DemoDualTimeline.tsx` - Overview/detail derivation and current client-side rebucketing behavior.

### Hot API paths
- `src/app/api/crime/overview/route.ts` - Current overview route that scans CSV and returns sampled timestamps.
- `src/app/api/crime/meta/route.ts` - Current metadata route performing repeated aggregate CSV scans.
- `src/app/api/crimes/range/route.ts` - Current exact-detail route with broad defaults and count-plus-data query flow.

### Query and storage layer
- `src/lib/queries.ts` - `queryCrimesInRange(...)` and `queryCrimeCount(...)` behavior that currently powers `/api/crimes/range`.
- `src/lib/db.ts` - Global DuckDB initialization, process-wide singleton behavior, and persisted helper-table setup.

### Detail consumers of `/api/crimes/range`
- `src/hooks/useCrimeData.ts` - Viewport/detail fetch hook using `/api/crimes/range` defaults.
- `src/store/useDashboardDemoTimeslicingModeStore.ts` - Burst-generation and manual draft-bin workflows that require exact detail rows.
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` - Per-slice detail fetching that currently requests up to 50k rows per slice.
- `src/components/dashboard-demo/DemoInspectPanel.tsx` - Slice count recalculation path that currently refetches exact rows.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTimelineDataStore.loadSummaryData()` already provides a natural summary-first entry point for dashboard startup.
- `useTimelineDataStore.loadRealData()` contains the current full Arrow-stream load path that should become deferred or scoped.
- `ensureSortedCrimesTable()` in `src/lib/db.ts` demonstrates the existing pattern for persisted DuckDB derived structures.
- `DemoDualTimeline` already supports overview rendering from summary timestamps and can be adapted to consume server-binned overview data.

### Established Patterns
- Zustand stores coordinate timeline, slices, and dashboard demo behavior, so summary/detail split decisions should flow through store boundaries rather than ad hoc component fetches.
- API routes currently encapsulate DuckDB access; Phase 81 should preserve that layering while changing route contracts and storage sources.
- The app already uses lazy and conditional data loading patterns in places, so deferring detail load aligns with existing architecture.

### Integration Points
- Dashboard startup path: `CubeVisualization` + `useTimelineDataStore`.
- Overview timeline path: `DemoDualTimeline` + `/api/crime/overview` + `/api/crime/meta`.
- Exact detail path: `/api/crimes/range` consumed by hooks, slice-inspection flows, and burst-generation flows.
- Storage lifecycle path: `src/lib/db.ts` plus query helpers and any new derived-table build utilities.

</code_context>

<specifics>
## Specific Ideas

- The overview tab should render from summary data only and must not require the full Arrow stream to become useful.
- Detail precision matters especially for slices, so summary optimization must not degrade exact slice analysis.
- The intended product behavior is a clear summary-first, detail-on-intent pipeline rather than a hidden eager preload.

</specifics>

<deferred>
## Deferred Ideas

- Parquet-backed or hybrid columnar ingestion remains a valid future optimization path, but Phase 81 locks on one-time CSV ingest into persisted DuckDB tables rather than requiring a Parquet migration now.
- Fine-grained choices such as exact page size, exact medium-bin resolution, and future static artifact exports are deferred to planning.

</deferred>

---

*Phase: 81-Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads*
*Context gathered: 2026-06-19*

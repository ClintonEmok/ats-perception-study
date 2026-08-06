# Phase 82: add poi to 2d map on dashboard demo - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

Wire the existing `MapPoiLayer` (`src/components/map/MapPoiLayer.tsx`) into the 2D map used by the dashboard-demo so the four POI categories (police, schools, transit, parks) are visible alongside the crime data, with a dashboard-demo toggle/control surface consistent with the existing STKDE and Heatmap toggle buttons, and respecting the demo's `useDashboardDemoMapLayerStore` so persistence and isolation are preserved.

Out of scope: changing the POI dataset, adding new POI categories, mutating the shared `MapPoiLayer` API, touching the `dashboard` route (non-demo), evaluation/locking wiring.

</domain>

<decisions>
## Implementation Decisions

### Data + State Source
- Use the existing `useDashboardDemoMapLayerStore` (already has `poi: true` default and `opacity.poi: 1`) — do **not** introduce a new store
- Read `POI_DATA` from `@/lib/poi-data` as the layer already does
- Categories default follows the layer's existing default: `['police', 'schools', 'transit', 'parks']`

### Wiring (MapVisualization)
- Add `<MapPoiLayer visible={visibility.poi} categories={...} />` inside the `<MapBase>` children in `src/components/map/MapVisualization.tsx`
- Read visibility from the resolved `mapLayerStore` (the same one the other layers read from via `mapLayerStoreOverride`)
- Apply `opacity.poi` to the markers via the layer's existing `style` mechanism (extend `MapPoiLayer` minimally with optional `opacity` prop OR wrap it in a `div` with `style={{ opacity }}` — wrap approach preferred to avoid touching the shared layer's contract)
- Use the existing `MapPoiLegend` only when the layer is visible (consistent with `MapLayerManager.tsx` pattern)

### Toggle Surface (DemoMapVisualization)
- Add a third `Button` next to the existing STKDE (top-14) and Heatmap (top-24) buttons: "Show POIs" / "Hide POIs" positioned at `top-4` (above STKDE)
- Reuse the `Layers3` icon for visual parity
- Wire to `toggleVisibility('poi')` from the demo map layer store
- Apply `destructive` variant when visible, `outline` when hidden (mirrors STKDE/Heatmap)

### Compatibility
- Phase 79 compatibility: POI layer renders purely in the 2D map; does not touch `useDashboardDemoCoordinationStore`, slices, or 3D widgets
- Phase 80 compatibility: POI toggle is not subject to evaluation locks (it's a passive overlay); the existing `disabled` props on the STKDE/Heatmap buttons are for participant lock; POI stays researcher/controlled via the same store

### the agent's Discretion
- Exact icon choice for the POI button (Layers3 is fine; `MapPin` from lucide is an alternative)
- Marker size scale relative to current 6×6 (keep as-is unless layering causes overlap)
- Whether to dedupe categories on the layer (keep current behavior)
- Legend placement inside the demo map card (can mirror `MapTypeLegend` position or omit and rely on hover popups)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/map/MapPoiLayer.tsx` — already exports `MapPoiLayer` and `MapPoiLegend`; accepts `visible` and `categories` props
- `src/lib/poi-data.ts` — `POI_DATA`, `PoiData`, `MapPoiCategory`, `CATEGORY_STYLES`
- `src/store/useDashboardDemoMapLayerStore.ts` — has `visibility.poi: true`, `opacity.poi: 1`, persisted under `dashboard-demo-map-layer-store-v1`
- `src/components/map/MapLayerManager.tsx` — reference for how POI is toggled in the non-demo `MapVisualization` (uses `useMapLayerStore`); dashboard demo does **not** use `MapLayerManager`

### Established Patterns
- `MapVisualization` already accepts `mapLayerStoreOverride` and reads `visibility` + `opacity` from it for other layers (`events`, `heatmap`, `trajectories`, `clusters`, `stkde`) — POI slot is unused
- `DemoMapVisualization` adds overlay buttons with absolute positioning on the right edge (`right-4 top-14`, `top-24`) and reads visibility from the demo map layer store directly (not via the override prop)
- Demo map buttons use `Button` from `@/components/ui/button` with `variant="destructive"` when on / `variant="outline"` when off, `size="sm"`, `text-[11px]`, `rounded-full`, `gap-2`

### Integration Points
- `src/components/map/MapVisualization.tsx` (lines ~166-207, inside `<MapBase>` children) — add POI layer
- `src/components/dashboard-demo/DemoMapVisualization.tsx` (after line 113) — add POI toggle button
- `src/components/dashboard-demo/DemoMapVisualization.tsx` (line 50) — add `poiVisible` selector near `heatmapVisible`

</code_context>

<specifics>
## Specific Ideas

- POI markers should not occlude crime event points; rely on existing z-order (markers render last so they sit on top of points, which is the intent for context cues)
- Default state (poi: true) means POIs appear immediately when the demo loads — consistent with the persisted default
- No new API route, no DuckDB changes — purely a render wiring + a toggle

</specifics>

<deferred>
## Deferred Ideas

- Per-category toggles (police vs transit vs parks) — defer; current implementation renders all four by default
- POI-driven slicing (e.g., "show crimes within 500m of police station X") — out of scope
- Server-backed POI dataset — current `POI_DATA` is a local static module; deferred

</deferred>

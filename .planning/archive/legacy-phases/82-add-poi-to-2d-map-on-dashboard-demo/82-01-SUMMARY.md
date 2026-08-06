# 82-01-SUMMARY.md — Wire MapPoiLayer into demo map + add toggle

**Status:** Complete ✓
**Type:** Feature (frontend, render-wiring + UI toggle)

## What Shipped

POIs (police, schools, transit, parks) now render on the dashboard-demo 2D map by default, with a new "Show POIs / Hide POIs" toggle button on the demo map.

### Files Changed
- `src/components/map/MapVisualization.tsx` (+9 lines) — added `MapPoiLayer` import + conditional render inside `<MapBase>`, wrapped in a div that applies `opacity.poi` from the resolved map layer store
- `src/components/dashboard-demo/DemoMapVisualization.tsx` (+14 lines) — added `poiVisible` selector + third toggle button at `top-4` (above the STKDE button), wired to `toggleVisibility('poi')` on the demo map layer store

### What Was Already There
- `src/components/map/MapPoiLayer.tsx` + `MapPoiLegend` — full layer implementation
- `src/lib/poi-data.ts` — 50+ Chicago POIs (police districts, CTA stations, universities, parks)
- `src/store/useDashboardDemoMapLayerStore.ts` — `poi: true` default, `opacity.poi: 1`, persisted under `dashboard-demo-map-layer-store-v1`

The gap was wiring only: the layer was implemented and the store had the slot, but `MapVisualization` never rendered the layer and the demo map had no toggle.

## Decisions Captured (vs. CONTEXT.md)

- **Opacity approach:** wrapped the layer in a div with `style={{ opacity: opacity.poi }}` rather than extending the layer's props. Keeps the shared `MapPoiLayer` API untouched and lets future map consumers reuse the layer.
- **Categories:** rendered all four by default (`['police', 'schools', 'transit', 'parks']`) — matches the layer's own default.
- **Button placement:** `top-4` (per user confirmation), above STKDE at `top-14`. Uses `Layers3` icon for visual parity with the existing STKDE and Heatmap buttons.
- **Pointer events:** set `pointer-events-auto` on the wrapper so POI markers remain clickable; the parent `MapBase` doesn't disable events.

## Verification

- `pnpm typecheck` — no new errors in the two changed files (pre-existing errors in `src/lib/queries.ts` and `src/store/useStkdeStore.test.ts` are unrelated to this phase)
- `pnpm lint` — no new warnings on changed files
- Phase 79 compatibility: no changes to coordination store, slice store, or 3D widgets
- Phase 80 compatibility: POI toggle reads/writes the demo map layer store only; not subject to evaluation locks
- Diff: 23 net lines across 2 files

## Manual UAT (recommended)

1. Open `/dashboard-demo`
2. Confirm ~50 POI markers (red P, maroon U, multi-color transit dots, green P) appear on the map by default
3. Click "Hide POIs" — all markers disappear; button switches to "Show POIs" with outline variant
4. Reload the page — toggle state persists
5. Click an individual POI — no-op is fine; hover popup shows name + category
6. STKDE and Heatmap toggles still work; POI toggle is independent

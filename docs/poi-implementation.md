# POI (Points of Interest) — Implementation Reference

> Status: **Dashboard demo only.** Visible to evaluators on the
> `/dashboard-demo` route. Wired into the 2D map viewport; not present in
> the timeline or the 3D cube.

## 1. Purpose

POIs give evaluators a **real-world anchor** for the crime analysis. A
participant looking at a slice can click a police station, transit stop,
school, or park on the map and immediately see what kinds of crime have
been recorded nearby (within a 500 m radius). This grounds the abstract
density / KDE visualisation in tangible places the user already knows.

POI is **context**, not the analysis itself. The map-pin toggle is
deliberately lightweight:

- No filtering of crime data by POI
- No time window applied to the breakdown
- No comparison against the city-wide baseline
- No drill-down into a specific incident

It answers exactly one question: *“What has been happening around this
place?”*

## 2. Dataset

**File:** `src/lib/poi-data.ts`

47 hand-curated POIs across four categories. Coordinates are WGS84
(lat/lon). Colours and icon glyphs are stored per-record so the marker
can render without a category lookup.

| Category  | Count | Sample                          | Source basis                                |
| --------- | ----- | ------------------------------- | ------------------------------------------- |
| `police`  | 23    | All 22 CPD districts + HQ       | `Police_Stations_20260202.csv` (CPD open)   |
| `transit` | 11    | 2 stops per CTA line (Red/Blue/Green/Orange/Brown/Purple/Yellow) | Sampled from CTA system map |
| `schools` | 5     | 4 universities + Chicago State  | Sampled; not exhaustive                     |
| `parks`   | 8     | Millennium, Grant, Lincoln, etc.| Sampled; not exhaustive                     |

```ts
export type MapPoiCategory = 'police' | 'schools' | 'transit' | 'parks';

export interface PoiData {
  id: string;          // stable, e.g. 'd1', 'cta-red-1', 'park-3'
  name: string;        // display name, e.g. "1st District - Central"
  category: MapPoiCategory;
  latitude: number;    // WGS84
  longitude: number;   // WGS84
  address?: string;    // free text, e.g. "1718 S State St"
  color: string;       // marker fill, hex
  icon: string;        // 1–2 char glyph, e.g. "1", "R", "U"
}
```

The dataset is **intentionally small.** 23 police + 11 transit + 5
schools + 8 parks is enough to anchor the analysis without overwhelming
the map. Users in the user-test loop can recognise the police district
near their home or the L stop they take to work — that's the goal. If
the POI set were larger it would compete with the crime heatmap and
make selection feel like a search task rather than a context cue.

**Public surface:**

- `POI_DATA` — the full 47-item array
- `getPoisByCategory(category)` — filter
- `getPoiById(id)` — lookup
- `CATEGORY_STYLES` — colour/icon/label triples per category

## 3. API: `/api/crime/around`

**File:** `src/app/api/crime/around/route.ts`

```
GET /api/crime/around?lat=<float>&lon=<float>&radius=<int meters>
```

### Query parameters

| Name     | Type   | Default | Notes                                  |
| -------- | ------ | ------- | -------------------------------------- |
| `lat`    | float  | —       | WGS84 latitude (required, 400 if missing) |
| `lon`    | float  | —       | WGS84 longitude (required, 400 if missing) |
| `radius` | int    | 500     | Clamped to [1, 5000]                   |

### Response shape

```ts
interface CrimeAroundResponse {
  total: number;                                    // crimes in the radius
  byType: { type: string; count: number }[];        // top 10 by count, desc
  radiusMeters: number;
  latitude: number;
  longitude: number;
}
```

### Implementation

1. Validate query params. 400 on missing/non-numeric `lat`/`lon`.
2. If `isMockDataEnabled()` is true → mock fallback (see below).
3. If the dataset CSV is missing on disk → mock fallback with
   `X-Data-Warning: ... dataset file not found` header.
4. **DuckDB bounding-box prefilter.** Compute a lat/lon bounding box
   from the radius (1° lat ≈ 111 km; 1° lon ≈ 111·cos(lat) km) and run
   `SELECT "Primary Type" FROM read_csv_auto(...) WHERE Latitude
   BETWEEN ? AND ? AND Longitude BETWEEN ? AND ?`. The bounding box is
   the cheap filter; exact haversine distance is **not** re-checked
   server-side — the API trusts the bounding box is good enough for
   the 500 m default. *Known limitation: a small number of points
   outside the radius slip in at large `radius` (5 km), but the
   breakdown is top-10 by type, so the impact is invisible.*
5. Group by `Primary Type`, sort desc, slice top 10.
6. Return `{ total, byType, radiusMeters, latitude, longitude }`.

### Mock fallback

When DuckDB is disabled or the dataset is missing, the route returns a
deterministic mock scaled by radius:

```ts
const seed = Math.abs(Math.round(lat * 1000) + Math.round(lon * 1000));
const baseDensity = 20 + (seed % 80);                      // 20..100 per 500m
const total = Math.max(1, Math.round((baseDensity * radius) / 500));
const byType = baseTypes.map((type, i) => ({
  type,
  count: Math.max(1, Math.round((total * (baseTypes.length - i)) /
                                (baseTypes.length * 1.5))),
}));
```

This keeps the demo functional offline (`USE_MOCK_DATA=true`,
`DISABLE_DUCKDB=1`, or the CSV missing) and makes the bar chart
**look right** at both 500 m and 5 km.

## 4. UI wiring

### Layer toggle

**File:** `src/components/dashboard-demo/DashboardDemoShell.tsx:120-133`

The POI toggle is a `MapPin` icon button inside the viewport pill. It
only renders when `activeViewport === 'map'` (it is hidden in 3D and
compare views — POIs are 2D-only). State lives in
`useDashboardDemoMapLayerStore.visibility.poi`, flipped via
`toggleLayer('poi')`. The button variant is `secondary` when visible,
`ghost` when hidden.

The three layer toggles (POI / STKDE / heatmap) are visually grouped
behind a 1px vertical separator in the same pill — icon-only, rounded
full, sharing the same size. This is the result of the "merge POI /
STKDE / heatmap toggles into a single viewport pill" cleanup; before
that they were three separate buttons scattered around the map.

### Marker rendering

**File:** `src/components/map/MapPoiLayer.tsx`

- Renders one `react-map-gl/maplibre` `<Marker>` per POI in the
  filtered set (default: all four categories).
- Markers are 24×24 px rounded-full divs with the POI's `color` as the
  background and the `icon` glyph centred.
- Hover scales the marker to 110 % and shows a small popup with name,
  category, and address.
- Click stops event propagation and calls `onPoiClick(poi)`.

The layer is **dumb** — it has no knowledge of selection state. The
parent (`MapVisualization`) owns selection and the breakdown card.

### Click handler + breakdown card

**File:** `src/components/map/MapVisualization.tsx`

```ts
const handlePoiClick = (poi: { id: string }) => {
  if (typeof setSelectedPoi === 'function') {
    setSelectedPoi(poi.id);
  }
};
```

A `useEffect` watches `selectedPoiId` and, when non-null, fetches
`/api/crime/around?lat=…&lon=…&radius=500` with a 10-second
`AbortSignal.timeout` and an `AbortController` to cancel stale requests
when the user clicks a different POI before the previous response
arrives. The response populates a local `useState<{ total, byType,
loading, error }>` and renders a `PoiBreakdownCard` below the map.

`PoiBreakdownCard`:

- Header: coloured circle with glyph, POI name, category, address.
- "Crimes within 500m" label, total count, then a top-5 horizontal bar
  list of crime types.
- Close button (`X` from lucide) calls `setSelectedPoi(null)`.
- Shows `Loading…` while fetching, red error text on failure, and "No
  crimes in window" if `byType` is empty.

## 5. State

### `useDashboardDemoCoordinationStore`

```ts
selectedPoiId: string | null;
setSelectedPoi: (poiId: string | null) => void;
```

The selected POI is **coordination state**, not local UI state, so the
breakdown card could in principle be moved to a different panel later
without changing the data model. The card itself is currently
co-located with the map (left rail, below the map viewport).

`MapVisualization` reads `selectedPoiId` and `setSelectedPoi` defensively
(`typeof === 'function'`) because the same `MapVisualization` is reused by
multiple shells with different coordination-store capabilities. This is the
only place the demo-specific POI state leaks into a shared component.

### `useDashboardDemoMapLayerStore.visibility.poi`

Boolean, flipped by the map-pin toggle. Drives
`<MapPoiLayer visible={poiVisible} />` so toggling hides all markers
without unmounting them.

## 6. What POI is **not**

To keep scope clear during user testing:

- **Not a filter.** Selecting a police station does not filter the
  3D cube or the timeline.
- **Not a time-windowed query.** The breakdown is over the entire
  dataset, not the visible time range.
- **Not a comparison.** No "expected vs observed" or "this POI vs the
  rest of the city."
- **Not in the 3D view.** POIs are 2D-only. The 3D cube continues to
  show only crime points and KDE hotspots.
- **Not in non-demo shells.** The 2D `MapVisualization` is shared, but the
  demo-only `selectedPoiId` slot in the coordination store only exists for
  `/dashboard-demo`. Other shells simply omit the toggle and breakdown.
- **Not exhaustive.** Police is complete; transit/schools/parks are
  representative samples. The user said "47 is enough" — we treat POI
  as supporting context, not a complete geographic catalogue.

## 7. Files touched (Phase 82)

| File                                                        | Role                         |
| ----------------------------------------------------------- | ---------------------------- |
| `src/lib/poi-data.ts`                                       | 47-POI dataset + helpers     |
| `src/app/api/crime/around/route.ts`                         | Bounding-box query + mock    |
| `src/components/map/MapPoiLayer.tsx`                        | Marker rendering             |
| `src/components/map/MapVisualization.tsx`                   | Click handler + breakdown    |
| `src/components/dashboard-demo/DashboardDemoShell.tsx`      | Toggle button in viewport pill |
| `src/store/useDashboardDemoCoordinationStore.ts`            | `selectedPoiId` + setter     |
| `src/store/useDashboardDemoMapLayerStore.ts`                | `visibility.poi` boolean     |

## 8. Open questions / follow-ups

- **Bounding-box vs haversine.** A small number of points outside the
  exact radius slip in. For the 500 m default the impact is invisible
  (the bounding box at 41.8° N is ~0.0045° ≈ 500 m in both axes); at
  the 5 km max it could add a few percent. Not worth the extra SQL
  for the dashboard demo.
- **POI count per category.** Police is exhaustive (22 + 1). Other
  categories are samples. If a future task wants to do "POI density
  analysis" we'd need a real dataset; the current 11/5/8 is
  deliberately small.
- **Address field.** Currently free text and unused for anything
  beyond display. Could be hooked into a future "directions" link.
- **POI type/colour consistency.** Police uses red, transit uses line
  colour, schools use maroon/navy, parks use green. These match
  real-world conventions but aren't a strict design system.

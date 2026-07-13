# External Integrations

**Analysis Date:** 2026-07-14

## APIs & External Services

**OpenStreetMap Overpass API:**
- Service: OSM Overpass API for POI (Point of Interest) queries
- Endpoint: `https://overpass-api.de/api/interpreter`
- SDK/Client: Custom client in `src/lib/neighbourhood/osm.ts`
- Auth: None (public API)
- Usage: Fetches restaurants, bars, schools, hospitals, parks, shops, transit stations within bounding boxes
- Request format: POST with `application/x-www-form-urlencoded` body containing Overpass QL query
- Response format: JSON with `elements` array containing OSM nodes/ways with tags
- Rate limiting: 30-second timeout configured in query

**Convex (unused/legacy):**
- Service: Convex backend-as-a-service
- Config: `.env.local` contains `CONVEX_DEPLOYMENT=dev:aromatic-lapwing-757` and `NEXT_PUBLIC_CONVEX_URL`
- Status: Not actively used; `convex/` directory is empty; appears to be leftover from earlier development

## Data Sources

**Primary Crime Dataset:**
- Path: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
- Format: CSV with ~8.5M rows (Chicago crime data 2001-2026)
- Schema columns: `Date` (TIMESTAMP), `Primary Type`, `IUCR`, `District`, `Year`, `Latitude`, `Longitude`
- Accessed via: `src/lib/db.ts` `getDataPath()`
- Used by: All API routes under `/api/crime/*`, `/api/adaptive/*`, `/api/stkde/*`

**IUCR Codes Reference:**
- Path: `data/sources/Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv`
- Format: CSV reference data for crime type codes

**Police Stations:**
- Path: `data/sources/Police_Stations_20260202.csv`
- Format: CSV with police station locations

**GeoJSON Boundary Files (public/):**
- `public/data/chicago-community-areas.geojson` - Community area boundaries
- `public/data/chicago-neighbourhoods.geojson` - Neighborhood boundaries
- `public/data/chicago-police-districts.geojson` - Police district boundaries
- `public/data/PoliceBeatDec2012_20260623.geojson` - Police beat boundaries

**Static Baseline:**
- Path: `public/baselines/baseline_168.json`
- Format: JSON with 168 cells (24 hours x 7 days) for contextual baseline
- Usage: Fallback when DuckDB is unavailable for `/api/adaptive/contextual-baseline`

**DuckDB Cache:**
- Path: `data/cache/crime.duckdb` (default, configurable via `DUCKDB_PATH`)
- Format: DuckDB database file
- Tables created: `crimes_sorted`, `crime_dataset_meta`, `crime_overview_bins_medium`, `crime_dataset_state`, `adaptive_global_cache`, `study_*` tables
- Created by: `src/lib/db.ts` `getDb()` and `ensureSummaryMaterialization()`

## Data Storage

**Databases:**
- DuckDB 1.4.4 (in-process OLAP)
  - Connection: File-based at `data/cache/crime.duckdb` (or `DUCKDB_PATH` env var)
  - Client: Native Node.js driver (`duckdb` package)
  - Configuration: 2 threads (default), `preserve_insertion_order=false`
  - Tables: `crimes_sorted` (sorted copy for zone map optimization), `crime_dataset_meta`, `crime_overview_bins_medium`, `adaptive_global_cache`, `study_sessions`, `study_trials`, `study_questionnaire_responses`, `study_condition_events`

**File Storage:**
- Local filesystem only (no cloud storage)
- CSV source files in `data/sources/`
- DuckDB cache in `data/cache/`
- GeoJSON boundary files in `public/data/`

**Caching:**
- In-memory cache in `src/app/api/neighbourhood/poi/route.ts` (24-hour TTL per bounding box)
- In-memory cache in `src/app/api/adaptive/contextual-baseline/route.ts` (per DuckDB path)
- DuckDB table-level caching for `adaptive_global_cache`
- HTTP cache headers on API responses (`Cache-Control`)

## Authentication & Identity

**Auth Provider:**
- None (no authentication system)
- Study participants identified by `participantId` string passed in request bodies
- No JWT, session tokens, or user accounts

## Monitoring & Observability

**Error Tracking:**
- None (no external error tracking service)

**Logs:**
- Custom `LoggerService` class in `src/lib/logger.ts`
- Client-side: Batches events, flushes via `navigator.sendBeacon` or `fetch POST`
- Server-side: `console.log`/`console.error` in API routes
- Study logging: `/api/study/log` endpoint for structured study events
- Development logs: `dev.log`, `.dev-server.log` files

## Internal APIs

**Crime Data Routes:**
- `GET /api/crime/stream` - Streaming crime data (Apache Arrow IPC format)
  - File: `src/app/api/crime/stream/route.ts`
  - Query params: `startDate`, `endDate`, `crimeTypes`, `maxRows`
  - Response: `application/vnd.apache.arrow.stream`
  - Runtime: Node.js, force-dynamic

- `GET /api/crime/bins` - Binned crime data for 3D cube
  - File: `src/app/api/crime/bins/route.ts`
  - Query params: `resX`, `resY`, `resZ`, `types`, `districts`, `startTime`, `endTime`
  - Response: JSON `{ bins: Bin[] }`
  - Runtime: Node.js, force-dynamic

- `GET /api/crimes/range` - Viewport-based crime data with cursor pagination
  - File: `src/app/api/crimes/range/route.ts`
  - Query params: `startEpoch`, `endEpoch`, `pageSize`, `bufferDays`, `crimeTypes`, `districts`, `target`, `cursor`
  - Response: JSON `{ data: CrimeRecord[], meta: CrimeDataMeta }`
  - Runtime: Node.js, force-dynamic

- `GET /api/crime/around` - Crime data around a point
  - File: `src/app/api/crime/around/route.ts`

- `GET /api/crime/facets` - Crime type/district facets
  - File: `src/app/api/crime/facets/route.ts`

- `GET /api/crime/meta` - Dataset metadata
  - File: `src/app/api/crime/meta/route.ts`

- `GET /api/crime/overview` - Overview summary
  - File: `src/app/api/crime/overview/route.ts`

- `GET /api/crime/stats-summary` - Statistics summary
  - File: `src/app/api/crime/stats-summary/route.ts`

**Adaptive Time Routes:**
- `GET /api/adaptive/global` - Global adaptive scaling maps
  - File: `src/app/api/adaptive/global/route.ts`
  - Query params: `binCount`, `kernelWidth`, `binningMode`
  - Response: JSON with `densityMap`, `countMap`, `burstinessMap`, `warpMap` (Float32Array as JSON)
  - Runtime: Node.js, force-dynamic

- `GET|POST /api/adaptive/bursts` - Burst detection data
  - File: `src/app/api/adaptive/bursts/route.ts`
  - GET query params: `startEpoch`, `endEpoch`, `baselineStartEpoch`, `baselineEndEpoch`, `granularity`, `crimeTypes`, `spatialFormula`
  - POST body: `{ partitions, crimeTypes, granularity, spatialFormula }`
  - Response: JSON `{ bins: BurstBin[], targetSliceCount, totalB }`
  - Runtime: Node.js, force-dynamic

- `GET /api/adaptive/contextual-baseline` - 168-cell hourly baseline
  - File: `src/app/api/adaptive/contextual-baseline/route.ts`
  - Response: JSON `Baseline168` with header and 168 cells
  - Runtime: Node.js, force-dynamic

**STKDE Routes:**
- `POST /api/stkde/hotspots` - Spatio-temporal kernel density estimation
  - File: `src/app/api/stkde/hotspots/route.ts`
  - Body: `StkdeRequest` with domain, filters, params, limits, guardrails
  - Response: JSON `StkdeResponse` with hotspots and heatmap
  - Runtime: Node.js, force-dynamic
  - Supports full-population and sampled compute modes with fallback

**Neighbourhood Routes:**
- `GET /api/neighbourhood/poi` - Points of interest within bounds
  - File: `src/app/api/neighbourhood/poi/route.ts`
  - Query params: `minLat`, `maxLat`, `minLon`, `maxLon`
  - Response: JSON neighbourhood summary with POI data
  - Runtime: Node.js, force-dynamic
  - 24-hour in-memory cache per bounding box

**Study Routes:**
- `POST /api/study/log` - Evaluation study event logging
  - File: `src/app/api/study/log/route.ts`
  - Body: `StudyIntent` (session-start, session-end, trial-complete, questionnaire-response, condition-toggle, warp-adjustment)
  - Response: JSON `{ ok: boolean, kind: string }`
  - Runtime: Node.js, force-dynamic
  - Writes to DuckDB study tables via `src/lib/study/storage.ts`

**Synthetic Data Routes:**
- `GET /api/synthetic/bursty` - Generate synthetic bursty crime sequences
  - File: `src/app/api/synthetic/bursty/route.ts`
  - Query params: `alpha`, `delta`, `count`, `startEpoch`, `endEpoch`, `typeStrategy`, `seed`, `windowSec`, `format`
  - Response: JSON or CSV (when `format=csv`)
  - Runtime: Node.js, force-dynamic

## Protocol Details

**Request/Response Formats:**
- Crime streaming: Apache Arrow IPC stream format (`application/vnd.apache.arrow.stream`)
- All other API routes: JSON (`application/json`)
- Study logging: JSON POST with typed intent bodies
- POI queries: Overpass QL (POST form-encoded) -> JSON response

**Data Serialization:**
- Apache Arrow IPC for high-throughput crime data streaming (server -> client)
- JSON for all other API responses
- Float32Array serialized as JSON arrays for density/burstiness/warp maps
- Cursor-based pagination for `/api/crimes/range` (format: `{timestamp}:{rowId}`)

**Error Handling Pattern:**
- All API routes catch errors and return structured error responses
- DuckDB failures trigger mock data generation with `X-Data-Warning` header
- Mock data used as fallback when `USE_MOCK_DATA=true` or DuckDB unavailable

**Coordinate System:**
- Geographic: WGS84 lat/lon (Chicago bounds: lon -87.9 to -87.5, lat 41.6 to 42.1)
- Normalized: -50 to 50 range for 3D cube visualization
- Web Mercator: Via `@math.gl/web-mercator` for map projections
- Conversion functions: `src/lib/coordinate-normalization.ts`

**Web Workers:**
- `src/workers/adaptiveTime.worker.ts` - Adaptive time scaling computation
- `src/workers/stkdeHotspot.worker.ts` - STKDE hotspot filtering
- `src/workers/kdeSlice.worker.ts` - KDE slice computation
- Communication: Message-based with `requestId` for correlation

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA=false` (in `.env`) - Enables DuckDB data pipeline
- `NEXT_PUBLIC_API_BASE_URL=` (in `.env`) - API base URL (empty for same-origin)

**Optional env vars:**
- `DUCKDB_PATH` - Custom DuckDB database location
- `DISABLE_DUCKDB` - Force mock data mode
- `DUCKDB_THREADS` - DuckDB thread count (default: 2)
- `STKDE_QA_FULL_POP_ENABLED` - Enable full-population STKDE (default: true)

**Convex env vars (legacy/unused):**
- `CONVEX_DEPLOYMENT` - Convex deployment selector
- `NEXT_PUBLIC_CONVEX_URL` - Convex project URL
- `NEXT_PUBLIC_CONVEX_SITE_URL` - Convex site URL

**Secrets location:**
- `.env.local` for Convex credentials (not committed to git)
- No API keys or secrets required for core functionality

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- `navigator.sendBeacon('/api/study/log', blob)` - Best-effort study event delivery on page unload
- `fetch('/api/study/log', ...)` - Acknowledged study event writes with retry logic

---

*Integration audit: 2026-07-14*

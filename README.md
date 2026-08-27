# Adaptive Space-Time Cube Prototype

A Next.js prototype for exploring crime patterns through an adaptive space-time cube. Connects a 3D cube, a 2D map, and a dual timeline so analysts can brush time, inspect points, and see bursty intervals expand or compress as time resolution changes.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9, React 19.2.7 |
| Language | TypeScript 5.9 (strict mode) |
| Package Manager | pnpm 9.x |
| 3D Rendering | Three.js 0.182, React Three Fiber 9.5 |
| Maps | MapLibre GL 5.17, react-map-gl 8.1 |
| State | Zustand 5, TanStack Query 5 |
| Data | DuckDB 1.4, Apache Arrow 21 |
| 2D Charts | @visx 3.12 (axis, brush, scale, shape) |
| GPU Heatmaps | deck.gl 9.3 |
| Animation | GSAP 3.15 |
| UI | Radix UI 1.4, shadcn/ui, Tailwind CSS 4 |
| Testing | Vitest 4, jsdom 28, React Test Renderer 19 |

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route is the dashboard demo.

The `.env` file sets `USE_MOCK_DATA=false` (DuckDB enabled). To force mock data, set `USE_MOCK_DATA=true` or `DISABLE_DUCKDB=true`.

## Key Features

- **3D Space-Time Cube** — Renders crime density across x (space), z (space), and y (time) axes
- **2D Map** — MapLibre-based geographic view with density heatmaps
- **Dual Timeline** — Overview + detail brushing with adaptive time scaling
- **Adaptive Warp** — Dense time periods expand, sparse periods compress
- **Slice System** — Create, detect, and manage time slices with burst analysis
- **STKDE** — Spatiotemporal KDE for hotspot detection

## DBTA Method

The central technique is **Density-Based Temporal Allocation (DBTA)**. DBTA
allocates visual time according to observed event density instead of giving
every equal-duration interval the same screen width. Dense periods expand so
their internal structure can be inspected; sparse periods compress while
remaining present in the time domain.

The implemented pipeline is:

1. Filter finite event timestamps to the active time domain.
2. Assign timestamps to `b` temporal bins in one pass.
3. Optionally smooth the bin signal with a bounded neighborhood of width `k`.
4. Normalize density by the maximum bin value.
5. Convert each normalized density value `d_i` into a contrast-weighted value:
   `w_i = 1 + 5d_i^3`.
6. Normalize the weights and integrate them as a cumulative map of temporal
   boundaries.
7. Use the same mapping for the timeline and 3D cube so visual position still
   refers to the same underlying event time.

The dashboard uses `b = 1024` adaptive samples, a kernel width of `k = 3`, and
pure density weighting by default. Burstiness can be blended into the worker
signal for ablation studies, but the thesis DBTA path uses density alone.

### Running Time And Memory

Let `n` be the number of valid events, `b` the number of temporal bins, `k`
the smoothing neighborhood width, and `m` the number of displayed slices.

| Stage | Time | Extra space |
|-------|------|-------------|
| Timestamp filtering and bin accumulation | `O(n)` | `O(b)` |
| Bounded density smoothing | `O(bk)` | `O(b)` |
| Weighting and cumulative boundary map | `O(b)` | `O(b)` |
| Slice boundary allocation | `O(m log m + m)` | `O(m)` |

Therefore, the active uniform-time DBTA implementation is `O(n + bk)` time
and `O(b)` additional space. With fixed `b = 1024` and `k = 3`, this is
linear, `O(n)`, in the number of input events. The active dashboard path does
not sort timestamps; it accumulates density bins in one pass and then builds
the cumulative allocation map. The cubic contrast transform changes the
allocation strength, not the asymptotic running time.

The general-purpose adaptive worker in `src/workers/adaptiveTime.worker.ts`
currently sorts a copy of the timestamps before binning, so that path is
`O(n log n + bk)` time and `O(n + b)` space. Its uniform-event mode also uses
binary-search boundary assignment, adding `O(n log b)`. That sorted worker
path is separate from the linear density-only DBTA path described above.

These are algorithmic bounds, not hardware benchmarks. DuckDB handles the
server-side filtering and aggregation before the client receives the event
timestamps or summaries. Optional spatial burst scoring has separate costs;
the average-nearest-neighbor formula is `O(p^2)` for `p` points in a scored
bin, so it is not part of the core density-only DBTA bound.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, data flow, key abstractions
- [Getting Started](docs/GETTING-STARTED.md) — Setup, prerequisites, development workflow
- [Development](docs/DEVELOPMENT.md) — Code conventions, patterns, contributing
- [Testing](docs/TESTING.md) — Test patterns, running tests
- [Configuration](docs/CONFIGURATION.md) — Environment variables, config files
- [API](docs/API.md) — API route reference

The application has one user-facing route: `/`. It renders the dashboard demo with synchronized map, 3D cube, timeline, STKDE, slice, inspect, and compare views. The `/dashboard-demo` path remains available as a direct alias.

## Repository Structure

```text
src/app/                    Next.js routes and API handlers only
src/components/dashboard-demo/  Dashboard UI and dashboard-specific view logic
src/components/             Shared UI components
src/hooks/                  Reusable React hooks
src/lib/                    Domain logic and view models; keep server-only modules isolated here
src/store/                  Zustand state stores
src/types/                  Shared TypeScript types
src/workers/                Web Workers for expensive client-side computation
```

Keep route files thin: validate request parameters, call domain/server code, and return the response. Do not add reusable components or analytics logic under `src/app`. Local datasets, generated DuckDB files, exported figures, and video work stay outside the production source tree and are ignored by Git.

## Development Commands

```bash
pnpm dev             # Start the development server
pnpm typecheck       # Check TypeScript without emitting files
pnpm test -- --run   # Run the complete Vitest suite once
pnpm build           # Create a production build
pnpm dataset:verify  # Verify the local CSV against data/manifest.json
pnpm dataset:build   # Materialize the DuckDB cache before serving
```

The dashboard uses DuckDB for local analytical queries. The raw Chicago CSV and
generated DuckDB cache are intentionally ignored by Git. Reviewers can download
the pinned dataset described in `data/manifest.json`, run `pnpm dataset:verify`,
and then start the app. Set `DATASET_PATH` when the CSV is stored elsewhere.

## License

Private — thesis project.

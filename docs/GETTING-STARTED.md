<!-- generated-by: gsd-doc-writer -->
# Getting Started

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20+ |
| pnpm | 9.x |
| RAM (recommended) | 8 GB+ |
| Disk space | ~500 MB for dataset + DuckDB cache |

The project uses DuckDB as an embedded OLAP database for processing large crime datasets (8.5M+ records). Heavy analytics run in-process, so sufficient RAM is important for smooth operation.

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Project
```

### 2. Install dependencies

```bash
pnpm install
```

The install runs a `postinstall` script that:

1. Applies `patch-package` patches to `node_modules` (`patches/` directory).
2. Creates a symlink for the DuckDB native addon:

```
mkdir -p node_modules/duckdb/lib/binding/3 && \
ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node
```

This symlink step is required because newer versions of pnpm do not place the `.node` binary file where DuckDB expects it. If you see a `MODULE_NOT_FOUND` error related to DuckDB on startup, the symlink is likely missing. Re-run `pnpm run postinstall` to recreate it.

### 3. Set up environment variables

A `.env` file is already present at the project root:

```
USE_MOCK_DATA=false
```

By default, `USE_MOCK_DATA=false` enables DuckDB for real crime data processing. Set it to `true` to bypass DuckDB and use synthetic mock data (useful for development without the full dataset).

Additional optional variables (see [CONFIGURATION.md](CONFIGURATION.md)):

- `DUCKDB_PATH` — Custom path for the DuckDB database file (defaults to `data/cache/crime.duckdb`)
- `DISABLE_DUCKDB` — Forces mock data when set, regardless of `USE_MOCK_DATA`

### 4. Data setup

The application loads crime data from local CSV files. There are two modes:

**Real data mode (default):**

On first request, DuckDB creates a cached database at `data/cache/crime.duckdb` and loads crime records from `data/sources/Crimes_-_2001_to_Present_20260114.csv`. This process runs automatically — no manual step needed.

The database is zone-map optimized: data is sorted by date into a `crimes_sorted` table, which lets DuckDB skip irrelevant row groups when querying date ranges.

**Synthetic data (for development):**

If the CSV source file is not present, the project includes a setup script:

```bash
node scripts/setup-data.js
```

This generates 100,000 synthetic crime events into `data/source.csv`, then converts them to a Parquet file at `data/crime.parquet` with normalized coordinates (Web Mercator x/z and time y).

The script reuses blocks for trajectory pillars and scatters points around Chicago West Loop coordinates.

### 5. Post-installation check

Verify the DuckDB native addon symlink exists:

```bash
ls -la node_modules/duckdb/lib/binding/3/duckdb.node
```

If the file is not found, run:

```bash
pnpm run postinstall
```

## Development Server

Start the development server:

```bash
pnpm run dev
```

The Next.js dev server starts on `http://localhost:3000` by default. Open it in your browser.

The first page load may take a few seconds longer because DuckDB initializes the database and loads crime data. Subsequent loads are fast due to caching.

## Production Build

Build the application for production:

```bash
pnpm run build
```

This runs `NEXT_DISABLE_TURBOPACK=1 next build`. Turbopack is disabled because DuckDB is configured as a `serverExternalPackage` in `next.config.ts` and must run in the standard Node.js server environment.

Start the production server:

```bash
pnpm run start
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # Backend endpoints (crime, stkde, adaptive, etc.)
│   │   ├── dashboard-demo/ # Final dashboard workspace
│   │   ├── timeslicing/  # Time resolution controls
│   │   ├── stkde/        # Hotspot analysis
│   │   ├── stats/        # Summary statistics
│   │   └── ...
│   ├── components/       # React components
│   │   ├── map/          # MapLibre map components
│   │   ├── timeline/     # Dual timeline components
│   │   ├── viz/          # 3D cube and visualization components
│   │   └── ui/           # shadcn/ui primitives
│   ├── store/            # Zustand state management
│   ├── lib/              # Business logic, queries, utilities
│   ├── hooks/            # React hooks
│   ├── types/            # TypeScript type definitions
│   ├── workers/          # Web Workers (adaptive time, STKDE)
│   └── providers/        # React providers (QueryClient, etc.)
├── data/                 # Crime datasets
│   ├── cache/            # DuckDB cached database
│   ├── sources/          # Raw CSV source files
│   └── crime.parquet     # Pre-processed Parquet data
├── scripts/              # Utility scripts
└── docs/                 # Project documentation
```

## Available Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with links to demo and STKDE 3D |
| `/dashboard-demo` | Main synchronized workspace with map, 3D inspection, timeline, and workflow rail |
| `/timeline-test` | 2D timeline sandbox for brush behavior, tick labels, and temporal QA |
| `/timeline-test-3d` | 3D companion for spatial-temporal alignment experiments |
| `/timeslicing` | Manual controls for time resolution, bin generation, and slice inspection |
| `/timeslicing-algos` | Algorithm lab for alternative binning strategies and slice generation rules |
| `/demo/non-uniform-time-slicing` | Showcase for granularity-aware brushed partition selection |
| `/stkde` | Hotspot analysis with kernel density estimation and burst detection |
| `/stkde-3d` | 3D STKDE evolution with KDE heatmaps stacked through time |
| `/stats` | Summary dashboard for totals, breakdowns, and trend inspection |
| `/cube-sandbox` | Focused playground for 3D cube interactions and spatial debugging |
| `/algorithms` | Time and space complexity analysis for every algorithm |
| `/docs` | In-app feature atlas documenting all surfaces |

## Common Issues

### DuckDB native addon not found

```
Error: Cannot find module 'duckdb'
```

**Solution:** The postinstall symlink may be missing. Run:

```bash
pnpm run postinstall
```

Verify the symlink with `ls -la node_modules/duckdb/lib/binding/3/duckdb.node`.

### Port 3000 already in use

Start the dev server on a different port:

```bash
pnpm run dev -- -p 3001
```

### DuckDB initialization timeout on first load

The first page load triggers DuckDB to read and process the crime CSV. For an 8.5M-row dataset this can take 10-30 seconds. Subsequent loads are instant due to database caching.

If you'd like to skip this, set `USE_MOCK_DATA=true` in `.env`.

## Next Steps

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, data flow, and key abstractions
- [CONFIGURATION.md](CONFIGURATION.md) — Environment variables and runtime settings
- [TESTING.md](TESTING.md) — How to run tests and coverage requirements

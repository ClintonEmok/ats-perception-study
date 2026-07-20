# Data

This directory contains the dataset and cache used by the Adaptive Space-Time Cube application.

## sources/

Raw CSV source files. The primary crime dataset lives here:

- `Crimes_-_2001_to_Present_20260114.csv` — Chicago crime records (2001 to present, ~8.5M rows). Columns include `ID`, `Date`, `Block`, `IUCR`, `Primary Type`, `Description`, `Location Description`, `Arrest`, `Domestic`, `Beat`, `District`, `Ward`, `Community Area`, `FBI Code`, `X Coordinate`, `Y Coordinate`, `Year`, `Updated On`, `Latitude`, `Longitude`, `Location`.
- `Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv` — IUCR code lookup table.
- `Police_Stations_20260202.csv` — Chicago police station POI data.

## cache/

DuckDB cache files generated on first request. Contains:

- `crime.duckdb` — Persistent DuckDB database with materialized tables:
  - `crimes_sorted` — Zone-map-optimized copy of the source CSV, ordered by `Date` (enables row group skipping for time-range queries).
  - `crime_dataset_meta` — Pre-aggregated metadata (min/max time, lat/lon bounds, count, distinct crime types).
  - `crime_overview_bins_medium` — Pre-bucketed 120-bin summary for the overview histogram.

The cache is invalidated automatically when the source CSV fingerprint changes (`size:mtime`).

## Pipeline

CSV in `sources/` → DuckDB auto-materializes `crimes_sorted` on first request → API routes query the table directly → responses stream as Apache Arrow IPC to the client.

No pre-processing step is required; the application bootstraps its data on first load.

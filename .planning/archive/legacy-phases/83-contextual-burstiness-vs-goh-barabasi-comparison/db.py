"""Read-only data access for Phase 83.

Mirrors src/lib/db.ts and the Next.js pipeline's crimes_sorted
materialisation. Opens DuckDB read-only so it never races the
Next.js dev server's WAL writes; falls back to the source CSV if
the cache is missing or unreadable.

Resolution: the default DUCKDB_PATH is the project-root-relative path
"data/cache/crime.duckdb" (matches the Next.js default in
src/lib/db.ts:15). To run from the phase directory, set
DUCKDB_PATH=../../../data/cache/crime.duckdb in the environment, or
call load_crimes(db_path=Path("...")) with an explicit absolute path.
"""

from __future__ import annotations

import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import duckdb
import pandas as pd

# ── Path defaults (per 83-RESEARCH.md L32 and src/lib/db.ts:15) ──

DEFAULT_DUCKDB_PATH = Path("data/cache/crime.duckdb")
DEFAULT_CSV_PATH = Path("data/sources/Crimes_-_2001_to_Present_20260114.csv")
SOURCE_FILE = "Crimes_-_2001_to_Present_20260114.csv"


# ── DuckDB connection ──────────────────────────────────────────


@contextmanager
def connect_duckdb(
    path: Path | None = None,
    *,
    read_only: bool = True,
) -> Iterator[duckdb.DuckDBPyConnection]:
    """Yield a DuckDB connection. Read-only by default.

    If path is None, resolves to the DUCKDB_PATH env var, else the
    DEFAULT_DUCKDB_PATH (relative — caller is expected to invoke from
    the project root or pass an absolute path).
    """
    if path is None:
        path = Path(os.environ.get("DUCKDB_PATH", DEFAULT_DUCKDB_PATH))
    try:
        # read_only=True — the contract: never race the Next.js WAL writes.
        con = duckdb.connect(str(path), read_only=read_only)
    except (duckdb.IOException, FileNotFoundError) as exc:
        raise RuntimeError(
            f"DuckDB cache not found at {path}. Set DUCKDB_PATH or "
            f"restore data/cache/crime.duckdb. Falling back handled "
            f"by load_crimes()."
        ) from exc
    try:
        yield con
    finally:
        con.close()


# ── CSV loader (fallback) ──────────────────────────────────────


def _load_from_csv(csv_path: Path) -> pd.DataFrame:
    """Read the source CSV and return the standardised 4-col DataFrame.

    Mirrors the columns produced by the DuckDB path: ts (int64 epoch),
    hour (int8), dow (int8, 0=Sun to match DuckDB DOW), month (int8, 0-11).
    """
    df = pd.read_csv(
        csv_path,
        usecols=["Date", "Latitude", "Longitude"],
        parse_dates=["Date"],
    )
    # Drop null/NaN rows
    df = df.dropna(subset=["Date", "Latitude", "Longitude"])
    # Standardise
    ts = (df["Date"].astype("int64") // 10**9).astype("int64")
    hour = df["Date"].dt.hour.astype("int8")
    # Pandas dayofweek is 0=Mon; convert to 0=Sun to match DuckDB DOW.
    dow = ((df["Date"].dt.dayofweek + 1) % 7).astype("int8")
    # Zero-indexed month to match DuckDB EXTRACT(MONTH) - 1.
    month = (df["Date"].dt.month - 1).astype("int8")
    out = pd.DataFrame(
        {"ts": ts, "hour": hour, "dow": dow, "month": month},
        columns=["ts", "hour", "dow", "month"],
    )
    out = out.dropna(subset=["ts"]).reset_index(drop=True)
    return out


# ── Public loader (DuckDB first, CSV fallback) ─────────────────


def load_crimes(
    *,
    db_path: Path | None = None,
    csv_path: Path | None = None,
) -> pd.DataFrame:
    """Return a DataFrame with columns [ts, hour, dow, month].

    ts     : int64 — epoch seconds
    hour   : int8  — 0..23
    dow    : int8  — 0=Sun..6=Sat (matches DuckDB DOW)
    month  : int8  — 0..11 (zero-indexed)

    Tries DuckDB first; on RuntimeError (cache missing), prints a stderr
    warning and falls back to the source CSV.
    """
    if db_path is None:
        db_path = Path(os.environ.get("DUCKDB_PATH", DEFAULT_DUCKDB_PATH))
    if csv_path is None:
        csv_path = DEFAULT_CSV_PATH

    try:
        with connect_duckdb(db_path) as con:
            arrow_table = con.execute(
                'SELECT EXTRACT(EPOCH FROM "Date") AS ts, '
                'EXTRACT(HOUR FROM "Date") AS hour, '
                'EXTRACT(DOW FROM "Date") AS dow, '
                '(EXTRACT(MONTH FROM "Date") - 1) AS month '
                'FROM crimes_sorted '
                'WHERE "Date" IS NOT NULL '
                'AND "Latitude" IS NOT NULL '
                'AND "Longitude" IS NOT NULL'
            ).fetch_arrow_table()
        df = arrow_table.to_pandas()
        # Standardise dtypes — the Arrow→pandas path may yield int32/int64
        # depending on driver version. Force the contract.
        df["ts"] = df["ts"].astype("int64")
        df["hour"] = df["hour"].astype("int8")
        df["dow"] = df["dow"].astype("int8")
        df["month"] = df["month"].astype("int8")
        df = df[["ts", "hour", "dow", "month"]]
        df = df.dropna(subset=["ts"]).reset_index(drop=True)
        return df
    except RuntimeError as exc:
        print(
            f"WARNING: DuckDB cache missing — falling back to {csv_path}. "
            f"This is slower (~30-60s) but functionally equivalent.",
            file=sys.stderr,
        )
        return _load_from_csv(csv_path)


# ── Smoke test ─────────────────────────────────────────────────


if __name__ == "__main__":
    df = load_crimes()
    print(df.shape)
    print(df.head(3))
    print("dtypes:", df.dtypes.tolist())

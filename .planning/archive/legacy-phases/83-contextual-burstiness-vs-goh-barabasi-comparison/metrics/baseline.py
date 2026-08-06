"""Baseline build / save / load contract for the contextual z-score.

The 168-cell (hour, dayOfWeek) baseline is the foundation of the
contextual metric. Once it is built from the full dataset, every
analysis (full-dataset comparison, single-week experiment, future
TypeScript integration) can load it from disk instead of re-querying
8.5M rows from DuckDB.

Format
------
A single parquet file with the 168 rows. Schema:

    hour            int8     0..23
    dow             int8     0=Sun..6=Sat
    count           int64    event count in the cell
    mean_per_sec    float64  conditional rate of events at (h, d)
    sigma_per_sec   float64  Poisson noise floor of the conditional rate
    count_cell_weeks float64 number of weeks the cell was observed

The 168 rows cover all (h, d) combinations; missing cells get
count=0, mean_per_sec=0, sigma_per_sec=0.

Sidecar JSON ``baseline_168.meta.json`` records build provenance:

    {
      "n_events": 8382486,
      "ts_min": 978307200,
      "ts_max": 1767571199,
      "total_weeks": 1305.0,
      "fingerprint": "sha256:...",
      "built_at": "2026-06-27T13:30:00Z"
    }

The fingerprint is sha256 over the sorted (h, d) -> count map. It
lets downstream consumers detect when the source data has changed
without re-reading the 8.5M parquet.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

# ── Schema constants ─────────────────────────────────────────────

EXPECTED_COLUMNS: tuple[str, ...] = (
    "hour",
    "dow",
    "count",
    "mean_per_sec",
    "sigma_per_sec",
    "count_cell_weeks",
)

HOURS = list(range(24))
DAYS = list(range(7))
N_CELLS = len(HOURS) * len(DAYS)  # 168

PARQUET_NAME = "baseline_168.parquet"
META_NAME = "baseline_168.meta.json"


# ── Metadata dataclass ──────────────────────────────────────────


@dataclass(frozen=True)
class BaselineMeta:
    n_events: int
    ts_min: int
    ts_max: int
    total_weeks: float
    fingerprint: str
    built_at: str

    def to_dict(self) -> dict:
        return {
            "n_events": self.n_events,
            "ts_min": self.ts_min,
            "ts_max": self.ts_max,
            "total_weeks": self.total_weeks,
            "fingerprint": self.fingerprint,
            "built_at": self.built_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "BaselineMeta":
        return cls(
            n_events=int(d["n_events"]),
            ts_min=int(d["ts_min"]),
            ts_max=int(d["ts_max"]),
            total_weeks=float(d["total_weeks"]),
            fingerprint=str(d["fingerprint"]),
            built_at=str(d["built_at"]),
        )


# ── Schema validation ──────────────────────────────────────────


def validate(df: pd.DataFrame) -> None:
    """Raise ValueError if df is not a valid 168-row baseline."""
    if list(df.columns) != list(EXPECTED_COLUMNS):
        raise ValueError(
            f"baseline columns must be {EXPECTED_COLUMNS}, got {list(df.columns)}"
        )
    if len(df) != N_CELLS:
        raise ValueError(
            f"baseline must have {N_CELLS} rows, got {len(df)}"
        )
    if not (df["hour"].between(0, 23).all()):
        raise ValueError("hour column out of range [0, 23]")
    if not (df["dow"].between(0, 6).all()):
        raise ValueError("dow column out of range [0, 6]")
    if (df["count"] < 0).any():
        raise ValueError("count column has negative values")
    if (df["mean_per_sec"] < 0).any():
        raise ValueError("mean_per_sec column has negative values")
    if (df["sigma_per_sec"] < 0).any():
        raise ValueError("sigma_per_sec column has negative values")
    pairs = set(zip(df["hour"].astype(int), df["dow"].astype(int)))
    expected = {(h, d) for h in HOURS for d in DAYS}
    if pairs != expected:
        raise ValueError(
            f"baseline must cover all 168 (h, d) cells; "
            f"missing {expected - pairs}, extra {pairs - expected}"
        )


# ── Build from a DataFrame ──────────────────────────────────────


def build_from_dataframe(
    df: pd.DataFrame,
    *,
    ts_min: int | None = None,
    ts_max: int | None = None,
) -> tuple[pd.DataFrame, BaselineMeta]:
    """Build a baseline from a DataFrame with [ts, hour, dow, month].

    Returns the validated 168-row baseline + a metadata record.
    If ``ts_min`` / ``ts_max`` are not given, they are taken from
    the DataFrame.
    """
    if ts_min is None:
        ts_min = int(df["ts"].min())
    if ts_max is None:
        ts_max = int(df["ts"].max())
    n_events = int(len(df))
    total_seconds = ts_max - ts_min
    total_weeks = total_seconds / (7 * 86_400)

    grouped = df.groupby(["hour", "dow"]).size().reset_index(name="count")
    full = (
        pd.MultiIndex.from_product([HOURS, DAYS], names=["hour", "dow"])
        .to_frame(index=False)
    )
    full = full.merge(grouped, on=["hour", "dow"], how="left").fillna({"count": 0})
    full["count"] = full["count"].astype("int64")
    cell_seconds = 3600 * total_weeks
    full["mean_per_sec"] = full["count"] / cell_seconds
    full["sigma_per_sec"] = np_lib_sqrt(
        full["mean_per_sec"].clip(lower=0) / cell_seconds
    )
    full["count_cell_weeks"] = total_weeks
    full = full.sort_values(["hour", "dow"]).reset_index(drop=True)
    full = full[list(EXPECTED_COLUMNS)]
    validate(full)

    fingerprint = _fingerprint(full)
    meta = BaselineMeta(
        n_events=n_events,
        ts_min=ts_min,
        ts_max=ts_max,
        total_weeks=total_weeks,
        fingerprint=fingerprint,
        built_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    return full, meta


def _fingerprint(df: pd.DataFrame) -> str:
    """Stable sha256 of the (h, d) -> count map."""
    pairs = sorted(zip(df["hour"].astype(int), df["dow"].astype(int), df["count"].astype(int)))
    raw = "\n".join(f"{h},{d},{c}" for h, d, c in pairs).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()[:16]


def np_lib_sqrt(x):
    """Local import to keep top-of-file imports lean."""
    import numpy as np
    return np.sqrt(x)


# ── Save / load ─────────────────────────────────────────────────


def save(baseline: pd.DataFrame, meta: BaselineMeta, directory: Path) -> tuple[Path, Path]:
    """Write the parquet + sidecar JSON. Returns (parquet_path, json_path)."""
    directory.mkdir(parents=True, exist_ok=True)
    parquet_path = directory / PARQUET_NAME
    json_path = directory / META_NAME
    baseline.to_parquet(parquet_path, index=False)
    json_path.write_text(json.dumps(meta.to_dict(), indent=2))
    return parquet_path, json_path


def load(directory: Path) -> tuple[pd.DataFrame, BaselineMeta]:
    """Read the parquet + sidecar JSON from `directory`.

    Validates the schema and the (h, d) coverage. Raises FileNotFoundError
    if either file is missing.
    """
    parquet_path = directory / PARQUET_NAME
    json_path = directory / META_NAME
    if not parquet_path.exists():
        raise FileNotFoundError(f"baseline parquet not found: {parquet_path}")
    if not json_path.exists():
        raise FileNotFoundError(f"baseline meta not found: {json_path}")
    df = pd.read_parquet(parquet_path)
    validate(df)
    meta = BaselineMeta.from_dict(json.loads(json_path.read_text()))
    return df, meta

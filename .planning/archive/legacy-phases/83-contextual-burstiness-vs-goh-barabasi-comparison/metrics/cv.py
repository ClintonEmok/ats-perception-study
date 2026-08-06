"""Coefficient of variation of inter-event times (CBP-08).

The unbounded cousin of Goh-Barabasi B. Same numerator (sigma_tau)
and same numerator-side structure, but the denominator is just
mu_tau instead of sigma_tau + mu_tau. CV isolates the effect of
Goh-Barabasi's bounded denominator: is the B(IEI) collapse at
the daily scale a property of the gap distribution itself, or
an artifact of B's boundedness?

```
B  = (sigma_tau - mu_tau) / (sigma_tau + mu_tau)  ∈ [-1, 1]
CV =       sigma_tau              / mu_tau       ∈ [0, inf)
```

For Poisson-process gaps, CV ≈ 1. Crime is typically over-dispersed
(CV > 1) because of bursty clustering.

Reference: docs/FUTURE-WORK-ADAPTIVE-TIME.md:227, 288 (the per-window
CV collapse that motivated the 4-way comparison).
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd

# ── Constants (match metrics/goh_barabasi.py) ─────────────────────

WINDOWS_SEC: tuple[int, ...] = (3600, 21600, 86400, 604800)
WINDOW_LABELS: dict[int, str] = {
    3600: "1h",
    21600: "6h",
    86400: "1d",
    604800: "1w",
}
MIN_EVENTS_PER_WINDOW: int = 5
DEFAULT_STEP_POLICY: str = "quarter"  # step = window_sec // 4


# ── CV formula ────────────────────────────────────────────────────


def cv_tau(inter_event_gaps: np.ndarray) -> float | None:
    """Compute the coefficient of variation ``sigma_tau / mu_tau``.

    Returns ``None`` for degenerate inputs so callers can drop them
    cleanly from the comparison:

    - n < 2 gaps (a single event gives zero gaps)
    - mean <= 0 (zero-length or negative gaps)
    """
    if inter_event_gaps.size < 2:
        return None
    mean = float(inter_event_gaps.mean())
    if mean <= 0:
        return None
    variance = float(((inter_event_gaps - mean) ** 2).mean())
    std = math.sqrt(variance)
    return std / mean


# ── Window sweep ──────────────────────────────────────────────────


def compute_cv_series(
    timestamps: np.ndarray,
    window_sec: int,
    step_sec: int | None = None,
    min_events: int = MIN_EVENTS_PER_WINDOW,
) -> pd.DataFrame:
    """Sliding window sweep computing CV per window.

    Returns
    -------
    pd.DataFrame
        Columns ``[window_start:int64, window_end:int64,
        n_events:int32, CV:float64]``. Windows with degenerate CV
        (None) or fewer than ``min_events`` events are excluded.
    """
    columns = ["window_start", "window_end", "n_events", "CV"]
    if timestamps.size < 2:
        return pd.DataFrame({c: pd.Series(dtype=_dtype_for(c)) for c in columns})

    if step_sec is None:
        step_sec = max(1, window_sec // 4)

    t_start = int(timestamps[0])
    t_end = int(timestamps[-1])

    rows: list[tuple[int, int, int, float]] = []
    for ws in range(t_start, t_end - window_sec + 1, step_sec):
        we = ws + window_sec
        lo = np.searchsorted(timestamps, ws, side="left")
        hi = np.searchsorted(timestamps, we, side="left")
        n_events = hi - lo
        if n_events < min_events:
            continue
        # Inter-event gaps within the window. Cast to float64 so the
        # mean/std math is robust against int64 overflow on the diff.
        gaps = np.diff(timestamps[lo:hi].astype(np.float64))
        if gaps.size < 2:
            continue
        cv = cv_tau(gaps)
        if cv is None:
            continue
        rows.append((ws, we, n_events, cv))

    if not rows:
        return pd.DataFrame({c: pd.Series(dtype=_dtype_for(c)) for c in columns})

    df = pd.DataFrame(rows, columns=columns)
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["CV"] = df["CV"].astype("float64")
    return df


# ── Parquet writer ────────────────────────────────────────────────


def write_cv_parquet(series: pd.DataFrame, output_path: Path) -> None:
    """Write the per-window CV series to a parquet file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_parquet(output_path, index=False)
    print(f"Wrote {len(series):,} windows to {output_path}")


# ── Internal helpers ──────────────────────────────────────────────


def _dtype_for(column: str) -> str:
    return {
        "window_start": "int64",
        "window_end": "int64",
        "n_events": "int32",
        "CV": "float64",
    }[column]


# ── Standalone entry point ────────────────────────────────────────


if __name__ == "__main__":
    from db import load_crimes

    df = load_crimes()
    timestamps = df["ts"].to_numpy()

    # Full-series IEI reference CV. Poisson-process gaps have CV ≈ 1.
    # Crime is over-dispersed so we expect CV > 1.
    full_gaps = np.diff(timestamps.astype(np.float64))
    cv_full = cv_tau(full_gaps)
    print(f"Full-series CV (IEI): {cv_full:.4f}  (Poisson-process would be ≈ 1.0)")

    output_path = Path("output/cv_metric.parquet")
    all_series: list[pd.DataFrame] = []
    for window_sec in WINDOWS_SEC:
        step = max(1, window_sec // 4)
        series = compute_cv_series(timestamps, window_sec, step)
        series["window_sec"] = window_sec
        all_series.append(series)
        print(f"  {WINDOW_LABELS[window_sec]}: {len(series):,} valid windows")
    full = pd.concat(all_series, ignore_index=True) if all_series else pd.DataFrame()
    write_cv_parquet(full, output_path)

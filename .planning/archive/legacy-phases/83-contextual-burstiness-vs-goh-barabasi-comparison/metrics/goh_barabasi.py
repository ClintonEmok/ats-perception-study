"""Goh-Barabasi inter-event-time burstiness (CBP-02).

Direct port of ``src/lib/burst-detection.ts:53-59`` (computeTemporalB).
Runs the same 1h/6h/1d/1w window sweep as the contextual metric so the
two are directly comparable on the comparison table in Plan 04.

Reference: docs/FUTURE-WORK-ADAPTIVE-TIME.md:286-294 documents the
per-window B(IEI) CV collapse (0.30 / 0.06 / 0.01 / 0.00 at 1h/6h/1d/1w).
This module is the empirical reproduction of that table on the 8.5M
record Chicago crime dataset.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd

# ── Constants (locked — match metrics/contextual.py) ──────────────

WINDOWS_SEC: tuple[int, ...] = (3600, 21600, 86400, 604800)
WINDOW_LABELS: dict[int, str] = {
    3600: "1h",
    21600: "6h",
    86400: "1d",
    604800: "1w",
}
MIN_EVENTS_PER_WINDOW: int = 5
DEFAULT_STEP_POLICY: str = "quarter"  # step = window_sec // 4


# ── B formula port (src/lib/burst-detection.ts:53-59) ─────────────


def goh_barabasi_b(inter_event_gaps: np.ndarray) -> float | None:
    """Compute the Goh-Barabasi burstiness B on inter-event gaps.

    Direct port of ``src/lib/burst-detection.ts:53-59``:

        B = (sigma_tau - mu_tau) / (sigma_tau + mu_tau)

    Where sigma_tau and mu_tau are the population std and mean of the
    inter-event gaps tau_i = t_{i+1} - t_i.

    Returns ``None`` (not 0, not NaN) for degenerate inputs so callers
    can drop them cleanly from the comparison:

    - n < 2 gaps (a single event gives zero gaps)
    - mean <= 0 (zero-length or negative gaps)
    - sigma + mean == 0 (degenerate in the limit; in practice guarded
      by the mean > 0 check above, but kept for safety)
    """
    if inter_event_gaps.size < 2:
        return None
    mean = float(inter_event_gaps.mean())
    if mean <= 0:
        return None
    variance = float(((inter_event_gaps - mean) ** 2).mean())
    std = math.sqrt(variance)
    denom = std + mean
    if denom == 0:
        return None
    return (std - mean) / denom


# ── Window sweep (overlapping, step = window // 4) ────────────────


def compute_goh_barabasi_series(
    timestamps: np.ndarray,
    window_sec: int,
    step_sec: int | None = None,
    min_events: int = MIN_EVENTS_PER_WINDOW,
) -> pd.DataFrame:
    """Sliding window sweep computing B per window.

    Parameters
    ----------
    timestamps : np.ndarray
        Shape ``(N,)`` int64 epoch seconds, sorted ascending.
    window_sec : int
        Window size in seconds (one of 3600, 21600, 86400, 604800).
    step_sec : int, optional
        Step size in seconds. Defaults to ``max(1, window_sec // 4)``
        (the "quarter" step policy).
    min_events : int, optional
        Drop windows with fewer events than this. Default 5 (matches
        metrics/contextual.py for fairness with the comparison).

    Returns
    -------
    pd.DataFrame
        Columns ``[window_start:int64, window_end:int64,
        n_events:int32, B:float64]``. Windows with degenerate B (None)
        or fewer than ``min_events`` are excluded.
    """
    columns = ["window_start", "window_end", "n_events", "B"]
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
        b = goh_barabasi_b(gaps)
        if b is None:
            continue
        rows.append((ws, we, n_events, b))

    if not rows:
        return pd.DataFrame({c: pd.Series(dtype=_dtype_for(c)) for c in columns})

    df = pd.DataFrame(rows, columns=columns)
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["B"] = df["B"].astype("float64")
    return df


# ── Parquet writer ────────────────────────────────────────────────


def write_goh_barabasi_parquet(series: pd.DataFrame, output_path: Path) -> None:
    """Write the per-window B series to a parquet file.

    Creates parent directories as needed. Prints a one-line summary
    to stdout.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_parquet(output_path, index=False)
    print(f"Wrote {len(series):,} windows to {output_path}")


# ── Internal helpers ──────────────────────────────────────────────


def _dtype_for(column: str) -> str:
    """Return the canonical dtype for an output column."""
    return {
        "window_start": "int64",
        "window_end": "int64",
        "n_events": "int32",
        "B": "float64",
    }[column]


# ── Standalone entry point ────────────────────────────────────────


if __name__ == "__main__":
    from db import load_crimes

    df = load_crimes()
    timestamps = df["ts"].to_numpy()

    # Full-series IEI reference B (per docs/FUTURE-WORK-ADAPTIVE-TIME.md:288 ≈ 0.30)
    full_gaps = np.diff(timestamps.astype(np.float64))
    b_full = goh_barabasi_b(full_gaps)
    print(f"Full-series Goh-Barabasi B (IEI): {b_full:.4f}  (expected ≈ 0.30)")
    if b_full is not None and not (0.20 <= b_full <= 0.40):
        import sys as _sys
        print(
            f"  WARNING: full-series B is outside expected range [0.20, 0.40]",
            file=_sys.stderr,
        )

    output_path = Path("output/goh_barabasi_metric.parquet")
    all_series: list[pd.DataFrame] = []
    for window_sec in WINDOWS_SEC:
        step = max(1, window_sec // 4)
        series = compute_goh_barabasi_series(timestamps, window_sec, step)
        series["window_sec"] = window_sec
        all_series.append(series)
        print(f"  {WINDOW_LABELS[window_sec]}: {len(series):,} valid windows")
    full = pd.concat(all_series, ignore_index=True) if all_series else pd.DataFrame()
    write_goh_barabasi_parquet(full, output_path)

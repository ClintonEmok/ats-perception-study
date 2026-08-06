"""Density burst signal (CBP-07).

The simplest possible burst metric: events per second in each window.
Captures the *raw activity level* — a bursty window has more events,
regardless of how clustered they are. Plan 04 uses density as one of
the three reference metrics in the 4-way comparison against the
contextual z-score.

Why density is in the reference set:
- It is the null-model burst signal: any "burstiness" claim must
  beat raw count variation to be interesting.
- Bounded gaps (B) and CV (CV) are both gap-based; density is the
  count-based counterpart.
- Density is always defined (>= 0) and is finite, so it anchors
  the comparison at the "no information lost, no normalization
  applied" end of the metric spectrum.

Per 83-CONTEXT.md, empty windows are kept (density = 0.0) so the
series captures the full dynamic range, including quiet periods.
"""

from __future__ import annotations

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


# ── Density value ─────────────────────────────────────────────────


def density_value(n_events: int, window_seconds: int) -> float:
    """Return ``n_events / window_seconds`` (events per second)."""
    if window_seconds <= 0:
        return 0.0
    return n_events / window_seconds


# ── Window sweep (overlapping, step = window // 4) ────────────────


def compute_density_series(
    timestamps: np.ndarray,
    window_sec: int,
    step_sec: int | None = None,
    min_events: int = MIN_EVENTS_PER_WINDOW,
) -> pd.DataFrame:
    """Sliding window sweep computing density per window.

    Per 83-CONTEXT.md: empty windows are kept (density = 0.0) so the
    series captures the full dynamic range, including quiet periods.
    The ``min_events`` argument is honored for consistency with the
    other reference metrics (it gates which windows are *recorded*),
    but the default behavior is to keep all windows.
    """
    columns = ["window_start", "window_end", "n_events", "density"]
    if timestamps.size < 1:
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
        rows.append((ws, we, n_events, density_value(n_events, window_sec)))

    if not rows:
        return pd.DataFrame({c: pd.Series(dtype=_dtype_for(c)) for c in columns})

    df = pd.DataFrame(rows, columns=columns)
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["density"] = df["density"].astype("float64")
    return df


# ── Parquet writer ────────────────────────────────────────────────


def write_density_parquet(series: pd.DataFrame, output_path: Path) -> None:
    """Write the per-window density series to a parquet file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_parquet(output_path, index=False)
    print(f"Wrote {len(series):,} windows to {output_path}")


# ── Internal helpers ──────────────────────────────────────────────


def _dtype_for(column: str) -> str:
    return {
        "window_start": "int64",
        "window_end": "int64",
        "n_events": "int32",
        "density": "float64",
    }[column]


# ── Standalone entry point ────────────────────────────────────────


if __name__ == "__main__":
    from db import load_crimes

    df = load_crimes()
    timestamps = df["ts"].to_numpy()

    output_path = Path("output/density_metric.parquet")
    all_series: list[pd.DataFrame] = []
    for window_sec in WINDOWS_SEC:
        step = max(1, window_sec // 4)
        series = compute_density_series(timestamps, window_sec, step)
        series["window_sec"] = window_sec
        all_series.append(series)
        print(f"  {WINDOW_LABELS[window_sec]}: {len(series):,} valid windows")
    full = pd.concat(all_series, ignore_index=True) if all_series else pd.DataFrame()
    write_density_parquet(full, output_path)

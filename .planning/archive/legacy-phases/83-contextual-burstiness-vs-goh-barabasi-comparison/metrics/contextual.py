"""Contextual burstiness z-score (CBP-01).

For each window we compare the observed count to the local
expected rate. The expected rate comes from a 168-cell baseline
(hour x dayOfWeek) of *conditional* rates — the rate at hour h
on day-of-week d, not the rate averaged over all time.

Why the z-score formulation beats Goh-Barabasi for periodic data:

  - Goh-Barabasi B collapses to near zero at long windows because
    inter-event gaps become dominated by the diurnal/weekly period
    rather than the actual burstiness within each period.
  - The z-score is *relative to the local expected rate* — Saturday
    22:00 expects many more events than Tuesday 05:00, so an above-
    average Saturday is *less* z-bursty than an above-average Tuesday,
    even if their raw counts are the same.
  - This is the property the warp visualization wants: a period
    that is busy *for its time of day* should expand, and a period
    that is quiet *for its time of day* should compress.

The 168-cell grid (24 hours x 7 days) is the right granularity for
the Chicago crime dataset: 8.5M events spread across 168 cells means
~50,500 events per cell on average, giving ~1-4% relative error on
sigma estimation.
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

# Per 83-RESEARCH.md L88: substitute epsilon for sigma=0 cells to
# avoid divide-by-zero. In practice this is a near-zero-risk on the
# 8.5M dataset (no cell has sigma=0) but the guard is essential for
# synthetic data and small samples.
EPSILON = 1e-9

# 1970-01-01 (epoch) was a Thursday; in 0=Sun convention that's 4.
EPOCH_DOW_OFFSET = 4

SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86_400
SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY


# ── Baseline computation ─────────────────────────────────────────


def compute_baseline(df: pd.DataFrame) -> pd.DataFrame:
    """Compute the 168-cell (hour, dayOfWeek) baseline.

    Returns a 168-row DataFrame with columns:
        hour, dow, count, mean_per_sec, sigma_per_sec, count_cell_weeks

    `mean_per_sec` is the *conditional* rate of events per second at
    hour h on day-of-week d — i.e., the rate *when we are at that
    time*, not the rate averaged over all time. This is what the
    z-score needs to be apples-to-apples with the observed window
    counts.

    `sigma_per_sec` is the Poisson-noise floor of the conditional
    rate, used as a per-second std. For long-window z-scoring this
    enters through the sqrt(window_seconds) factor in
    compute_contextual_z_series.
    """
    ts_min = int(df["ts"].min())
    ts_max = int(df["ts"].max())
    total_seconds = ts_max - ts_min
    total_weeks = total_seconds / SECONDS_PER_WEEK

    grouped = (
        df.groupby(["hour", "dow"]).size().reset_index(name="count")
    )

    full = pd.MultiIndex.from_product(
        [range(24), range(7)], names=["hour", "dow"]
    ).to_frame(index=False)
    full = full.merge(grouped, on=["hour", "dow"], how="left").fillna({"count": 0})
    full["count"] = full["count"].astype("int64")
    # Conditional rate: events per second AT (h, d).
    # The cell (h, d) is observed SECONDS_PER_HOUR * total_weeks times
    # over the dataset, so the conditional rate is count / (hours * weeks).
    cell_seconds = SECONDS_PER_HOUR * total_weeks
    full["mean_per_sec"] = full["count"] / cell_seconds
    # Poisson noise floor per second (conditional): sqrt(rate) / sqrt(cell_seconds)
    full["sigma_per_sec"] = np.sqrt(full["mean_per_sec"].clip(lower=0) / cell_seconds)
    full["count_cell_weeks"] = total_weeks
    full = full.sort_values(["hour", "dow"]).reset_index(drop=True)
    return full


# ── Per-window z-score (vectorised) ──────────────────────────────


def _build_lookup(baseline: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Return (mu_168, sig_168) arrays indexed by hour*7 + dow."""
    mu_168 = np.zeros(24 * 7, dtype=np.float64)
    sig_168 = np.zeros(24 * 7, dtype=np.float64)
    for _, row in baseline.iterrows():
        idx = int(row["hour"]) * 7 + int(row["dow"])
        mu_168[idx] = float(row["mean_per_sec"])
        sig_168[idx] = float(row["sigma_per_sec"])
    return mu_168, sig_168


def compute_contextual_z_series(
    timestamps: np.ndarray,
    baseline: pd.DataFrame,
    window_sec: int,
    step_sec: int | None = None,
    min_events: int = MIN_EVENTS_PER_WINDOW,
) -> pd.DataFrame:
    """Sliding window sweep computing contextual z per window (vectorised).

    For each window of length W starting at ws, the expected count
    is the sum over the cells the window spans of
    (mu_per_sec[cell] * 3600). Sigma is the Poisson-noise floor of
    that expected count: sqrt(expected).

    Two metrics are computed per window:
      - z = (observed - expected) / sqrt(expected)  [Pearson residual]
      - r = observed / expected                       [intensity ratio]

    The z-score is the signed deviation in standardized units; its
    std is the natural "burstiness" measure when comparing to other
    metrics' CV. The intensity ratio is the natural positive-valued
    form for the warp visualization (r > 1 = expand, r < 1 = compress).

    Returns columns: window_start, window_end, n_events, hour, dow, z, r.
    """
    columns = ["window_start", "window_end", "n_events", "hour", "dow", "z", "r"]
    if timestamps.size < 1:
        return pd.DataFrame({c: pd.Series(dtype=_dtype_for(c)) for c in columns})

    if step_sec is None:
        step_sec = max(1, window_sec // 4)

    t_start = int(timestamps[0])
    t_end = int(timestamps[-1])

    window_starts = np.arange(t_start, t_end - window_sec + 1, step_sec, dtype=np.int64)
    window_ends = window_starts + window_sec

    # Vectorised n_events per window
    left_idx = np.searchsorted(timestamps, window_starts, side="left")
    right_idx = np.searchsorted(timestamps, window_ends, side="left")
    n_events = (right_idx - left_idx).astype(np.int32)

    # Per-cell mu lookup (conditional rate per second)
    mu_168, _sig_168 = _build_lookup(baseline)

    h0 = ((window_starts // SECONDS_PER_HOUR) % 24).astype(np.int64)
    d0 = ((window_starts // SECONDS_PER_DAY + EPOCH_DOW_OFFSET) % 7).astype(np.int64)
    n_cells_in_window = window_sec // SECONDS_PER_HOUR  # 1, 6, 24, or 168

    mu_per_window = np.zeros(len(window_starts), dtype=np.float64)
    for offset in range(n_cells_in_window):
        h = (h0 + offset) % 24
        d = (d0 + (h0 + offset) // 24) % 7
        cell_idx = h * 7 + d
        mu_per_window += mu_168[cell_idx] * SECONDS_PER_HOUR

    # Pearson residual + intensity ratio
    mu_safe = np.maximum(mu_per_window, EPSILON)
    z_arr = (n_events.astype(np.float64) - mu_per_window) / np.sqrt(mu_safe)
    r_arr = n_events.astype(np.float64) / mu_safe

    mask = n_events >= min_events

    out = pd.DataFrame({
        "window_start": window_starts[mask],
        "window_end": window_ends[mask],
        "n_events": n_events[mask],
        "hour": h0[mask].astype(np.int8),
        "dow": d0[mask].astype(np.int8),
        "z": z_arr[mask].astype(np.float64),
        "r": r_arr[mask].astype(np.float64),
    })
    return out


# ── Parquet writer ──────────────────────────────────────────────


def write_contextual_parquet(series: pd.DataFrame, output_path: Path) -> None:
    """Write the per-window z-score series to a parquet file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_parquet(output_path, index=False)
    print(f"Wrote {len(series):,} windows to {output_path}")


# ── Internal helpers ─────────────────────────────────────────────


def _dtype_for(column: str) -> str:
    return {
        "window_start": "int64",
        "window_end": "int64",
        "n_events": "int32",
        "hour": "int8",
        "dow": "int8",
        "z": "float64",
        "r": "float64",
    }[column]


# ── Standalone entry point ──────────────────────────────────────


if __name__ == "__main__":
    from db import load_crimes

    df = load_crimes()
    timestamps = df["ts"].to_numpy()

    print("Computing 168-cell baseline ...")
    baseline = compute_baseline(df)
    baseline.to_csv(Path("output/baseline_168.csv"), index=False)
    print(f"  baseline cells: {len(baseline)}")
    print(
        f"  mu range: {baseline.mean_per_sec.min():.6f} to {baseline.mean_per_sec.max():.6f}"
    )

    output_path = Path("output/contextual_metric.parquet")
    all_series: list[pd.DataFrame] = []
    for window_sec in WINDOWS_SEC:
        step = max(1, window_sec // 4)
        series = compute_contextual_z_series(timestamps, baseline, window_sec, step)
        series["window_sec"] = window_sec
        all_series.append(series)
        print(f"  {WINDOW_LABELS[window_sec]}: {len(series):,} valid windows")
    full = pd.concat(all_series, ignore_index=True) if all_series else pd.DataFrame()
    write_contextual_parquet(full, output_path)

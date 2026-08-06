"""Unit tests for metrics/density.py.

Density is the simplest of the three reference metrics — ``n_events /
window_seconds`` per window. Tests are deterministic synthetic-data
only and run in < 1 second.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from metrics.density import (
    MIN_EVENTS_PER_WINDOW,
    WINDOWS_SEC,
    compute_density_series,
    density_value,
    write_density_parquet,
)


# ── Formula edge cases ────────────────────────────────────────────


def test_density_value_basic():
    """60 events / 3600s = 0.01667 events/s."""
    assert density_value(60, 3600) == pytest.approx(1 / 60, rel=1e-9)


def test_density_value_zero_events():
    """Zero events → 0.0 density."""
    assert density_value(0, 3600) == 0.0


def test_density_value_one_event():
    """Single event in 1h = 1/3600."""
    assert density_value(1, 3600) == pytest.approx(1 / 3600, rel=1e-9)


def test_density_value_zero_window():
    """Defensive: zero-width window returns 0.0 instead of crashing."""
    assert density_value(60, 0) == 0.0


# ── Window sweep ──────────────────────────────────────────────────


def test_density_uniform():
    """60 events spread evenly over a 1h window → density = 60/3600."""
    # 60 timestamps, one per minute, plus a sentinel at 3600 so the
    # half-open window range includes the [0, 3600) window.
    timestamps = np.concatenate(
        [np.arange(0, 60 * 60, 60, dtype=np.int64), np.array([3600], dtype=np.int64)]
    )
    df = compute_density_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 1
    assert int(df.iloc[0]["n_events"]) == 60
    assert float(df.iloc[0]["density"]) == pytest.approx(60 / 3600, rel=1e-9)


def test_density_bursty():
    """100 events in first 60s, 0 in next 3540s of a 1h window.

    density = 100/3600 ≈ 0.0278 events/s.
    """
    burst = np.arange(0, 100, dtype=np.int64)  # 100 events in [0, 100)
    timestamps = burst  # only the burst, t_end = 99
    # We need the [0, 3600) window to contain 100 events.
    # Step=1, so the loop iterates ws=0,1,..., (t_end-3600+1).
    # t_end=99, so 99 - 3600 + 1 = -3500 → loop doesn't execute.
    # Fix: add a sentinel at 3600 so t_end=3600.
    sentinel = np.array([3600], dtype=np.int64)
    timestamps = np.concatenate([burst, sentinel])
    df = compute_density_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 1
    assert int(df.iloc[0]["n_events"]) == 100
    assert float(df.iloc[0]["density"]) == pytest.approx(100 / 3600, rel=1e-9)


def test_density_empty_window_filtered():
    """Windows with n_events < MIN_EVENTS_PER_WINDOW are dropped.

    4 events in a 1h window with 5-event minimum → empty DataFrame.
    """
    timestamps = np.array([0, 100, 200, 300], dtype=np.int64)
    df = compute_density_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 0
    assert list(df.columns) == ["window_start", "window_end", "n_events", "density"]


def test_density_window_sweep_uniform_24h():
    """24h dataset, 60 events/hour (one per minute) → 24 rows, density ≈ 60/3600."""
    timestamps = np.arange(0, 24 * 3600 + 1, 60, dtype=np.int64)
    df = compute_density_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 24
    assert (df["n_events"] == 60).all()
    assert df["density"].apply(lambda v: abs(v - 60 / 3600) < 1e-9).all()


# ── Parquet roundtrip ─────────────────────────────────────────────


def test_write_density_parquet_roundtrip(tmp_path: Path):
    """Write a tiny DataFrame and read it back; values preserved exactly."""
    rows = [
        (0, 3600, 60, 60 / 3600),
        (3600, 7200, 120, 120 / 3600),
        (7200, 10800, 80, 80 / 3600),
    ]
    df = pd.DataFrame(rows, columns=["window_start", "window_end", "n_events", "density"])
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["density"] = df["density"].astype("float64")

    out = tmp_path / "density.parquet"
    write_density_parquet(df, out)
    assert out.exists()
    back = pd.read_parquet(out)
    pd.testing.assert_frame_equal(back, df)


# ── Constants sanity ──────────────────────────────────────────────


def test_density_constants_match_other_metrics():
    """Density shares the locked window set and min_events with the other metrics."""
    assert WINDOWS_SEC == (3600, 21600, 86400, 604800)
    assert MIN_EVENTS_PER_WINDOW == 5

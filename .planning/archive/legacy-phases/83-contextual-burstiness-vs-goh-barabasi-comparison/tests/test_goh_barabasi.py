"""Unit tests for metrics/goh_barabasi.py.

All tests are deterministic synthetic-data only (no DuckDB dependency).
The B formula is the direct port of src/lib/burst-detection.ts:53-59,
so these tests are the spec for the port.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from metrics.goh_barabasi import (
    MIN_EVENTS_PER_WINDOW,
    WINDOWS_SEC,
    compute_goh_barabasi_series,
    goh_barabasi_b,
    write_goh_barabasi_parquet,
)


# ── Formula edge cases (port verification) ────────────────────────


def test_goh_barabasi_b_constant_gaps():
    """Constant gaps → B = -1 (sigma=0, mean>0)."""
    gaps = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
    assert goh_barabasi_b(gaps) == -1.0


def test_goh_barabasi_b_uniform_gaps_with_noise():
    """1000 uniform gaps → B is strongly negative (low spread, regular).

    For Uniform(0.5, 1.5), mean=1.0, std≈0.289, so B ≈ (0.289-1)/(0.289+1)
    ≈ -0.55. Allow a wider window for sampling noise across 1000 points.
    """
    rng = np.random.default_rng(42)
    gaps = rng.uniform(0.5, 1.5, 1000)
    b = goh_barabasi_b(gaps)
    assert b is not None
    assert -0.7 < b < -0.4


def test_goh_barabasi_b_bursty():
    """Long-tail gaps (many tiny + a few huge) → B > 0.5."""
    gaps = np.concatenate([np.full(990, 0.001), np.full(9, 100.0)])
    b = goh_barabasi_b(gaps)
    assert b is not None
    assert b > 0.5


def test_goh_barabasi_b_too_few_gaps():
    """n=1 → None."""
    assert goh_barabasi_b(np.array([1.0])) is None


def test_goh_barabasi_b_zero_mean():
    """All-zero gaps → mean=0 → None (don't divide by zero)."""
    assert goh_barabasi_b(np.array([0.0, 0.0, 0.0])) is None


def test_goh_barabasi_b_negative_gaps():
    """Negative gaps should still produce a finite float (defensive)."""
    gaps = np.array([-1.0, 1.0, 2.0])
    b = goh_barabasi_b(gaps)
    assert b is not None
    assert np.isfinite(b)


def test_goh_barabasi_b_scale_invariant():
    """B is scale-invariant: scaling all gaps by k leaves B unchanged."""
    a = np.array([1.0, 1.0, 1.0, 1.0])
    b = np.array([1e-15, 1e-15, 1e-15, 1e-15])
    assert goh_barabasi_b(a) == goh_barabasi_b(b) == -1.0


def test_goh_barabasi_b_bounded():
    """For any finite gaps with mean>0, |B| <= 1."""
    rng = np.random.default_rng(7)
    for _ in range(20):
        gaps = rng.exponential(1.0, 200)
        b = goh_barabasi_b(gaps)
        assert b is not None
        assert -1.0 - 1e-9 <= b <= 1.0 + 1e-9


# ── Window sweep (compute_goh_barabasi_series) ────────────────────


def test_compute_goh_barabasi_series_basic():
    """24h dataset, one event/minute × 60 minutes/hour, step=window.

    1h window, 1h step → exactly 24 rows, each n_events=60, B finite.

    The data extends to 86400 (inclusive) so the half-open window
    ``[t_end - window_sec + 1, t_end + 1)`` covers all 24 hour-aligned
    windows. Without the trailing 60s the last event at t=86340 leaves
    the (82800, 86400) window incomplete.
    """
    timestamps = np.arange(0, 24 * 3600 + 1, 60, dtype=np.int64)
    df = compute_goh_barabasi_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 24
    assert (df["n_events"] == 60).all()
    assert df["B"].apply(np.isfinite).all()


def test_compute_goh_barabasi_series_min_events_filter():
    """100 events in hour 0, 100 events at the end of hour 23, 0 elsewhere.

    1h window, 1h step → only the first and last windows should
    survive the MIN_EVENTS_PER_WINDOW=5 filter.

    A sentinel event at t=24*3600 extends ``t_end`` so the
    half-open window range ``range(0, 86401, 3600) = [0, 3600, ..., 82800]``
    produces 24 candidate windows. The middle 22 windows (covering
    hours 1..22) have 0 events and are dropped.
    """
    hour_0 = np.arange(0, 100, dtype=np.int64)  # 100 events in [0, 100)
    hour_23 = np.arange(23 * 3600, 24 * 3600, dtype=np.int64)  # 100 events in [82800, 86400)
    sentinel = np.array([24 * 3600], dtype=np.int64)  # ensures t_end == 86400
    timestamps = np.concatenate([hour_0, hour_23, sentinel])

    df = compute_goh_barabasi_series(timestamps, window_sec=3600, step_sec=3600)

    # Only the first and last 1h windows should have >= 5 events.
    assert len(df) == 2
    starts = sorted(df["window_start"].tolist())
    assert starts == [0, 23 * 3600]


def test_step_default_quarter():
    """step_sec default is window_sec // 4 → more than 24 windows for 24h of data."""
    timestamps = np.arange(0, 24 * 3600, 60, dtype=np.int64)  # 1 event/min
    # With step=900 (window/4) and 1h window, we get ~95 windows.
    df = compute_goh_barabasi_series(timestamps, window_sec=3600)
    assert len(df) > 24
    # Verify the step policy: the row count should match step=900.
    df_quarter = compute_goh_barabasi_series(timestamps, window_sec=3600, step_sec=900)
    assert len(df) == len(df_quarter)


def test_compute_goh_barabasi_series_empty_too_few_events():
    """< 2 events → empty DataFrame with the right columns."""
    timestamps = np.array([0, 100], dtype=np.int64)
    df = compute_goh_barabasi_series(timestamps, window_sec=10, step_sec=1)
    # 2 events with gaps.size < 2 in any window → all skipped
    assert len(df) == 0
    assert list(df.columns) == ["window_start", "window_end", "n_events", "B"]


def test_write_goh_barabasi_parquet_roundtrip(tmp_path: Path):
    """Write a tiny DataFrame and read it back; values preserved exactly."""
    rows = [
        (0, 3600, 60, -0.5),
        (3600, 7200, 120, 0.1),
        (7200, 10800, 80, 0.25),
        (10800, 14400, 50, -0.1),
        (14400, 18000, 70, 0.4),
    ]
    df = pd.DataFrame(rows, columns=["window_start", "window_end", "n_events", "B"])
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["B"] = df["B"].astype("float64")

    out = tmp_path / "goh.parquet"
    write_goh_barabasi_parquet(df, out)
    assert out.exists()
    back = pd.read_parquet(out)
    pd.testing.assert_frame_equal(back, df)


# ── Cross-check against documented reference value ────────────────


@pytest.mark.skipif(
    not Path("data/cache/crime.duckdb").exists()
    and not Path("../../../data/cache/crime.duckdb").exists(),
    reason="DuckDB cache not present (smoke test for full-series B ≈ 0.30)",
)
def test_full_series_b_matches_documented_baseline():
    """Full-series (no-windowing) B over the 8.5M dataset must be in [0.20, 0.40].

    Reference: docs/FUTURE-WORK-ADAPTIVE-TIME.md:288 reports ≈ 0.30 at
    the 1h IEI scale on the Chicago crime dataset. The tolerance ±0.10
    covers normal dataset updates and platform-level jitter.
    """
    import os
    if "DUCKDB_PATH" not in os.environ:
        # Try the project-root-relative path that db.py defaults to.
        candidate = Path("../../../data/cache/crime.duckdb")
        if candidate.exists():
            os.environ["DUCKDB_PATH"] = str(candidate.resolve())

    from db import load_crimes
    df = load_crimes()
    timestamps = df["ts"].to_numpy()
    full_gaps = np.diff(timestamps.astype(np.float64))
    b_full = goh_barabasi_b(full_gaps)
    assert b_full is not None
    assert 0.20 <= b_full <= 0.40, f"full-series B = {b_full:.4f} (expected in [0.20, 0.40])"


# ── Constants sanity ──────────────────────────────────────────────


def test_constants_unchanged():
    """The locked constants must not drift from the plan's values."""
    assert WINDOWS_SEC == (3600, 21600, 86400, 604800)
    assert MIN_EVENTS_PER_WINDOW == 5

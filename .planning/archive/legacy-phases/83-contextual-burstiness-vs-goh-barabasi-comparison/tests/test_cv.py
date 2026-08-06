"""Unit tests for metrics/cv.py.

CV is the unbounded cousin of Goh-Barabasi B. ``CV = sigma_tau / mu_tau``
on inter-event gaps. Tests are deterministic synthetic-data only.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from metrics.cv import (
    MIN_EVENTS_PER_WINDOW,
    WINDOWS_SEC,
    compute_cv_series,
    cv_tau,
    write_cv_parquet,
)


# ── Formula edge cases ────────────────────────────────────────────


def test_cv_constant_gaps():
    """Constant gaps → CV = 0 (sigma=0, mean>0)."""
    gaps = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
    assert cv_tau(gaps) == 0.0


def test_cv_uniform_gaps_with_noise():
    """1000 uniform gaps → CV in (0, 0.5) — narrow spread, low CV.

    For Uniform(0.5, 1.5), mean=1.0, std≈0.289, so CV≈0.289. Allow
    some noise range for 1000 samples.
    """
    rng = np.random.default_rng(42)
    gaps = rng.uniform(0.5, 1.5, 1000)
    cv = cv_tau(gaps)
    assert cv is not None
    assert 0.0 < cv < 0.5


def test_cv_bursty():
    """Long-tail gaps (many tiny + a few huge) → CV > 5."""
    gaps = np.concatenate([np.full(990, 0.001), np.full(9, 100.0)])
    cv = cv_tau(gaps)
    assert cv is not None
    assert cv > 5.0


def test_cv_too_few_gaps():
    """n=1 → None."""
    assert cv_tau(np.array([1.0])) is None


def test_cv_zero_mean():
    """All-zero gaps → mean=0 → None (don't divide by zero)."""
    assert cv_tau(np.array([0.0, 0.0, 0.0])) is None


def test_cv_bounded_below():
    """For any finite gaps with mean>0, CV >= 0."""
    rng = np.random.default_rng(7)
    for _ in range(20):
        gaps = rng.exponential(1.0, 200)
        cv = cv_tau(gaps)
        assert cv is not None
        assert cv >= 0.0


def test_cv_unbounded_above():
    """CV is not bounded above (unlike B which is in [-1, 1]).

    A strongly bimodal distribution should produce CV >> 1 (more
    dispersed than Poisson). With 999 tiny gaps and 1 huge gap,
    mean ≈ 1.001 and std ≈ 31.6, so CV ≈ 31.6 — far above the
    Poisson-process CV ≈ 1 anchor.
    """
    gaps = np.concatenate([np.full(999, 0.001), np.array([1000.0])])
    cv = cv_tau(gaps)
    assert cv is not None
    assert cv > 10.0  # Poisson-process CV ≈ 1; bimodal should be >> 1


# ── Window sweep ──────────────────────────────────────────────────


def test_cv_window_sweep_uniform_24h():
    """24h dataset, 60 events/hour, step=1h → 24 rows, CV finite."""
    timestamps = np.arange(0, 24 * 3600 + 1, 60, dtype=np.int64)
    df = compute_cv_series(timestamps, window_sec=3600, step_sec=3600)
    assert len(df) == 24
    assert (df["n_events"] == 60).all()
    assert df["CV"].apply(np.isfinite).all()


def test_cv_min_events_filter():
    """100 events at start, 100 events at end of 24h, 0 in middle.

    1h window, 1h step → only the first and last windows should
    survive the MIN_EVENTS_PER_WINDOW=5 filter.
    """
    hour_0 = np.arange(0, 100, dtype=np.int64)  # 100 events in [0, 100)
    hour_23 = np.arange(23 * 3600, 24 * 3600, dtype=np.int64)  # 100 events in [82800, 86400)
    sentinel = np.array([24 * 3600], dtype=np.int64)  # ensures t_end == 86400
    timestamps = np.concatenate([hour_0, hour_23, sentinel])

    df = compute_cv_series(timestamps, window_sec=3600, step_sec=3600)

    assert len(df) == 2
    starts = sorted(df["window_start"].tolist())
    assert starts == [0, 23 * 3600]


# ── Parquet roundtrip ─────────────────────────────────────────────


def test_write_cv_parquet_roundtrip(tmp_path: Path):
    """Write a tiny DataFrame and read it back; values preserved exactly."""
    rows = [
        (0, 3600, 60, 0.3),
        (3600, 7200, 120, 0.5),
        (7200, 10800, 80, 0.7),
        (10800, 14400, 50, 0.2),
        (14400, 18000, 70, 1.1),
    ]
    df = pd.DataFrame(rows, columns=["window_start", "window_end", "n_events", "CV"])
    df["window_start"] = df["window_start"].astype("int64")
    df["window_end"] = df["window_end"].astype("int64")
    df["n_events"] = df["n_events"].astype("int32")
    df["CV"] = df["CV"].astype("float64")

    out = tmp_path / "cv.parquet"
    write_cv_parquet(df, out)
    assert out.exists()
    back = pd.read_parquet(out)
    pd.testing.assert_frame_equal(back, df)


# ── Constants sanity ──────────────────────────────────────────────


def test_cv_constants_match_other_metrics():
    """CV shares the locked window set and min_events with the other metrics."""
    assert WINDOWS_SEC == (3600, 21600, 86400, 604800)
    assert MIN_EVENTS_PER_WINDOW == 5

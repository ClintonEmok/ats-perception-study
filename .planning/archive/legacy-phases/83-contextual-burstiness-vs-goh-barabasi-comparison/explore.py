"""Phase 83 — Initial data exploration (Plan 01, Task 4).

Computes the 168-cell baseline (hour x dayOfWeek) on the 8.5M-row
crime dataset and a quick z-score preview at 1d windows. Writes
baseline_168.csv, z_quick_1d.csv, and exploration_report.md with
a PASS / INVESTIGATE verdict — a sanity check that the data
supports the 168-cell approach before investing in Plan 02-05.

Per-cell sigma uses a Poisson-style rate-based estimate. This is
the null-model sigma — the actual sigma would be computed from
weekly bucket counts in Plan 02. The Poisson estimate is
sufficient for the Plan 01 exploration to confirm sigma
estimation is stable (i.e. no cell has sigma=0 in practice).

Usage:
    DUCKDB_PATH=../../../data/cache/crime.duckdb .venv/bin/python explore.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

from db import load_crimes

# ── Constants ───────────────────────────────────────────────

SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86_400
EPSILON = 1e-9
PREVIEW_WINDOW = SECONDS_PER_DAY  # 1d for the quick preview
PREVIEW_STEP = PREVIEW_WINDOW // 4  # 6h step

# 1970-01-01 (epoch) was a Thursday; in 0=Sun convention that's 4.
EPOCH_DOW_OFFSET = 4

DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

OUTPUT_DIR = Path("output")
BASELINE_CSV = OUTPUT_DIR / "baseline_168.csv"
Z_PREVIEW_CSV = OUTPUT_DIR / "z_quick_1d.csv"
REPORT_MD = OUTPUT_DIR / "exploration_report.md"


# ── Baseline ────────────────────────────────────────────────


def compute_baseline(df: pd.DataFrame) -> pd.DataFrame:
    """Return a 168-row DataFrame with the (h, d) baseline.

    Columns: hour, dow, count, mean_per_sec, sigma_per_sec, count_cell_weeks
    """
    ts_min = int(df["ts"].min())
    ts_max = int(df["ts"].max())
    total_seconds = ts_max - ts_min
    total_weeks = total_seconds / (7 * SECONDS_PER_DAY)

    grouped = df.groupby(["hour", "dow"]).size().reset_index(name="count")
    # Make sure all 168 cells exist (fill missing with 0)
    full = pd.MultiIndex.from_product(
        [range(24), range(7)], names=["hour", "dow"]
    ).to_frame(index=False)
    full = full.merge(grouped, on=["hour", "dow"], how="left").fillna({"count": 0})
    full["count"] = full["count"].astype("int64")
    full["mean_per_sec"] = full["count"] / total_seconds
    # Per-cell sigma uses a Poisson-style rate-based estimate. This is
    # the null-model sigma — the actual σ would be computed from weekly
    # bucket counts in Plan 02. The Poisson estimate is sufficient for
    # the Plan 01 exploration to confirm sigma estimation is stable
    # (i.e. no cell has σ=0 in practice).
    full["sigma_per_sec"] = np.sqrt(full["mean_per_sec"].clip(lower=0))
    full["count_cell_weeks"] = total_weeks
    full = full.sort_values(["hour", "dow"]).reset_index(drop=True)
    return full


# ── z-score preview at 1d windows ────────────────────────────


def quick_z_preview(
    df: pd.DataFrame,
    baseline: pd.DataFrame,
    window_seconds: int = PREVIEW_WINDOW,
) -> pd.DataFrame:
    """Return a per-window z-score preview for 1d (or other) windows.

    Approximates each window by its dominant (h, d) cell (the cell
    containing the window's midpoint). This is fast and good enough
    for a sanity-check preview — Plan 03 will use the full linearised
    form.
    """
    df_sorted = df.sort_values("ts").reset_index(drop=True)
    ts_array = df_sorted["ts"].to_numpy()
    t_min = int(ts_array[0])
    t_max = int(ts_array[-1])
    step = window_seconds // 4
    window_starts = np.arange(t_min, t_max - window_seconds + 1, step)

    # Index baseline by (hour, dow) → mean_per_sec, sigma_per_sec
    base_idx = baseline.set_index(["hour", "dow"])[["mean_per_sec", "sigma_per_sec"]]

    rows = []
    for ws in window_starts:
        we = ws + window_seconds
        # observed = number of events in [ws, we)
        lo = int(np.searchsorted(ts_array, ws, side="left"))
        hi = int(np.searchsorted(ts_array, we, side="left"))
        observed = hi - lo

        # Dominant cell — the cell containing the window midpoint
        midpoint = ws + window_seconds // 2
        h = ((midpoint // SECONDS_PER_HOUR) % 24)
        d = ((ws // SECONDS_PER_DAY) + EPOCH_DOW_OFFSET) % 7

        mu_rate = base_idx.loc[(h, d), "mean_per_sec"]
        sig_rate = base_idx.loc[(h, d), "sigma_per_sec"]
        mu = float(mu_rate) * window_seconds
        sig = float(sig_rate) * np.sqrt(window_seconds)

        z = (observed - mu) / max(sig, EPSILON)
        rows.append((int(ws), int(observed), float(mu), float(sig), float(z)))

    return pd.DataFrame(
        rows, columns=["window_start", "observed", "mu", "sigma", "z"]
    )


# ── Report writer ────────────────────────────────────────────


def _hour_label(h: int) -> str:
    return f"{h:02d}:00"


def _day_label(d: int) -> str:
    return DAY_LABELS[int(d)]


def write_report(
    df: pd.DataFrame,
    baseline: pd.DataFrame,
    z_preview: pd.DataFrame,
    n_degenerate: int,
    z_min: float,
    z_max: float,
    z_std: float,
    z_cv: float,
    z_abs_gt3: int,
    z_abs_gt5: int,
    verdict: str,
) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    peak = baseline.loc[baseline["count"].idxmax()]
    trough = baseline.loc[baseline["count"].idxmin()]
    n_rows = len(df)
    ts_min = int(df["ts"].min())
    ts_max = int(df["ts"].max())
    min_str = pd.Timestamp(ts_min, unit="s", tz="UTC").strftime("%Y-%m-%d")
    max_str = pd.Timestamp(ts_max, unit="s", tz="UTC").strftime("%Y-%m-%d")

    lines = [
        "# Phase 83 — Initial Data Exploration",
        "",
        "Generated by `explore.py` — Phase 83 plan 01.",
        "See DECISION-GATE.md (Plan 05) for the go/not_yet/no call.",
        "",
        "## 1. Dataset",
        "",
        f"- **Row count:** {n_rows:,}",
        f"- **Date range:** {min_str} → {max_str}",
        f"- **Source:** `data/cache/crime.duckdb` (DuckDB, read-only)",
        f"- **Columns used:** ts, hour, dow, month",
        "",
        "## 2. 168-cell baseline",
        "",
        f"- **Total cells:** 168",
        f"- **Degenerate cells (sigma < {EPSILON:g}):** {n_degenerate}",
        f"- **Min cell count:** {int(baseline['count'].min()):,}",
        f"- **Max cell count:** {int(baseline['count'].max()):,}",
        f"- **Peak cell:** hour={int(peak['hour'])} ({_hour_label(int(peak['hour']))}), "
        f"dow={int(peak['dow'])} ({_day_label(int(peak['dow']))}), count={int(peak['count']):,}",
        f"- **Trough cell:** hour={int(trough['hour'])} ({_hour_label(int(trough['hour']))}), "
        f"dow={int(trough['dow'])} ({_day_label(int(trough['dow']))}), count={int(trough['count']):,}",
        "",
        "## 3. Quick z-score preview (1d windows)",
        "",
        f"- **Number of windows:** {len(z_preview):,}",
        f"- **z_min:** {z_min:.3f}",
        f"- **z_max:** {z_max:.3f}",
        f"- **z_std:** {z_std:.3f}",
        f"- **z_cv (std / |mean|):** {z_cv:.3f}",
        f"- **|z| > 3 windows:** {z_abs_gt3:,}",
        f"- **|z| > 5 windows:** {z_abs_gt5:,}",
        "",
        "**Interpretation:** If z_cv ≥ 0.10 and max |z| > 5, the contextual",
        "metric has good dynamic range for downstream comparison. Actual",
        f"values: z_cv = {z_cv:.3f}, max|z| = {max(abs(z_min), abs(z_max)):.3f}.",
        "",
        "## 4. Verdict — proceed to Plan 02?",
        "",
        f"**Verdict: {verdict}**",
        "",
        "Rule: PASS if `n_degenerate == 0 AND z_cv >= 0.05 AND z_max > 5`,",
        "else INVESTIGATE. This is a self-check that the data supports",
        "the 168-cell approach.",
        "",
        f"- n_degenerate = {n_degenerate} (must be 0)",
        f"- z_cv = {z_cv:.3f} (must be >= 0.05)",
        f"- z_max = {z_max:.3f} (must be > 5)",
        "",
        "---",
        "",
        "*Generated by explore.py — Phase 83 plan 01. See DECISION-GATE.md",
        "(Plan 05) for the go/not_yet/no call.*",
    ]
    REPORT_MD.write_text("\n".join(lines) + "\n")


# ── Main ─────────────────────────────────────────────────────


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading crimes via db.load_crimes()...")
    df = load_crimes()
    print(f"  → {len(df):,} events loaded")
    print()

    print("Computing 168-cell baseline (hour x dayOfWeek)...")
    baseline = compute_baseline(df)
    baseline.to_csv(BASELINE_CSV, index=False)
    print(f"  → {len(baseline)} cells written to {BASELINE_CSV}")
    print(f"Baseline: 168 cells ({int(baseline['count'].min()):,} – {int(baseline['count'].max()):,} events/cell)")
    print()

    print("Computing quick z-score preview (1d windows)...")
    z_preview = quick_z_preview(df, baseline)
    z_preview.to_csv(Z_PREVIEW_CSV, index=False)
    print(f"  → {len(z_preview):,} windows written to {Z_PREVIEW_CSV}")
    print()

    n_degenerate = int((baseline["sigma_per_sec"] < EPSILON).sum())
    z_min = float(z_preview["z"].min())
    z_max = float(z_preview["z"].max())
    z_std = float(z_preview["z"].std())
    z_abs_gt3 = int((z_preview["z"].abs() > 3).sum())
    z_abs_gt5 = int((z_preview["z"].abs() > 5).sum())
    z_mean = float(z_preview["z"].mean())
    z_cv = z_std / max(abs(z_mean), EPSILON)

    verdict = (
        "PASS" if (n_degenerate == 0 and z_cv >= 0.05 and z_max > 5) else "INVESTIGATE"
    )

    print("Summary statistics:")
    print(f"  n_degenerate cells: {n_degenerate}")
    peak_h, peak_d = int(baseline.loc[baseline['count'].idxmax(), 'hour']), int(baseline.loc[baseline['count'].idxmax(), 'dow'])
    trough_h, trough_d = int(baseline.loc[baseline['count'].idxmin(), 'hour']), int(baseline.loc[baseline['count'].idxmin(), 'dow'])
    print(f"  peak cell: hour={peak_h} ({_hour_label(peak_h)}), dow={peak_d} ({_day_label(peak_d)}), count={int(baseline['count'].max()):,}")
    print(f"  trough cell: hour={trough_h} ({_hour_label(trough_h)}), dow={trough_d} ({_day_label(trough_d)}), count={int(baseline['count'].min()):,}")
    print(f"  z_min: {z_min:.3f}")
    print(f"  z_max: {z_max:.3f}")
    print(f"  z_std: {z_std:.3f}")
    print(f"  z_cv: {z_cv:.3f}")
    print(f"  |z| > 3: {z_abs_gt3:,}")
    print(f"  |z| > 5: {z_abs_gt5:,}")
    print()
    print(f"Verdict: {verdict}")

    write_report(
        df, baseline, z_preview,
        n_degenerate, z_min, z_max, z_std, z_cv, z_abs_gt3, z_abs_gt5,
        verdict,
    )
    print(f"  → report written to {REPORT_MD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Phase 83 single-command entry point.

Loads the 8.5M-record Chicago crime dataset, computes the contextual
and the three reference burstiness metrics (Goh-Barabasi, density, CV)
over 1h/6h/1d/1w windows, writes comparison_table.csv, renders thesis
figures, and writes DECISION-GATE.md.

Usage:
    python run.py                                    # uses defaults
    python run.py --output-dir <path>                # custom output
    DUCKDB_PATH=/abs/path/to/crime.duckdb python run.py

The venv at ./.venv must exist (created via `make install`).
Run from the phase root directory.
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from db import load_crimes
from metrics import goh_barabasi

try:
    from metrics import density
except ImportError:
    density = None  # type: ignore[assignment]
try:
    from metrics import cv
except ImportError:
    cv = None  # type: ignore[assignment]
try:
    from metrics import contextual
except ImportError:
    contextual = None  # type: ignore[assignment]
try:
    import compare, figures  # type: ignore[import-not-found]
except ImportError:
    compare = figures = None  # type: ignore[assignment]
try:
    from metrics import decision_gate
except ImportError:
    decision_gate = None  # type: ignore[assignment]

DEFAULT_OUTPUT_DIR = Path("output")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--db-path",
        type=Path,
        default=None,
        help="Path to DuckDB cache. Defaults to DUCKDB_PATH env or "
        "data/cache/crime.duckdb (relative to project root).",
    )
    ap.add_argument(
        "--csv-path",
        type=Path,
        default=None,
        help="Path to the source CSV fallback. Defaults to "
        "data/sources/Crimes_-_2001_to_Present_20260114.csv.",
    )
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for output artifacts (default: output/).",
    )
    return ap.parse_args()


def _summarize(values, label: str) -> str:
    """Render n_windows / mean / std / min / max / cv / range for a series."""
    if values is None or len(values) == 0:
        return f"  {label}: (no windows)"
    arr = np.asarray(values, dtype=np.float64)
    n = arr.size
    mean = float(arr.mean())
    std = float(arr.std())  # population std (ddof=0), mirrors burstiness_sweep.py
    vmin = float(arr.min())
    vmax = float(arr.max())
    cv_val = std / abs(mean) if mean != 0 else float("inf")
    rng = vmax - vmin
    return (
        f"  {label}: n={n:,}  mean={mean:+.4f}  std={std:.4f}  "
        f"min={vmin:+.4f}  max={vmax:+.4f}  cv={cv_val:.4f}  range={rng:.4f}"
    )


def main() -> int:
    args = parse_args()
    print(f"Phase 83 — output directory: {args.output_dir.resolve()}")
    print()

    t0 = time.perf_counter()
    df = load_crimes(db_path=args.db_path, csv_path=args.csv_path)

    min_ts = int(df["ts"].min())
    max_ts = int(df["ts"].max())
    min_str = datetime.fromtimestamp(min_ts, tz=timezone.utc).strftime("%Y-%m-%d")
    max_str = datetime.fromtimestamp(max_ts, tz=timezone.utc).strftime("%Y-%m-%d")
    print(
        f"Loaded {len(df):,} events  "
        f"(ts range: {min_str}  →  {max_str})"
    )
    print(f"Elapsed: {time.perf_counter() - t0:.1f}s")
    print(f"Output directory: {args.output_dir.resolve()}")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    timestamps = df["ts"].to_numpy()

    # ── Plan 03 stage: three reference metrics (B, density, CV) ────
    t_metric_start = time.perf_counter()

    # 1. Goh-Barabasi B (CBP-02) — direct port of computeTemporalB
    t1 = time.perf_counter()
    print("=== Goh-Barabasi B (CBP-02) ===")
    full_gaps = np.diff(timestamps.astype("float64")) if timestamps.size >= 2 else None
    b_full = (
        goh_barabasi.goh_barabasi_b(full_gaps) if full_gaps is not None else None
    )
    if b_full is not None:
        print(f"Full-series Goh-Barabasi B (IEI): {b_full:.4f}  (expected ≈ 0.30)")
        if not (0.20 <= b_full <= 0.40):
            print(
                "  WARNING: full-series B is outside expected range [0.20, 0.40]",
                file=sys.stderr,
            )
    else:
        print("Full-series Goh-Barabasi B (IEI): (degenerate)")
    all_b = []
    for window_sec in goh_barabasi.WINDOWS_SEC:
        step = max(1, window_sec // 4)
        b_series = goh_barabasi.compute_goh_barabasi_series(
            timestamps, window_sec, step
        )
        b_series["window_sec"] = window_sec
        all_b.append(b_series)
        print(
            _summarize(
                b_series["B"].to_numpy() if len(b_series) else None,
                goh_barabasi.WINDOW_LABELS[window_sec],
            )
        )
    full_b = pd.concat(all_b, ignore_index=True) if all_b else pd.DataFrame()
    goh_barabasi.write_goh_barabasi_parquet(
        full_b, args.output_dir / "goh_barabasi_metric.parquet"
    )
    print(f"Goh-Barabasi metric: {time.perf_counter() - t1:.1f}s")
    print()

    # 2. Density (CBP-07) — events/sec
    if density is not None:
        t1 = time.perf_counter()
        print("=== density (CBP-07) ===")
        all_d = []
        for window_sec in density.WINDOWS_SEC:
            step = max(1, window_sec // 4)
            d_series = density.compute_density_series(timestamps, window_sec, step)
            d_series["window_sec"] = window_sec
            all_d.append(d_series)
            print(
                _summarize(
                    d_series["density"].to_numpy() if len(d_series) else None,
                    density.WINDOW_LABELS[window_sec],
                )
            )
        full_d = pd.concat(all_d, ignore_index=True) if all_d else pd.DataFrame()
        density.write_density_parquet(
            full_d, args.output_dir / "density_metric.parquet"
        )
        print(f"density metric: {time.perf_counter() - t1:.1f}s")
        print()

    # 3. Coefficient of variation (CBP-08) — sigma_tau / mu_tau
    if cv is not None:
        t1 = time.perf_counter()
        print("=== CV (CBP-08) ===")
        full_gaps = (
            np.diff(timestamps.astype("float64")) if timestamps.size >= 2 else None
        )
        cv_full = cv.cv_tau(full_gaps) if full_gaps is not None else None
        if cv_full is not None:
            print(
                f"Full-series CV (IEI): {cv_full:.4f}  (Poisson-process would be ≈ 1.0)"
            )
        else:
            print("Full-series CV (IEI): (degenerate)")
        all_c = []
        for window_sec in cv.WINDOWS_SEC:
            step = max(1, window_sec // 4)
            cv_series = cv.compute_cv_series(timestamps, window_sec, step)
            cv_series["window_sec"] = window_sec
            all_c.append(cv_series)
            print(
                _summarize(
                    cv_series["CV"].to_numpy() if len(cv_series) else None,
                    cv.WINDOW_LABELS[window_sec],
                )
            )
        full_c = pd.concat(all_c, ignore_index=True) if all_c else pd.DataFrame()
        cv.write_cv_parquet(full_c, args.output_dir / "cv_metric.parquet")
        print(f"CV metric: {time.perf_counter() - t1:.1f}s")
        print()

    print(
        f"Reference metrics total: {time.perf_counter() - t_metric_start:.1f}s"
    )
    if density is not None and cv is not None:
        print(
            f"Reference metrics: density {len(pd.read_parquet(args.output_dir / 'density_metric.parquet')):,} windows total, "
            f"CV {len(pd.read_parquet(args.output_dir / 'cv_metric.parquet')):,} windows total"
        )

    # ── Plan 02 stage: contextual z-score (CBP-01) ────────────
    if contextual is not None:
        t1 = time.perf_counter()
        print("=== contextual z (CBP-01) ===")
        from metrics import baseline as baseline_mod
        baseline_path = Path(__file__).parent / "baselines"
        try:
            baseline, baseline_meta = baseline_mod.load(baseline_path)
            print(f"  baseline (cached): {len(baseline)} cells, "
                  f"fingerprint {baseline_meta.fingerprint}, "
                  f"n_events {baseline_meta.n_events:,}")
        except FileNotFoundError:
            print("  baseline cache not found, building from data ...")
            baseline, baseline_meta = baseline_mod.build_from_dataframe(df)
            baseline_mod.save(baseline, baseline_meta, baseline_path)
        # Always also write a CSV copy to output/ for figures.py.
        baseline.to_csv(args.output_dir / "baseline_168.csv", index=False)
        print(f"  mu range: {baseline['mean_per_sec'].min():.6f} to "
              f"{baseline['mean_per_sec'].max():.6f}")
        all_z: list[pd.DataFrame] = []
        for window_sec in contextual.WINDOWS_SEC:
            step = max(1, window_sec // 4)
            z_series = contextual.compute_contextual_z_series(
                timestamps, baseline, window_sec, step
            )
            z_series["window_sec"] = window_sec
            all_z.append(z_series)
            z_vals = z_series["z"].to_numpy() if len(z_series) else None
            print(_summarize(z_vals, contextual.WINDOW_LABELS[window_sec]))
        full_z = pd.concat(all_z, ignore_index=True) if all_z else pd.DataFrame()
        contextual.write_contextual_parquet(
            full_z, args.output_dir / "contextual_metric.parquet"
        )
        print(f"contextual metric: {time.perf_counter() - t1:.1f}s")
        print()

    # ── Plan 04 stage: comparison + figures ──────────────────────
    if compare is not None and figures is not None:
        t1 = time.perf_counter()
        print("=== Plan 04: comparison + figures ===")
        parquets = compare.load_parquets(args.output_dir)
        table = compare.build_comparison_table(parquets)
        compare.write_comparison_csv(
            table, args.output_dir / "comparison_table.csv"
        )
        figures_dir = args.output_dir / "figures"
        figures.render_heatmap(
            args.output_dir / "baseline_168.csv",
            figures_dir / "baseline_heatmap.png",
        )
        figures.render_time_series(
            parquets["contextual"],
            parquets["B"],
            parquets["density"],
            parquets["CV"],
            figures_dir / "metric_timeseries.png",
        )
        figures.render_contrast_table(
            table, figures_dir / "contrast_table.png"
        )
        print(f"comparison + figures: {time.perf_counter() - t1:.1f}s")
        print()

    # ── Plan 05 stage: decision gate ──────────────────────────────
    if decision_gate is not None:
        t1 = time.perf_counter()
        print("=== Plan 05: decision gate ===")
        table = pd.read_csv(args.output_dir / "comparison_table.csv")
        gate = decision_gate.evaluate_gate(table)
        decision_gate.render_decision_gate_md(
            table, gate, len(df), args.output_dir / "DECISION-GATE.md"
        )
        print(f"VERDICT: {gate['verdict'].upper()}")
        print(gate["rationale"])
        print(f"decision gate: {time.perf_counter() - t1:.1f}s")
        print()

    print(f"Total elapsed: {time.perf_counter() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())

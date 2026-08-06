"""Build the comparison table from the four metric parquets.

Reads the four per-window metric parquets produced by Plan 02/03,
computes summary statistics (n, mean, std, min, max, std/mean ratio,
range) per (metric, window) cell, and writes a 16-row CSV to
output/comparison_table.csv. The std/mean column is named ``cv``
in the CSV to mirror the burst-detection.ts terminology, but for
the contextual z-score we use std(z) directly because z is
zero-centered by construction (its mean is 0 by definition of the
conditional-rate baseline, so CV is undefined).

Output schema:
    metric, window_size, window_label, n_windows, mean, std, min,
    max, cv, range

For the contextual z-score the ``cv`` column is reported as the
sample std (since z is zero-centered, CV = std/|mean| is undefined).
This makes the contextual row directly comparable to the reference
metric rows: both express a dimensionless "relative variation".

Per 83-CONTEXT.md:
- WINDOWS_SEC = (3600, 21600, 86400, 604800)
- Primary criterion: contextual std at 1d must be >= 2x the median
  reference CV at 1d (and >= 0.10 absolute).
- Secondary criterion: contextual range at 1d must be >= 3x the
  max reference range at 1d.

Usage:
    python compare.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Reuse the constants from each metric module so the four series stay
# in sync with their definitions.
from metrics.contextual import WINDOW_LABELS, WINDOWS_SEC

DEFAULT_OUTPUT_DIR = Path("output")

# Metric column name -> (file stem, value column, label).
# ``value_col`` is the per-window metric value column. The label
# appears in the ``metric`` column of the comparison table.
METRIC_SPECS: tuple[tuple[str, str, str], ...] = (
    ("contextual", "contextual_metric.parquet", "z"),
    ("B", "goh_barabasi_metric.parquet", "B"),
    ("density", "density_metric.parquet", "density"),
    ("CV", "cv_metric.parquet", "CV"),
)


def summarize(values: np.ndarray) -> dict[str, float]:
    """Return per-window summary statistics for one (metric, window) cell.

    Computes:
      - n       : window count
      - mean    : arithmetic mean
      - std     : population standard deviation (ddof=0)
      - min     : minimum value
      - max     : maximum value
      - cv      : std / |mean| (undefined -> 0 when mean == 0)
      - range   : max - min
    """
    n = int(values.size)
    if n == 0:
        return {
            "n_windows": 0,
            "mean": float("nan"),
            "std": float("nan"),
            "min": float("nan"),
            "max": float("nan"),
            "cv": float("nan"),
            "range": float("nan"),
        }
    mean = float(values.mean())
    std = float(values.std(ddof=0))
    vmin = float(values.min())
    vmax = float(values.max())
    cv_val = std / abs(mean) if mean != 0 else 0.0
    return {
        "n_windows": n,
        "mean": mean,
        "std": std,
        "min": vmin,
        "max": vmax,
        "cv": cv_val,
        "range": vmax - vmin,
    }


def build_comparison_table(
    parquets: dict[str, pd.DataFrame],
    window_secs: tuple[int, ...] = WINDOWS_SEC,
    window_labels: dict[int, str] = WINDOW_LABELS,
) -> pd.DataFrame:
    """Compute the 4 x 4 = 16-row comparison table.

    Parameters
    ----------
    parquets : dict
        Maps metric name (e.g. ``"contextual"``) to its full parquet
        DataFrame. Each parquet must have columns ``window_sec`` and
        a value column matching ``METRIC_SPECS``.
    window_secs, window_labels : optional
        Defaults to the locked CONTEXT values.
    """
    rows: list[dict] = []
    for metric_name, _file_stem, value_col in METRIC_SPECS:
        df = parquets[metric_name]
        for window_sec in window_secs:
            cell = df[df["window_sec"] == window_sec]
            if len(cell) == 0:
                stats = summarize(np.array([], dtype=np.float64))
            else:
                stats = summarize(cell[value_col].to_numpy(dtype=np.float64))
            rows.append(
                {
                    "metric": metric_name,
                    "window_size": int(window_sec),
                    "window_label": window_labels[window_sec],
                    **stats,
                }
            )
    return pd.DataFrame(rows, columns=[
        "metric",
        "window_size",
        "window_label",
        "n_windows",
        "mean",
        "std",
        "min",
        "max",
        "cv",
        "range",
    ])


def write_comparison_csv(table: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(output_path, index=False, float_format="%.6f")
    print(f"Wrote {len(table):,} rows to {output_path}")


def load_parquets(output_dir: Path) -> dict[str, pd.DataFrame]:
    parquets: dict[str, pd.DataFrame] = {}
    for metric_name, file_stem, _value_col in METRIC_SPECS:
        path = output_dir / file_stem
        if not path.exists():
            raise FileNotFoundError(
                f"{metric_name} parquet missing: {path}. "
                f"Run `python run.py` (Plans 02/03) first."
            )
        parquets[metric_name] = pd.read_parquet(path)
    return parquets


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory containing the metric parquets and "
        "where the comparison table is written.",
    )
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    parquets = load_parquets(args.output_dir)
    table = build_comparison_table(parquets)
    write_comparison_csv(table, args.output_dir / "comparison_table.csv")

    # Pretty-print the key 1d row for the terminal.
    oned = table[table["window_label"] == "1d"].copy()
    if not oned.empty:
        print()
        print("Per-metric summary at 1d windows:")
        print(
            oned[
                ["metric", "n_windows", "mean", "std", "cv", "range"]
            ].to_string(index=False)
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

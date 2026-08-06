"""Render the three thesis-ready figures from the comparison table.

Reuses the matplotlib palette and 320 DPI from
``scripts/chapter3_visualizations.py`` so the visual style matches
the rest of the thesis.

Figure 1: heatmap of z-score across (hour x dayOfWeek) — the
contextual baseline itself, showing the diurnal/weekly structure
the z-score is meant to capture. Renders for the 1d window case.

Figure 2: per-window time series of all four metrics at 1d windows,
overlayed on a shared axis. Shows that B/density/CV are visually
flat while z swings through -30 to +34. Y-axes are normalized to
unit range so the dynamic range is visible on one plot.

Figure 3: 4x4 contrast table (metric x window) showing the std
column for contextual and the cv column for the references.
Saved as a PNG via matplotlib table rendering.

All three figures include a source caption per CONTEXT.md L93.

Usage:
    python figures.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Reuse the same palette and DPI the rest of the thesis uses.
# Mirrors scripts/chapter3_visualizations.py constants.
BG = "#ffffff"
INK = "#18202a"
SUBTLE = "#5b6675"
GRID = "#d8e0e8"
BLUE = "#3b6ea8"
BLUE_DARK = "#1f3f63"
BLUE_LIGHT = "#a8c0db"
TEAL = "#3a8a8a"
ACCENT = "#d9a441"
RED = "#d46c68"
FIGURE_DPI = 320

# 168-cell heatmap will use this 24 x 7 layout.
HOUR_LABELS = [f"{h:02d}" for h in range(24)]
DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

# Source caption appended to all three figures.
SOURCE_CAPTION = (
    "Source: 8.38M-record Chicago crime dataset (2001-2026); "
    "analysis: Phase 83 Contextual Burstiness vs Goh-Barabasi Comparison."
)


def _add_source_caption(fig: plt.Figure, source: str = SOURCE_CAPTION) -> None:
    fig.text(
        0.01,
        0.01,
        source,
        fontsize=7,
        color=SUBTLE,
        ha="left",
        va="bottom",
        style="italic",
    )


def _baseline_lookup(baseline_csv: Path) -> tuple[np.ndarray, np.ndarray]:
    """Return (mu_24x7, sig_24x7) arrays from the baseline CSV.

    The CSV has columns hour, dow, count, mean_per_sec, sigma_per_sec.
    """
    df = pd.read_csv(baseline_csv)
    mu = np.zeros((24, 7), dtype=np.float64)
    sig = np.zeros((24, 7), dtype=np.float64)
    for _, row in df.iterrows():
        h = int(row["hour"])
        d = int(row["dow"])
        mu[h, d] = float(row["mean_per_sec"])
        sig[h, d] = float(row["sigma_per_sec"])
    return mu, sig


def render_heatmap(baseline_csv_path: Path, output_path: Path) -> None:
    """Figure 1: 24x7 heatmap of expected-rate baseline.

    Reads the 168-cell baseline from the CSV produced by Plan 01's
    explore.py / contextual.py. The heatmap shows the conditional
    rate (events/hour) at hour h on day-of-week d — the structure
    the z-score is normalizing against.
    """
    baseline = pd.read_csv(baseline_csv_path)
    mu = np.zeros((24, 7), dtype=np.float64)
    for _, row in baseline.iterrows():
        h = int(row["hour"])
        d = int(row["dow"])
        mu[h, d] = float(row["mean_per_sec"])

    fig, ax = plt.subplots(figsize=(7.0, 4.5), dpi=FIGURE_DPI)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    im = ax.imshow(
        mu * 3600.0,  # convert per-sec to per-hour so the colorbar is
                      # readable (range ~11-58 events/hour)
        cmap="Blues",
        aspect="auto",
        origin="upper",
        interpolation="nearest",
    )
    ax.set_xticks(range(7))
    ax.set_xticklabels(DOW_LABELS, fontsize=8, color=INK)
    ax.set_yticks(range(24))
    ax.set_yticklabels(HOUR_LABELS, fontsize=7, color=INK)
    ax.set_xlabel("Day of week", fontsize=9, color=INK)
    ax.set_ylabel("Hour of day (0-23)", fontsize=9, color=INK)
    ax.set_title(
        "Contextual baseline: expected crime count per hour,\n"
        "by (hour of day, day of week) — 8.38M events, 2001-2026",
        fontsize=10,
        color=INK,
        pad=10,
    )
    cbar = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.04)
    cbar.set_label("events / hour", fontsize=8, color=INK)
    cbar.ax.tick_params(labelsize=7, colors=INK)

    for spine in ax.spines.values():
        spine.set_color(GRID)
    ax.tick_params(axis="both", colors=INK)
    _add_source_caption(fig)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote heatmap to {output_path}")


def _baseline_lookup_via_baseline(baseline: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    mu = np.zeros((24, 7), dtype=np.float64)
    sig = np.zeros((24, 7), dtype=np.float64)
    for _, row in baseline.iterrows():
        h = int(row["hour"])
        d = int(row["dow"])
        mu[h, d] = float(row["mean_per_sec"])
        sig[h, d] = float(row["sigma_per_sec"])
    return mu, sig


def render_time_series(
    contextual: pd.DataFrame,
    goh: pd.DataFrame,
    density_df: pd.DataFrame,
    cv_df: pd.DataFrame,
    output_path: Path,
) -> None:
    """Figure 2: per-window time series of all 4 metrics at 1d.

    Y-axes are normalized to [0, 1] per metric so all four are visible
    on one plot. The x-axis is the window start timestamp.
    """
    fig, axes = plt.subplots(
        4, 1, figsize=(7.5, 8.0), dpi=FIGURE_DPI, sharex=True
    )
    fig.patch.set_facecolor(BG)

    oned = lambda df, col: df[df["window_sec"] == 86400].sort_values("window_start")

    series_specs = [
        ("contextual z (Pearson residual)", oned(contextual, "z"), BLUE, "z"),
        ("B (Goh-Barabasi)", oned(goh, "B"), TEAL, "B"),
        ("density (events / sec)", oned(density_df, "density"), ACCENT, "density"),
        ("CV (sigma_tau / mu_tau)", oned(cv_df, "CV"), RED, "CV"),
    ]

    for ax, (label, df, color, col) in zip(axes, series_specs):
        ax.set_facecolor(BG)
        if len(df) == 0:
            ax.text(
                0.5,
                0.5,
                f"(no {label} data)",
                transform=ax.transAxes,
                ha="center",
                va="center",
                color=SUBTLE,
                fontsize=9,
            )
        else:
            x = df["window_start"].to_numpy()
            y = df[col].to_numpy(dtype=np.float64)
            y_min, y_max = float(np.min(y)), float(np.max(y))
            if y_max > y_min:
                y_norm = (y - y_min) / (y_max - y_min)
            else:
                y_norm = np.zeros_like(y)
            ax.plot(x, y_norm, color=color, linewidth=0.5)
            ax.text(
                0.02,
                0.92,
                f"range {y_max - y_min:.4f}",
                transform=ax.transAxes,
                ha="left",
                va="top",
                fontsize=8,
                color=INK,
                bbox=dict(boxstyle="round,pad=0.2", facecolor=BG, edgecolor=GRID, linewidth=0.5),
            )
        ax.set_ylabel(label, fontsize=8, color=INK)
        ax.tick_params(axis="both", labelsize=7, colors=INK)
        for spine in ax.spines.values():
            spine.set_color(GRID)
        ax.grid(True, color=GRID, linewidth=0.4, alpha=0.7)
        ax.set_ylim(-0.05, 1.05)

    axes[-1].set_xlabel("window_start (epoch seconds)", fontsize=9, color=INK)
    fig.suptitle(
        "Per-window time series at 1d windows (normalised to [0,1] per metric)\n"
        "Contextual z has the only visible dynamic range",
        fontsize=10,
        color=INK,
        y=0.995,
    )
    _add_source_caption(fig)
    fig.tight_layout(rect=(0, 0.04, 1, 0.97))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote time-series figure to {output_path}")


def render_contrast_table(table: pd.DataFrame, output_path: Path) -> None:
    """Figure 3: 4x4 contrast table — std for contextual, cv for refs."""
    pivot = table.pivot(index="metric", columns="window_label", values="std").copy()
    pivot = pivot.reindex(["contextual", "B", "density", "CV"])
    pivot = pivot[["1h", "6h", "1d", "1w"]]

    fig, ax = plt.subplots(figsize=(7.0, 3.2), dpi=FIGURE_DPI)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.axis("off")

    cell_text = []
    for metric in pivot.index:
        row = [metric] + [f"{v:.4f}" if pd.notna(v) else "-" for v in pivot.loc[metric].tolist()]
        cell_text.append(row)

    tbl = ax.table(
        cellText=cell_text,
        colLabels=["metric", "1h", "6h", "1d", "1w"],
        loc="center",
        cellLoc="center",
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9)
    tbl.scale(1.0, 1.5)

    # Color the contextual row blue, references in lighter blue.
    for i, metric in enumerate(pivot.index):
        for j in range(5):
            cell = tbl[i + 1, j]
            cell.set_facecolor(BLUE_LIGHT if metric == "contextual" else BG)
            cell.set_edgecolor(GRID)
            cell.set_text_props(color=INK)
    for j in range(5):
        cell = tbl[0, j]
        cell.set_facecolor(BLUE_DARK)
        cell.set_text_props(color="white", weight="bold")

    ax.set_title(
        "Std of per-window metric values (4 metrics x 4 windows)\n"
        "Contextual std scales with window size; reference CVs do not",
        fontsize=10,
        color=INK,
        pad=12,
    )
    _add_source_caption(fig)
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote contrast table to {output_path}")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=Path("output"),
        help="Directory containing the metric parquets and where the "
        "figures are written.",
    )
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    ctx = pd.read_parquet(args.output_dir / "contextual_metric.parquet")
    goh = pd.read_parquet(args.output_dir / "goh_barabasi_metric.parquet")
    den = pd.read_parquet(args.output_dir / "density_metric.parquet")
    cv_df = pd.read_parquet(args.output_dir / "cv_metric.parquet")
    table = pd.read_csv(args.output_dir / "comparison_table.csv")

    figures_dir = args.output_dir / "figures"
    render_heatmap(args.output_dir / "baseline_168.csv", figures_dir / "baseline_heatmap.png")
    render_time_series(ctx, goh, den, cv_df, figures_dir / "metric_timeseries.png")
    render_contrast_table(table, figures_dir / "contrast_table.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Experiment 1: Multi-scale Analysis of Temporal Event Distributions

Characterizes temporal behaviour of the Chicago crime dataset across multiple
spatial and temporal scales, examining inter-event times and event densities.

Supports two CSV formats (auto-detected):
  - sample: data/source.csv  (ISO 8601 timestamps, lowercase columns)
  - full:   data/sources/Crimes_-_2001_to_Present_*.csv
            (US date format, "Date"/"Primary Type"/"District"/"Beat" columns)

Usage:
    python3.11 scripts/experiment1_temporal_characterization.py data/source.csv
    python3.11 scripts/experiment1_temporal_characterization.py \\
        "data/sources/Crimes_-_2001_to_Present_20260114.csv"
"""

from __future__ import annotations

import argparse
import csv
import math
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np


# ── Configuration ─────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / 'output' / 'experiment1'
DPI = 300
FIGSIZE_WIDE = (12, 5)
FIGSIZE_SQUARE = (7, 6)
PALETTE = ['#1f3a5f', '#c0392b', '#2c7a3d', '#b8860b', '#5b3a8a',
           '#a83279', '#0e7c7b', '#c25e0e']

# Publication-style matplotlib defaults: small, clean, sans-serif.
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Helvetica', 'Arial', 'DejaVu Sans'],
    'font.size': 8,
    'axes.titlesize': 9,
    'axes.labelsize': 8,
    'xtick.labelsize': 7,
    'ytick.labelsize': 7,
    'legend.fontsize': 7,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.linewidth': 0.6,
    'xtick.major.width': 0.6,
    'ytick.major.width': 0.6,
    'xtick.major.size': 3,
    'ytick.major.size': 3,
    'lines.linewidth': 0.9,
    'savefig.bbox': 'tight',
    'savefig.pad_inches': 0.05,
    'figure.dpi': DPI,
})


# ── Format detection ──────────────────────────────────────────────────

def detect_format(csv_path: str) -> dict:
    """Detect CSV format and return column indices + timestamp parser."""
    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader)

    # 'sample' format: timestamp, type, district, block
    if 'timestamp' in header and 'type' in header:
        def parse(ts: str) -> tuple[float, int, int, int]:
            dt = datetime.fromisoformat(ts.rstrip('Z'))
            dt = dt.replace(tzinfo=timezone.utc)
            return dt.timestamp(), dt.year, dt.month, dt.day
        return {
            'name': 'sample',
            'idx_date': header.index('timestamp'),
            'idx_type': header.index('type'),
            'idx_district': header.index('district'),
            'idx_beat': header.index('block'),
            'idx_lat': None,
            'idx_lon': None,
            'parse': parse,
        }

    # 'full' format: Date, Primary Type, District, Beat
    if 'Date' in header and 'Primary Type' in header:
        def parse(ts: str) -> tuple[float, int, int, int]:
            dt = datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p')
            # No tz info in source; treat as UTC-naive but with .timestamp() consistent
            return dt.replace(tzinfo=timezone.utc).timestamp(), dt.year, dt.month, dt.day
        return {
            'name': 'full',
            'idx_date': header.index('Date'),
            'idx_type': header.index('Primary Type'),
            'idx_district': header.index('District'),
            'idx_beat': header.index('Beat'),
            'idx_lat': header.index('Latitude'),
            'idx_lon': header.index('Longitude'),
            'parse': parse,
        }

    raise ValueError(f'Unknown CSV format — header columns: {header[:10]}...')


def has_valid_coordinates(row: list[str], fmt: dict) -> bool:
    """Return whether a record has finite coordinate values."""

    idx_lat = fmt.get('idx_lat')
    idx_lon = fmt.get('idx_lon')
    if idx_lat is None or idx_lon is None:
        return True
    try:
        latitude = float(row[idx_lat])
        longitude = float(row[idx_lon])
    except (ValueError, IndexError, TypeError):
        return False
    return math.isfinite(latitude) and math.isfinite(longitude)


# ── Subset anchors (computed from sample) ────────────────────────────

def determine_anchors(csv_path: str, fmt: dict, sample_n: int = 100_000) -> dict:
    """
    Quick first-pass scan to determine subset anchors:
      - year, month, day for temporal subsets (most recent)
      - most frequent type, district, beat for spatial subsets
    """
    type_counts: Counter = Counter()
    dist_counts: Counter = Counter()
    beat_counts: Counter = Counter()
    last_date: datetime | None = None
    rows_seen = 0

    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            rows_seen += 1
            if rows_seen > sample_n:
                break
            if not has_valid_coordinates(row, fmt):
                continue
            try:
                ts, y, m, d = fmt['parse'](row[fmt['idx_date']])
            except (ValueError, IndexError):
                continue
            last_date = datetime(y, m, d, tzinfo=timezone.utc)
            type_counts[row[fmt['idx_type']].upper()] += 1
            dist_counts[row[fmt['idx_district']].strip()] += 1
            beat_counts[row[fmt['idx_beat']].strip()] += 1

    if last_date is None:
        raise ValueError('No valid rows found in sample.')

    return {
        'year': last_date.year,
        'month': last_date.month,
        'day': last_date.day,
        'top_type': type_counts.most_common(1)[0][0],
        'top_district': dist_counts.most_common(1)[0][0],
        'top_beat': beat_counts.most_common(1)[0][0],
        'sample_rows': rows_seen,
    }


# ── Single-pass subset extraction ─────────────────────────────────────

def load_subsets(csv_path: str, fmt: dict, anchors: dict,
                 progress: bool = True) -> dict[str, np.ndarray]:
    """
    Stream the CSV once. For each row, append the timestamp to every
    matching subset. Returns {label: sorted_float64_array}.
    """
    buckets: dict[str, list[float]] = {
        'full': [],
        'year': [],
        'month': [],
        'day': [],
        'district': [],
        'beat': [],
        'type': [],
        'beat_type': [],
    }

    total = 0
    invalid_coordinates = 0
    y_anchor = anchors['year']
    m_anchor = anchors['month']
    d_anchor = anchors['day']
    t_anchor = anchors['top_type']
    d_dist = anchors['top_district']
    d_beat = anchors['top_beat']

    idx_d, idx_t, idx_dist, idx_b = (
        fmt['idx_date'], fmt['idx_type'], fmt['idx_district'], fmt['idx_beat'])
    parse = fmt['parse']

    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for i, row in enumerate(reader):
            total += 1
            if progress and total % 500_000 == 0:
                print(f'    ... {total:,} rows processed', flush=True)
            if not has_valid_coordinates(row, fmt):
                invalid_coordinates += 1
                continue
            try:
                ts, y, m, d = parse(row[idx_d])
            except (ValueError, IndexError):
                continue
            t_val = row[idx_t].upper()
            dist_val = row[idx_dist].strip()
            beat_val = row[idx_b].strip()

            buckets['full'].append(ts)
            if y == y_anchor:
                buckets['year'].append(ts)
                if m == m_anchor:
                    buckets['month'].append(ts)
                    if d == d_anchor:
                        buckets['day'].append(ts)
            if dist_val == d_dist:
                buckets['district'].append(ts)
            if beat_val == d_beat:
                buckets['beat'].append(ts)
            if t_val == t_anchor:
                buckets['type'].append(ts)
            if beat_val == d_beat and t_val == t_anchor:
                buckets['beat_type'].append(ts)

    subsets: dict[str, np.ndarray] = {}
    for key, values in buckets.items():
        arr = np.array(values, dtype=np.float64) if values else np.array([], dtype=np.float64)
        arr.sort()
        subsets[key] = arr

    return subsets, total, invalid_coordinates


# ── Labelling ─────────────────────────────────────────────────────────

def labelled_subsets(subsets: dict[str, np.ndarray], anchors: dict) -> dict[str, np.ndarray]:
    """Rename internal bucket keys to human-readable labels."""
    y, m, d = anchors['year'], anchors['month'], anchors['day']
    return {
        'After cleanup':                               subsets['full'],
        f'Single year ({y})':                          subsets['year'],
        f'Single month ({y}-{m:02d})':                 subsets['month'],
        f'Single day ({y}-{m:02d}-{d:02d})':           subsets['day'],
        f'Single district ({anchors["top_district"]})': subsets['district'],
        f'Single beat ({anchors["top_beat"]})':         subsets['beat'],
        f'Single type ({anchors["top_type"].title()})': subsets['type'],
        f'Beat ({anchors["top_beat"]}) + Type ({anchors["top_type"].title()})':
                                                          subsets['beat_type'],
    }


# ── Metrics ───────────────────────────────────────────────────────────

def goh_burstiness(cv: float) -> float:
    """Goh–Barabási (2008) burstiness parameter B = (σ−μ)/(σ+μ).

    Defined for inter-event time distributions. Derived from CV = σ/μ,
    so B = (CV−1)/(CV+1). Range [-1, 1]: B=0 Poisson, B>0 bursty, B<0 regular.
    Not applicable to binned density counts — use CV/Gini for those.
    """
    if cv is None or not math.isfinite(cv) or cv + 1 == 0:
        return float('nan')
    return (cv - 1) / (cv + 1)


def interevent_metrics(ts: np.ndarray) -> dict | None:
    if len(ts) < 2:
        return None
    gaps = np.diff(ts)
    mu = float(np.mean(gaps))
    med = float(np.median(gaps))
    std = float(np.std(gaps, ddof=0))
    cv = std / mu if mu > 0 else float('nan')
    b = goh_burstiness(cv)
    return {'mean': mu, 'median': med, 'std': std, 'cv': cv, 'b': b, 'n': len(gaps)}


def density_metrics(counts: np.ndarray) -> dict:
    total = float(np.sum(counts))
    n = len(counts)
    mu = total / n
    var = float(np.var(counts, ddof=0))
    cv = math.sqrt(var) / mu if mu > 0 else float('nan')
    empty_pct = float(np.sum(counts == 0)) / n * 100
    if total > 0:
        sorted_c = np.sort(counts)
        n_f = float(n)
        weighted = sum((i + 1) * c for i, c in enumerate(sorted_c))
        gini = (2 * weighted) / (n_f * total) - (n_f + 1) / n_f
    else:
        gini = float('nan')
    return {'mean': mu, 'variance': var, 'cv': cv,
            'gini': gini, 'empty_pct': empty_pct, 'n_bins': n}


def bin_counts(ts: np.ndarray, bin_hours: float,
               start: float | None = None, end: float | None = None) -> np.ndarray:
    if len(ts) == 0:
        return np.array([], dtype=int)
    t0 = start if start is not None else float(ts[0])
    t1 = end if end is not None else float(ts[-1])
    if t1 <= t0:
        t1 = t0 + 3600 * bin_hours
    bin_edges = np.arange(t0, t1 + 3600 * bin_hours, 3600 * bin_hours)
    counts, _ = np.histogram(ts, bins=bin_edges)
    return counts


# ── Step 1: Timestamp quality ─────────────────────────────────────────

def step1_timestamp_quality(csv_path: str, fmt: dict, anchors: dict,
                            total_rows: int, output_dir: Path):
    print('\n' + '=' * 72)
    print('  Step 1: Timestamp Quality Assessment')
    print('=' * 72)

    parse = fmt['parse']
    idx_d = fmt['idx_date']

    # Stream a quality sample — first 1M rows is plenty for resolution
    seen: Counter = Counter()
    n_total = 0
    min_diff = float('inf')
    last_ts = None
    sample_limit = 1_000_000

    print(f'  Scanning first {sample_limit:,} rows for quality metrics ...')
    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if n_total >= sample_limit:
                break
            try:
                ts, *_ = parse(row[idx_d])
            except (ValueError, IndexError):
                continue
            n_total += 1
            seen[ts] += 1
            if last_ts is not None and ts != last_ts:
                d = ts - last_ts
                if 0 < d < min_diff:
                    min_diff = d
            last_ts = ts

    if last_ts is None:
        print('  ERROR: No valid timestamps found.')
        return

    n_unique = len(seen)
    n_dups = sum(c - 1 for c in seen.values() if c > 1)
    dup_pct = n_dups / n_total * 100

    # Resolution label
    if min_diff == float('inf'):
        res = 'n/a (all duplicate timestamps)'
    elif min_diff < 1:
        res = f'{min_diff * 1000:.1f} ms'
    elif min_diff < 60:
        res = f'{min_diff:.2f} s'
    elif min_diff < 3600:
        res = f'{min_diff / 60:.2f} min'
    else:
        res = f'{min_diff / 3600:.2f} h'

    counts_dist = list(seen.values())
    max_per_ts = max(counts_dist)

    print(f'  Rows scanned:              {n_total:,}')
    print(f'  Unique timestamps:         {n_unique:,}')
    print(f'  Duplicate timestamps:      {n_dups:,}  ({dup_pct:.2f}%)')
    print(f'  Approx. finest resolution: {res}')
    print(f'  Events per timestamp:      min={min(counts_dist)}, '
          f'median={int(np.median(counts_dist))}, max={max_per_ts}')

    # Figure: histogram of events per timestamp (capped)
    fig, ax = plt.subplots(figsize=(3.5, 2.2))
    cap = min(max_per_ts, 20)
    plotted = [c for c in counts_dist if c <= cap]
    ax.hist(plotted, bins=min(cap, 50), color=PALETTE[0], alpha=0.85, edgecolor='white')
    ax.set_xlabel('Events per timestamp')
    ax.set_ylabel('Unique timestamps')
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{int(x):,}'))
    fig.tight_layout()
    fig.savefig(output_dir / 'step1_timestamp_quality.png', dpi=DPI)
    plt.close(fig)
    print(f'  Figure → step1_timestamp_quality.png')

    return min_diff


# ── Step 2: Subset overview ───────────────────────────────────────────

def step2_subset_overview(subsets: dict[str, np.ndarray], total_rows: int,
                          invalid_coordinates: int, output_dir: Path):
    print('\n' + '=' * 72)
    print('  Step 2: Multi-scale Dataset Selection')
    print('=' * 72)
    print(f'  Total CSV rows processed: {total_rows:,}\n')
    print(f'  Removed invalid coordinate records: {invalid_coordinates:,}')
    print(f'  Retained records: {total_rows - invalid_coordinates:,}\n')
    print(f'  {"Subset":60s} {"Events":>10s}')
    print(f'  {"─"*60} {"─"*10}')
    for label, ts in subsets.items():
        print(f'  {label:60s} {len(ts):>10,}')
    print(f'\n  Total subsets: {len(subsets)}')


# ── Step 3: Inter-event time analysis ─────────────────────────────────

def step3_interevent_analysis(subsets: dict[str, np.ndarray], output_dir: Path):
    print('\n' + '=' * 72)
    print('  Step 3: Inter-event Time Analysis')
    print('=' * 72)

    results = []
    gap_data: dict[str, np.ndarray] = {}

    for label, ts in subsets.items():
        m = interevent_metrics(ts)
        if m is None:
            print(f'  {label:60s}  SKIP (< 2 events)')
            continue
        gap_data[label] = np.diff(ts)
        results.append((label, m['mean'], m['median'], m['std'], m['cv'], m['b'],
                        m['n'], len(ts)))
        print(f'  {label:60s}  n={len(ts):>9,d}  '
              f'μ={m["mean"]:>12.1f}s  med={m["median"]:>10.1f}s  '
              f'σ={m["std"]:>12.1f}s  CV={m["cv"]:>6.3f}  B={m["b"]:>6.3f}')

    # Summary table
    print('\n  ── Inter-event Time Summary ──')
    print(f'  {"Subset":60s} {"Events":>10s} {"Mean(s)":>13s} '
          f'{"Median(s)":>11s} {"Std(s)":>13s} {"CV":>8s} {"B(IE)":>8s}')
    print(f'  {"─"*60} {"─"*10} {"─"*13} {"─"*11} {"─"*13} {"─"*8} {"─"*8}')
    for label, mu, med, std, cv, b, ng, ne in results:
        print(f'  {label:60s} {ne:>10,d} {mu:>13.1f} {med:>11.1f} '
              f'{std:>13.1f} {cv:>8.3f} {b:>8.3f}')

    # Short labels for plots
    short = {
        'After cleanup': 'Cleaned',
        'Single year (2025)': 'Year',
        'Single month (2025-07)': 'Month',
        'Single day (2025-07-31)': 'Day',
        'Single district (012)': 'District',
        'Single beat (1834)': 'Beat',
        'Single type (Theft)': 'Type',
        'Beat (1834) + Type (Theft)': 'Beat+Type',
    }
    # Fallback: derive from label
    def _short(lbl: str) -> str:
        if lbl in short:
            return short[lbl]
        if lbl.startswith('Single year'):
            return 'Year'
        if lbl.startswith('Single month'):
            return 'Month'
        if lbl.startswith('Single day'):
            return 'Day'
        if lbl.startswith('Single district'):
            return 'District'
        if lbl.startswith('Single beat'):
            return 'Beat'
        if lbl.startswith('Single type'):
            return 'Type'
        if '+' in lbl:
            return 'Beat+Type'
        return lbl

    # Figure: histograms of inter-event times (log x) for key subsets
    key_labels = [
        'After cleanup',
        next((l for l in subsets if l.startswith('Single year')), None),
        next((l for l in subsets if l.startswith('Single month')), None),
        next((l for l in subsets if l.startswith('Single district')), None),
    ]
    key_labels = [k for k in key_labels if k]
    hist_files: list[str] = []
    hist_names = {
        'After cleanup': 'step3_interevent_hist_full.png',
        'Single year (2025)': 'step3_interevent_hist_year.png',
        'Single month (2025-07)': 'step3_interevent_hist_month.png',
        'Single district (012)': 'step3_interevent_hist_district.png',
    }
    for label in key_labels:
        fig, ax = plt.subplots(figsize=(3.5, 2.4))
        gaps = gap_data[label]
        log_gaps = np.log10(gaps[gaps > 0])
        ax.hist(log_gaps, bins=80, color=PALETTE[0], alpha=0.85, edgecolor='none')
        ax.set_title(_short(label))
        ax.set_xlabel('log10 positive inter-event gap (s)')
        ax.set_ylabel('Frequency')
        ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{int(x):,}'))
        fig.tight_layout()
        out_name = hist_names.get(label, f"step3_interevent_hist_{label.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('+', 'plus')}.png")
        fig.savefig(output_dir / out_name, dpi=DPI)
        plt.close(fig)
        hist_files.append(out_name)

    # Figure: boxplot across subsets
    plot_labels, plot_data = [], []
    for label, gaps in gap_data.items():
        if len(gaps) < 3:
            continue
        plot_labels.append(_short(label))
        plot_data.append(np.log10(gaps[gaps > 0]))
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    bp = ax.boxplot(plot_data, vert=True, patch_artist=True, widths=0.6)
    ax.set_xticklabels(plot_labels, rotation=30)
    for patch, color in zip(bp['boxes'], PALETTE[:len(plot_labels)]):
        patch.set_facecolor(color)
        patch.set_alpha(0.5)
    ax.set_ylabel('log10 positive inter-event gap (s)')
    ax.grid(True, axis='y', alpha=0.3)
    fig.tight_layout()
    fig.savefig(output_dir / 'step3_interevent_boxplot.png', dpi=DPI)
    plt.close(fig)
    print(f"\n  Figures → {', '.join(hist_files)}, step3_interevent_boxplot.png")

    return results


# ── Step 4: Event density analysis ────────────────────────────────────

def step4_density_analysis(subsets: dict[str, np.ndarray], output_dir: Path):
    print('\n' + '=' * 72)
    print('  Step 4: Event Density Analysis')
    print('=' * 72)

    bin_sizes_hours = [1, 6, 24, 168]
    bin_labels = ['1 hour', '6 hours', '1 day', '1 week']
    table = []

    for label, ts in subsets.items():
        if len(ts) < 2:
            continue
        t0, t1 = float(ts[0]), float(ts[-1])
        print(f'\n  ── {label} ──')
        for bin_h, bin_lbl in zip(bin_sizes_hours, bin_labels):
            counts = bin_counts(ts, bin_h, t0, t1)
            if len(counts) == 0:
                continue
            m = density_metrics(counts)
            table.append((label, bin_lbl, m))
            print(f'    {bin_lbl:10s}  bins={m["n_bins"]:>7,d}  '
                  f'μ={m["mean"]:>9.2f}  var={m["variance"]:>11.1f}  '
                  f'CV={m["cv"]:>6.3f}  Gini={m["gini"]:>6.3f}  '
                  f'empty={m["empty_pct"]:>5.1f}%')

    # Figures for full dataset
    full_ts = subsets.get('After cleanup', np.array([]))
    if len(full_ts) >= 2:
        t0, t1 = float(full_ts[0]), float(full_ts[-1])

        # Time series per bin size (single column, 4 stacked rows)
        fig, axes = plt.subplots(4, 1, figsize=(5.5, 5.5), sharex=True)
        for ax, bin_h, bin_lbl in zip(axes, bin_sizes_hours, bin_labels):
            counts = bin_counts(full_ts, bin_h, t0, t1)
            bin_edges = np.arange(t0, t1 + 3600 * bin_h, 3600 * bin_h)
            centers = (bin_edges[:-1] + bin_edges[1:]) / 2
            ax.fill_between(centers, counts, alpha=0.4, color=PALETTE[0])
            ax.plot(centers, counts, color=PALETTE[0], linewidth=0.5)
            ax.set_ylabel(f'Counts / {bin_lbl}', fontsize=7)
        axes[-1].set_xlabel('Time')
        fig.tight_layout()
        fig.savefig(output_dir / 'step4_timeseries_fulldataset.png', dpi=DPI)
        plt.close(fig)

        # Density histograms per bin size (1x4 row)
        fig, axes = plt.subplots(1, 4, figsize=(10, 2.4))
        for ax, bin_h, bin_lbl in zip(axes, bin_sizes_hours, bin_labels):
            counts = bin_counts(full_ts, bin_h, t0, t1)
            ax.hist(counts, bins=min(60, len(np.unique(counts))),
                    color=PALETTE[0], alpha=0.85, edgecolor='none')
            ax.set_title(bin_lbl)
            ax.set_xlabel('Events / bin', fontsize=7)
            if ax is axes[0]:
                ax.set_ylabel('Bins')
            ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{int(x):,}'))
        fig.tight_layout()
        fig.savefig(output_dir / 'step4_density_histograms_fulldataset.png', dpi=DPI)
        plt.close(fig)

        # Lorenz curves
        fig, ax = plt.subplots(figsize=(3.5, 3.2))
        for bin_h, bin_lbl, color in zip(bin_sizes_hours, bin_labels, PALETTE):
            counts = bin_counts(full_ts, bin_h, t0, t1)
            if np.sum(counts) == 0:
                continue
            sorted_c = np.sort(counts)
            cum_share = np.cumsum(sorted_c) / np.sum(sorted_c)
            pop_share = np.arange(1, len(cum_share) + 1) / len(cum_share)
            gini = density_metrics(counts)['gini']
            ax.plot(pop_share, cum_share,
                    label=f'{bin_lbl} (G={gini:.2f})',
                    color=color, linewidth=1.0)
        ax.plot([0, 1], [0, 1], 'k--', alpha=0.4, linewidth=0.6, label='Equal')
        ax.set_xlabel('Bin share')
        ax.set_ylabel('Event share')
        ax.legend(loc='lower right')
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        fig.savefig(output_dir / 'step4_lorenz_curves.png', dpi=DPI)
        plt.close(fig)

    print(f'\n  Figures → step4_timeseries_fulldataset.png, '
          f'step4_density_histograms_fulldataset.png, step4_lorenz_curves.png')

    return table


# ── Step 5: Summary ───────────────────────────────────────────────────

def step5_summary(subsets: dict[str, np.ndarray],
                  interevent_results: list,
                  density_table: list, output_dir: Path):
    print('\n' + '=' * 72)
    print('  Step 5: Relationship Between Inter-event Irregularity and Density')
    print('=' * 72)

    ie_cv = {lbl: cv for lbl, _, _, _, cv, _, _, _ in interevent_results}
    ie_b = {lbl: b for lbl, _, _, _, _, b, _, _ in interevent_results}
    den_map = {(lbl, bin_lbl): m for lbl, bin_lbl, m in density_table}

    bin_lbl = '1 day'
    print(f'\n  Summary using {bin_lbl} bins:\n')
    header = (f'  {"Dataset":60s} {"Events":>10s} {"IE-CV":>8s} {"B(IE)":>8s} '
              f'{"Dens-CV":>9s} {"Dens-Gini":>10s}')
    sep = (f'  {"─"*60} {"─"*10} {"─"*8} {"─"*8} {"─"*9} {"─"*10}')
    print(header)
    print(sep)
    for lbl, ts in subsets.items():
        if lbl not in ie_cv:
            continue
        ie = ie_cv.get(lbl, float('nan'))
        ib = ie_b.get(lbl, float('nan'))
        den = den_map.get((lbl, bin_lbl), {})
        dc = den.get('cv', float('nan'))
        dg = den.get('gini', float('nan'))
        print(f'  {lbl:60s} {len(ts):>10,d} {ie:>8.3f} {ib:>8.3f} '
              f'{dc:>9.3f} {dg:>10.3f}')

    # CSV
    csv_path = output_dir / 'step5_summary.csv'
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Dataset', 'Events', 'Interevent_CV', 'B_Interevent',
                         'Density_CV_1d', 'Density_Gini_1d',
                         'Density_CV_1h', 'Density_Gini_1h'])
        for lbl, ts in subsets.items():
            if lbl not in ie_cv:
                continue
            row = [lbl, len(ts), ie_cv[lbl], ie_b[lbl]]
            for bl in ['1 day', '1 hour']:
                d = den_map.get((lbl, bl), {})
                row += [d.get('cv', ''), d.get('gini', '')]
            writer.writerow(row)
    print(f'\n  CSV → step5_summary.csv')

    # Markdown table
    md_path = output_dir / 'step5_summary.md'
    with open(md_path, 'w') as f:
        f.write('# Experiment 1: Multi-scale Summary\n\n')
        f.write('Goh–Barabási burstiness parameter B = (σ−μ)/(σ+μ) is reported\n')
        f.write('for inter-event times only. Binned density is summarised by CV and Gini.\n\n')

        f.write('## All density bin sizes\n\n')
        f.write('| Dataset | Events | IE-CV | B(IE) | '
                'CV (1h) | Gini (1h) | '
                'CV (6h) | Gini (6h) | '
                'CV (1d) | Gini (1d) | '
                'CV (1w) | Gini (1w) |\n')
        f.write('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n')
        for lbl, ts in subsets.items():
            if lbl not in ie_cv:
                continue
            row = [lbl, f'{len(ts):,}', f'{ie_cv[lbl]:.3f}', f'{ie_b[lbl]:.3f}']
            for bl in ['1 hour', '6 hours', '1 day', '1 week']:
                d = den_map.get((lbl, bl), {})
                cv = d.get('cv', float('nan'))
                g = d.get('gini', float('nan'))
                row += [f'{cv:.3f}' if cv == cv else '—',
                        f'{g:.3f}' if g == g else '—']
            f.write('| ' + ' | '.join(row) + ' |\n')

        f.write('\n## Headline (1-day bins)\n\n')
        f.write('| Dataset | Events | IE-CV | B(IE) | Dens-CV (1d) | Dens-Gini (1d) |\n')
        f.write('|---|---:|---:|---:|---:|---:|\n')
        for lbl, ts in subsets.items():
            if lbl not in ie_cv:
                continue
            d = den_map.get((lbl, '1 day'), {})
            cv = d.get('cv', float('nan'))
            g = d.get('gini', float('nan'))
            f.write(f'| {lbl} | {len(ts):,} | {ie_cv[lbl]:.3f} | {ie_b[lbl]:.3f} '
                    f'| {cv:.3f} | {g:.3f} |\n')
    print(f'  MD  → step5_summary.md')


# ── Main ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Experiment 1: Multi-scale Analysis of Temporal Event Distributions',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', help='Path to crime CSV')
    parser.add_argument('--output-dir', default=str(DEFAULT_OUTPUT),
                        help=f'Output directory (default: {DEFAULT_OUTPUT})')
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print('=' * 72)
    print('  Experiment 1: Multi-scale Analysis of Temporal Event Distributions')
    print('=' * 72)

    # Detect format
    print(f'\n  Loading {args.csv_path} ...')
    fmt = detect_format(args.csv_path)
    print(f'  Detected format: {fmt["name"]}')

    # Determine anchors
    print('  Sampling to determine subset anchors ...')
    anchors = determine_anchors(args.csv_path, fmt)
    print(f'  Year/Month/Day anchor: {anchors["year"]}/{anchors["month"]:02d}/{anchors["day"]:02d}')
    print(f'  Top type:     {anchors["top_type"]}')
    print(f'  Top district: {anchors["top_district"]}')
    print(f'  Top beat:     {anchors["top_beat"]}')

    # Stream and collect subsets
    print('\n  Streaming CSV to build subsets ...')
    subsets_raw, total_rows, invalid_coordinates = load_subsets(args.csv_path, fmt, anchors)
    subsets = labelled_subsets(subsets_raw, anchors)
    print(f'  Processed {total_rows:,} rows.')
    print(f'  Removed {invalid_coordinates:,} records with invalid coordinate values.')
    print(f'  Retained {total_rows - invalid_coordinates:,} records after cleanup.')

    # ── Step 1 ──
    step1_timestamp_quality(args.csv_path, fmt, anchors, total_rows, output_dir)

    # ── Step 2 ──
    step2_subset_overview(subsets, total_rows, invalid_coordinates, output_dir)

    # ── Step 3 ──
    interevent_results = step3_interevent_analysis(subsets, output_dir)

    # ── Step 4 ──
    density_table = step4_density_analysis(subsets, output_dir)

    # ── Step 5 ──
    step5_summary(subsets, interevent_results, density_table, output_dir)

    print('\n' + '=' * 72)
    print('  Experiment complete.')
    print(f'  Output directory: {output_dir}')
    print('=' * 72)


if __name__ == '__main__':
    main()

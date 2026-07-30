#!/usr/bin/env python3
"""Render two-week KDE parameter comparisons over the Chicago crime data.

The script mirrors the standalone STKDE coordinate space and KDE semantics:
events are projected into the [-50, 50] scene extent, smoothed on a regular
grid, normalized per interval, and rendered as a cell-respecting field.

Outputs are intentionally written to the ignored scripts/output directory:

    interval_metrics.csv
    selected_intervals.csv
    parameter_sweep_*.png
    recommended_contact_sheet.png
    evolution_*.png
    evolution_sequence.csv

Usage:
    python scripts/kde_2week_parameter_sweep.py
    python scripts/kde_2week_parameter_sweep.py --max-intervals 6
"""

from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
import pandas as pd
from scipy.ndimage import gaussian_filter, label, maximum_filter


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = PROJECT_ROOT / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'
DEFAULT_OUTPUT = PROJECT_ROOT / 'scripts' / 'output' / 'kde_2week_sweep'

GRID_MIN = -50.0
GRID_MAX = 50.0
SCENE_SPAN_METERS = 10_000.0
WINDOW_DAYS = 14
ORIGIN = np.datetime64('2000-12-21')
WEST, EAST = -87.725, -87.605
SOUTH, NORTH = 41.835, 41.920
KERNEL_RADIUS = 4

FIELD_CMAP = LinearSegmentedColormap.from_list(
    'stkde_field',
    [
        (0.00, '#071836'),
        (0.25, '#084e6e'),
        (0.50, '#0e94a3'),
        (0.75, '#22d3ee'),
        (0.90, '#fde047'),
        (1.00, '#fff7cc'),
    ],
)
FIELD_CMAP.set_bad((0, 0, 0, 0))


@dataclass(frozen=True)
class Interval:
    index: int
    start: pd.Timestamp
    end: pd.Timestamp
    support: np.ndarray

    @property
    def events(self) -> int:
        return int(self.support.sum())


def smoothing_meters_to_sigma_cells(smoothing_meters: float, grid_size: int) -> float:
    return max(0.1, max(1.0, smoothing_meters) / (SCENE_SPAN_METERS / max(4, grid_size)))


def project_to_scene(lat: np.ndarray, lon: np.ndarray, grid_size: int) -> tuple[np.ndarray, np.ndarray]:
    x = GRID_MIN + ((lon - WEST) / (EAST - WEST)) * 96.0
    z = GRID_MIN + ((NORTH - lat) / (NORTH - SOUTH)) * 96.0
    cols = np.clip(((x - GRID_MIN) / (GRID_MAX - GRID_MIN) * grid_size).astype(np.int64), 0, grid_size - 1)
    rows = np.clip(((z - GRID_MIN) / (GRID_MAX - GRID_MIN) * grid_size).astype(np.int64), 0, grid_size - 1)
    return rows, cols


def load_two_week_supports(input_csv: Path, grid_size: int) -> tuple[dict[int, np.ndarray], np.datetime64 | None]:
    """Aggregate bounded events into fixed two-week support grids."""
    supports: dict[int, np.ndarray] = {}
    latest_day: np.datetime64 | None = None
    usecols = ['Date', 'Latitude', 'Longitude']

    for chunk in pd.read_csv(input_csv, usecols=usecols, chunksize=250_000, low_memory=False):
        dates = pd.to_datetime(chunk['Date'], format='%m/%d/%Y %I:%M:%S %p', errors='coerce')
        lat = pd.to_numeric(chunk['Latitude'], errors='coerce')
        lon = pd.to_numeric(chunk['Longitude'], errors='coerce')
        valid = dates.notna() & lat.notna() & lon.notna()
        if not valid.any():
            continue

        dates_np = dates[valid].to_numpy().astype('datetime64[D]')
        lat_np = lat[valid].to_numpy()
        lon_np = lon[valid].to_numpy()
        bounded = (
            (lat_np >= SOUTH) & (lat_np <= NORTH) &
            (lon_np >= WEST) & (lon_np <= EAST)
        )
        if not bounded.any():
            continue

        dates_np = dates_np[bounded]
        chunk_latest = dates_np.max()
        if latest_day is None or chunk_latest > latest_day:
            latest_day = chunk_latest
        rows, cols = project_to_scene(lat_np[bounded], lon_np[bounded], grid_size)
        interval_indices = ((dates_np - ORIGIN) / np.timedelta64(1, 'D')).astype(np.int64) // WINDOW_DAYS

        for interval_index in np.unique(interval_indices):
            selected = interval_indices == interval_index
            support = supports.setdefault(int(interval_index), np.zeros((grid_size, grid_size), dtype=np.float64))
            np.add.at(support, (rows[selected], cols[selected]), 1)

    return supports, latest_day


def compute_field(
    support: np.ndarray,
    smoothing_meters: float,
    grid_size: int,
) -> tuple[np.ndarray, float, np.ndarray]:
    sigma_cells = smoothing_meters_to_sigma_cells(smoothing_meters, grid_size)
    smoothed = gaussian_filter(
        support,
        sigma=sigma_cells,
        radius=KERNEL_RADIUS,
        mode='constant',
        cval=0,
    )
    max_value = float(smoothed.max())
    normalized = smoothed / max(1.0, max_value)
    return normalized, sigma_cells, smoothed


def interval_metrics(support: np.ndarray, grid_size: int) -> dict[str, float | int]:
    occupied = support > 0
    total = float(support.sum())
    values = support.ravel()
    if total <= 0:
        return {
            'events': 0,
            'occupied_cells': 0,
            'occupied_ratio': 0.0,
            'peak_share': 0.0,
            'gini': 0.0,
        }

    ordered = np.sort(values)
    cumulative = np.cumsum(ordered)
    n = len(ordered)
    gini = float((2 * np.sum((np.arange(1, n + 1)) * ordered) / (n * total)) - ((n + 1) / n))
    return {
        'events': int(total),
        'occupied_cells': int(occupied.sum()),
        'occupied_ratio': float(occupied.mean()),
        'peak_share': float(values.max() / total),
        'gini': gini,
    }


def field_metrics(field: np.ndarray, cutoff: float) -> dict[str, float | int]:
    active = field > cutoff
    local_maxima = (
        (field == maximum_filter(field, size=5, mode='constant')) &
        (field >= max(cutoff, 0.15))
    )
    _, component_count = label(active)
    nonzero = field[field > 0]
    return {
        'active_ratio': float(active.mean()),
        'p95': float(np.percentile(nonzero, 95)) if len(nonzero) else 0.0,
        'p99': float(np.percentile(nonzero, 99)) if len(nonzero) else 0.0,
        'local_maxima': int(local_maxima.sum()),
        'components': int(component_count),
    }


def interval_timestamp(index: int) -> tuple[pd.Timestamp, pd.Timestamp]:
    start = pd.Timestamp(ORIGIN.astype('datetime64[ns]')) + pd.Timedelta(days=index * WINDOW_DAYS)
    return start, start + pd.Timedelta(days=WINDOW_DAYS)


def select_intervals(
    supports: dict[int, np.ndarray],
    latest_day: np.datetime64 | None,
    max_intervals: int,
    grid_size: int,
) -> list[Interval]:
    rows = []
    for index, support in supports.items():
        start, end = interval_timestamp(index)
        rows.append({'index': index, 'start': start, 'end': end, **interval_metrics(support, grid_size)})
    frame = pd.DataFrame(rows).sort_values('start').reset_index(drop=True)
    if latest_day is not None:
        latest_timestamp = pd.Timestamp(latest_day.astype('datetime64[ns]'))
        frame = frame[frame['end'] <= latest_timestamp + pd.Timedelta(days=1)].reset_index(drop=True)
    if frame.empty:
        return []

    targets = np.linspace(0.05, 0.95, max(3, max_intervals - 2))
    selected: list[int] = []
    for target in targets:
        desired = frame['events'].quantile(float(target))
        candidate = int((frame['events'] - desired).abs().idxmin())
        selected.append(int(frame.loc[candidate, 'index']))

    for metric in ['gini', 'peak_share']:
        selected.append(int(frame.loc[frame[metric].idxmax(), 'index']))

    unique = []
    for index in selected:
        if index not in unique:
            unique.append(index)
    unique = unique[:max_intervals]
    return [
        Interval(index=index, start=interval_timestamp(index)[0], end=interval_timestamp(index)[1], support=supports[index])
        for index in unique
    ]


def select_evolution_sequence(
    supports: dict[int, np.ndarray],
    latest_day: np.datetime64 | None,
    sequence_length: int,
) -> list[Interval]:
    """Select contiguous complete windows around the busiest complete interval."""
    candidates = []
    latest_timestamp = (
        pd.Timestamp(latest_day.astype('datetime64[ns]'))
        if latest_day is not None
        else None
    )
    for index, support in supports.items():
        start, end = interval_timestamp(index)
        if latest_timestamp is not None and end > latest_timestamp + pd.Timedelta(days=1):
            continue
        candidates.append((index, support))
    if not candidates:
        return []

    anchor = max(candidates, key=lambda item: item[1].sum())[0]
    all_indices = {index for index, _ in candidates}
    length = max(2, min(sequence_length, len(all_indices)))
    min_index = min(all_indices)
    max_index = max(all_indices)
    start_index = max(min_index, min(anchor - length // 2, max_index - length + 1))
    sequence_indices = [start_index + offset for offset in range(length)]
    sequence_indices = [index for index in sequence_indices if index in supports and index in all_indices]
    return [
        Interval(index=index, start=interval_timestamp(index)[0], end=interval_timestamp(index)[1], support=supports[index])
        for index in sequence_indices
    ]


def render_panel(
    ax,
    interval: Interval,
    grid_size: int,
    smoothing_meters: int,
    cutoff: float,
    title_prefix: str = '',
    color_max: float | None = None,
) -> dict[str, float | int]:
    field, sigma_cells, raw_field = compute_field(interval.support, smoothing_meters, grid_size)
    display_field = raw_field / max(1.0, color_max) if color_max is not None else field
    masked = np.ma.masked_where(field <= cutoff, display_field)
    metrics = field_metrics(field, cutoff)
    ax.set_facecolor('#061123')
    ax.imshow(
        masked,
        origin='lower',
        extent=(GRID_MIN, GRID_MAX, GRID_MIN, GRID_MAX),
        cmap=FIELD_CMAP,
        vmin=0,
        vmax=1,
        interpolation='nearest',
        alpha=0.96,
    )
    # A small event sample keeps the relationship between points and field visible.
    rows, cols = np.nonzero(interval.support)
    if len(rows) > 0:
        weights = interval.support[rows, cols]
        repeats = np.minimum(weights.astype(int), 4)
        event_x = np.repeat(GRID_MIN + (cols + 0.5) * (GRID_MAX - GRID_MIN) / grid_size, repeats)
        event_z = np.repeat(GRID_MIN + (rows + 0.5) * (GRID_MAX - GRID_MIN) / grid_size, repeats)
        ax.scatter(event_x, event_z, s=1.2, c='#ffffff', alpha=0.08, linewidths=0, rasterized=True)
    ax.contour(field, levels=[cutoff], extent=(GRID_MIN, GRID_MAX, GRID_MIN, GRID_MAX), colors='#fff7cc', linewidths=0.45, alpha=0.55)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(
        f'{title_prefix} {grid_size}g / {smoothing_meters}m / {cutoff:.0%}\n'
        f'{metrics["active_ratio"]:.0%} active · {metrics["components"]} regions · {metrics["local_maxima"]} peaks',
        fontsize=7.5,
        color='#d8e8f5',
        pad=4,
    )
    for spine in ax.spines.values():
        spine.set_color('#193555')
        spine.set_linewidth(0.7)
    return {'sigma_cells': sigma_cells, **metrics}


def render_parameter_grid(interval: Interval, output_path: Path) -> None:
    grids = [48, 104]
    smoothing_values = [100, 150, 250]
    cutoffs = [0.10, 0.20, 0.30]
    fig, axes = plt.subplots(6, 3, figsize=(9.6, 15.2), facecolor='#030b18')
    axes = np.asarray(axes)
    panel_index = 0
    for grid_size in grids:
        for smoothing_meters in smoothing_values:
            for cutoff_index, cutoff in enumerate(cutoffs):
                ax = axes[panel_index, cutoff_index]
                if cutoff_index == 0:
                    ax.set_ylabel(f'{grid_size} grid\n{smoothing_meters}m', color='#8aa5bf', fontsize=8, rotation=90, labelpad=12)
                render_panel(ax, interval, grid_size, smoothing_meters, cutoff)
            panel_index += 1
    fig.suptitle(
        f'KDE parameter sweep · {interval.start:%Y-%m-%d} to {interval.end:%Y-%m-%d}\n'
        f'{interval.events:,} bounded events · kernel radius {KERNEL_RADIUS} cells',
        color='#f5f9fc',
        fontsize=13,
        y=0.995,
    )
    fig.tight_layout(rect=(0.04, 0, 1, 0.965), h_pad=1.1, w_pad=0.6)
    fig.savefig(output_path, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)


def render_evolution_grid(
    intervals: list[Interval],
    grid_size: int,
    smoothing_meters: int,
    cutoff: float,
    output_path: Path,
) -> None:
    """Render a contiguous sequence with one shared absolute color scale."""
    raw_fields = [compute_field(interval.support, smoothing_meters, grid_size)[2] for interval in intervals]
    color_max = max((float(field.max()) for field in raw_fields), default=1.0)
    columns = 3
    rows = math.ceil(len(intervals) / columns)
    fig, axes = plt.subplots(rows, columns, figsize=(10.2, max(3.5, rows * 3.1)), facecolor='#030b18')
    axes = np.atleast_1d(axes).ravel()
    for index, interval in enumerate(intervals):
        render_panel(
            axes[index],
            interval,
            grid_size,
            smoothing_meters,
            cutoff,
            title_prefix=f'{interval.start:%Y-%m-%d}',
            color_max=color_max,
        )
    for ax in axes[len(intervals):]:
        ax.axis('off')
    fig.suptitle(
        f'KDE evolution · {grid_size} grid / {smoothing_meters}m / {cutoff:.0%}\n'
        'six contiguous two-week windows · shared absolute color scale · per-window cutoff',
        color='#f5f9fc',
        fontsize=13,
        y=0.995,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.955), h_pad=1.0, w_pad=0.7)
    fig.savefig(output_path, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)


def render_recommended_contact_sheet(intervals: list[Interval], output_path: Path) -> None:
    combinations = [
        (48, 150, 0.20, 'coarse / balanced'),
        (104, 150, 0.20, 'fine / balanced'),
        (104, 250, 0.20, 'fine / broad'),
        (104, 150, 0.30, 'fine / selective'),
    ]
    fig, axes = plt.subplots(len(intervals), len(combinations), figsize=(12, max(3.2, len(intervals) * 2.2)), facecolor='#030b18')
    axes = np.atleast_2d(axes)
    for row, interval in enumerate(intervals):
        for col, (grid_size, smoothing_meters, cutoff, label_text) in enumerate(combinations):
            title = f'{interval.start:%Y-%m-%d}\n{label_text}' if row == 0 else ''
            render_panel(axes[row, col], interval, grid_size, smoothing_meters, cutoff, title)
        axes[row, 0].set_ylabel(f'{interval.events:,} events', color='#8aa5bf', fontsize=8, labelpad=10)
    fig.suptitle('Two-week KDE comparison sheet · same scale, different renderer parameters', color='#f5f9fc', fontsize=13, y=0.998)
    fig.tight_layout(rect=(0.04, 0, 1, 0.975), h_pad=0.65, w_pad=0.35)
    fig.savefig(output_path, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)


def write_metrics(supports: dict[int, np.ndarray], output_path: Path) -> None:
    rows = []
    for index, support in sorted(supports.items()):
        start, end = interval_timestamp(index)
        rows.append({'interval_index': index, 'start': start.isoformat(), 'end': end.isoformat(), **interval_metrics(support, support.shape[0])})
    pd.DataFrame(rows).to_csv(output_path, index=False)


def write_evolution_sequence(intervals: list[Interval], output_path: Path) -> None:
    pd.DataFrame([
        {
            'sequence_position': position,
            'interval_index': interval.index,
            'start': interval.start.isoformat(),
            'end': interval.end.isoformat(),
            'events': interval.events,
        }
        for position, interval in enumerate(intervals, start=1)
    ]).to_csv(output_path, index=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Render two-week KDE parameter comparison figures.')
    parser.add_argument('--input-csv', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--grid', type=int, default=104, help='Grid used for interval selection metrics.')
    parser.add_argument('--max-intervals', type=int, default=6, help='Number of representative intervals to render.')
    parser.add_argument('--evolution-weeks', type=int, default=6, help='Number of contiguous two-week windows in each evolution image.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    supports, latest_day = load_two_week_supports(args.input_csv, args.grid)
    if not supports:
        raise SystemExit('No bounded events found.')

    write_metrics(supports, args.output_dir / 'interval_metrics.csv')
    intervals = select_intervals(supports, latest_day, args.max_intervals, args.grid)
    with (args.output_dir / 'selected_intervals.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=['interval_index', 'start', 'end', 'events'])
        writer.writeheader()
        for interval in intervals:
            writer.writerow({
                'interval_index': interval.index,
                'start': interval.start.isoformat(),
                'end': interval.end.isoformat(),
                'events': interval.events,
            })

    for interval in intervals:
        filename = f'parameter_sweep_{interval.start:%Y%m%d}_{interval.index:04d}.png'
        render_parameter_grid(interval, args.output_dir / filename)

    render_recommended_contact_sheet(intervals, args.output_dir / 'recommended_contact_sheet.png')
    evolution_intervals = select_evolution_sequence(supports, latest_day, args.evolution_weeks)
    write_evolution_sequence(evolution_intervals, args.output_dir / 'evolution_sequence.csv')
    for grid_size in [48, 104]:
        for smoothing_meters in [100, 150, 250]:
            for cutoff in [0.10, 0.20, 0.30]:
                filename = f'evolution_{grid_size}g_{smoothing_meters}m_{int(cutoff * 100):02d}pct.png'
                render_evolution_grid(
                    evolution_intervals,
                    grid_size,
                    smoothing_meters,
                    cutoff,
                    args.output_dir / filename,
                )

    print(f'Wrote {len(intervals)} interval sweep images to {args.output_dir}')
    print(f'Wrote {len(evolution_intervals)} contiguous evolution windows and 18 evolution images')
    print(f'Wrote {args.output_dir / "recommended_contact_sheet.png"}')


if __name__ == '__main__':
    main()

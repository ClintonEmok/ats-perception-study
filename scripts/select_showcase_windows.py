#!/usr/bin/env python3
"""Select multiple showcase windows from the full crime dataset.

The script scans the source CSV in chunks, aggregates events to hourly counts,
then ranks rolling windows by temporal variability (CV) and peak ratio.

Default output: ten non-overlapping windows for each of 1-day, 14-day,
30-day, and 90-day spans.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


DEFAULT_CSV = Path('data/sources/Crimes_-_2001_to_Present_20260114.csv')
DEFAULT_OUTPUT = Path('scripts/output/showcase_windows.csv')


def build_hourly_series(csv_path: Path, chunksize: int = 250_000) -> pd.Series:
    """Read the CSV in chunks and aggregate rows to hourly counts."""

    hour_counts: dict[pd.Timestamp, int] = {}
    min_ts: pd.Timestamp | None = None
    max_ts: pd.Timestamp | None = None

    date_format = '%m/%d/%Y %I:%M:%S %p'

    for chunk in pd.read_csv(
        csv_path,
        usecols=['Date'],
        dtype={'Date': 'string'},
        chunksize=chunksize,
        na_values={'': None},
    ):
        parsed = pd.to_datetime(chunk['Date'], format=date_format, errors='coerce')
        parsed = parsed.dropna().dt.floor('h')
        if parsed.empty:
            continue

        counts = parsed.value_counts()
        for ts, count in counts.items():
            hour_counts[ts] = hour_counts.get(ts, 0) + int(count)

        local_min = parsed.min()
        local_max = parsed.max()
        min_ts = local_min if min_ts is None else min(min_ts, local_min)
        max_ts = local_max if max_ts is None else max(max_ts, local_max)

    if min_ts is None or max_ts is None:
        raise ValueError('No valid timestamps found in the input CSV.')

    index = pd.date_range(min_ts, max_ts, freq='1h')
    values = [hour_counts.get(ts, 0) for ts in index]
    return pd.Series(values, index=index)


def collect_real_windows(hourly: pd.Series, window_hours: int, step_hours: int) -> list[dict]:
    windows: list[dict] = []
    values = hourly.values.astype(float)
    index = hourly.index

    for start in range(0, len(values) - window_hours + 1, step_hours):
        segment = values[start:start + window_hours]
        total = float(segment.sum())
        if total <= 0:
            continue

        mean = float(segment.mean())
        std = float(segment.std())
        cv = std / mean if mean > 0 else 0.0
        peak_ratio = float(segment.max() / mean) if mean > 0 else 0.0
        windows.append({
            'start': index[start],
            'end': index[start + window_hours - 1] + pd.Timedelta(hours=1),
            'cv': cv,
            'peak_ratio': peak_ratio,
            'total': total,
            'counts': segment,
        })

    return windows


def pick_distinct_windows(
    windows: list[dict],
    count: int,
    min_gap_hours: int,
) -> list[dict]:
    if not windows:
        return []

    ranked = sorted(windows, key=lambda row: (row['cv'], row['peak_ratio'], row['total']), reverse=True)
    target_indices = [round(i * (len(ranked) - 1) / max(count - 1, 1)) for i in range(count)]
    selected: list[dict] = []

    def far_enough(candidate: dict) -> bool:
        for existing in selected:
            delta_hours = abs((candidate['start'] - existing['start']).total_seconds()) / 3600
            if delta_hours < min_gap_hours:
                return False
        return True

    for target_index in target_indices:
        candidate = ranked[max(0, min(len(ranked) - 1, target_index))]
        if far_enough(candidate):
            selected.append(candidate)
            continue

        for offset in range(1, len(ranked)):
            for probe in (target_index - offset, target_index + offset):
                if 0 <= probe < len(ranked):
                    alternative = ranked[probe]
                    if far_enough(alternative):
                        selected.append(alternative)
                        break
            else:
                continue
            break

    return selected


def summarize_window(window: dict) -> dict[str, str]:
    return {
        'start': window['start'].date().isoformat(),
        'end': window['end'].date().isoformat(),
        'cv': f"{window['cv']:.3f}",
        'peak_ratio': f"{window['peak_ratio']:.3f}",
        'total_events': str(int(window['total'])),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Select multiple showcase windows from the full dataset.')
    parser.add_argument('--csv-path', type=Path, default=DEFAULT_CSV, help=f'Input CSV (default: {DEFAULT_CSV})')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT, help=f'Output CSV (default: {DEFAULT_OUTPUT})')
    parser.add_argument('--window-days', type=int, nargs='+', default=[1, 14, 30, 90], help='Window lengths in days')
    parser.add_argument('--count', type=int, default=10, help='Number of windows to keep per length')
    parser.add_argument('--step-days', type=int, default=7, help='Rolling step in days')
    args = parser.parse_args()

    hourly = build_hourly_series(args.csv_path)
    rows: list[dict[str, str]] = []

    for window_days in args.window_days:
        window_hours = 24 * window_days
        step_hours = 24 * args.step_days
        windows = collect_real_windows(hourly, window_hours=window_hours, step_hours=step_hours)
        selected = pick_distinct_windows(windows, count=args.count, min_gap_hours=window_hours // 2)

        if not selected:
            continue

        for rank, window in enumerate(selected, start=1):
            row = {
                'window_days': str(window_days),
                'rank': str(rank),
                **summarize_window(window),
            }
            rows.append(row)

    if not rows:
        raise RuntimeError('No showcase windows were selected.')

    args.output.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(args.output, index=False)

    print(f'Saved showcase windows to {args.output}')
    print('')
    for row in rows:
        print(
            f"{row['window_days']:>2}d #{row['rank']}: {row['start']} -> {row['end']} | "
            f"CV={row['cv']} | peak/mean={row['peak_ratio']} | events={row['total_events']}"
        )


if __name__ == '__main__':
    main()

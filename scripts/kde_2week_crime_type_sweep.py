#!/usr/bin/env python3
"""Run the two-week KDE evolution experiment separately by crime type.

This is a separate crime-type exploration entry point. It keeps the original
all-crime sweep unchanged while reusing its field renderer and plotting
helpers. Each crime type receives its own output directory and evolution
sequence, making spatial-temporal differences easier to compare.

Usage:
    python scripts/kde_2week_crime_type_sweep.py
    python scripts/kde_2week_crime_type_sweep.py \
        --crime-types THEFT,BATTERY,ROBBERY \
        --grids 96,104,112
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd

from kde_2week_parameter_sweep import (
    DEFAULT_INPUT,
    DEFAULT_OUTPUT,
    EAST,
    NORTH,
    ORIGIN,
    SOUTH,
    WEST,
    Interval,
    interval_timestamp,
    parse_float_values,
    parse_int_values,
    project_to_scene,
    render_evolution_grid,
    select_evolution_sequence,
    write_evolution_sequence,
)


DEFAULT_CRIME_TYPES = [
    'THEFT',
    'BATTERY',
    'CRIMINAL DAMAGE',
    'NARCOTICS',
    'ASSAULT',
    'BURGLARY',
]


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def load_two_week_supports_by_type(
    input_csv: Path,
    grid_size: int,
    crime_types: list[str],
) -> tuple[dict[str, dict[int, np.ndarray]], np.datetime64 | None]:
    """Scan the source once and aggregate requested types into support grids."""
    normalized_types = [crime_type.strip().upper() for crime_type in crime_types if crime_type.strip()]
    supports_by_type = {crime_type: {} for crime_type in normalized_types}
    latest_day: np.datetime64 | None = None

    for chunk in pd.read_csv(
        input_csv,
        usecols=['Date', 'Latitude', 'Longitude', 'Primary Type'],
        chunksize=250_000,
        low_memory=False,
    ):
        dates = pd.to_datetime(chunk['Date'], format='%m/%d/%Y %I:%M:%S %p', errors='coerce')
        lat = pd.to_numeric(chunk['Latitude'], errors='coerce')
        lon = pd.to_numeric(chunk['Longitude'], errors='coerce')
        types = chunk['Primary Type'].fillna('').astype(str).str.strip().str.upper()
        valid = dates.notna() & lat.notna() & lon.notna() & types.ne('')
        if not valid.any():
            continue

        dates_np = dates[valid].to_numpy().astype('datetime64[D]')
        lat_np = lat[valid].to_numpy()
        lon_np = lon[valid].to_numpy()
        types_np = types[valid].to_numpy()
        bounded = (
            (lat_np >= SOUTH) & (lat_np <= NORTH) &
            (lon_np >= WEST) & (lon_np <= EAST)
        )
        if not bounded.any():
            continue

        dates_np = dates_np[bounded]
        lat_np = lat_np[bounded]
        lon_np = lon_np[bounded]
        types_np = types_np[bounded]
        chunk_latest = dates_np.max()
        if latest_day is None or chunk_latest > latest_day:
            latest_day = chunk_latest

        rows, cols = project_to_scene(lat_np, lon_np, grid_size)
        interval_indices = ((dates_np - ORIGIN) / np.timedelta64(1, 'D')).astype(np.int64) // 14

        for crime_type in normalized_types:
            selected_type = types_np == crime_type
            if not selected_type.any():
                continue
            for interval_index in np.unique(interval_indices[selected_type]):
                selected = selected_type & (interval_indices == interval_index)
                support = supports_by_type[crime_type].setdefault(
                    int(interval_index),
                    np.zeros((grid_size, grid_size), dtype=np.float64),
                )
                np.add.at(support, (rows[selected], cols[selected]), 1)

    return supports_by_type, latest_day


def intervals_from_indices(
    supports: dict[int, np.ndarray],
    indices: list[int],
) -> list[Interval]:
    return [
        Interval(
            index=index,
            start=interval_timestamp(index)[0],
            end=interval_timestamp(index)[1],
            support=supports[index],
        )
        for index in indices
        if index in supports
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run two-week KDE evolution by crime type.')
    parser.add_argument('--input-csv', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT.parent / 'kde_2week_crime_type_sweep')
    parser.add_argument('--crime-types', default=','.join(DEFAULT_CRIME_TYPES))
    parser.add_argument('--grids', default='104')
    parser.add_argument('--smoothing', default='150,250')
    parser.add_argument('--cutoffs', default='0.20,0.25,0.30')
    parser.add_argument('--evolution-weeks', type=int, default=6)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    crime_types = [value.strip().upper() for value in args.crime_types.split(',') if value.strip()]
    grids = parse_int_values(args.grids)
    smoothing_values = parse_int_values(args.smoothing)
    cutoffs = parse_float_values(args.cutoffs)
    if not crime_types:
        raise SystemExit('No crime types supplied.')

    args.output_dir.mkdir(parents=True, exist_ok=True)
    sequence_indices_by_type: dict[str, list[int]] = {}

    for grid_position, grid_size in enumerate(grids):
        supports_by_type, latest_day = load_two_week_supports_by_type(args.input_csv, grid_size, crime_types)
        for crime_type in crime_types:
            supports = supports_by_type[crime_type]
            if not supports:
                print(f'Skipping {crime_type}: no bounded events found')
                continue

            if grid_position == 0:
                sequence = select_evolution_sequence(supports, latest_day, args.evolution_weeks)
                sequence_indices_by_type[crime_type] = [interval.index for interval in sequence]
            sequence = intervals_from_indices(supports, sequence_indices_by_type[crime_type])
            if not sequence:
                continue

            type_dir = args.output_dir / slugify(crime_type)
            type_dir.mkdir(parents=True, exist_ok=True)
            if grid_position == 0:
                write_evolution_sequence(sequence, type_dir / 'evolution_sequence.csv')

            for smoothing_meters in smoothing_values:
                for cutoff in cutoffs:
                    filename = f'evolution_{grid_size}g_{smoothing_meters}m_{int(cutoff * 100):02d}pct.png'
                    render_evolution_grid(
                        sequence,
                        grid_size,
                        smoothing_meters,
                        cutoff,
                        type_dir / filename,
                    )

            print(f'{crime_type}: {sequence[0].start:%Y-%m-%d} to {sequence[-1].end:%Y-%m-%d} · {sum(interval.events for interval in sequence):,} sequence events')

    print(f'Wrote crime-type KDE evolution outputs to {args.output_dir}')


if __name__ == '__main__':
    main()

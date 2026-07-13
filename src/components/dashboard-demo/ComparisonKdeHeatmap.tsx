'use client';

import { useMemo } from 'react';
import type { KdeCell, SliceKdeResult } from '@/lib/kde';

type ColorScheme = 'blue' | 'orange';

const GRID_SIZE = 32;
const PIXEL_SIZE = 4;
const VIEWPORT_SIZE = GRID_SIZE * PIXEL_SIZE;

const COLOR_STOPS: Record<ColorScheme, Array<{ stop: number; rgb: [number, number, number] }>> = {
  blue: [
    { stop: 0, rgb: [15, 23, 42] },
    { stop: 0.15, rgb: [30, 58, 138] },
    { stop: 0.4, rgb: [37, 99, 235] },
    { stop: 0.7, rgb: [96, 165, 250] },
    { stop: 1, rgb: [219, 234, 254] },
  ],
  orange: [
    { stop: 0, rgb: [15, 23, 42] },
    { stop: 0.15, rgb: [124, 45, 18] },
    { stop: 0.4, rgb: [234, 88, 12] },
    { stop: 0.7, rgb: [251, 146, 60] },
    { stop: 1, rgb: [254, 215, 170] },
  ],
};

function interpolateColor(intensity: number, scheme: ColorScheme): [number, number, number] {
  const stops = COLOR_STOPS[scheme];
  const t = Math.min(1, Math.max(0, intensity));

  let left = stops[0];
  let right = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i];
    const next = stops[i + 1];
    if (t >= current.stop && t <= next.stop) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(0.0001, right.stop - left.stop);
  const localT = (t - left.stop) / span;
  return [
    Math.round(left.rgb[0] + (right.rgb[0] - left.rgb[0]) * localT),
    Math.round(left.rgb[1] + (right.rgb[1] - left.rgb[1]) * localT),
    Math.round(left.rgb[2] + (right.rgb[2] - left.rgb[2]) * localT),
  ];
}

function buildCellIntensityGrid(cells: KdeCell[]): Float32Array {
  const grid = new Float32Array(GRID_SIZE * GRID_SIZE);
  for (const cell of cells) {
    const col = Math.min(
      GRID_SIZE - 1,
      Math.max(0, Math.floor((cell.x + 50) / (100 / GRID_SIZE))),
    );
    const row = Math.min(
      GRID_SIZE - 1,
      Math.max(0, Math.floor((cell.z + 50) / (100 / GRID_SIZE))),
    );
    const idx = row * GRID_SIZE + col;
    if (cell.intensity > grid[idx]) grid[idx] = cell.intensity;
  }
  return grid;
}

export interface ComparisonKdeHeatmapProps {
  kde?: SliceKdeResult;
  label: string;
  crimeCount: number;
  colorScheme: ColorScheme;
  isLoading?: boolean;
  size?: number;
}

export function ComparisonKdeHeatmap({
  kde,
  label,
  crimeCount,
  colorScheme,
  isLoading = false,
  size = VIEWPORT_SIZE,
}: ComparisonKdeHeatmapProps) {
  const grid = useMemo(() => (kde ? buildCellIntensityGrid(kde.cells) : null), [kde]);
  const backgroundFill = useMemo(() => `rgb(${interpolateColor(0, colorScheme).join(',')})`, [colorScheme]);

  return (
    <figure className="rounded-lg border border-border/70 bg-card/60 p-2">
      <figcaption className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {crimeCount.toLocaleString()} events
        </span>
      </figcaption>

      <div
        className="relative overflow-hidden rounded-md border border-border/70"
        style={{ width: size, height: size }}
      >
        {isLoading || !grid ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-[10px] text-muted-foreground">
            {isLoading ? 'Loading…' : 'No data'}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
            width={size}
            height={size}
            shapeRendering="crispEdges"
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${label} KDE heatmap`}
          >
            <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill={backgroundFill} />
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
              const intensity = grid[idx];
              if (intensity <= 0) return null;
              const row = Math.floor(idx / GRID_SIZE);
              const col = idx % GRID_SIZE;
              const [r, g, b] = interpolateColor(intensity, colorScheme);
              return (
                <rect
                  key={idx}
                  x={col * PIXEL_SIZE}
                  y={row * PIXEL_SIZE}
                  width={PIXEL_SIZE}
                  height={PIXEL_SIZE}
                  fill={`rgb(${r},${g},${b})`}
                />
              );
            })}
          </svg>
        )}
      </div>
    </figure>
  );
}

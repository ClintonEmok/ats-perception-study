'use client';

import { useMemo } from 'react';
import type { KdeCell } from '@/lib/kde';
import {
  buildSparseKdeGrid,
  COMPARISON_GRID_SIZE,
} from './lib/compare-sparse-surfaces';
import {
  getStkdeIntensityColor,
  getStkdeSignedDifferenceColor,
} from '@/app/stkde-3d/lib/palette';

type ColorScheme = 'intensity' | 'difference';
type BorderTone = 'a' | 'difference' | 'b';

const BORDER_TONES: Record<BorderTone, string> = {
  a: 'border-sky-400/75',
  difference: 'border-violet-400/75',
  b: 'border-amber-400/75',
};

const PIXEL_SIZE = 4;
const VIEWPORT_SIZE = COMPARISON_GRID_SIZE * PIXEL_SIZE;

export interface ComparisonKdeHeatmapProps {
  cells?: KdeCell[];
  label: string;
  crimeCount?: number;
  colorScheme: ColorScheme;
  borderTone: BorderTone;
  isLoading?: boolean;
  status?: string;
  size?: number;
}

export function ComparisonKdeHeatmap({
  cells,
  label,
  crimeCount,
  colorScheme,
  borderTone,
  isLoading = false,
  size = 560,
}: ComparisonKdeHeatmapProps) {
  const grid = useMemo(
    () => (cells ? buildSparseKdeGrid(cells, colorScheme === 'difference' ? 'signed' : 'absolute') : null),
    [cells, colorScheme],
  );
  const backgroundFill = colorScheme === 'difference' ? 'rgb(226, 232, 240)' : 'rgb(250, 244, 215)';

  return (
    <figure className={`w-full max-w-full rounded-lg border-2 ${BORDER_TONES[borderTone]} bg-card/60 p-2`}>
      <figcaption className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        {crimeCount !== undefined ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {crimeCount.toLocaleString()} events
          </span>
        ) : null}
      </figcaption>
      {status ? <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{status}</div> : null}

      <div
        className={`relative mx-auto aspect-square w-full overflow-hidden rounded-md border ${BORDER_TONES[borderTone]}`}
        style={{ maxWidth: size }}
      >
        {isLoading || !grid ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-[10px] text-muted-foreground">
            {isLoading ? 'Loading…' : 'No data'}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
            className="block size-full"
            shapeRendering="crispEdges"
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${label} ${colorScheme === 'difference' ? 'signed difference' : 'intensity'} heatmap`}
          >
            <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill={backgroundFill} />
            {Array.from({ length: COMPARISON_GRID_SIZE * COMPARISON_GRID_SIZE }, (_, idx) => {
              const intensity = grid.intensities[idx] ?? 0;
              const isActive = grid.active[idx] === 1;
              if (!isActive || (colorScheme === 'intensity' && intensity <= 0)) return null;
              const row = COMPARISON_GRID_SIZE - 1 - Math.floor(idx / COMPARISON_GRID_SIZE);
              const col = idx % COMPARISON_GRID_SIZE;
              const color = colorScheme === 'difference'
                ? getStkdeSignedDifferenceColor(intensity, intensity === 0 ? 0.98 : 0.9)
                : getStkdeIntensityColor(intensity, 0.34 + intensity * 0.64);
              return (
                <rect
                  key={idx}
                  x={col * PIXEL_SIZE}
                  y={row * PIXEL_SIZE}
                  width={PIXEL_SIZE}
                  height={PIXEL_SIZE}
                  fill={color}
                />
              );
            })}
          </svg>
        )}
      </div>
    </figure>
  );
}

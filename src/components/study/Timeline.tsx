"use client";

import { useMemo } from "react";
import { buildStimulusLayout, type StimulusLayout } from "@/lib/ats-study/stimulus";
import type { RenderedVariant } from "@/lib/ats-study/datasets";

export interface TimelineProps {
  variant: RenderedVariant;
  width?: number;
  height?: number;
  bandHeight?: number;
  ariaLabel?: string;
}

const MARKER = "TimelineChart-v4-2026-06-30";

function safe(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function Timeline({ variant, width, height, bandHeight, ariaLabel }: TimelineProps) {
  const layout: StimulusLayout = useMemo(
    () => buildStimulusLayout(variant, { width, height, bandHeight }),
    [variant, width, height, bandHeight],
  );

  const label = ariaLabel ?? `Timeline: ${variant.condition} (${variant.pattern})`;

  const w = safe(layout.width, 1);
  const h = safe(layout.height, 1);
  const cy = safe(layout.bandHeight, 0);

  const validBands = layout.bands.filter(
    (b) =>
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
      b.width > 0 &&
      b.height > 0,
  );
  const validRug = layout.rug.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );

  return (
    <svg
      role="img"
      aria-label={label}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      data-condition={layout.condition}
      data-pattern={layout.pattern}
      data-intervals={layout.intervalCount}
      data-timeline-marker={MARKER}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <g aria-hidden="true">
        {validBands.map((band) => (
          <rect
            key={`band-${band.index}`}
            x={safe(band.x, 0)}
            y={safe(band.y, 0)}
            width={safe(band.width, 1)}
            height={safe(band.height, 1)}
            fill="var(--study-band, #cbd5e1)"
            stroke="var(--study-band-stroke, #94a3b8)"
            strokeWidth={1}
            shapeRendering="crispEdges"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g aria-hidden="true">
        {validRug.map((point, idx) => {
          const px = safe(point.x, 0);
          const py = safe(point.y, cy);
          return (
            <line
              key={`rug-${idx}-${point.eventTime}`}
              x1={px}
              x2={px}
              y1={safe(py - 6, 0)}
              y2={safe(py + 6, h)}
              stroke="var(--study-rug, #0f172a)"
              strokeWidth={1}
              shapeRendering="crispEdges"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    </svg>
  );
}

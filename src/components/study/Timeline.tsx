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

const MARKER = "TimelineChart-v5-2026-06-30-NEW";

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info(`[${MARKER}] Timeline module loaded`);
}

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
      data-band-count={validBands.length}
      data-rug-count={validRug.length}
      data-timeline-marker={MARKER}
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        maxWidth: `${w}px`,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
      }}
    >
      <g aria-hidden="true">
        {validBands.map((band) => (
          <rect
            key={`band-${band.index}`}
            x={safe(band.x, 0)}
            y={safe(band.y, 0)}
            width={safe(band.width, 1)}
            height={safe(band.height, 1)}
            fill="#cbd5e1"
            stroke="#475569"
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
              stroke="#0f172a"
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

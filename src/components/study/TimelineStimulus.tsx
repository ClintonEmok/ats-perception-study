"use client";

import { useMemo } from "react";
import { buildStimulusLayout, type StimulusLayout } from "@/lib/ats-study/stimulus";
import type { RenderedVariant } from "@/lib/ats-study/datasets";

export interface TimelineStimulusProps {
  variant: RenderedVariant;
  width?: number;
  height?: number;
  bandHeight?: number;
  ariaLabel?: string;
}

export function TimelineStimulus({ variant, width, height, bandHeight, ariaLabel }: TimelineStimulusProps) {
  const layout: StimulusLayout = useMemo(
    () => buildStimulusLayout(variant, { width, height, bandHeight }),
    [variant, width, height, bandHeight],
  );
  const label = ariaLabel ?? `Timeline stimulus: ${variant.condition} (${variant.pattern})`;
  return (
    <svg
      role="img"
      aria-label={label}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      data-condition={layout.condition}
      data-pattern={layout.pattern}
      data-intervals={layout.intervalCount}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <g aria-hidden="true">
        {layout.bands.map((band) => (
          <rect
            key={`band-${band.index}`}
            x={band.x}
            y={band.y}
            width={band.width}
            height={band.height}
            fill="var(--study-band, #cbd5e1)"
            stroke="var(--study-band-stroke, #94a3b8)"
            strokeWidth={1}
            shapeRendering="crispEdges"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g aria-hidden="true">
        {layout.rug.map((point, idx) => (
          <line
            key={`rug-${idx}-${point.eventTime}`}
            x1={point.x}
            x2={point.x}
            y1={point.y - 6}
            y2={point.y + 6}
            stroke="var(--study-rug, #0f172a)"
            strokeWidth={1}
            shapeRendering="crispEdges"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

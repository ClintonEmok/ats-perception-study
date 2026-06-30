"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildStimulusLayout, type StimulusLayout } from "@/lib/ats-study/stimulus";
import type { RenderedVariant } from "@/lib/ats-study/datasets";

export interface TimelineStimulusProps {
  variant: RenderedVariant;
  width?: number;
  height?: number;
  bandHeight?: number;
  ariaLabel?: string;
}

function isFiniteBand(band: { x: number; y: number; width: number; height: number }): boolean {
  return (
    Number.isFinite(band.x) &&
    Number.isFinite(band.y) &&
    Number.isFinite(band.width) &&
    Number.isFinite(band.height) &&
    band.width > 0 &&
    band.height > 0
  );
}

export function TimelineStimulus({ variant, width, height, bandHeight, ariaLabel }: TimelineStimulusProps) {
  const layout: StimulusLayout = useMemo(
    () => buildStimulusLayout(variant, { width, height, bandHeight }),
    [variant, width, height, bandHeight],
  );

  const lastWarnedRef = useRef<string | null>(null);
  useEffect(() => {
    const bad = layout.bands.find((b) => !isFiniteBand(b));
    if (!bad) return;
    const key = `${variant.datasetId}#${bad.index}`;
    if (lastWarnedRef.current === key) return;
    lastWarnedRef.current = key;
    if (typeof console !== "undefined") {
      console.warn("[TimelineStimulus] filtered non-finite band", {
        datasetId: variant.datasetId,
        band: bad,
        layoutSize: { width: layout.width, height: layout.height },
        variantEvents: variant.events.length,
      });
    }
  }, [layout.bands, variant.datasetId, variant.events.length, layout.width, layout.height]);

  const label = ariaLabel ?? `Timeline stimulus: ${variant.condition} (${variant.pattern})`;
  const safeBands = layout.bands.filter(isFiniteBand);
  const safeRug = layout.rug.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

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
        {safeBands.map((band) => (
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
        {safeRug.map((point, idx) => (
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

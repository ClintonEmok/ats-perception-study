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

const COMPONENT_VERSION = "v3-safeNum";

function safeNum(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function TimelineStimulus({ variant, width, height, bandHeight, ariaLabel }: TimelineStimulusProps) {
  const layout: StimulusLayout = useMemo(
    () => buildStimulusLayout(variant, { width, height, bandHeight }),
    [variant, width, height, bandHeight],
  );

  const lastWarnedRef = useRef<string | null>(null);
  useEffect(() => {
    if (layout.bands.length === 0 && layout.rug.length > 0) {
      if (lastWarnedRef.current === "empty-bands") return;
      lastWarnedRef.current = "empty-bands";
      if (typeof console !== "undefined") {
        console.warn(
          `[TimelineStimulus ${COMPONENT_VERSION}] layout has no bands but has rug points`,
          { datasetId: variant.datasetId, rugCount: layout.rug.length },
        );
      }
    }
  }, [layout.bands.length, layout.rug.length, variant.datasetId]);

  const label = ariaLabel ?? `Timeline stimulus: ${variant.condition} (${variant.pattern})`;

  const w = safeNum(layout.width, 0);
  const h = safeNum(layout.height, 0);
  const cy = safeNum(layout.bandHeight, 0);

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

  if (w <= 0 || h <= 0) {
    return (
      <div data-testid="timeline-stimulus-empty" data-version={COMPONENT_VERSION} className="text-xs text-slate-400">
        (no timeline)
      </div>
    );
  }

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
      data-version={COMPONENT_VERSION}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <g aria-hidden="true">
        {validBands.map((band) => (
          <rect
            key={`band-${band.index}`}
            x={safeNum(band.x, 0)}
            y={safeNum(band.y, 0)}
            width={safeNum(band.width, 1)}
            height={safeNum(band.height, 1)}
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
          const px = safeNum(point.x, 0);
          const py = safeNum(point.y, cy);
          return (
            <line
              key={`rug-${idx}-${point.eventTime}`}
              x1={px}
              x2={px}
              y1={safeNum(py - 6, 0)}
              y2={safeNum(py + 6, 0)}
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

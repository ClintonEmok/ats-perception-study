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

const MARKER = "TimelineChart-v6-2026-06-30-BLACKBOX";

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
    <div
      role="img"
      aria-label={label}
      data-condition={layout.condition}
      data-pattern={layout.pattern}
      data-intervals={layout.intervalCount}
      data-band-count={validBands.length}
      data-rug-count={validRug.length}
      data-timeline-marker={MARKER}
      data-timeline-w={w}
      data-timeline-h={h}
      style={{
        display: "block",
        width: `${w}px`,
        height: `${h}px`,
        maxWidth: "100%",
        background: "#000000",
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "14px",
        lineHeight: 1.2,
        padding: "8px",
        boxSizing: "border-box",
        borderRadius: "4px",
        overflow: "hidden",
        flexShrink: 0,
        alignSelf: "stretch",
      }}
    >
      <strong>BLACKBOX</strong>
      <div>w={w} h={h}</div>
      <div>condition={layout.condition}</div>
      <div>pattern={layout.pattern}</div>
      <div>intervals={layout.intervalCount}</div>
      <div>bands={validBands.length}</div>
      <div>rug={validRug.length}</div>
    </div>
  );
}

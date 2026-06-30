import { BASE_DATASETS, type BaseDataset, type RenderedVariant } from "./datasets";
import { computeAtsIntervals, uniformIntervals, type AtsInterval } from "./atsMapping";
import {
  bandsFromIntervals,
  eventRugPoints,
  type BandRect,
  type RugPoint,
} from "./geometry";

export interface StimulusLayout {
  datasetId: string;
  condition: "uniform" | "ats";
  pattern: BaseDataset["pattern"];
  width: number;
  height: number;
  bandHeight: number;
  domain: { min: number; max: number };
  bands: BandRect[];
  rug: RugPoint[];
  intervalCount: number;
}

export interface BuildStimulusLayoutOptions {
  width?: number;
  height?: number;
  bandHeight?: number;
  binCount?: number;
}

const DEFAULT_OPTIONS: Required<BuildStimulusLayoutOptions> = {
  width: 960,
  height: 220,
  bandHeight: 28,
  binCount: 12,
};

export function buildStimulusLayout(
  variant: RenderedVariant,
  options: BuildStimulusLayoutOptions = {},
): StimulusLayout {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const domain = { min: variant.domain[0], max: variant.domain[1] };
  const intervals: AtsInterval[] =
    variant.condition === "uniform"
      ? uniformIntervals(variant.events, opts.binCount)
      : computeAtsIntervals(variant.events);
  const bands = bandsFromIntervals(intervals, domain, { width: opts.width, height: opts.height }, opts.bandHeight);
  const rug = eventRugPoints(variant.events, domain, { width: opts.width, height: opts.height }, opts.bandHeight);

  const hasNaN = (n: number) => !Number.isFinite(n);
  const hasAnyNaN =
    hasNaN(opts.width) ||
    hasNaN(opts.height) ||
    hasNaN(opts.bandHeight) ||
    bands.some((b) => hasNaN(b.x) || hasNaN(b.y) || hasNaN(b.width) || hasNaN(b.height)) ||
    rug.some((p) => hasNaN(p.x) || hasNaN(p.y));
  if (hasAnyNaN && typeof console !== "undefined") {
    console.warn(
      "[buildStimulusLayout] produced non-finite coordinates",
      {
        datasetId: variant.datasetId,
        condition: variant.condition,
        pattern: variant.pattern,
        opts: { width: opts.width, height: opts.height, bandHeight: opts.bandHeight },
        domain,
        eventCount: variant.events.length,
        firstEvent: variant.events[0],
        lastEvent: variant.events[variant.events.length - 1],
        intervalCount: intervals.length,
        firstInterval: intervals[0],
        lastInterval: intervals[intervals.length - 1],
        bands: bands.slice(0, 3),
        rug: rug.slice(0, 3),
      },
    );
  }

  return {
    datasetId: variant.datasetId,
    condition: variant.condition,
    pattern: variant.pattern,
    width: opts.width,
    height: opts.height,
    bandHeight: opts.bandHeight,
    domain,
    bands,
    rug,
    intervalCount: intervals.length,
  };
}

export { BASE_DATASETS };

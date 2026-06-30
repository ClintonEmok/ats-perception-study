export type EventTime = number;

export interface AtsInterval {
  index: number;
  start: EventTime;
  end: EventTime;
  width: EventTime;
  weight: number;
}

export interface AtsMappingOptions {
  targetBins: number;
  minWidth: number;
  maxWidth: number;
  weightFloor: number;
}

export const DEFAULT_ATS_OPTIONS: AtsMappingOptions = {
  targetBins: 12,
  minWidth: 10,
  maxWidth: 250,
  weightFloor: 0.05,
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx]!;
}

export function computeAtsIntervals(
  events: EventTime[],
  options: AtsMappingOptions = DEFAULT_ATS_OPTIONS,
): AtsInterval[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a - b);
  const minT = sorted[0]!;
  const maxT = sorted[sorted.length - 1]!;
  const totalSpan = Math.max(1, maxT - minT);
  const binCount = Math.max(2, Math.min(options.targetBins, sorted.length));
  const binEdges: number[] = [];
  for (let i = 0; i <= binCount; i += 1) {
    binEdges.push(minT + (i / binCount) * totalSpan);
  }
  const counts: number[] = new Array(binCount).fill(0);
  for (const t of sorted) {
    let lo = 0;
    let hi = binCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t >= binEdges[mid]!) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(0, Math.min(binCount - 1, lo - 1));
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  const maxCount = Math.max(1, ...counts);
  const weights = counts.map((c) => Math.max(options.weightFloor, c / maxCount));
  const uniformWidth = totalSpan / binCount;
  const rawWidths = weights.map((w) => uniformWidth / w);
  const median = quantile([...rawWidths].sort((a, b) => a - b), 0.5) || uniformWidth;
  const normalised = rawWidths.map((w) => {
    const scaled = w * (uniformWidth / median);
    return Math.max(options.minWidth, Math.min(options.maxWidth, scaled));
  });
  const sumRaw = normalised.reduce((acc, w) => acc + w, 0);
  const scaleToSpan = sumRaw > 0 ? totalSpan / sumRaw : 1;
  const widths = normalised.map((w) => w * scaleToSpan);
  let finalWidths = widths.map((w) => Math.max(options.minWidth, Math.min(options.maxWidth, w)));
  const finalSum = finalWidths.reduce((acc, w) => acc + w, 0);
  const finalScale = finalSum > 0 ? totalSpan / finalSum : 1;
  finalWidths = finalWidths.map((w) => w * finalScale);
  finalWidths = finalWidths.map((w) => Math.max(options.minWidth, Math.min(options.maxWidth, w)));
  const intervals: AtsInterval[] = [];
  let cursor = minT;
  for (let i = 0; i < binCount; i += 1) {
    const w = finalWidths[i]!;
    intervals.push({
      index: i,
      start: cursor,
      end: cursor + w,
      width: w,
      weight: weights[i]!,
    });
    cursor += w;
  }
  return intervals;
}

export function uniformIntervals(
  events: EventTime[],
  binCount: number,
): AtsInterval[] {
  if (events.length === 0 || binCount <= 0) return [];
  const sorted = [...events].sort((a, b) => a - b);
  const minT = sorted[0]!;
  const maxT = sorted[sorted.length - 1]!;
  const totalSpan = Math.max(1, maxT - minT);
  const w = totalSpan / binCount;
  const intervals: AtsInterval[] = [];
  for (let i = 0; i < binCount; i += 1) {
    intervals.push({
      index: i,
      start: minT + i * w,
      end: minT + (i + 1) * w,
      width: w,
      weight: 1 / binCount,
    });
  }
  return intervals;
}

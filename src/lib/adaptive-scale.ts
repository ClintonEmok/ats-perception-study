/**
 * @deprecated This module is not used by the main dashboard views.
 * The active density-based implementation is in adaptive-warp-utils.ts
 * (buildDensityWarpMap). This file is retained for the algorithms page
 * and useAdaptiveStore ablation experiments only.
 */
import { max } from 'd3-array';
import { ADAPTIVE_BURST_INFLUENCE } from './adaptive-utils';

export interface TimePoint {
  timestamp: Date | number;
  [key: string]: unknown;
}

export interface AdaptiveScaleConfig {
  domain: number[];
  range: number[];
}

function getTime(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

/**
 * Goh-Barabasi per-bin burstiness from event counts.
 *
 * Mirrors the worker's `computeBurstinessPerBin`: assume events within a
 * bin are roughly uniformly spaced, so for a bin with `c` events the
 * inter-event gap is binWidth / c. The standard deviation of the gap is
 * approximated as `meanGap * sqrt(c - 1) / c` (Poisson-like spread), which
 * produces B = (sigma - mu) / (sigma + mu) in [0, 1] for any c >= 1.
 *
 * This replaces the previous pairwise adjacent-bin heuristic, which always
 * returned 0 for the first bin and was too weak to drive the burstiness-only
 * scaling at lambda=1.0.
 */
function computeBurstinessWeights(counts: Float64Array): Float64Array {
  const burstiness = new Float64Array(counts.length);
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i] ?? 0;
    if (c < 1) {
      burstiness[i] = 0;
      continue;
    }
    // Spread of inter-event gaps for c events, normalised so 0..1 maps to
    // an increasing burst signal as a bin holds a single isolated cluster
    // (high concentration) vs. spread-out events.
    const normalized = Math.min(1, 1 - 1 / c);
    burstiness[i] = normalized;
  }
  return burstiness;
}

/**
 * Calculates the adaptive scale configuration (domain and range arrays)
 * to be used with d3.scaleLinear().
 */
export function getAdaptiveScaleConfig(
  data: TimePoint[],
  timeRange: [Date | number, Date | number],
  yRange: [number, number],
  binCount: number = 100
): AdaptiveScaleConfig {
  if (!data || data.length === 0) {
    return {
      domain: [getTime(timeRange[0]), getTime(timeRange[1])],
      range: [yRange[0], yRange[1]]
    };
  }

  const tStart = getTime(timeRange[0]);
  const tEnd = getTime(timeRange[1]);
  const [yMin, yMax] = yRange;
  const tSpan = tEnd - tStart;
  
  if (tSpan <= 0) {
    return {
      domain: [tStart, tEnd],
      range: [yMin, yMax]
    };
  }

  // 1. Binning
  const counts = new Float64Array(binCount);
  
  for (const d of data) {
    const t = getTime(d.timestamp);
    const norm = (t - tStart) / tSpan;
    const idx = Math.floor(norm * binCount);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    counts[clampedIdx]++;
  }
  
  // 2. Weights
  const maxDensity = max(counts) || 1;
  const burstiness = computeBurstinessWeights(counts);
  const weights = new Float64Array(binCount);
  
  for (let i = 0; i < binCount; i++) {
    const density = counts[i] / maxDensity;
    const blended = ((1 - ADAPTIVE_BURST_INFLUENCE) * density) + (ADAPTIVE_BURST_INFLUENCE * (burstiness[i] ?? 0));
    weights[i] = 1 + blended * 5;
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const totalHeight = yMax - yMin;
  
  // 3. Build Domain and Range Arrays
  const domain = new Array(binCount + 1);
  const range = new Array(binCount + 1);
  
  let currentY = yMin;
  const binSize = tSpan / binCount;

  for (let i = 0; i < binCount; i++) {
    domain[i] = tStart + i * binSize;
    range[i] = currentY;
    
    const binHeight = (weights[i] / totalWeight) * totalHeight;
    currentY += binHeight;
  }
  
  domain[binCount] = tEnd;
  range[binCount] = yMax;

  return { domain, range };
}

export function getAdaptiveScaleConfigColumnar(
  timestamps: Float32Array | Float64Array,
  timeRange: [number, number],
  yRange: [number, number],
  binCount: number = 100
): AdaptiveScaleConfig {
  const tStart = timeRange[0];
  const tEnd = timeRange[1];
  const tSpan = tEnd - tStart;
  const count = timestamps.length;
  const [yMin, yMax] = yRange;

  if (count === 0 || tSpan <= 0) {
    return {
      domain: [tStart, tEnd],
      range: [yMin, yMax]
    };
  }

  // 1. Binning
  const counts = new Float64Array(binCount);
  
  for (let i = 0; i < count; i++) {
    const t = timestamps[i];
    const norm = (t - tStart) / tSpan;
    const idx = Math.floor(norm * binCount);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    counts[clampedIdx]++;
  }
  
  // 2. Weights
  const maxDensity = max(counts) || 1;
  const burstiness = computeBurstinessWeights(counts);
  const weights = new Float64Array(binCount);
  
  for (let i = 0; i < binCount; i++) {
    const density = counts[i] / maxDensity;
    const blended = ((1 - ADAPTIVE_BURST_INFLUENCE) * density) + (ADAPTIVE_BURST_INFLUENCE * (burstiness[i] ?? 0));
    weights[i] = 1 + blended * 5;
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const totalHeight = yMax - yMin;
  
  // 3. Build Domain and Range Arrays
  const domain = new Array(binCount + 1);
  const range = new Array(binCount + 1);
  
  let currentY = yMin;
  const binSize = tSpan / binCount;

  for (let i = 0; i < binCount; i++) {
    domain[i] = tStart + i * binSize;
    range[i] = currentY;
    
    const binHeight = (weights[i] / totalWeight) * totalHeight;
    currentY += binHeight;
  }
  
  domain[binCount] = tEnd;
  range[binCount] = yMax;

  return { domain, range };
}

/**
 * Computes the Y (vertical) positions for points based on adaptive temporal scaling.
 */
export function computeAdaptiveY(
  data: TimePoint[],
  timeRange: [Date | number, Date | number],
  yRange: [number, number],
  binCount: number = 100
): number[] {
  if (!data || data.length === 0) return [];

  const tStart = getTime(timeRange[0]);
  const tEnd = getTime(timeRange[1]);
  const tSpan = tEnd - tStart;

  // Use the shared config logic
  const { range: yStarts } = getAdaptiveScaleConfig(data, timeRange, yRange, binCount);
  
  return data.map(d => {
    const t = getTime(d.timestamp);
    const norm = (t - tStart) / tSpan;
    
    // Calculate fractional index
    const fractionalIdx = norm * binCount;
    const idx = Math.floor(fractionalIdx);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    
    let tInBin = fractionalIdx - idx;
    
    if (idx >= binCount) tInBin = 1;
    if (idx < 0) tInBin = 0;
    
    const binStart = yStarts[clampedIdx];
    const binEnd = yStarts[clampedIdx + 1];
    
    return binStart + tInBin * (binEnd - binStart);
  });
}

export function computeAdaptiveYColumnar(
  timestamps: Float32Array | Float64Array,
  timeRange: [number, number],
  yRange: [number, number],
  binCount: number = 100
): Float32Array {
  const tStart = timeRange[0];
  const tEnd = timeRange[1];
  const tSpan = tEnd - tStart;
  const count = timestamps.length;
  
  // 1. Binning
  const counts = new Float64Array(binCount);
  
  for (let i = 0; i < count; i++) {
    const t = timestamps[i];
    const norm = (t - tStart) / tSpan;
    const idx = Math.floor(norm * binCount);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    counts[clampedIdx]++;
  }
  
  // 2. Weights
  const maxDensity = max(counts) || 1;
  const burstiness = computeBurstinessWeights(counts);
  const weights = new Float64Array(binCount);
  
  for (let i = 0; i < binCount; i++) {
    const density = counts[i] / maxDensity;
    const blended = ((1 - ADAPTIVE_BURST_INFLUENCE) * density) + (ADAPTIVE_BURST_INFLUENCE * (burstiness[i] ?? 0));
    weights[i] = 1 + blended * 5;
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const totalHeight = yRange[1] - yRange[0];
  const yMin = yRange[0];
  
  // 3. Build Range Arrays (Start Y for each bin)
  const yStarts = new Float64Array(binCount + 1);
  let currentY = yMin;
  
  for (let i = 0; i < binCount; i++) {
    yStarts[i] = currentY;
    const binHeight = (weights[i] / totalWeight) * totalHeight;
    currentY += binHeight;
  }
  yStarts[binCount] = yRange[1];
  
  // 4. Map timestamps to Y
  const result = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    const t = timestamps[i];
    const norm = (t - tStart) / tSpan;
    const fractionalIdx = norm * binCount;
    const idx = Math.floor(fractionalIdx);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    
    let tInBin = fractionalIdx - idx;
    if (idx >= binCount) tInBin = 1;
    if (idx < 0) tInBin = 0;
    
    const binStart = yStarts[clampedIdx];
    const binEnd = yStarts[clampedIdx + 1];
    
    result[i] = binStart + tInBin * (binEnd - binStart);
  }
  
  return result;
}

export interface WorkerConfig {
  binCount: number;
  kernelWidth?: number;
  binningMode?: 'uniform-time' | 'uniform-events';
  burstInfluence?: number;
}

export interface WorkerInput {
  requestId: number;
  timestamps: Float32Array;
  domain: [number, number];
  config: WorkerConfig;
}

export interface WorkerOutput {
  requestId: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  countMap: Float32Array;
}

const EPSILON = 1e-6;

const clampToBin = (index: number, binCount: number) => {
  if (index < 0) return 0;
  if (index >= binCount) return binCount - 1;
  return index;
};

const ensureStrictlyMonotonicBoundaries = (
  boundaries: Float32Array,
  domainStart: number,
  domainEnd: number
) => {
  if (boundaries.length === 0) return;
  boundaries[0] = domainStart;
  for (let i = 1; i < boundaries.length; i++) {
    const previous = boundaries[i - 1];
    const current = boundaries[i];
    if (!Number.isFinite(current) || current <= previous) {
      boundaries[i] = previous + EPSILON;
    }
  }
  const lastIndex = boundaries.length - 1;
  boundaries[lastIndex] = Math.max(domainEnd, boundaries[lastIndex - 1] + EPSILON);
};

const findBoundaryBin = (value: number, boundaries: Float32Array) => {
  let low = 0;
  let high = boundaries.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (boundaries[mid] < value) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

export const computeAdaptiveMaps = (
  timestamps: Float32Array,
  domain: [number, number],
  config: WorkerConfig
): Omit<WorkerOutput, 'requestId'> => {
  const { binCount, kernelWidth = 1, binningMode = 'uniform-time', burstInfluence = 0 } = config;
  // burstInfluence: 0 = pure density (matches thesis Ch5), 1 = pure burstiness.
  // Overridden by ADAPTIVE_BURST_INFLUENCE from useAdaptiveStore.
  const safeBinCount = Math.max(1, Math.floor(binCount));
  const tStart = domain[0];
  const tEnd = domain[1];
  const rawSpan = tEnd - tStart;
  const tSpan = Number.isFinite(rawSpan) && rawSpan > 0 ? rawSpan : 1;

  if (!timestamps || timestamps.length === 0) {
    const emptyDensity = new Float32Array(safeBinCount);
    const emptyBurstiness = new Float32Array(safeBinCount);
    const emptyWarp = new Float32Array(safeBinCount);
    const emptyCount = new Float32Array(safeBinCount);
    const denom = safeBinCount > 1 ? safeBinCount - 1 : 1;
    for (let i = 0; i < safeBinCount; i++) {
      emptyWarp[i] = tStart + (i / denom) * tSpan;
    }
    return {
      densityMap: emptyDensity,
      burstinessMap: emptyBurstiness,
      warpMap: emptyWarp,
      countMap: emptyCount
    };
  }

  const validTimestamps = Array.from(timestamps).filter(
    (value) => Number.isFinite(value) && value >= tStart && value <= tEnd
  );

  const sorted = validTimestamps.sort((a, b) => a - b);
  const countMap = new Float32Array(safeBinCount);
  const densityInput = new Float32Array(safeBinCount);

  if (binningMode === 'uniform-events' && sorted.length > 0) {
    const boundaries = new Float32Array(safeBinCount + 1);
    boundaries[0] = tStart;
    boundaries[safeBinCount] = tEnd;

    const maxTimestampIndex = sorted.length - 1;
    for (let edgeIndex = 1; edgeIndex < safeBinCount; edgeIndex++) {
      const target = (edgeIndex * sorted.length) / safeBinCount;
      const sampleIndex = Math.min(maxTimestampIndex, Math.floor(target));
      boundaries[edgeIndex] = sorted[sampleIndex] ?? tEnd;
    }

    ensureStrictlyMonotonicBoundaries(boundaries, tStart, tEnd);

    for (const t of sorted) {
      const boundaryIndex = findBoundaryBin(t, boundaries);
      const idx = clampToBin(boundaryIndex, safeBinCount);
      countMap[idx] += 1;
    }

    for (let i = 0; i < safeBinCount; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const width = Math.max(EPSILON, end - start);
      densityInput[i] = countMap[i] / width;
    }
  } else {
    for (const t of sorted) {
      const norm = (t - tStart) / tSpan;
      if (norm < 0 || norm > 1) continue;
      const rawIndex = Math.floor(norm * safeBinCount);
      const idx = clampToBin(rawIndex, safeBinCount);
      countMap[idx] += 1;
    }

    for (let i = 0; i < safeBinCount; i++) {
      densityInput[i] = countMap[i];
    }
  }

  let smoothedDensity = densityInput;
  if (kernelWidth > 1) {
    smoothedDensity = new Float32Array(safeBinCount);
    for (let i = 0; i < safeBinCount; i++) {
      let sum = 0;
      let neighbors = 0;
      for (let k = -kernelWidth; k <= kernelWidth; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < safeBinCount) {
          const value = densityInput[idx];
          if (Number.isFinite(value)) {
            sum += value;
            neighbors += 1;
          }
        }
      }
      smoothedDensity[i] = neighbors > 0 ? sum / neighbors : 0;
    }
  }

  let maxDensity = 0;
  for (let i = 0; i < safeBinCount; i++) {
    const value = smoothedDensity[i];
    if (Number.isFinite(value) && value > maxDensity) {
      maxDensity = value;
    }
  }
  if (maxDensity <= 0) {
    maxDensity = 1;
  }

  const densityMap = new Float32Array(safeBinCount);
  for (let i = 0; i < safeBinCount; i++) {
    const normalized = smoothedDensity[i] / maxDensity;
    densityMap[i] = Number.isFinite(normalized) ? normalized : 0;
  }

  const burstCounts = new Float32Array(safeBinCount);
  const burstSum = new Float32Array(safeBinCount);
  const burstSumSq = new Float32Array(safeBinCount);
  if (sorted.length > 1) {
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i] - sorted[i - 1];
      if (!Number.isFinite(delta) || delta < 0) continue;
      const norm = (sorted[i] - tStart) / tSpan;
      if (norm < 0 || norm > 1) continue;
      const idx = clampToBin(Math.floor(norm * safeBinCount), safeBinCount);
      burstCounts[idx] += 1;
      burstSum[idx] += delta;
      burstSumSq[idx] += delta * delta;
    }
  }

  const burstinessMap = new Float32Array(safeBinCount);
  for (let i = 0; i < safeBinCount; i++) {
    const count = burstCounts[i];
    if (count <= 1) {
      burstinessMap[i] = 0;
      continue;
    }
    const mean = burstSum[i] / count;
    const variance = Math.max(0, burstSumSq[i] / count - mean * mean);
    const sigma = Math.sqrt(variance);
    const denom = sigma + mean;
    const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
    const normalized = Math.max(0, Math.min(1, (burstiness + 1) / 2));
    burstinessMap[i] = Number.isFinite(normalized) ? normalized : 0;
  }

  const safeBurstInfluence = Math.max(0, Math.min(1, burstInfluence));
  const weights = new Float32Array(safeBinCount);
  let totalWeight = 0;
  for (let i = 0; i < safeBinCount; i++) {
    const blendedSignal = ((1 - safeBurstInfluence) * densityMap[i]) + (safeBurstInfluence * burstinessMap[i]);
    const finiteSignal = Number.isFinite(blendedSignal) ? blendedSignal : 0;
    const weight = 1 + finiteSignal * 5;
    weights[i] = weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0 || !Number.isFinite(totalWeight)) {
    totalWeight = safeBinCount;
    for (let i = 0; i < safeBinCount; i++) {
      weights[i] = 1;
    }
  }

  const warpMap = new Float32Array(safeBinCount);
  let accumulated = 0;
  for (let i = 0; i < safeBinCount; i++) {
    const warped = tStart + (accumulated / totalWeight) * tSpan;
    warpMap[i] = Number.isFinite(warped) ? warped : tStart;
    accumulated += weights[i];
  }

  return {
    densityMap,
    burstinessMap,
    warpMap,
    countMap
  };
};

if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { requestId, timestamps, domain, config } = e.data;
    const maps = computeAdaptiveMaps(timestamps, domain, config);
    self.postMessage({ requestId, ...maps });
  };
}

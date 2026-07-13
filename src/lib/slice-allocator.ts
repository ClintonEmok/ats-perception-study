import type { BurstBinResult } from './burst-detection';

export interface AllocatedSlice {
  sourceBinIndex: number;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
}

export function allocateNonUniformSlices(
  bins: BurstBinResult[],
  targetCount: number,
): AllocatedSlice[] {
  if (bins.length === 0) return [];
  if (bins.length === 1) {
    return [{
      sourceBinIndex: 0,
      startEpoch: bins[0].startEpoch,
      endEpoch: bins[0].endEpoch,
      burstScore: bins[0].combinedB,
    }];
  }

  const totalB = bins.reduce((sum, b) => sum + b.combinedB, 0);
  const slices: AllocatedSlice[] = [];

  if (totalB <= 0) {
    for (let i = 0; i < bins.length; i++) {
      slices.push({
        sourceBinIndex: i,
        startEpoch: bins[i].startEpoch,
        endEpoch: bins[i].endEpoch,
        burstScore: 0,
      });
    }
    return slices;
  }

  const rawAllocations = bins.map((bin) => ({
    bin,
    raw: (bin.combinedB / totalB) * targetCount,
    allocated: Math.max(1, Math.round((bin.combinedB / totalB) * targetCount)),
  }));

  const used = rawAllocations.reduce((sum, a) => sum + a.allocated, 0);
  let remaining = targetCount - used;

  while (remaining > 0) {
    const candidate = rawAllocations.reduce((best, curr) =>
      curr.allocated - curr.raw < best.diff
        ? { diff: curr.allocated - curr.raw, idx: rawAllocations.indexOf(curr) }
        : best,
      { diff: Infinity, idx: -1 },
    );
    if (candidate.idx < 0) break;
    rawAllocations[candidate.idx].allocated++;
    remaining--;
  }

  while (remaining < 0) {
    const candidate = rawAllocations.reduce((best, curr) =>
      curr.allocated > 1 && curr.allocated - curr.raw > best.diff
        ? { diff: curr.allocated - curr.raw, idx: rawAllocations.indexOf(curr) }
        : best,
      { diff: -Infinity, idx: -1 },
    );
    if (candidate.idx < 0) break;
    rawAllocations[candidate.idx].allocated = Math.max(1, rawAllocations[candidate.idx].allocated - 1);
    remaining++;
  }

  for (const alloc of rawAllocations) {
    const bin = alloc.bin;
    const slotCount = alloc.allocated;
    const binSpan = bin.endEpoch - bin.startEpoch;
    const slotSpan = binSpan / slotCount;

    for (let s = 0; s < slotCount; s++) {
      slices.push({
        sourceBinIndex: bins.indexOf(bin),
        startEpoch: bin.startEpoch + s * slotSpan,
        endEpoch: bin.startEpoch + (s + 1) * slotSpan,
        burstScore: bin.combinedB,
      });
    }
  }

  slices.sort((a, b) => a.startEpoch - b.startEpoch);
  return slices;
}

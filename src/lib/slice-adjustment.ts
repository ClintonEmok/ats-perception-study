export type AdjustmentHandle = 'start' | 'end';

export type LimitCue = 'none' | 'minDuration' | 'domainStart' | 'domainEnd';

export type SnapSource = 'none' | 'grid' | 'neighbor';

export type SnapMode = 'adaptive' | 'fixed';

export type SliceBoundary = {
  id: string;
  startSec: number;
  endSec: number;
  isVisible?: boolean;
};

export type SnapCandidate = {
  valueSec: number;
  source: Exclude<SnapSource, 'none'>;
};

export type SnapConfig = {
  enabled: boolean;
  bypass?: boolean;
  mode?: SnapMode;
  toleranceSec: number;
  gridCandidatesSec?: number[];
  neighborCandidatesSec?: number[];
};

export type AdjustBoundaryInput = {
  handle: AdjustmentHandle;
  rawPointerSec: number;
  fixedBoundarySec: number;
  domainStartSec: number;
  domainEndSec: number;
  minDurationSec: number;
  snap?: SnapConfig;
};

export type AdjustBoundaryResult = {
  startSec: number;
  endSec: number;
  startNorm: number;
  endNorm: number;
  rawClampedSec: number;
  appliedSec: number;
  limitCue: LimitCue;
  snapSource: SnapSource;
};

const NORMALIZED_MIN = 0;
const NORMALIZED_MAX = 100;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const normalizeDomain = (domainStartSec: number, domainEndSec: number): [number, number] => {
  if (domainStartSec <= domainEndSec) {
    return [domainStartSec, domainEndSec];
  }

  return [domainEndSec, domainStartSec];
};

const uniqueSorted = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b);

export function secToNormalized(sec: number, domainStartSec: number, domainEndSec: number): number {
  const [minDomain, maxDomain] = normalizeDomain(domainStartSec, domainEndSec);
  const span = Math.max(0, maxDomain - minDomain);
  if (span === 0) {
    return NORMALIZED_MIN;
  }

  const ratio = (sec - minDomain) / span;
  return clamp(ratio * NORMALIZED_MAX, NORMALIZED_MIN, NORMALIZED_MAX);
}

export function normalizedToSec(normalized: number, domainStartSec: number, domainEndSec: number): number {
  const [minDomain, maxDomain] = normalizeDomain(domainStartSec, domainEndSec);
  const span = Math.max(0, maxDomain - minDomain);
  const normalizedClamped = clamp(normalized, NORMALIZED_MIN, NORMALIZED_MAX);
  if (span === 0) {
    return minDomain;
  }

  return minDomain + (normalizedClamped / NORMALIZED_MAX) * span;
}

export function getAdaptiveIntervalSec(domainStartSec: number, domainEndSec: number): number {
  const [minDomain, maxDomain] = normalizeDomain(domainStartSec, domainEndSec);
  const span = maxDomain - minDomain;

  if (span <= 2 * 3600) {
    return 60;
  }
  if (span <= 12 * 3600) {
    return 300;
  }
  if (span <= 48 * 3600) {
    return 900;
  }
  if (span <= 14 * 86400) {
    return 3600;
  }

  return 86400;
}

export function resolveSnapIntervalSec(params: {
  mode: SnapMode;
  fixedPresetSec: number | null;
  domainStartSec: number;
  domainEndSec: number;
}): number {
  if (params.mode === 'fixed' && params.fixedPresetSec && params.fixedPresetSec > 0) {
    return params.fixedPresetSec;
  }

  return getAdaptiveIntervalSec(params.domainStartSec, params.domainEndSec);
}

export function resolveNeighborCandidates(params: {
  boundaries: SliceBoundary[];
  activeSliceId: string;
  handle: AdjustmentHandle;
  domainStartSec: number;
  domainEndSec: number;
  fixedBoundarySec: number;
}): number[] {
  const [minDomain, maxDomain] = normalizeDomain(params.domainStartSec, params.domainEndSec);
  const domainCandidate = params.handle === 'start' ? minDomain : maxDomain;

  const candidates: number[] = [domainCandidate];
  for (const boundary of params.boundaries) {
    if (boundary.id === params.activeSliceId || boundary.isVisible === false) {
      continue;
    }

    candidates.push(boundary.startSec, boundary.endSec);
  }

  return uniqueSorted(candidates).filter((candidate) => candidate !== params.fixedBoundarySec);
}

export function pickNearest(
  rawSec: number,
  candidates: SnapCandidate[],
  toleranceSec: number
): SnapCandidate | null {
  if (candidates.length === 0 || toleranceSec < 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const deltaDiff = Math.abs(a.valueSec - rawSec) - Math.abs(b.valueSec - rawSec);
    if (deltaDiff !== 0) {
      return deltaDiff;
    }

    if (a.source !== b.source) {
      return a.source === 'neighbor' ? -1 : 1;
    }

    return a.valueSec - b.valueSec;
  });

  const winner = sorted[0];
  if (Math.abs(winner.valueSec - rawSec) > toleranceSec) {
    return null;
  }

  return winner;
}

export function resolveSnap(rawSec: number, snap?: SnapConfig): { snappedSec: number; source: SnapSource } {
  if (!snap || !snap.enabled || snap.bypass) {
    return { snappedSec: rawSec, source: 'none' };
  }

  const gridCandidates = (snap.gridCandidatesSec ?? []).map((valueSec) => ({
    valueSec,
    source: 'grid' as const,
  }));
  const neighborCandidates = (snap.neighborCandidatesSec ?? []).map((valueSec) => ({
    valueSec,
    source: 'neighbor' as const,
  }));

  const winner = pickNearest(rawSec, [...gridCandidates, ...neighborCandidates], snap.toleranceSec);
  if (!winner) {
    return { snappedSec: rawSec, source: 'none' };
  }

  return { snappedSec: winner.valueSec, source: winner.source };
}

export function adjustBoundary(input: AdjustBoundaryInput): AdjustBoundaryResult {
  const [minDomain, maxDomain] = normalizeDomain(input.domainStartSec, input.domainEndSec);
  const minDurationSec = Math.max(0, input.minDurationSec);
  const rawWasBelowDomain = input.rawPointerSec < minDomain;
  const rawWasAboveDomain = input.rawPointerSec > maxDomain;
  const rawClampedSec = clamp(input.rawPointerSec, minDomain, maxDomain);
  const snapResolved = resolveSnap(rawClampedSec, input.snap);
  const snappedClampedSec = clamp(snapResolved.snappedSec, minDomain, maxDomain);

  let startSec = input.handle === 'start' ? snappedClampedSec : input.fixedBoundarySec;
  let endSec = input.handle === 'end' ? snappedClampedSec : input.fixedBoundarySec;
  let appliedSec = snappedClampedSec;
  let limitCue: LimitCue = 'none';

  if (input.handle === 'start') {
    const maxStart = input.fixedBoundarySec - minDurationSec;
    if (startSec > maxStart) {
      startSec = maxStart;
      appliedSec = startSec;
      limitCue = 'minDuration';
    }

    if (startSec < minDomain) {
      startSec = minDomain;
      appliedSec = startSec;
      limitCue = 'domainStart';
    } else if (rawWasBelowDomain && limitCue === 'none') {
      limitCue = 'domainStart';
    }

    endSec = input.fixedBoundarySec;
  } else {
    const minEnd = input.fixedBoundarySec + minDurationSec;
    if (endSec < minEnd) {
      endSec = minEnd;
      appliedSec = endSec;
      limitCue = 'minDuration';
    }

    if (endSec > maxDomain) {
      endSec = maxDomain;
      appliedSec = endSec;
      limitCue = 'domainEnd';
    } else if (rawWasAboveDomain && limitCue === 'none') {
      limitCue = 'domainEnd';
    }

    startSec = input.fixedBoundarySec;
  }

  return {
    startSec,
    endSec,
    startNorm: secToNormalized(startSec, minDomain, maxDomain),
    endNorm: secToNormalized(endSec, minDomain, maxDomain),
    rawClampedSec,
    appliedSec,
    limitCue,
    snapSource: limitCue === 'none' ? snapResolved.source : 'none',
  };
}

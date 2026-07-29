export const FIXED_SCAN_DURATION_SECONDS = 24 * 60 * 60;

export type EpochDomain = [number, number];

function resolveDomain(domain: EpochDomain): EpochDomain | null {
  const start = Math.min(domain[0], domain[1]);
  const end = Math.max(domain[0], domain[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return [start, end];
}

export function buildFixedDurationWindow(
  anchorEpoch: number,
  requestedDurationSeconds: number,
  domain: EpochDomain,
): EpochDomain | null {
  const resolvedDomain = resolveDomain(domain);
  if (!resolvedDomain || !Number.isFinite(anchorEpoch) || !Number.isFinite(requestedDurationSeconds)) {
    return null;
  }

  const [domainStart, domainEnd] = resolvedDomain;
  const domainDuration = domainEnd - domainStart;
  const duration = Math.min(Math.max(0, requestedDurationSeconds), domainDuration);
  if (duration <= 0) return null;

  const latestStart = domainEnd - duration;
  const start = Math.min(latestStart, Math.max(domainStart, anchorEpoch - duration / 2));
  return [start, start + duration];
}

export function proposeFixedDurationWindowAtY(
  y: number,
  yToEpoch: (y: number) => number,
  requestedDurationSeconds: number,
  domain: EpochDomain,
): EpochDomain | null {
  if (!Number.isFinite(y)) return null;
  const anchorEpoch = yToEpoch(y);
  return buildFixedDurationWindow(anchorEpoch, requestedDurationSeconds, domain);
}

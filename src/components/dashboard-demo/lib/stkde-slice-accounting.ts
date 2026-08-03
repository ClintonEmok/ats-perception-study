import type { StkdeResponse } from '@/lib/stkde/contracts';

/**
 * Resolve the event count for one rendered dashboard slice by its canonical
 * source identity. A missing response or missing keyed result is unknown; it
 * is deliberately not coerced to zero because zero is a valid server result.
 */
export function resolveSliceEventCount(
  response: StkdeResponse | null | undefined,
  sourceSliceId: string,
): number | null {
  if (!response || !sourceSliceId) return null;

  const result = response.sliceResults?.[sourceSliceId];
  return result ? result.meta.eventCount : null;
}

/**
 * Build an ID-keyed count map for an ordered rendered slice list. Ordering is
 * an input for callers, never an identity mechanism for the response.
 */
export function buildSliceEventCountMap(
  response: StkdeResponse | null | undefined,
  sourceSliceIds: readonly string[],
): Record<string, number | null> {
  return Object.fromEntries(
    sourceSliceIds.map((sourceSliceId) => [
      sourceSliceId,
      resolveSliceEventCount(response, sourceSliceId),
    ]),
  );
}

export const resolveDashboardSliceEventCount = resolveSliceEventCount;
export const buildDashboardSliceEventCountMap = buildSliceEventCountMap;

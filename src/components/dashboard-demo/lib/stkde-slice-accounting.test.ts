import { describe, expect, it } from 'vitest';
import { buildSliceEventCountMap, resolveSliceEventCount } from './stkde-slice-accounting';
import type { StkdeResponse } from '@/lib/stkde/contracts';

const makeResponse = (sliceResults: StkdeResponse['sliceResults']): StkdeResponse => ({
  meta: {
    eventCount: 999,
    computeMs: 1,
    truncated: false,
    requestedComputeMode: 'sampled',
    effectiveComputeMode: 'sampled',
    fallbackApplied: null,
    clampsApplied: [],
  },
  heatmap: { cells: [], maxIntensity: 0 },
  hotspots: [],
  contracts: { scoreVersion: 'stkde-v1' },
  sliceResults,
});

const surface = (eventCount: number) => ({
  meta: {
    eventCount,
    computeMs: 1,
    truncated: false,
    requestedComputeMode: 'sampled' as const,
    effectiveComputeMode: 'sampled' as const,
    fallbackApplied: null,
    clampsApplied: [],
  },
  heatmap: { cells: [], maxIntensity: 0 },
  hotspots: [],
  contracts: { scoreVersion: 'stkde-v1' as const },
});

describe('dashboard STKDE slice accounting', () => {
  it('uses canonical source IDs and preserves a server zero', () => {
    const response = makeResponse({
      'slice-b': surface(0),
      'slice-a': surface(7),
    });

    expect(resolveSliceEventCount(response, 'slice-b')).toBe(0);
    expect(buildSliceEventCountMap(response, ['slice-a', 'slice-b'])).toEqual({
      'slice-a': 7,
      'slice-b': 0,
    });
  });

  it('returns unknown for absent keyed results and never falls back to top-level metadata', () => {
    const response = makeResponse({ 'slice-a': surface(4) });

    expect(resolveSliceEventCount(response, 'slice-missing')).toBeNull();
    expect(resolveSliceEventCount(null, 'slice-a')).toBeNull();
    expect(buildSliceEventCountMap(response, ['slice-missing', 'slice-a'])).toEqual({
      'slice-missing': null,
      'slice-a': 4,
    });
  });

  it('keeps source identity independent from response ordering', () => {
    const response = makeResponse({
      'source-second': surface(22),
      'source-first': surface(11),
    });

    expect(buildSliceEventCountMap(response, ['source-first', 'source-second'])).toEqual({
      'source-first': 11,
      'source-second': 22,
    });
  });
});

import type { CrimeRecord } from '@/types/crime';
import { generateStkde3dMockData, generateStkde3dRealData } from './mock-data';

export const MAX_DATA_PAGES = 100;

export type Stkde3dDatasetPreset = {
  startEpoch: number;
  endEpoch: number;
  limit: number;
};

export type Stkde3dDataset = {
  slices: ReturnType<typeof generateStkde3dMockData>['slices'];
  sliceEvents: ReturnType<typeof generateStkde3dMockData>['sliceEvents'];
  source: 'real' | 'mock';
};

type CrimeRangeResponse = {
  data?: CrimeRecord[];
  meta?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
};

export type Stkde3dFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function getDefaultFetch(): Stkde3dFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('The browser fetch implementation is unavailable');
  }

  return globalThis.fetch.bind(globalThis);
}

/**
 * Load the complete STKDE-3D dataset through the existing cursor-paginated
 * range endpoint. The fetch implementation is injectable so the route and
 * tests share exactly one request lifecycle without reaching around this
 * helper for a second data path.
 */
export async function loadStkde3dDataset(
  preset: Stkde3dDatasetPreset,
  fetchImpl: Stkde3dFetch = getDefaultFetch(),
): Promise<Stkde3dDataset> {
  const records: CrimeRecord[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  for (let page = 0; page < MAX_DATA_PAGES && hasMore; page += 1) {
    const params = new URLSearchParams({
      startEpoch: preset.startEpoch.toString(),
      endEpoch: preset.endEpoch.toString(),
      bufferDays: '0',
      limit: preset.limit.toString(),
    });
    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await fetchImpl(`/api/crimes/range?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as CrimeRangeResponse;
    records.push(...(result.data ?? []));
    hasMore = result.meta?.hasMore === true;
    const nextCursor = result.meta?.nextCursor ?? null;
    if (!hasMore || !nextCursor || nextCursor === cursor) {
      hasMore = false;
      break;
    }
    cursor = nextCursor;
  }

  if (hasMore) {
    throw new Error(`Crime range exceeded the ${MAX_DATA_PAGES}-page limit`);
  }

  const realDataset = generateStkde3dRealData(records);
  return { ...realDataset, source: 'real' };
}

export function loadConfiguredMockStkde3dDataset(): Stkde3dDataset {
  return { ...generateStkde3dMockData(), source: 'mock' };
}

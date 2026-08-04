import type { DemoSelectionPartition } from './demo-burst-generation';
import type { CrimeRecord } from '@/types/crime';

export interface CrimeRangeFetchInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
}

export interface CrimeFetchResult {
  records: CrimeRecord[];
  sampled: boolean;
  limit: number;
}

/** Fetch all pages for one exact millisecond range used by dashboard generators. */
export const fetchCrimeRecordsForRange = async (
  generationInputs: CrimeRangeFetchInputs,
  startMs: number,
  endMs: number,
  limit: number,
): Promise<CrimeFetchResult> => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { records: [], sampled: false, limit };
  }

  const crimeTypes = generationInputs.crimeTypes.filter((type) => type !== 'all-crime-types');
  const records: CrimeRecord[] = [];
  let sampled = false;
  let cursor: string | null = null;

  while (true) {
    const searchParams = new URLSearchParams({
      startEpoch: String(Math.floor(Math.min(startMs, endMs) / 1000)),
      endEpoch: String(Math.floor(Math.max(startMs, endMs) / 1000)),
      bufferDays: '0',
      pageSize: String(limit),
      ...(cursor ? { cursor } : {}),
    });

    if (crimeTypes.length > 0) {
      searchParams.set('crimeTypes', crimeTypes.join(','));
    }

    if (generationInputs.neighbourhood) {
      searchParams.set('districts', generationInputs.neighbourhood);
    }

    const response = await fetch(`/api/crimes/range?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error(`Burst selection crime fetch failed with status ${response.status}`);
    }

    const result = (await response.json()) as {
      data?: CrimeRecord[];
      meta?: {
        sampled?: boolean;
        hasMore?: boolean;
        nextCursor?: string | null;
      };
    };
    const pageRecords = Array.isArray(result.data) ? result.data : [];
    records.push(...pageRecords);
    sampled = sampled || Boolean(result.meta?.sampled);

    if (!result.meta?.hasMore || !result.meta?.nextCursor || pageRecords.length === 0) {
      break;
    }

    cursor = result.meta.nextCursor;
  }

  return {
    records,
    sampled,
    limit,
  };
};

export const fetchCrimeRecordsForPartitions = async (
  generationInputs: CrimeRangeFetchInputs,
  partitions: DemoSelectionPartition[],
  limit: number,
): Promise<CrimeFetchResult> => {
  const results = await Promise.all(
    partitions.map((partition) => fetchCrimeRecordsForRange(
      generationInputs,
      partition.startTime,
      partition.endTime,
      limit,
    )),
  );

  return {
    records: results.flatMap((result) => result.records),
    sampled: results.some((result) => result.sampled),
    limit,
  };
};

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchCrimeRecordsForPartitions } from './fetchCrimeRecordsForRange';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCrimeRecordsForPartitions', () => {
  test('fetches each explicit partition and carries sampled metadata forward', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      const startEpoch = url.searchParams.get('startEpoch');

      return {
        ok: true,
        json: async () => ({
          data: [{
            timestamp: Number(startEpoch),
            type: 'THEFT',
            district: '1',
          }],
          meta: {
            sampled: startEpoch === '0',
            hasMore: false,
            nextCursor: null,
          },
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchCrimeRecordsForPartitions(
      { crimeTypes: [], neighbourhood: null },
      [
        { startTime: 0, endTime: 1_000 },
        { startTime: 1_000, endTime: 3_000 },
      ],
      5000,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.records).toHaveLength(2);
    expect(result.sampled).toBe(true);
    expect(result.limit).toBe(5000);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('startEpoch=0'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('startEpoch=1'));
  });
});

import { describe, expect, test, vi } from 'vitest';
import { loadStkde3dDataset, type Stkde3dDatasetPreset, type Stkde3dFetch } from './dataset-loader';

const PRESET: Stkde3dDatasetPreset = {
  startEpoch: 100,
  endEpoch: 200,
  limit: 2,
};

const RECORD = {
  id: 'crime-1',
  timestamp: 150,
  lat: 41.88,
  lon: -87.64,
  x: 0,
  z: 0,
  type: 'THEFT',
  district: '001',
  year: 1970,
  iucr: '0110',
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(fetchSpy: ReturnType<typeof vi.fn<Stkde3dFetch>>, index: number): URL {
  return new URL(String(fetchSpy.mock.calls[index]?.[0]), 'http://localhost');
}

describe('loadStkde3dDataset', () => {
  test('loads a single page through the injected fetch implementation', async () => {
    const fetchSpy = vi.fn<Stkde3dFetch>().mockResolvedValue(
      response({ data: [RECORD], meta: { hasMore: false, nextCursor: null } }),
    );

    const dataset = await loadStkde3dDataset(PRESET, fetchSpy);

    expect(dataset.source).toBe('real');
    expect(dataset.sliceEvents.flat()).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(requestUrl(fetchSpy, 0).searchParams.get('cursor')).toBeNull();
    expect(requestUrl(fetchSpy, 0).searchParams.get('limit')).toBe('2');
  });

  test('preserves cursor pagination until the API reports completion', async () => {
    const fetchSpy = vi.fn<Stkde3dFetch>()
      .mockResolvedValueOnce(response({ data: [RECORD], meta: { hasMore: true, nextCursor: 'page-2' } }))
      .mockResolvedValueOnce(response({ data: [{ ...RECORD, id: 'crime-2', timestamp: 175 }], meta: { hasMore: false } }));

    const dataset = await loadStkde3dDataset(PRESET, fetchSpy);

    expect(dataset.sliceEvents.flat()).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(requestUrl(fetchSpy, 1).searchParams.get('cursor')).toBe('page-2');
  });

  test('surfaces a failed response instead of silently converting it to mock data', async () => {
    const fetchSpy = vi.fn<Stkde3dFetch>().mockResolvedValue(response({ error: 'offline' }, 503));

    await expect(loadStkde3dDataset(PRESET, fetchSpy)).rejects.toThrow('HTTP 503');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('allows an explicit retry to invoke the same loader lifecycle once more', async () => {
    const fetchSpy = vi.fn<Stkde3dFetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response({ data: [RECORD], meta: { hasMore: false } }));

    await expect(loadStkde3dDataset(PRESET, fetchSpy)).rejects.toThrow('offline');
    const retried = await loadStkde3dDataset(PRESET, fetchSpy);

    expect(retried.source).toBe('real');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

import { CHICAGO_BOUNDS, lonLatToNormalized } from './coordinate-normalization';
import { ensureSortedCrimesTable, getDb, isMockDataEnabled } from './db';
import { createSeededRandom, gaussianish, weightedPick } from './synthetic/prng';
import type { AdaptiveBinningMode } from '@/types/adaptive';
import {
  buildAdaptiveBurstQuery,
  buildAdaptiveDensityQuery,
  buildAdaptiveDomainQuery,
  buildAdaptiveTimestampQuery,
  buildCrimeCountQuery,
  buildCrimesInRangeQuery,
  buildDensityBinsQuery,
  buildGlobalAdaptiveCacheQueries,
  clampAdaptiveBinCount,
  clampKernelWidth,
  computeWarpMap,
  sanitizeTableName,
  smoothSeries,
  toNumber,
} from './queries/index';
import type {
  CrimeRecord,
  DensityBin,
  GlobalAdaptiveMaps,
  QueryCrimesOptions,
  QueryFilters,
} from './queries/index';

export type { CrimeRecord, DensityBin, GlobalAdaptiveMaps, QueryCrimesOptions, QueryFilters } from './queries/index';
export { buildCrimeCoordinateSelectColumns } from './queries/index';

const MOCK_CRIME_TYPES = [
  'THEFT',
  'BATTERY',
  'CRIMINAL DAMAGE',
  'ASSAULT',
  'BURGLARY',
  'ROBBERY',
  'MOTOR VEHICLE THEFT',
  'DECEPTIVE PRACTICE',
];
const MOCK_DISTRICTS = Array.from({ length: 25 }, (_, idx) => String(idx + 1));

type MockHotspot = {
  district: string;
  centerLon: number;
  centerLat: number;
  typeWeights: Partial<Record<string, number>>;
};

const MOCK_HOTSPOTS: MockHotspot[] = [
  { district: '1', centerLon: -87.63, centerLat: 41.88, typeWeights: { THEFT: 4, BATTERY: 3, ROBBERY: 2 } },
  { district: '6', centerLon: -87.66, centerLat: 41.74, typeWeights: { BATTERY: 4, ASSAULT: 3, BURGLARY: 2 } },
  { district: '8', centerLon: -87.71, centerLat: 41.78, typeWeights: { MOTOR_VEHICLE_THEFT: 1, 'MOTOR VEHICLE THEFT': 4, THEFT: 2 } },
  { district: '11', centerLon: -87.72, centerLat: 41.88, typeWeights: { BATTERY: 4, ROBBERY: 3, ASSAULT: 2 } },
  { district: '18', centerLon: -87.64, centerLat: 41.92, typeWeights: { THEFT: 5, DECEPTIVE_PRACTICE: 1, 'DECEPTIVE PRACTICE': 3 } },
  { district: '24', centerLon: -87.68, centerLat: 42.01, typeWeights: { BURGLARY: 4, THEFT: 3, CRIMINAL_DAMAGE: 1, 'CRIMINAL DAMAGE': 2 } },
];

interface AdaptiveCacheRow {
  domain_start: number | bigint;
  domain_end: number | bigint;
  row_count: number | bigint;
  density_json: string;
  count_json?: string | null;
  burstiness_json: string;
  warp_json: string;
  binning_mode?: string | null;
  generated_at: string;
}

type DbLike = Awaited<ReturnType<typeof getDb>>;

const normalizeRange = (start: number, end: number) => {
  if (start <= end) return { start, end };
  return { start: end, end: start };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const EPSILON = 1e-6;

const resolveBinningMode = (value: string | null | undefined): AdaptiveBinningMode => {
  if (value === 'uniform-events') return 'uniform-events';
  return 'uniform-time';
};

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
  for (let i = 1; i < boundaries.length; i += 1) {
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
    if (boundaries[mid] <= value) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

const generateMockCrimeRecords = (
  startEpoch: number,
  endEpoch: number,
  options?: QueryCrimesOptions
): CrimeRecord[] => {
  const limit = options?.limit ?? 50000;
  const recordCount = Math.min(limit, 5000);
  const crimeTypes = options?.crimeTypes?.length ? options.crimeTypes : MOCK_CRIME_TYPES;
  const districts = options?.districts?.length ? options.districts : MOCK_DISTRICTS;
  const { start, end } = normalizeRange(startEpoch, endEpoch);
  const span = Math.max(1, end - start);

  const seed =
    (Math.floor(start / 3600) * 31) ^
    (Math.floor(end / 3600) * 17) ^
    (crimeTypes.join('|').length * 101) ^
    (districts.join('|').length * 53);
  const rng = createSeededRandom(seed);

  const activeHotspots = MOCK_HOTSPOTS.filter((hotspot) => districts.includes(hotspot.district));
  const hotspots =
    activeHotspots.length > 0
      ? activeHotspots
      : districts.map((district) => ({
          district,
          centerLon: CHICAGO_BOUNDS.minLon + rng() * (CHICAGO_BOUNDS.maxLon - CHICAGO_BOUNDS.minLon),
          centerLat: CHICAGO_BOUNDS.minLat + rng() * (CHICAGO_BOUNDS.maxLat - CHICAGO_BOUNDS.minLat),
          typeWeights: {} as Partial<Record<string, number>>,
        }));

  const temporalPeakCount = 3 + Math.floor(rng() * 3);
  const temporalPeaks = Array.from({ length: temporalPeakCount }, () => {
    const center = start + Math.floor(rng() * span);
    const width = Math.max(3600, span * (0.04 + rng() * 0.12));
    return { center, width };
  });

  const records: CrimeRecord[] = [];
  for (let i = 0; i < recordCount; i += 1) {
    const hotspot = hotspots[Math.floor(rng() * hotspots.length)];
    const peak = temporalPeaks[Math.floor(rng() * temporalPeaks.length)];
    const usePeak = rng() < 0.78;
    const timestamp = usePeak
      ? Math.floor(clamp(peak.center + gaussianish(rng) * (peak.width / 2), start, end))
      : Math.floor(start + rng() * span);

    const spatialSpread = 0.015 + rng() * 0.02;
    const lon = clamp(hotspot.centerLon + gaussianish(rng) * spatialSpread, CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.maxLon);
    const lat = clamp(hotspot.centerLat + gaussianish(rng) * spatialSpread, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLat);

    const candidateTypes = crimeTypes;
    const typeWeights = candidateTypes.map((type) => hotspot.typeWeights[type] ?? 1);
    const type = weightedPick(candidateTypes, typeWeights, rng);

    const iucrBase = String(Math.floor(100 + rng() * 900));
    const year = new Date(timestamp * 1000).getUTCFullYear();
    const { x, z } = lonLatToNormalized(lon, lat);

    records.push({
      timestamp,
      type,
      lat,
      lon,
      x,
      z,
      iucr: iucrBase,
      district: hotspot.district,
      year,
    });
  }

  records.sort((a, b) => a.timestamp - b.timestamp);
  return records;
};

const mockCrimeCount = (startEpoch: number, endEpoch: number, filters?: QueryFilters): number => {
  const typeFactor = filters?.crimeTypes?.length ? filters.crimeTypes.length / MOCK_CRIME_TYPES.length : 1;
  const districtFactor = filters?.districts?.length ? filters.districts.length / MOCK_DISTRICTS.length : 1;
  const { start, end } = normalizeRange(startEpoch, endEpoch);
  const spanDays = Math.max(1, (end - start) / 86400);
  const yearScale = spanDays / 365;
  const basePerYear = 100000;
  return Math.max(1000, Math.floor(basePerYear * yearScale * typeFactor * districtFactor));
};

const executeAll = <T>(
  db: Pick<DbLike, 'all'>,
  sql: string,
  params: unknown[]
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const all = db.all as unknown as (this: Pick<DbLike, 'all'>, sql: string, ...args: unknown[]) => void;
    all.call(db, sql, ...params, (err: Error | null, rows: unknown[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });

const executeRun = (db: Pick<DbLike, 'run'>, sql: string, params: unknown[] = []): Promise<void> =>
  new Promise((resolve, reject) => {
    const run = db.run as unknown as (this: Pick<DbLike, 'run'>, sql: string, ...args: unknown[]) => void;
    run.call(db, sql, ...params, (err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

export const queryCrimesInRange = async (
  startEpoch: number,
  endEpoch: number,
  options?: QueryCrimesOptions
): Promise<CrimeRecord[]> => {
  if (isMockDataEnabled()) {
    return generateMockCrimeRecords(startEpoch, endEpoch, options);
  }

  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  const built = buildCrimesInRangeQuery(tableName, startEpoch, endEpoch, options);

  try {
    const rows = await executeAll<Record<string, unknown>>(db, built.sql, built.params);
    return rows.map((row) => ({
      timestamp: typeof row.timestamp === 'bigint' ? Number(row.timestamp) : row.timestamp,
      type: row.type as string,
      lat: typeof row.lat === 'bigint' ? Number(row.lat) : row.lat,
      lon: typeof row.lon === 'bigint' ? Number(row.lon) : row.lon,
      x: typeof row.x === 'bigint' ? Number(row.x) : row.x,
      z: typeof row.z === 'bigint' ? Number(row.z) : row.z,
      iucr: row.iucr as string,
      district: row.district as string,
      year: typeof row.year === 'bigint' ? Number(row.year) : row.year,
    })) as CrimeRecord[];
  } catch (error) {
    console.error('Error querying crimes in range:', error);
    throw error;
  }
};

export const queryCrimeCount = async (
  startEpoch: number,
  endEpoch: number,
  filters?: QueryFilters
): Promise<number> => {
  if (isMockDataEnabled()) {
    return mockCrimeCount(startEpoch, endEpoch, filters);
  }

  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  const built = buildCrimeCountQuery(tableName, startEpoch, endEpoch, filters);

  try {
    const rows = await executeAll<{ count: number | string | bigint }>(db, built.sql, built.params);
    const row = rows[0] as { count: number | string | bigint };
    return typeof row.count === 'bigint'
      ? Number(row.count)
      : typeof row.count === 'string'
        ? parseInt(row.count, 10)
        : row.count;
  } catch (error) {
    console.error('Error querying crime count:', error);
    throw error;
  }
};

export const getOrCreateGlobalAdaptiveMaps = async (
  binCount: number,
  kernelWidth: number,
  binningMode: AdaptiveBinningMode = 'uniform-time'
): Promise<GlobalAdaptiveMaps> => {
  const db = await getDb();
  const tableName = sanitizeTableName(await ensureSortedCrimesTable());
  const cacheTableName = sanitizeTableName('adaptive_global_cache');
  const safeBinCount = clampAdaptiveBinCount(binCount);
  const safeKernelWidth = clampKernelWidth(kernelWidth);
  const safeBinningMode = resolveBinningMode(binningMode);
  const cacheKey = `global:${safeBinCount}:${safeKernelWidth}:${safeBinningMode}`;

  const cacheQueries = buildGlobalAdaptiveCacheQueries(cacheTableName, {
    cacheKey,
    binCount: safeBinCount,
    kernelWidth: safeKernelWidth,
    binningMode: safeBinningMode,
    domain: [0, 0],
    rowCount: 0,
    densityJson: '[]',
    countJson: '[]',
    burstJson: '[]',
    warpJson: '[]',
  });

  await executeRun(db, cacheQueries.ensureTableSql);
  for (const ensureColumnSql of cacheQueries.ensureColumnsSql) {
    await executeRun(db, ensureColumnSql);
  }

  const cached = await executeAll<AdaptiveCacheRow>(db, cacheQueries.readByKey.sql, cacheQueries.readByKey.params);

  if (cached.length > 0) {
    const row = cached[0];
    return {
      binCount: safeBinCount,
      kernelWidth: safeKernelWidth,
      binningMode: resolveBinningMode(row.binning_mode),
      domain: [toNumber(row.domain_start), toNumber(row.domain_end)],
      rowCount: toNumber(row.row_count),
      densityMap: Float32Array.from(JSON.parse(row.density_json) as number[]),
      countMap: Float32Array.from(JSON.parse(row.count_json || row.density_json) as number[]),
      burstinessMap: Float32Array.from(JSON.parse(row.burstiness_json) as number[]),
      warpMap: Float32Array.from(JSON.parse(row.warp_json) as number[]),
      generatedAt: row.generated_at,
    };
  }

  const domainRows = await executeAll<{ min_ts: number | bigint; max_ts: number | bigint; row_count: number | bigint }>(
    db,
    buildAdaptiveDomainQuery(tableName),
    []
  );

  const minTs = toNumber(domainRows[0]?.min_ts);
  const maxTs = toNumber(domainRows[0]?.max_ts);
  const rowCount = toNumber(domainRows[0]?.row_count);
  const domain: [number, number] = [minTs, maxTs > minTs ? maxTs : minTs + 1];

  const countMap = new Float32Array(safeBinCount);
  const densityInput = new Float32Array(safeBinCount);

  if (safeBinningMode === 'uniform-events') {
    const timestampsQuery = buildAdaptiveTimestampQuery(tableName, domain);
    const timestampRows = await executeAll<{ ts: number | bigint }>(db, timestampsQuery.sql, timestampsQuery.params);
    const sorted = timestampRows
      .map((row) => toNumber(row.ts))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    if (sorted.length > 0) {
      const boundaries = new Float32Array(safeBinCount + 1);
      boundaries[0] = domain[0];
      boundaries[safeBinCount] = domain[1];

      const maxTimestampIndex = sorted.length - 1;
      for (let edgeIndex = 1; edgeIndex < safeBinCount; edgeIndex += 1) {
        const target = (edgeIndex * sorted.length) / safeBinCount;
        const sampleIndex = Math.min(maxTimestampIndex, Math.floor(target));
        boundaries[edgeIndex] = sorted[sampleIndex] ?? domain[1];
      }

      ensureStrictlyMonotonicBoundaries(boundaries, domain[0], domain[1]);

      for (const t of sorted) {
        const boundaryIndex = findBoundaryBin(t, boundaries);
        const idx = clampToBin(boundaryIndex, safeBinCount);
        countMap[idx] += 1;
      }

      for (let i = 0; i < safeBinCount; i += 1) {
        const width = Math.max(EPSILON, boundaries[i + 1] - boundaries[i]);
        densityInput[i] = countMap[i] / width;
      }
    }
  } else {
    const densityQuery = buildAdaptiveDensityQuery(tableName, domain, safeBinCount);
    const densityRows = await executeAll<{ idx: number | bigint; count: number | bigint }>(
      db,
      densityQuery.sql,
      densityQuery.params
    );

    for (const row of densityRows) {
      const idx = toNumber(row.idx);
      if (idx >= 0 && idx < safeBinCount) countMap[idx] = toNumber(row.count);
    }

    for (let i = 0; i < safeBinCount; i += 1) {
      densityInput[i] = countMap[i];
    }
  }

  const smoothedDensity = smoothSeries(densityInput, safeKernelWidth);
  let maxDensity = 0;
  for (let i = 0; i < smoothedDensity.length; i += 1) {
    if (smoothedDensity[i] > maxDensity) maxDensity = smoothedDensity[i];
  }
  if (maxDensity <= 0) maxDensity = 1;

  const normalizedDensity = new Float32Array(safeBinCount);
  for (let i = 0; i < smoothedDensity.length; i += 1) {
    normalizedDensity[i] = smoothedDensity[i] / maxDensity;
  }

  const burstQuery = buildAdaptiveBurstQuery(tableName, domain, safeBinCount);
  const burstRows = await executeAll<{ idx: number | bigint; c: number | bigint; s: number | bigint; ss: number | bigint }>(
    db,
    burstQuery.sql,
    burstQuery.params
  );

  const burstinessMap = new Float32Array(safeBinCount);
  for (const row of burstRows) {
    const idx = toNumber(row.idx);
    if (idx < 0 || idx >= safeBinCount) continue;
    const count = toNumber(row.c);
    if (count <= 1) {
      burstinessMap[idx] = 0;
      continue;
    }
    const sum = toNumber(row.s);
    const sumSq = toNumber(row.ss);
    const mean = sum / count;
    const variance = Math.max(0, sumSq / count - mean * mean);
    const sigma = Math.sqrt(variance);
    const denom = sigma + mean;
    const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
    burstinessMap[idx] = Math.max(0, Math.min(1, (burstiness + 1) / 2));
  }

  const warpMap = computeWarpMap(normalizedDensity, domain);

  const densityJson = JSON.stringify(Array.from(normalizedDensity));
  const countJson = JSON.stringify(Array.from(countMap));
  const burstJson = JSON.stringify(Array.from(burstinessMap));
  const warpJson = JSON.stringify(Array.from(warpMap));

  const persistQueries = buildGlobalAdaptiveCacheQueries(cacheTableName, {
    cacheKey,
    binCount: safeBinCount,
    kernelWidth: safeKernelWidth,
    binningMode: safeBinningMode,
    domain,
    rowCount,
    densityJson,
    countJson,
    burstJson,
    warpJson,
  });

  await executeRun(db, persistQueries.deleteByKey.sql, persistQueries.deleteByKey.params);
  await executeRun(db, persistQueries.insert.sql, persistQueries.insert.params);

  return {
    binCount: safeBinCount,
    kernelWidth: safeKernelWidth,
    binningMode: safeBinningMode,
    domain,
    rowCount,
    densityMap: normalizedDensity,
    countMap,
    burstinessMap,
    warpMap,
    generatedAt: new Date().toISOString(),
  };
};

export const queryDensityBins = async (
  startEpoch: number,
  endEpoch: number,
  resX: number,
  resY: number,
  resZ: number
): Promise<DensityBin[]> => {
  const db = await getDb();
  const tableName = sanitizeTableName(await ensureSortedCrimesTable());
  const query = buildDensityBinsQuery(tableName, startEpoch, endEpoch, resX, resY, resZ);

  const rows = await executeAll<Record<string, unknown>>(db, query.sql, query.params).catch((err) => {
    console.error('Error querying density bins:', err);
    throw err;
  });

  return rows.map((row) => ({
    x: typeof row.x === 'bigint' ? Number(row.x) : row.x,
    y: typeof row.y === 'bigint' ? Number(row.y) : row.y,
    z: typeof row.z === 'bigint' ? Number(row.z) : row.z,
    count: typeof row.count === 'bigint' ? Number(row.count) : row.count,
    dominantType: row.dominantType as string,
  })) as DensityBin[];
};

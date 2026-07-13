import { ensureSortedCrimesTable, getDb } from '@/lib/db';
import type { StkdeRequest } from './contracts';
import { buildStkdeGridConfig, type StkdeGridConfig } from './compute';

type DbLike = {
  all: (...args: unknown[]) => void;
};

const executeAll = <T>(db: DbLike, sql: string, params: unknown[]): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: unknown[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });

export interface FullPopulationBucket {
  bucketStartEpochSec: number;
  count: number;
}

export interface FullPopulationStkdeStats {
  scannedRows: number;
  aggregatedCells: number;
  queryMs: number;
  chunks: number;
}

export interface FullPopulationStkdeInputs {
  grid: StkdeGridConfig;
  cellSupport: Float64Array;
  cellTemporalBuckets: Map<number, FullPopulationBucket[]>;
  eventCount: number;
  stats: FullPopulationStkdeStats;
}

interface BuildOptions {
  chunkSize?: number;
  signal?: AbortSignal;
}

interface AggregatedRow {
  row_idx: number | bigint;
  col_idx: number | bigint;
  bucket_start: number | bigint;
  bucket_count: number | bigint;
}

interface CountRow {
  count: number | bigint;
}

const toNumber = (value: number | bigint) => (typeof value === 'bigint' ? Number(value) : value);

const appendCrimeFilters = (request: StkdeRequest, params: unknown[]) => {
  const filters: string[] = [
    '"Date" IS NOT NULL',
    '"Latitude" IS NOT NULL AND "Longitude" IS NOT NULL',
    'EXTRACT(EPOCH FROM "Date") >= ?',
    'EXTRACT(EPOCH FROM "Date") <= ?',
  ];
  params.push(request.domain.startEpochSec, request.domain.endEpochSec);

  if (request.filters.crimeTypes?.length) {
    const placeholders = request.filters.crimeTypes.map(() => '?').join(', ');
    filters.push(`"Primary Type" IN (${placeholders})`);
    params.push(...request.filters.crimeTypes);
  }

  if (request.filters.districts?.length) {
    const placeholders = request.filters.districts.map(() => '?').join(', ');
    filters.push(`"District" IN (${placeholders})`);
    params.push(...request.filters.districts);
  }

  const bbox = request.filters.bbox;
  if (bbox) {
    filters.push('"Longitude" >= ? AND "Longitude" <= ?');
    filters.push('"Latitude" >= ? AND "Latitude" <= ?');
    params.push(bbox[0], bbox[2], bbox[1], bbox[3]);
  }

  return filters.join(' AND ');
};

export async function buildFullPopulationStkdeInputs(
  request: StkdeRequest,
  options?: BuildOptions,
): Promise<FullPopulationStkdeInputs> {
  const startedAt = performance.now();
  const chunkSize = Math.max(1, options?.chunkSize ?? 20_000);
  const db = (await getDb()) as unknown as DbLike;
  const tableName = await ensureSortedCrimesTable();
  const grid = buildStkdeGridConfig(request);
  const cellCount = grid.rows * grid.cols;
  const cellSupport = new Float64Array(cellCount);
  const cellTemporalBuckets = new Map<number, FullPopulationBucket[]>();
  let eventCount = 0;

  const filterParams: unknown[] = [];
  const whereSql = appendCrimeFilters(request, filterParams);
  const countSql = `
    SELECT COUNT(*) as count
    FROM ${tableName}
    WHERE ${whereSql}
  `;
  const countRows = await executeAll<CountRow>(db, countSql, [...filterParams]);
  const scannedRows = countRows[0] ? toNumber(countRows[0].count) : 0;

  // Keep aggregation at a fixed hourly resolution so temporal bandwidth
  // changes the smoothing stage rather than the underlying bucket geometry.
  const bucketSizeSec = 3600;

  const aggregateSql = `
    WITH filtered AS (
      SELECT
        EXTRACT(EPOCH FROM "Date") as ts,
        "Latitude" as lat,
        "Longitude" as lon
      FROM ${tableName}
      WHERE ${whereSql}
    ), aggregated AS (
      SELECT
        CAST(FLOOR((lon - ?) / ?) AS INTEGER) as col_idx,
        CAST(FLOOR((lat - ?) / ?) AS INTEGER) as row_idx,
        CAST(FLOOR(ts / ?) * ? AS BIGINT) as bucket_start,
        COUNT(*) as bucket_count
      FROM filtered
      GROUP BY 1, 2, 3
    )
    SELECT row_idx, col_idx, bucket_start, bucket_count
    FROM aggregated
    WHERE row_idx >= 0 AND row_idx < ?
      AND col_idx >= 0 AND col_idx < ?
    ORDER BY row_idx, col_idx, bucket_start
    LIMIT ? OFFSET ?
  `;

  const baseAggregateParams: unknown[] = [
    ...filterParams,
    grid.minLng,
    grid.lonCellDegrees,
    grid.minLat,
    grid.latCellDegrees,
    bucketSizeSec,
    bucketSizeSec,
    grid.rows,
    grid.cols,
  ];

  let offset = 0;
  let chunks = 0;
  while (true) {
    if (options?.signal?.aborted) {
      throw new Error('full-population-aborted');
    }
    const rows = await executeAll<AggregatedRow>(db, aggregateSql, [...baseAggregateParams, chunkSize, offset]);
    if (rows.length === 0) break;
    chunks += 1;

    for (const row of rows) {
      const rowIndex = toNumber(row.row_idx);
      const colIndex = toNumber(row.col_idx);
      const bucketStartEpochSec = toNumber(row.bucket_start);
      const bucketCount = toNumber(row.bucket_count);
      if (rowIndex < 0 || colIndex < 0 || rowIndex >= grid.rows || colIndex >= grid.cols) {
        continue;
      }
      const idx = rowIndex * grid.cols + colIndex;
      cellSupport[idx] += bucketCount;
      eventCount += bucketCount;
      const existing = cellTemporalBuckets.get(idx);
      const nextBucket = { bucketStartEpochSec, count: bucketCount };
      if (existing) {
        existing.push(nextBucket);
      } else {
        cellTemporalBuckets.set(idx, [nextBucket]);
      }
    }

    offset += rows.length;
    if (rows.length < chunkSize) break;
  }

  return {
    grid,
    cellSupport,
    cellTemporalBuckets,
    eventCount,
    stats: {
      scannedRows,
      aggregatedCells: cellTemporalBuckets.size,
      queryMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
      chunks,
    },
  };
}

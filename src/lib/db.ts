import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';

type DuckDbInstance = {
  exec: (sql: string, callback: (err: Error | null) => void) => void;
  all: (
    sql: string,
    ...args: [...unknown[], (err: Error | null, rows: unknown[]) => void] | []
  ) => void;
  run: (sql: string, callback: (err: Error | null) => void) => void;
};

declare global {
  var __quietTigerDuckDb: DuckDbInstance | undefined;
  var __quietTigerDuckDbInitPromise: Promise<DuckDbInstance> | undefined;
  var __quietTigerDuckDbSortedTablePromise: Promise<string> | undefined;
  var __quietTigerDuckDbSummaryPromise: Promise<void> | undefined;
}

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'cache', 'crime.duckdb');
const DEFAULT_DUCKDB_THREADS = '2';
const OVERVIEW_SUMMARY_BIN_COUNT = 120;

export interface DatasetMetadata {
  minTime: number;
  maxTime: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  count: number;
  crimeTypes: string[];
  yearRange: { min: number; max: number };
  isMock?: boolean;
}

export interface OverviewSummaryBin {
  x0: number;
  x1: number;
  length: number;
}

export const isMockDataEnabled = (): boolean => {
  const raw = (process.env.USE_MOCK_DATA ?? process.env.DISABLE_DUCKDB ?? '').trim();
  if (!raw) return true;
  const normalized = raw.toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

/**
 * Get the path to the crime data CSV file.
 * The CSV contains ~8.5M rows from 2001-2026.
 */
export const getDataPath = (): string => {
  const configuredPath = process.env.DATASET_PATH?.trim();
  if (configuredPath) {
    return isAbsolute(configuredPath)
      ? configuredPath
      : resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
  }

  return join(process.cwd(), 'data', 'sources', 'Crimes_-_2001_to_Present_20260114.csv');
};

const getDatasetFingerprint = (): string | null => {
  const dataPath = getDataPath();
  if (!existsSync(dataPath)) {
    return null;
  }

  const stat = statSync(dataPath);
  return `${stat.size}:${stat.mtimeMs}`;
};

const runSql = async (database: DuckDbInstance, sql: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    database.run(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const queryRows = async <T>(database: DuckDbInstance, sql: string): Promise<T[]> =>
  new Promise((resolve, reject) => {
    database.all(sql, (err, rows: unknown[]) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows as T[]);
    });
  });

export const getDbPath = (): string => {
  const configuredPath = process.env.DUCKDB_PATH?.trim();
  if (!configuredPath) return DEFAULT_DB_PATH;
  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
};

const getDuckDbThreads = (): string => {
  return process.env.DUCKDB_THREADS?.trim() || DEFAULT_DUCKDB_THREADS;
};

const configureDatabase = async (database: DuckDbInstance): Promise<void> => {
  const statements = [
    `SET threads=${getDuckDbThreads()}`,
    `SET preserve_insertion_order=false`,
  ];

  for (const statement of statements) {
    await new Promise<void>((resolve, reject) => {
      database.exec(statement, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
};

/**
 * Parse a date string in "MM/DD/YYYY HH:MM:SS A" format (US date format)
 * and return a Date object.
 * 
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Parsed Date object
 */
export const parseDate = (dateStr: string): Date => {
  // DuckDB format: '%m/%d/%Y %I:%M:%S %p'
  // This parses "01/05/2026 12:00:00 AM" to a proper Date
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed;
};

/**
 * Parse a date string and return Unix epoch seconds.
 * Handles "MM/DD/YYYY HH:MM:SS A" format.
 * 
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Unix epoch seconds
 */
export const epochSeconds = (dateStr: string): number => {
  return Math.floor(parseDate(dateStr).getTime() / 1000);
};

export const getDb = async (): Promise<DuckDbInstance> => {
  if (isMockDataEnabled()) {
    throw new Error('DuckDB disabled via USE_MOCK_DATA/DISABLE_DUCKDB');
  }

  if (globalThis.__quietTigerDuckDb) {
    return globalThis.__quietTigerDuckDb;
  }

  if (!globalThis.__quietTigerDuckDbInitPromise) {
    globalThis.__quietTigerDuckDbInitPromise = (async () => {
      const dbPath = getDbPath();
      mkdirSync(dirname(dbPath), { recursive: true });

      const duckdb = await import('duckdb');
      const database = await new Promise<DuckDbInstance>((resolve, reject) => {
        const instance = new duckdb.default.Database(dbPath, (err?: Error | null) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(instance);
        });
      });

      await configureDatabase(database as DuckDbInstance);

      globalThis.__quietTigerDuckDb = database;
      console.log(
        `DuckDB initialized at ${dbPath} (threads=${getDuckDbThreads()})`,
      );

      return database;
    })().catch((error) => {
      globalThis.__quietTigerDuckDbInitPromise = undefined;
      throw error;
    });
  }

  return globalThis.__quietTigerDuckDbInitPromise;
};

/**
 * Ensure the sorted crimes table exists for zone map optimization.
 * Creates a sorted copy of the crimes data ordered by Date column,
 * which enables DuckDB to skip irrelevant row groups when querying date ranges.
 * 
 * @returns The table name to use for queries ('crimes_sorted')
 */
const materializeSortedCrimesTable = async (): Promise<string> => {
  const database = await getDb();
  const dataPath = getDataPath();

  return new Promise((resolve, reject) => {
    // First check if table already exists
    database.all("SELECT name FROM sqlite_master WHERE type='table' AND name='crimes_sorted'", (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error checking for crimes_sorted table:', err);
        reject(err);
        return;
      }
      
      const tables = rows as { name: string }[];
      if (tables.length > 0) {
        // Table exists, use it
        console.log('crimes_sorted table already exists');
        resolve('crimes_sorted');
        return;
      }
      
      // Table doesn't exist, create it
      console.log('Creating crimes_sorted table (zone map optimized)...');
      
      const createQuery = `
        CREATE TABLE crimes_sorted AS 
        SELECT * FROM read_csv_auto('${dataPath}')
        WHERE "Date" IS NOT NULL
        ORDER BY "Date"
      `;

      database.run(createQuery, (runErr: Error | null) => {
        if (runErr) {
          console.error('Error creating crimes_sorted table:', runErr);
          reject(runErr);
          return;
        }

        console.log('crimes_sorted table ready with zone map optimization');
        resolve('crimes_sorted');
      });
    });
  });
};

export const ensureSortedCrimesTable = async (): Promise<string> => {
  if (globalThis.__quietTigerDuckDbSortedTablePromise) {
    return globalThis.__quietTigerDuckDbSortedTablePromise;
  }

  globalThis.__quietTigerDuckDbSortedTablePromise = materializeSortedCrimesTable().finally(() => {
    globalThis.__quietTigerDuckDbSortedTablePromise = undefined;
  });

  return globalThis.__quietTigerDuckDbSortedTablePromise;
};

const materializeSummaryTables = async (): Promise<void> => {
  if (isMockDataEnabled()) {
    return;
  }

  const dataPath = getDataPath();
  if (!existsSync(dataPath)) {
    return;
  }

  const database = await getDb();
  const currentFingerprint = getDatasetFingerprint();
  if (!currentFingerprint) {
    return;
  }

  await runSql(database, `CREATE TABLE IF NOT EXISTS crime_dataset_state (dataset_fingerprint VARCHAR, generated_at TIMESTAMP)`);

  try {
    const rows = await queryRows<{ dataset_fingerprint: string }>(
      database,
      'SELECT dataset_fingerprint FROM crime_dataset_state LIMIT 1'
    );

    if (rows[0]?.dataset_fingerprint === currentFingerprint) {
      return;
    }
  } catch {
    // Rebuild below.
  }

  await ensureSortedCrimesTable();

  await runSql(
    database,
    `CREATE OR REPLACE TABLE crime_dataset_meta AS
      SELECT
        MIN(EXTRACT(EPOCH FROM "Date")) AS min_time,
        MAX(EXTRACT(EPOCH FROM "Date")) AS max_time,
        MIN("Latitude") AS min_lat,
        MAX("Latitude") AS max_lat,
        MIN("Longitude") AS min_lon,
        MAX("Longitude") AS max_lon,
        COUNT(*) AS count,
        GROUP_CONCAT(DISTINCT "Primary Type", ',') AS crime_types,
        MIN("Year") AS min_year,
        MAX("Year") AS max_year
      FROM crimes_sorted
      WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL`
  );

  await runSql(
    database,
    `CREATE OR REPLACE TABLE crime_overview_bins_medium AS
      WITH ordered AS (
        SELECT
          NTILE(${OVERVIEW_SUMMARY_BIN_COUNT}) OVER (ORDER BY "Date") AS bin_index,
          EXTRACT(EPOCH FROM "Date") AS timestamp_sec,
          "Primary Type" AS primary_type,
          "District" AS district
        FROM crimes_sorted
        WHERE "Date" IS NOT NULL
      )
      SELECT
        bin_index,
        MIN(timestamp_sec) AS x0,
        MAX(timestamp_sec) AS x1,
        primary_type,
        district,
        COUNT(*) AS length
      FROM ordered
      GROUP BY bin_index, primary_type, district
      ORDER BY bin_index`
  );

  await runSql(database, 'DELETE FROM crime_dataset_state');
  await runSql(
    database,
    `INSERT INTO crime_dataset_state (dataset_fingerprint, generated_at)
      VALUES ('${currentFingerprint.replace(/'/g, "''")}', CURRENT_TIMESTAMP)`
  );
};

export const ensureCrimeSummaryTables = async (): Promise<void> => {
  if (globalThis.__quietTigerDuckDbSummaryPromise) {
    return globalThis.__quietTigerDuckDbSummaryPromise;
  }

  globalThis.__quietTigerDuckDbSummaryPromise = materializeSummaryTables().finally(() => {
    globalThis.__quietTigerDuckDbSummaryPromise = undefined;
  });

  return globalThis.__quietTigerDuckDbSummaryPromise;
};

export const readDatasetMetadata = async (): Promise<DatasetMetadata> => {
  await ensureCrimeSummaryTables();

  const database = await getDb();
  const rows = await queryRows<{
    min_time: number | string | bigint;
    max_time: number | string | bigint;
    min_lat: number | string | bigint;
    max_lat: number | string | bigint;
    min_lon: number | string | bigint;
    max_lon: number | string | bigint;
    count: number | string | bigint;
    crime_types: string | null;
    min_year: number | string | bigint | null;
    max_year: number | string | bigint | null;
  }>(database, 'SELECT * FROM crime_dataset_meta LIMIT 1');

  const row = rows[0];
  if (!row) {
    throw new Error('No metadata found');
  }

  return {
    minTime: Number(row.min_time),
    maxTime: Number(row.max_time),
    minLat: Number(row.min_lat),
    maxLat: Number(row.max_lat),
    minLon: Number(row.min_lon),
    maxLon: Number(row.max_lon),
    count: Number(row.count),
    crimeTypes: (row.crime_types ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .sort(),
    yearRange: {
      min: Number(row.min_year ?? 0),
      max: Number(row.max_year ?? 0),
    },
  };
};

export const readOverviewBins = async (maxPoints: number, filters?: { crimeTypes?: string[]; districts?: string[] }): Promise<OverviewSummaryBin[]> => {
  await ensureCrimeSummaryTables();

  const database = await getDb();
  const safeMaxPoints = Math.max(1, Math.floor(maxPoints));
  const crimeTypeFilter = filters?.crimeTypes?.length
    ? `AND primary_type IN (${filters.crimeTypes.map((type) => `'${type.replace(/'/g, "''")}'`).join(', ')})`
    : '';
  const districtFilter = filters?.districts?.length
    ? `AND district IN (${filters.districts.map((district) => `'${district.replace(/'/g, "''")}'`).join(', ')})`
    : '';

  const rows = await queryRows<{
    x0: number | string | bigint;
    x1: number | string | bigint;
    length: number | string | bigint;
  }>(
    database,
    `WITH filtered AS (
      SELECT bin_index, x0, x1, length
      FROM crime_overview_bins_medium
      WHERE 1=1
        ${crimeTypeFilter}
        ${districtFilter}
    ), rebucketed AS (
      SELECT
        NTILE(${safeMaxPoints}) OVER (ORDER BY bin_index) AS output_bucket,
        x0,
        x1,
        length
      FROM filtered
    )
    SELECT MIN(x0) AS x0, MAX(x1) AS x1, SUM(length) AS length
    FROM rebucketed
    GROUP BY output_bucket
    ORDER BY MIN(x0)`
  );

  return rows.map((row) => ({
    x0: Number(row.x0),
    x1: Number(row.x1),
    length: Number(row.length),
  }));
};

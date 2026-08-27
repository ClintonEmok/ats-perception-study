import { existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(resolve(root, 'data/manifest.json'), 'utf8'));
const dataPath = process.env.DATASET_PATH
  ? (isAbsolute(process.env.DATASET_PATH) ? process.env.DATASET_PATH : resolve(root, process.env.DATASET_PATH))
  : resolve(root, 'data/sources', manifest.filename);
const dbPath = process.env.DUCKDB_PATH
  ? (isAbsolute(process.env.DUCKDB_PATH) ? process.env.DUCKDB_PATH : resolve(root, process.env.DUCKDB_PATH))
  : join(root, 'data/cache/crime.duckdb');

if (!existsSync(dataPath)) {
  throw new Error(`Dataset not found: ${dataPath}. Run pnpm dataset:verify for setup guidance.`);
}

const sqlPath = dataPath.replaceAll("'", "''");
const fingerprint = `${statSync(dataPath).size}:${statSync(dataPath).mtimeMs}`;
mkdirSync(dirname(dbPath), { recursive: true });

const duckdb = await import('duckdb');
const database = await new Promise((resolveDatabase, reject) => {
  const instance = new duckdb.default.Database(dbPath, (error) => {
    if (error) reject(error);
    else resolveDatabase(instance);
  });
});

const run = (sql) => new Promise((resolveRun, reject) => {
  database.run(sql, (error) => (error ? reject(error) : resolveRun()));
});

await run('SET threads=2');
await run('SET preserve_insertion_order=false');
await run(`CREATE OR REPLACE TABLE crimes_sorted AS
  SELECT * FROM read_csv_auto('${sqlPath}')
  WHERE "Date" IS NOT NULL
  ORDER BY "Date"`);
await run(`CREATE OR REPLACE TABLE crime_dataset_meta AS
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
  WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL`);
await run(`CREATE OR REPLACE TABLE crime_overview_bins_medium AS
  WITH ordered AS (
    SELECT
      NTILE(120) OVER (ORDER BY "Date") AS bin_index,
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
  ORDER BY bin_index`);
await run('CREATE TABLE IF NOT EXISTS crime_dataset_state (dataset_fingerprint VARCHAR, generated_at TIMESTAMP)');
await run('DELETE FROM crime_dataset_state');
await run(`INSERT INTO crime_dataset_state VALUES ('${fingerprint}', CURRENT_TIMESTAMP)`);

console.log(`DuckDB dataset built at ${dbPath}`);
database.close();

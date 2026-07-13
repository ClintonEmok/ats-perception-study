import { NextResponse } from 'next/server';
import { getDb, isMockDataEnabled } from '@/lib/db';

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
// Prevent static optimization
export const dynamic = 'force-dynamic';

interface FacetItem {
  name: string;
  count: number;
}

interface FacetsResponse {
  types: FacetItem[];
  districts: FacetItem[];
}

interface ColumnInfo {
  typeColumn: string;
  districtColumn: string | null;
  timestampColumn: string;
}

type DuckDbLike = Awaited<ReturnType<typeof getDb>>;

const DATA_PATH = 'data/crime.parquet';
let columnInfo: ColumnInfo | null = null;

const MOCK_FACETS: FacetsResponse = {
  types: [
    { name: 'THEFT', count: 2200 },
    { name: 'BATTERY', count: 1800 },
    { name: 'CRIMINAL DAMAGE', count: 1400 },
    { name: 'ASSAULT', count: 900 },
    { name: 'BURGLARY', count: 700 },
    { name: 'ROBBERY', count: 500 },
  ],
  districts: [
    { name: '1', count: 900 },
    { name: '2', count: 850 },
    { name: '3', count: 820 },
    { name: '4', count: 780 },
    { name: '5', count: 720 },
    { name: '6', count: 650 },
  ]
};

const quoteIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

const selectFirst = (columns: Set<string>, candidates: string[]) =>
  candidates.find((candidate) => columns.has(candidate)) || null;

const resolveColumnInfo = async (connection: DuckDbLike): Promise<ColumnInfo> => {
  if (columnInfo) return columnInfo;

  const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
    connection.all(`SELECT * FROM '${DATA_PATH}' LIMIT 1`, (err: Error | null, res: unknown[]) => {
      if (err) reject(err);
      else resolve(res as Record<string, unknown>[]);
    });
  });

  const columns = new Set<string>(rows[0] ? Object.keys(rows[0]) : []);
  const typeColumn = selectFirst(columns, ['Primary Type', 'primary_type', 'type']);
  const districtColumn = selectFirst(columns, ['District', 'district']);
  const timestampColumn = selectFirst(columns, ['timestamp', 'Date', 'date']);

  if (!typeColumn) {
    throw new Error('Type column not found in crime.parquet');
  }

  if (!timestampColumn) {
    throw new Error('Timestamp column not found in crime.parquet');
  }

  columnInfo = { typeColumn, districtColumn, timestampColumn };
  return columnInfo;
};

const normalizeEpochSeconds = (value: number) => (value > 1_000_000_000_000 ? Math.floor(value / 1000) : value);

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Validate query parameters
    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required parameters: start and end' },
        { status: 400 }
      );
    }

    const startTime = parseInt(start, 10);
    const endTime = parseInt(end, 10);

    if (isNaN(startTime) || isNaN(endTime)) {
      return NextResponse.json(
        { error: 'Invalid parameters: start and end must be valid numbers' },
        { status: 400 }
      );
    }

    if (isMockDataEnabled()) {
      return NextResponse.json(MOCK_FACETS, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=5, stale-while-revalidate=10',
          'X-Content-Type-Options': 'nosniff',
          'X-Data-Warning': 'Using demo data - database disabled',
        },
      });
    }

    const db = await getDb();
    // const connection = db.connect(); // Not needed for in-memory or when using db.all directly

    const { typeColumn, districtColumn, timestampColumn } = await resolveColumnInfo(db);
    const startEpoch = normalizeEpochSeconds(startTime);
    const endEpoch = normalizeEpochSeconds(endTime);
    const timeColumn = quoteIdentifier(timestampColumn);

    // Build time range filter condition
    const timeFilter = `epoch(CAST(${timeColumn} AS TIMESTAMP)) BETWEEN ${startEpoch} AND ${endEpoch}`;

    // Execute both aggregations in parallel
    const typeColumnSql = quoteIdentifier(typeColumn);
    const districtColumnSql = districtColumn ? quoteIdentifier(districtColumn) : null;

    const [typesResult, districtsResult] = await Promise.all([
      // Query for Primary Type counts
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const query = `
          SELECT 
            ${typeColumnSql} as name, 
            COUNT(*) as count 
           FROM '${DATA_PATH}' 
           WHERE ${timeFilter}
           GROUP BY 1
           ORDER BY count DESC
         `;
         db.all(query, (err: Error | null, res: unknown[]) => {
           if (err) reject(err);
           else resolve(res as Record<string, unknown>[]);
         });
      }),

      // Query for District counts
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const query = districtColumnSql
          ? `
            SELECT 
              ${districtColumnSql} as name, 
              COUNT(*) as count 
            FROM '${DATA_PATH}' 
            WHERE ${timeFilter}
            GROUP BY 1
             ORDER BY count DESC
           `
           : `
             SELECT 
               'Unknown' as name, 
               COUNT(*) as count 
             FROM '${DATA_PATH}' 
             WHERE ${timeFilter}
           `;
         db.all(query, (err: Error | null, res: unknown[]) => {
           if (err) reject(err);
           else resolve(res as Record<string, unknown>[]);
         });
      }),
    ]);

    // Format the response
    const response: FacetsResponse = {
      types: typesResult.map(row => ({
        name: String(row.name || 'Unknown'),
        count: Number(row.count || 0),
      })),
      districts: districtsResult.map(row => ({
        name: String(row.name || 'Unknown'),
        count: Number(row.count || 0),
      })),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=5, stale-while-revalidate=10',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('Facets API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getDb, ensureSortedCrimesTable, isMockDataEnabled } from '@/lib/db';

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

    const tableName = await ensureSortedCrimesTable();
    const db = await getDb();

    // Execute both aggregations in parallel
    const [typesResult, districtsResult] = await Promise.all([
      // Query for Primary Type counts
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const query = `
          SELECT
            "Primary Type" AS name,
            COUNT(*) AS count
          FROM ${tableName}
          WHERE "Date" IS NOT NULL
            AND EXTRACT(EPOCH FROM "Date") BETWEEN ? AND ?
          GROUP BY 1
          ORDER BY count DESC
        `;
        db.all(query, startTime, endTime, (err: Error | null, res: unknown[]) => {
          if (err) reject(err);
          else resolve(res as Record<string, unknown>[]);
        });
      }),

      // Query for District counts
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const query = `
          SELECT
            "District" AS name,
            COUNT(*) AS count
          FROM ${tableName}
          WHERE "Date" IS NOT NULL
            AND "District" IS NOT NULL
            AND EXTRACT(EPOCH FROM "Date") BETWEEN ? AND ?
          GROUP BY 1
          ORDER BY count DESC
        `;
        db.all(query, startTime, endTime, (err: Error | null, res: unknown[]) => {
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

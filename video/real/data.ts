import weekData from '../data/real-week.json';

export type RealCrimeRecord = {
  timestamp: number;
  type: string;
  lat: number;
  lon: number;
  x: number;
  z: number;
  district: string;
};

export const WEEK_START = weekData.startEpoch;
export const WEEK_END = weekData.endEpoch;
export const SELECTED_START = Date.parse('2025-07-31T00:00:00Z') / 1000;
export const SELECTED_END = Date.parse('2025-08-01T00:00:00Z') / 1000;
export const REAL_WEEK_RECORDS = weekData.records as RealCrimeRecord[];
export const SOURCE_RECORD_COUNT = weekData.sourceRecordCount;

export const CATEGORY_COLORS: Record<string, string> = {
  THEFT: '#2563eb',
  BATTERY: '#e11d48',
  'CRIMINAL DAMAGE': '#7c3aed',
  ASSAULT: '#ea580c',
  BURGLARY: '#0891b2',
  ROBBERY: '#059669',
  'MOTOR VEHICLE THEFT': '#ca8a04',
};

export const colorForType = (type: string): string => CATEGORY_COLORS[type] ?? '#64748b';

export const isSelectedRecord = (record: RealCrimeRecord): boolean =>
  record.timestamp >= SELECTED_START && record.timestamp < SELECTED_END;

const selectedRecords = REAL_WEEK_RECORDS.filter(isSelectedRecord);
const selectedTypeCounts = selectedRecords.reduce<Record<string, number>>((counts, record) => {
  counts[record.type] = (counts[record.type] ?? 0) + 1;
  return counts;
}, {});
const selectedHourCounts = selectedRecords.reduce<number[]>((counts, record) => {
  counts[new Date(record.timestamp * 1000).getUTCHours()] += 1;
  return counts;
}, Array.from({ length: 24 }, () => 0));

export const SELECTED_RECORD_COUNT = selectedRecords.length;
export const SELECTED_TOP_CRIME = Object.entries(selectedTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
export const SELECTED_PEAK_HOUR = selectedHourCounts.indexOf(Math.max(...selectedHourCounts));

export const DAILY_COUNTS = Array.from({ length: 7 }, (_, day) =>
  REAL_WEEK_RECORDS.filter((record) => Math.floor((record.timestamp - WEEK_START) / 86400) === day).length,
);
export const SELECTED_HOURLY_COUNTS = Array.from({ length: 24 }, (_, hour) =>
  selectedRecords.filter((record) => new Date(record.timestamp * 1000).getUTCHours() === hour).length,
);

export type AdaptiveDayLayout = {
  start: number;
  end: number;
  center: number;
  width: number;
  count: number;
};

export const buildAdaptiveDayLayout = (warpProgress: number, multiplier: number): AdaptiveDayLayout[] => {
  const minimum = Math.min(...DAILY_COUNTS);
  const maximum = Math.max(...DAILY_COUNTS);
  const weights = DAILY_COUNTS.map((count) => {
    const normalizedDensity = maximum === minimum ? 0.5 : (count - minimum) / (maximum - minimum);
    const adaptiveWeight = Math.max(0.3, Math.min(2.2, 1 + (normalizedDensity - 0.5) * 0.9 * multiplier));
    return 1 + (adaptiveWeight - 1) * warpProgress;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return weights.map((weight, day) => {
    const width = weight / totalWeight;
    const start = cursor;
    const end = start + width;
    cursor = end;
    return { start, end, center: (start + end) / 2, width, count: DAILY_COUNTS[day] };
  });
};

export const buildAdaptiveHourLayout = (warpProgress: number, multiplier: number): AdaptiveDayLayout[] => {
  const minimum = Math.min(...SELECTED_HOURLY_COUNTS);
  const maximum = Math.max(...SELECTED_HOURLY_COUNTS);
  const weights = SELECTED_HOURLY_COUNTS.map((count) => {
    const normalizedDensity = maximum === minimum ? 0.5 : (count - minimum) / (maximum - minimum);
    const adaptiveWeight = Math.max(0.22, Math.min(2.4, 1 + (normalizedDensity - 0.5) * 0.82 * multiplier));
    return 1 + (adaptiveWeight - 1) * warpProgress;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return weights.map((weight, hour) => {
    const width = weight / totalWeight;
    const start = cursor;
    const end = start + width;
    cursor = end;
    return { start, end, center: (start + end) / 2, width, count: SELECTED_HOURLY_COUNTS[hour] };
  });
};

type AggregatedCell = {
  x: number;
  z: number;
  time: number;
  count: number;
  selectedCount: number;
  dominantType: string;
};

const aggregateRecords = ({ spatialBins, timeBins }: { spatialBins: number; timeBins: number }): AggregatedCell[] => {
  const cells = new Map<string, AggregatedCell & { types: Record<string, number> }>();
  for (const record of REAL_WEEK_RECORDS) {
    const xIndex = Math.max(0, Math.min(spatialBins - 1, Math.floor(((record.x + 50) / 100) * spatialBins)));
    const zIndex = Math.max(0, Math.min(spatialBins - 1, Math.floor(((record.z + 50) / 100) * spatialBins)));
    const timeIndex = Math.max(0, Math.min(timeBins - 1, Math.floor(((record.timestamp - WEEK_START) / (WEEK_END - WEEK_START)) * timeBins)));
    const key = `${xIndex}:${zIndex}:${timeIndex}`;
    const cell = cells.get(key) ?? {
      x: ((xIndex + 0.5) / spatialBins) * 100 - 50,
      z: ((zIndex + 0.5) / spatialBins) * 100 - 50,
      time: WEEK_START + ((timeIndex + 0.5) / timeBins) * (WEEK_END - WEEK_START),
      count: 0,
      selectedCount: 0,
      dominantType: record.type,
      types: {},
    };
    cell.count += 1;
    if (isSelectedRecord(record)) cell.selectedCount += 1;
    cell.types[record.type] = (cell.types[record.type] ?? 0) + 1;
    if (cell.types[record.type] > (cell.types[cell.dominantType] ?? 0)) cell.dominantType = record.type;
    cells.set(key, cell);
  }
  return Array.from(cells.values()).map((cell) => ({
    x: cell.x,
    z: cell.z,
    time: cell.time,
    count: cell.count,
    selectedCount: cell.selectedCount,
    dominantType: cell.dominantType,
  }));
};

export const MAP_CELLS = aggregateRecords({ spatialBins: 38, timeBins: 1 });
export const CUBE_CELLS = aggregateRecords({ spatialBins: 18, timeBins: 28 });

export const buildHistogram = (binCount: number): number[] => {
  const bins = Array.from({ length: binCount }, () => 0);
  const duration = WEEK_END - WEEK_START;
  for (const record of REAL_WEEK_RECORDS) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(((record.timestamp - WEEK_START) / duration) * binCount)));
    bins[index] += 1;
  }
  return bins;
};

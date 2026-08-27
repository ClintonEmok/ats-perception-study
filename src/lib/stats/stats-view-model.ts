/**
 * View model functions for transforming crime data into chart-ready formats.
 */
import type { CrimeRecord } from '@/types/crime';
import type { NeighborhoodStats } from '@/lib/stats/aggregation';
import { getDistrictDisplayName } from '@/lib/category-maps';

export { getDistrictDisplayName };

export function formatDistrictName(district: string | number): string {
  const num = typeof district === 'string' ? parseInt(district, 10) : district;
  if (isNaN(num)) return String(district);
  return num.toString().padStart(3, '0');
}

export interface StatsSummary {
  totalCrimes: number;
  avgPerDay: number;
  peakHour: number;
  peakHourLabel: string;
  mostCommonCrime: string;
  mostCommonCrimeCount: number;
  districtCount: number;
  dateRange: string;
}

export function transformStatsSummary(
  stats: NeighborhoodStats,
  selectedDistrictCount: number,
  timeRange: { startEpoch: number; endEpoch: number }
): StatsSummary {
  const { total, peakHour, byType } = stats;
  
  const dayCount = Math.max(1, Math.ceil((timeRange.endEpoch - timeRange.startEpoch) / 86400));
  const avgPerDay = Math.round(total / dayCount);
  
  const peakHourLabel = formatHour(peakHour.hour);
  
  const mostCommon = byType[0];
  
  const startDate = new Date(timeRange.startEpoch * 1000).toLocaleDateString();
  const endDate = new Date(timeRange.endEpoch * 1000).toLocaleDateString();
  const dateRange = `${startDate} - ${endDate}`;
  
  return {
    totalCrimes: total,
    avgPerDay,
    peakHour: peakHour.hour,
    peakHourLabel,
    mostCommonCrime: mostCommon?.name || 'N/A',
    mostCommonCrimeCount: mostCommon?.count || 0,
    districtCount: selectedDistrictCount,
    dateRange,
  };
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export function formatHourDetailed(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ChartDataPoint {
  label: string;
  value: number;
  count: number;
}

export function prepareTypeChartData(byType: Array<{ name: string; count: number; percentage: number }>): ChartDataPoint[] {
  return byType.slice(0, 10).map(item => ({
    label: item.name,
    value: item.count,
    count: item.count,
  }));
}

export function prepareHourChartData(byHour: number[]): ChartDataPoint[] {
  return byHour.map((count, hour) => ({
    label: formatHourDetailed(hour),
    value: hour,
    count,
  }));
}

export function prepareDayChartData(byDayOfWeek: number[]): ChartDataPoint[] {
  return byDayOfWeek.map((count, day) => ({
    label: DAY_LABELS[day],
    value: day,
    count,
  }));
}

export function prepareMonthChartData(crimes: CrimeRecord[]): ChartDataPoint[] {
  const monthCounts = new Array(12).fill(0);
  for (const crime of crimes) {
    const month = new Date(crime.timestamp * 1000).getMonth();
    monthCounts[month]++;
  }
  
  return monthCounts.map((count, month) => ({
    label: MONTH_LABELS[month],
    value: month,
    count,
  }));
}

export function getHeatmapData(
  byHour: number[],
  byDayOfWeek: number[]
): number[][] {
  const heatmap: number[][] = [];
  
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourlyTotal = byHour[hour] || 0;
      const dailyTotal = byDayOfWeek[day] || 0;
      const expectedIfUniform = hourlyTotal * dailyTotal / (byHour.reduce((a, b) => a + b, 1));
      const ratio = expectedIfUniform > 0 ? dailyTotal / expectedIfUniform : 1;
      row.push(Math.round(byHour[hour] * ratio / 7));
    }
    heatmap.push(row);
  }
  
  return heatmap;
}

import type { NeighborhoodStats } from './aggregation';

export interface TemporalPulsePoint {
  label: string;
  count: number;
}

export interface TemporalPulseSeries {
  hourly: TemporalPulsePoint[];
  daily: TemporalPulsePoint[];
  monthly: TemporalPulsePoint[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatHourLabel(hour: number): string {
  return String(hour).padStart(2, '0');
}

function toSeries(counts: number[] | undefined, labels: string[]): TemporalPulsePoint[] {
  if (!counts) return [];

  return counts.map((count, index) => ({
    label: labels[index] ?? String(index),
    count: Number(count) || 0,
  }));
}

export function buildTemporalPulseSeries(stats: Pick<NeighborhoodStats, 'byHour' | 'byDayOfWeek' | 'byMonth'> | null | undefined): TemporalPulseSeries {
  if (!stats) {
    return {
      hourly: [],
      daily: [],
      monthly: [],
    };
  }

  return {
    hourly: stats.byHour.map((count, hour) => ({
      label: formatHourLabel(hour),
      count: Number(count) || 0,
    })),
    daily: toSeries(stats.byDayOfWeek, DAY_LABELS),
    monthly: toSeries(stats.byMonth, MONTH_LABELS),
  };
}

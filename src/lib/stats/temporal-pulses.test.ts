import { describe, expect, it } from 'vitest';
import { buildTemporalPulseSeries, formatHourLabel } from './temporal-pulses';

describe('formatHourLabel', () => {
  it('formats hours as zero-padded 24-hour time without AM/PM', () => {
    expect(formatHourLabel(0)).toBe('00');
    expect(formatHourLabel(6)).toBe('06');
    expect(formatHourLabel(12)).toBe('12');
    expect(formatHourLabel(18)).toBe('18');
    expect(formatHourLabel(23)).toBe('23');
  });
});

describe('buildTemporalPulseSeries', () => {
  it('builds hourly, daily, and monthly trend series', () => {
    const pulses = buildTemporalPulseSeries({
      byHour: Array.from({ length: 24 }, (_, hour) => hour),
      byDayOfWeek: [10, 20, 30, 40, 50, 60, 70],
      byMonth: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });

    expect(pulses.hourly).toHaveLength(24);
    expect(pulses.hourly[0]).toEqual({ label: '00', count: 0 });
    expect(pulses.hourly[12]).toEqual({ label: '12', count: 12 });
    expect(pulses.daily).toEqual([
      { label: 'Sun', count: 10 },
      { label: 'Mon', count: 20 },
      { label: 'Tue', count: 30 },
      { label: 'Wed', count: 40 },
      { label: 'Thu', count: 50 },
      { label: 'Fri', count: 60 },
      { label: 'Sat', count: 70 },
    ]);
    expect(pulses.monthly[0]).toEqual({ label: 'Jan', count: 1 });
    expect(pulses.monthly[11]).toEqual({ label: 'Dec', count: 12 });
  });
});

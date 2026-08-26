export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const TIMELINE_WIDTH = 1320;
export const TIMELINE_LEFT = (CANVAS_WIDTH - TIMELINE_WIDTH) / 2; // 300px

export const THEME = {
  bg: '#f8fafc',
  bgCard: '#ffffff',
  bgCardHover: '#f1f5f9',
  border: 'rgba(15, 23, 42, 0.08)',
  borderMedium: '#cbd5e1',
  borderDark: '#94a3b8',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  tueRed: '#C8102E',
  tueRedBg: 'rgba(200, 16, 46, 0.08)',
  tueRedBorder: 'rgba(200, 16, 46, 0.28)',
  navy: '#0f172a',
  navyLight: '#1e293b',
  blue: '#2563eb',
  blueBg: 'rgba(37, 99, 235, 0.08)',
  blueBorder: 'rgba(37, 99, 235, 0.3)',
  violet: '#7c3aed',
  violetBg: 'rgba(124, 58, 237, 0.08)',
  emerald: '#059669',
  emeraldBg: 'rgba(5, 150, 105, 0.08)',
  amber: '#d97706',
  amberBg: 'rgba(217, 119, 6, 0.08)',
} as const;

export const DENSITY_HEAT_STOPS = [
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#C8102E',
];

// ==========================================
// 1. YEARLY OVERVIEW (12 Months)
// ==========================================
export const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const MONTHLY_COUNTS = [
  420, 390, 480, 560, 650, 780, 940, 890, 710, 620, 490, 440,
];
export const MONTHLY_MAX = Math.max(...MONTHLY_COUNTS);

// 48 granular sub-bins across the year (4 per month)
export const ANNUAL_SUB_BINS = [
  95, 105, 110, 110,  // Jan
  90, 95, 100, 105,   // Feb
  110, 120, 125, 125, // Mar
  130, 140, 145, 145, // Apr
  150, 160, 170, 170, // May
  180, 195, 200, 205, // Jun
  210, 245, 250, 235, // Jul (Selected Month)
  225, 230, 220, 215, // Aug
  180, 175, 180, 175, // Sep
  155, 155, 160, 150, // Oct
  125, 120, 125, 120, // Nov
  110, 110, 115, 105, // Dec
];
export const ANNUAL_SUB_BINS_MAX = Math.max(...ANNUAL_SUB_BINS);

// ==========================================
// 2. SELECTED MONTH: JULY (31 Days)
// ==========================================
// Prominent high-activity days: Day 05 (54) and Day 14 (64 - prime focus)
export const JULY_31_DAILY_COUNTS = [
  16, 18, 48, 24, 54, 28, 22, // 01-07 (Jul 05: 54)
  14, 12, 26, 32, 46, 24, 64, // 08-14 (Jul 14: 64 - Major burst day that expands)
  18, 28, 34, 30, 52, 26, 20, // 15-21 (Jul 19: 52)
  12, 24, 30, 32, 26, 48, 22, // 22-28 (Jul 27: 48)
  14, 16, 20,                 // 29-31
];
export const JULY_31_MAX = Math.max(...JULY_31_DAILY_COUNTS);
export const JULY_31_MIN = Math.min(...JULY_31_DAILY_COUNTS);

// ==========================================
// 3. HOURLY BREAKDOWN FOR EXPANDED DAY 14 (24 Hours)
// ==========================================
export const DAY14_HOURLY_COUNTS = [
  2,  1,  1,  1,  2,  3,  4,  6,  // 00:00 - 07:00 (Quiet early morning)
  8,  9, 12, 11, 14, 13, 15, 12,  // 08:00 - 15:00 (Busy afternoon)
  14, 10, 16, 13, 11, 14, 12,  8,  // 16:00 - 23:00 (Evening peak: 18:00 is 16)
];
export const DAY14_HOURLY_MAX = Math.max(...DAY14_HOURLY_COUNTS);

export interface DayLayout {
  dayIndex: number;
  dayNumber: number;
  label: string; // "01", "02" ... "31"
  count: number;
  startPct: number;
  widthPct: number;
  centerPct: number;
  isBurst: boolean;
  isTargetDay: boolean; // Day 14
}

/**
 * Calculates continuous layout for July (31 days) morphing from uniform daily (t=0) to DBTA (t=1).
 */
export function getJulyMonthLayout(dbtaProgress: number): DayLayout[] {
  const count = JULY_31_DAILY_COUNTS.length; // 31
  const uniformWidth = 1 / count;

  // DBTA weights across the 31 days of July
  // High-activity days (e.g. Day 14 with 64 events) expand to ~10-12% width
  // Quiet days compress to ~1.6-1.8% width (preserving non-zero floor guarantee)
  const alpha = 2.8;
  const k = 1.35;
  const rawWeights = JULY_31_DAILY_COUNTS.map((c) => {
    const norm = (c - JULY_31_MIN) / (JULY_31_MAX - JULY_31_MIN);
    return Math.max(0.42, 1 + alpha * Math.pow(norm, k));
  });
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const dbtaWidths = rawWeights.map((w) => w / totalWeight);

  let cursor = 0;
  return JULY_31_DAILY_COUNTS.map((c, i) => {
    const w = (1 - dbtaProgress) * uniformWidth + dbtaProgress * dbtaWidths[i];
    const start = cursor;
    const end = start + w;
    cursor = end;
    const dayNumber = i + 1;
    const label = dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
    const isBurst = c >= 48;
    const isTargetDay = i === 13; // July 14

    return {
      dayIndex: i,
      dayNumber,
      label,
      count: c,
      startPct: start * 100,
      widthPct: w * 100,
      centerPct: (start + w / 2) * 100,
      isBurst,
      isTargetDay,
    };
  });
}

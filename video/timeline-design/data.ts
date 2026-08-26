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

export const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

// Realistic annual crime volume (summer peak)
export const MONTHLY_COUNTS = [
  420, 390, 480, 560, 650, 780, 940, 890, 710, 620, 490, 440,
];
export const MONTHLY_MAX = Math.max(...MONTHLY_COUNTS);

// 48 granular sub-bins across the year (4 per month)
export const ANNUAL_SUB_BINS = [
  // Jan
  95, 105, 110, 110,
  // Feb
  90, 95, 100, 105,
  // Mar
  110, 120, 125, 125,
  // Apr
  130, 140, 145, 145,
  // May
  150, 160, 170, 170,
  // Jun
  180, 195, 200, 205,
  // Jul (selected)
  210, 245, 250, 235,
  // Aug
  225, 230, 220, 215,
  // Sep
  180, 175, 180, 175,
  // Oct
  155, 155, 160, 150,
  // Nov
  125, 120, 125, 120,
  // Dec
  110, 110, 115, 105,
];
export const ANNUAL_SUB_BINS_MAX = Math.max(...ANNUAL_SUB_BINS);

// July daily counts (31 days) — with prominent burst days:
// Jul 03, Jul 05, Jul 12, Jul 19, Jul 27
export const JULY_DAILY_COUNTS = [
  14, 16, 52, 22, 58, 28, 20, // 01-07 (Jul 03: 52, Jul 05: 58)
  12, 10, 24, 30, 48, 22, 16, // 08-14 (Jul 12: 48)
  11, 26, 32, 28, 54, 24, 18, // 15-21 (Jul 19: 54)
  9,  22, 28, 30, 24, 50, 20, // 22-28 (Jul 27: 50)
  12, 13, 18,                 // 29-31
];
export const JULY_DAILY_MAX = Math.max(...JULY_DAILY_COUNTS);
export const JULY_DAILY_MIN = Math.min(...JULY_DAILY_COUNTS);

export interface DayLayout {
  dayIndex: number;
  label: string;
  count: number;
  startPct: number; // 0..100
  widthPct: number; // 0..100
  centerPct: number; // 0..100
  isBurst: boolean;
  rawWeight: number;
}

/**
 * Calculates continuous layout for July (31 days) morphing from uniform (t=0) to DBTA (t=1).
 */
export function getJulyLayout(morphProgress: number): DayLayout[] {
  const count = JULY_DAILY_COUNTS.length; // 31
  const uniformWidth = 1 / count;

  // DBTA weight calculation
  // w_i = 1 + alpha * ((N_i - min) / (max - min))^k
  // Preserving non-zero floor guarantee (min weight >= 0.45)
  const alpha = 2.4;
  const k = 1.35;
  const rawWeights = JULY_DAILY_COUNTS.map((c) => {
    const norm = (c - JULY_DAILY_MIN) / (JULY_DAILY_MAX - JULY_DAILY_MIN);
    return Math.max(0.45, 1 + alpha * Math.pow(norm, k));
  });
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const dbtaWidths = rawWeights.map((w) => w / totalWeight);

  let cursor = 0;
  return JULY_DAILY_COUNTS.map((c, i) => {
    // Linear blend of uniform width vs DBTA width
    const w = (1 - morphProgress) * uniformWidth + morphProgress * dbtaWidths[i];
    const start = cursor;
    const end = start + w;
    cursor = end;
    const dayNumber = i + 1;
    const label = dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
    const isBurst = c >= 48;

    return {
      dayIndex: i,
      label,
      count: c,
      startPct: start * 100,
      widthPct: w * 100,
      centerPct: (start + w / 2) * 100,
      isBurst,
      rawWeight: rawWeights[i],
    };
  });
}

export interface CalloutDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  tag?: string; // e.g. "R5a", "R1", "R3"
  phasePeriodSeconds: number; // For desynchronized floating motion
  accentColor: string;
  badgeBg: string;
}

export const TIMELINE_CALLOUTS: CalloutDefinition[] = [
  {
    id: 'overview-context',
    number: 1,
    title: 'FULL TEMPORAL OVERVIEW',
    subtitle: 'Selected focus remains situated within the complete analysis period.',
    tag: 'R5a',
    phasePeriodSeconds: 6.2,
    accentColor: '#0f172a',
    badgeBg: 'rgba(15, 23, 42, 0.08)',
  },
  {
    id: 'temporal-focus',
    number: 2,
    title: 'TEMPORAL FOCUS',
    subtitle: 'The analyst defines the period to investigate directly in context.',
    phasePeriodSeconds: 5.5,
    accentColor: '#C8102E',
    badgeBg: 'rgba(200, 16, 46, 0.1)',
  },
  {
    id: 'adaptive-detail',
    number: 3,
    title: 'ADAPTIVE DETAIL',
    subtitle: 'Temporal granularity automatically responds to the selected domain scale.',
    phasePeriodSeconds: 7.1,
    accentColor: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.1)',
  },
  {
    id: 'density-allocation',
    number: 4,
    title: 'DENSITY-SCALED ALLOCATION',
    subtitle: 'More activity receives more visual space without dropping quiet intervals.',
    tag: 'R1',
    phasePeriodSeconds: 6.8,
    accentColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.1)',
  },
  {
    id: 'time-reference',
    number: 5,
    title: 'ORIGINAL TIME REFERENCE',
    subtitle: 'Clock-time calendar boundaries and timestamps remain explicitly accessible.',
    tag: 'R3',
    phasePeriodSeconds: 7.8,
    accentColor: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.1)',
  },
];

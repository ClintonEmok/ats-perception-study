import {
  AXIS_COLOR,
  BORDER_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
} from '../density-approaches/data';
import { EventItem, IntervalSpec } from '../equal-time-concept/types';

export {
  AXIS_COLOR,
  BORDER_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
};
export type { EventItem, IntervalSpec };

// Layout dimensions for 1920x1080 canvas
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const TIMELINE_WIDTH = 1600;
export const TIMELINE_X = (CANVAS_WIDTH - TIMELINE_WIDTH) / 2; // 160px
export const TIMELINE_Y = 560; // Timeline baseline Y

// Uniform boundary offsets relative to timeline left (5 equal intervals of 320px)
export const UNIFORM_BOUNDARIES = [0, 320, 640, 960, 1280, 1600];

// DBTA Allocated boundary offsets relative to timeline left
// Interval 0 (12-13, 2 events): 130px -> [0, 130]
// Interval 1 (13-14, 6 events): 250px -> [130, 380]
// Interval 2 (14-15, 48 events): 820px -> [380, 1200] (2.56x expansion for burst)
// Interval 3 (15-16, 2 events): 130px -> [1200, 1330]
// Interval 4 (16-17, 7 events): 270px -> [1330, 1600]
// Sum: 130 + 250 + 820 + 130 + 270 = 1600px (Strictly constant display extent)
export const DBTA_BOUNDARIES = [0, 130, 380, 1200, 1330, 1600];

export const TIME_LABELS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
export const EVENT_COUNTS = [2, 6, 48, 2, 7];

// Density signal profile points: [normalizedTime 0..1, densityValue 0..1]
// Time 0 = 12:00, 0.2 = 13:00, 0.4 = 14:00, 0.6 = 15:00, 0.8 = 16:00, 1.0 = 17:00
export const DENSITY_SAMPLE_POINTS = [
  { t: 0.0, d: 0.08 },
  { t: 0.05, d: 0.08 },
  { t: 0.1, d: 0.1 },
  { t: 0.15, d: 0.09 },
  { t: 0.2, d: 0.12 },
  { t: 0.25, d: 0.22 },
  { t: 0.3, d: 0.26 },
  { t: 0.35, d: 0.3 },
  { t: 0.38, d: 0.48 },
  { t: 0.42, d: 0.82 },
  { t: 0.46, d: 0.98 },
  { t: 0.5, d: 1.0 }, // Peak at 14:30
  { t: 0.54, d: 0.96 },
  { t: 0.58, d: 0.78 },
  { t: 0.62, d: 0.38 },
  { t: 0.65, d: 0.18 },
  { t: 0.7, d: 0.1 },
  { t: 0.75, d: 0.1 },
  { t: 0.8, d: 0.16 },
  { t: 0.85, d: 0.28 },
  { t: 0.9, d: 0.32 },
  { t: 0.95, d: 0.2 },
  { t: 1.0, d: 0.1 },
];

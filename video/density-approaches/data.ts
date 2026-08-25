import {
  AXIS_COLOR,
  BORDER_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
} from '../equal-time-concept/data';
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
export const TIMELINE_X = (CANVAS_WIDTH - TIMELINE_WIDTH) / 2; // 160
export const TIMELINE_Y = 560;

// Sub-bin histogram configuration for Aggregation
export interface BinBar {
  intervalIndex: number;
  subIndex: number; // 0, 1, 2
  count: number;
  height: number; // Max pixel height
  isBurst: boolean;
}

export const HISTOGRAM_BINS: BinBar[] = [
  // 12:00 - 13:00
  { intervalIndex: 0, subIndex: 0, count: 1, height: 14, isBurst: false },
  { intervalIndex: 0, subIndex: 1, count: 0, height: 6, isBurst: false },
  { intervalIndex: 0, subIndex: 2, count: 1, height: 14, isBurst: false },
  // 13:00 - 14:00
  { intervalIndex: 1, subIndex: 0, count: 2, height: 26, isBurst: false },
  { intervalIndex: 1, subIndex: 1, count: 2, height: 26, isBurst: false },
  { intervalIndex: 1, subIndex: 2, count: 2, height: 26, isBurst: false },
  // 14:00 - 15:00 (Dominant Burst)
  { intervalIndex: 2, subIndex: 0, count: 14, height: 130, isBurst: true },
  { intervalIndex: 2, subIndex: 1, count: 18, height: 175, isBurst: true },
  { intervalIndex: 2, subIndex: 2, count: 16, height: 150, isBurst: true },
  // 15:00 - 16:00
  { intervalIndex: 3, subIndex: 0, count: 1, height: 14, isBurst: false },
  { intervalIndex: 3, subIndex: 1, count: 0, height: 6, isBurst: false },
  { intervalIndex: 3, subIndex: 2, count: 1, height: 14, isBurst: false },
  // 16:00 - 17:00
  { intervalIndex: 4, subIndex: 0, count: 2, height: 26, isBurst: false },
  { intervalIndex: 4, subIndex: 1, count: 3, height: 38, isBurst: false },
  { intervalIndex: 4, subIndex: 2, count: 2, height: 26, isBurst: false },
];

// Clean subset of events preserved during Filtering (attribute/subset filter across entire timeline)
export const FILTER_PRESERVED_IDS = new Set([
  // 12:00 - 13:00 (1 of 2 preserved)
  'h1-2',
  // 13:00 - 14:00 (4 of 6 preserved - rich surrounding black events)
  'h2-1',
  'h2-3',
  'h2-4',
  'h2-6',
  // 14:00 - 15:00 (7 of 48 preserved - well-spaced red events)
  'h3-4',
  'h3-11',
  'h3-18',
  'h3-25',
  'h3-32',
  'h3-39',
  'h3-46',
  // 15:00 - 16:00 (1 of 2 preserved)
  'h4-1',
  // 16:00 - 17:00 (5 of 7 preserved - rich surrounding black events)
  'h5-1',
  'h5-3',
  'h5-4',
  'h5-6',
  'h5-7',
]);

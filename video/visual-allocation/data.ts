import {
  AXIS_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
} from '../equal-time-concept/data';
import { EventItem, IntervalSpec } from '../equal-time-concept/types';

export {
  AXIS_COLOR,
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
export const TIMELINE_Y = 540; // Perfect vertical center

// Uniform boundary offsets relative to timeline left (5 equal intervals of 320px)
export const UNIFORM_BOUNDARIES = [0, 320, 640, 960, 1280, 1600];

// Non-uniform boundary offsets relative to timeline left
// Interval 0 (12-13, 2 events): 130px
// Interval 1 (13-14, 6 events): 250px
// Interval 2 (14-15, 48 events): 820px (expands horizontally)
// Interval 3 (15-16, 2 events): 130px
// Interval 4 (16-17, 7 events): 270px
// Sum: 130 + 250 + 820 + 130 + 270 = 1600px
export const NON_UNIFORM_BOUNDARIES = [0, 130, 380, 1200, 1330, 1600];

import {
  AXIS_COLOR,
  BORDER_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
} from '../density-approaches/data';

export {
  AXIS_COLOR,
  BORDER_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
};

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const TIMELINE_WIDTH = 1760;
export const TIMELINE_X = (CANVAS_WIDTH - TIMELINE_WIDTH) / 2; // 80
export const TIMELINE_Y = CANVAS_HEIGHT / 2; // 540

// Uniform 1-hour slice boundaries on 1760px width
export const UNIFORM_BOUNDARIES = [0, 352, 704, 1056, 1408, 1760];
export const UNIFORM_TIME_LABELS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
export const UNIFORM_EVENT_COUNTS = [2, 6, 48, 2, 7];
export const UNIFORM_DURATIONS = ['1 hour', '1 hour', '1 hour', '1 hour', '1 hour'];

// Wang et al. Non-Uniform boundaries on 1760px width (each slice has exactly 13 events)
export const WANG_BOUNDARIES = [0, 744, 837, 931, 1024, 1760];
export const WANG_TIME_LABELS = ['12:00', '14:06', '14:23', '14:40', '14:55', '17:00'];
export const WANG_EVENT_COUNTS = [13, 13, 13, 13, 13];
export const WANG_DURATIONS = ['2h 06m', '17m', '17m', '15m', '2h 05m'];
export const WANG_SLICE_NAMES = [
  '12:00 – 14:06',
  '14:06 – 14:23',
  '14:23 – 14:40',
  '14:40 – 14:55',
  '14:55 – 17:00',
];

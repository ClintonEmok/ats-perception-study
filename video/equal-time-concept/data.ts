import { IntervalSpec } from './types';

export const TUE_RED = '#C8102E'; // Official TU/e primary red
export const DARK_TEXT = '#0f172a';
export const MUTED_TEXT = '#475569';
export const BORDER_COLOR = '#334155';
export const AXIS_COLOR = '#0f172a';

// ----------------------------------------------------
// Hourly Configuration (5 intervals: 12:00 -> 17:00)
// ----------------------------------------------------
export const HOURLY_TIME_POINTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// Real Chicago geographic incident coordinates from dataset
const CHICAGO_BURST_COORDS = [
  { lon: -87.6269, lat: 41.8414 }, { lon: -87.6126, lat: 41.7562 }, { lon: -87.6941, lat: 41.8040 },
  { lon: -87.7073, lat: 41.8875 }, { lon: -87.7662, lat: 41.9671 }, { lon: -87.7923, lat: 41.9215 },
  { lon: -87.7726, lat: 41.9275 }, { lon: -87.6292, lat: 41.8742 }, { lon: -87.5952, lat: 41.8072 },
  { lon: -87.6902, lat: 41.7968 }, { lon: -87.6624, lat: 41.8023 }, { lon: -87.6592, lat: 41.8087 },
  { lon: -87.7368, lat: 41.9744 }, { lon: -87.7037, lat: 42.0048 }, { lon: -87.6263, lat: 41.7245 },
  { lon: -87.7150, lat: 41.8908 }, { lon: -87.7684, lat: 41.8862 }, { lon: -87.6589, lat: 41.9660 },
  { lon: -87.6473, lat: 41.7214 }, { lon: -87.6619, lat: 41.6930 }, { lon: -87.6633, lat: 41.7463 },
  { lon: -87.7091, lat: 41.8602 }, { lon: -87.6641, lat: 41.7310 }, { lon: -87.6832, lat: 41.7623 },
  { lon: -87.6253, lat: 41.8464 }, { lon: -87.6270, lat: 41.8501 }, { lon: -87.6470, lat: 41.6845 },
  { lon: -87.7411, lat: 41.8113 }, { lon: -87.6879, lat: 41.8001 }, { lon: -87.7267, lat: 41.8797 },
  { lon: -87.6531, lat: 41.8878 }, { lon: -87.7473, lat: 41.9547 }, { lon: -87.6721, lat: 41.6910 },
  { lon: -87.6712, lat: 41.8341 }, { lon: -87.6503, lat: 41.7569 }, { lon: -87.7034, lat: 41.8136 },
  { lon: -87.6914, lat: 41.8465 }, { lon: -87.6346, lat: 41.9064 }, { lon: -87.6268, lat: 41.8927 },
  { lon: -87.6408, lat: 41.7755 }, { lon: -87.7143, lat: 41.8783 }, { lon: -87.6232, lat: 41.7911 },
  { lon: -87.7020, lat: 41.8819 }, { lon: -87.8060, lat: 41.9755 }, { lon: -87.6678, lat: 41.8776 },
  { lon: -87.6937, lat: 41.7791 }, { lon: -87.6277, lat: 41.8786 }, { lon: -87.7247, lat: 41.8607 },
];

export const HOURLY_INTERVALS: IntervalSpec[] = [
  {
    index: 0,
    label: '12:00',
    startTime: '12:00',
    endTime: '13:00',
    densityType: 'sparse',
    events: [
      { id: 'h1-1', intervalIndex: 0, xPercent: 30, yPercent: 50, lon: -87.6331, lat: 41.9101, appearFrame: 35 },
      { id: 'h1-2', intervalIndex: 0, xPercent: 75, yPercent: 50, lon: -87.7197, lat: 41.9331, appearFrame: 85 },
    ],
  },
  {
    index: 1,
    label: '13:00',
    startTime: '13:00',
    endTime: '14:00',
    densityType: 'moderate',
    events: [
      { id: 'h2-1', intervalIndex: 1, xPercent: 12, yPercent: 50, lon: -87.6071, lat: 41.7494, appearFrame: 48 },
      { id: 'h2-2', intervalIndex: 1, xPercent: 28, yPercent: 50, lon: -87.7085, lat: 41.9107, appearFrame: 80 },
      { id: 'h2-3', intervalIndex: 1, xPercent: 48, yPercent: 50, lon: -87.6183, lat: 41.7558, appearFrame: 115 },
      { id: 'h2-4', intervalIndex: 1, xPercent: 65, yPercent: 50, lon: -87.6772, lat: 41.9987, appearFrame: 148 },
      { id: 'h2-5', intervalIndex: 1, xPercent: 82, yPercent: 50, lon: -87.6139, lat: 41.7593, appearFrame: 178 },
      { id: 'h2-6', intervalIndex: 1, xPercent: 94, yPercent: 50, lon: -87.7179, lat: 41.9071, appearFrame: 205 },
    ],
  },
  {
    index: 2,
    label: '14:00',
    startTime: '14:00',
    endTime: '15:00',
    densityType: 'dense',
    // 48 events spread across Chicago appearing naturally over 6 seconds (frames 30 to 210 / 1.0s to 7.0s)
    events: Array.from({ length: 48 }, (_, i) => ({
      id: `h3-${i + 1}`,
      intervalIndex: 2,
      xPercent: 2 + (i / 47) * 96,
      yPercent: 50,
      lon: CHICAGO_BURST_COORDS[i % CHICAGO_BURST_COORDS.length].lon,
      lat: CHICAGO_BURST_COORDS[i % CHICAGO_BURST_COORDS.length].lat,
      appearFrame: 30 + Math.floor((i / 47) * 180),
    })),
  },
  {
    index: 3,
    label: '15:00',
    startTime: '15:00',
    endTime: '16:00',
    densityType: 'sparse',
    events: [
      { id: 'h4-1', intervalIndex: 3, xPercent: 25, yPercent: 50, lon: -87.6408, lat: 41.7755, appearFrame: 65 },
      { id: 'h4-2', intervalIndex: 3, xPercent: 70, yPercent: 50, lon: -87.6217, lat: 41.8284, appearFrame: 135 },
    ],
  },
  {
    index: 4,
    label: '16:00',
    startTime: '16:00',
    endTime: '17:00',
    densityType: 'moderate',
    events: [
      { id: 'h5-1', intervalIndex: 4, xPercent: 10, yPercent: 50, lon: -87.6943, lat: 41.9820, appearFrame: 55 },
      { id: 'h5-2', intervalIndex: 4, xPercent: 24, yPercent: 50, lon: -87.7561, lat: 41.9209, appearFrame: 90 },
      { id: 'h5-3', intervalIndex: 4, xPercent: 38, yPercent: 50, lon: -87.5864, lat: 41.7783, appearFrame: 125 },
      { id: 'h5-4', intervalIndex: 4, xPercent: 52, yPercent: 50, lon: -87.7668, lat: 41.9386, appearFrame: 155 },
      { id: 'h5-5', intervalIndex: 4, xPercent: 66, yPercent: 50, lon: -87.6934, lat: 41.7785, appearFrame: 180 },
      { id: 'h5-6', intervalIndex: 4, xPercent: 80, yPercent: 50, lon: -87.6476, lat: 41.8884, appearFrame: 198 },
      { id: 'h5-7', intervalIndex: 4, xPercent: 92, yPercent: 50, lon: -87.6253, lat: 41.8464, appearFrame: 210 },
    ],
  },
];

export const INTERVALS = HOURLY_INTERVALS;

import { CUBE_CELLS, DAILY_COUNTS, WEEK_START } from '../real/data';

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export const GRID_SIZE = 30;
export const VIEWBOX_SIZE = 600;
export const CELL_SIZE = VIEWBOX_SIZE / GRID_SIZE;

export const LEFT_DAY = 2; // Wed Jul 30 (Slice 3 / A)
export const RIGHT_DAY = 3; // Thu Jul 31 (Slice 4 / B)

export const LEFT_DAY_LABEL = 'Slice 3 (A)';
export const RIGHT_DAY_LABEL = 'Slice 4 (B)';
export const LEFT_DAY_DATE = 'Wed 30 Jul';
export const RIGHT_DAY_DATE = 'Thu 31 Jul';

export const LEFT_EVENTS = DAILY_COUNTS[LEFT_DAY]; // 1,240
export const RIGHT_EVENTS = DAILY_COUNTS[RIGHT_DAY]; // 1,580
export const DELTA_EVENTS = RIGHT_EVENTS - LEFT_EVENTS; // +340

// Aggregate spatial density on a 30x30 Chicago grid
export const aggregateDay = (dayIndex: number): number[] => {
  const values = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => 0);
  for (const cell of CUBE_CELLS) {
    const day = Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400)));
    if (day !== dayIndex) continue;
    const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((cell.x + 50) / 100) * GRID_SIZE)));
    const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((cell.z + 50) / 100) * GRID_SIZE)));
    values[y * GRID_SIZE + x] += cell.count;
  }
  const maximum = Math.max(...values, 1);
  return values.map((value) => value / maximum);
};

export const LEFT_GRID = aggregateDay(LEFT_DAY);
export const RIGHT_GRID = aggregateDay(RIGHT_DAY);

const rawDifference = LEFT_GRID.map((value, index) => value - (RIGHT_GRID[index] ?? 0));
const maxDifference = Math.max(...rawDifference.map(Math.abs), 1);
export const DIFFERENCE_GRID = rawDifference.map((value) => value / maxDifference);

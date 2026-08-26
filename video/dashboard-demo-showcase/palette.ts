import { PALETTES } from '../../src/lib/palettes';

export const DASHBOARD_COLORS = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.145 0 0)',
  card: 'oklch(1 0 0)',
  muted: 'oklch(0.97 0 0)',
  mutedForeground: 'oklch(0.42 0 0)',
  secondary: 'oklch(0.97 0 0)',
  border: 'oklch(0.922 0 0)',
  input: 'oklch(0.922 0 0)',
  primary: 'oklch(0.205 0 0)',
  primaryForeground: 'oklch(0.985 0 0)',
  chart1: 'oklch(0.646 0.222 41.116)',
  chart2: 'oklch(0.6 0.118 184.704)',
  chart3: 'oklch(0.398 0.07 227.392)',
  destructive: 'oklch(0.577 0.245 27.325)',
  scene: '#f4f1eb',
  sceneLine: '#7c6858',
  sceneGrid: '#dedbd2',
  sceneActive: '#b45309',
  brush: '#8b5cf6',
  brushStroke: '#a78bfa',
  brushHandle: '#6d28d9',
  brushHandleStroke: '#c4b5fd',
  timeCursor: '#10b981',
} as const;

export const DASHBOARD_CATEGORY_COLORS = PALETTES.light.categoryColors;

export const DENSITY_GRADIENT =
  'linear-gradient(90deg, rgb(34, 76, 255) 0%, rgb(0, 212, 255) 50%, rgb(255, 214, 64) 80%, rgb(255, 64, 96) 100%)';

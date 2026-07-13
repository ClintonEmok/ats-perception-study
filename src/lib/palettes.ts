export type Theme = 'light' | 'dark' | 'colorblind';

export interface Palette {
  name: string;
  background: string; // 3D Scene background
  foreground: string; // Text color (approx)
  fog: string; // Fog color
  mapStyle: string; // MapLibre style URL
  categoryColors: Record<string, string>;
}

export const OKABE_ITO = {
  black: '#000000',
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermilion: '#D55E00',
  reddishPurple: '#CC79A7',
  grey: '#999999',
};

const DEFAULT_CATEGORY_COLORS = {
  'THEFT': '#FFD700', // Gold
  'BATTERY': '#F59E0B', // Amber
  'CRIMINAL DAMAGE': '#FB7185', // Rose
  'NARCOTICS': '#38BDF8', // Sky
  'ASSAULT': '#FF4500', // OrangeRed
  'OTHER OFFENSE': '#A78BFA', // Violet
  'BURGLARY': '#1E90FF', // DodgerBlue
  'MOTOR VEHICLE THEFT': '#22C55E', // Green
  'DECEPTIVE PRACTICE': '#14B8A6', // Teal
  'ROBBERY': '#32CD32', // LimeGreen
  'VANDALISM': '#DA70D6', // Orchid
  'CRIMINAL TRESPASS': '#E879F9', // Fuchsia
  'WEAPONS VIOLATION': '#F97316', // Orange
  'OTHER': '#FFFFFF',
};

// Normalize keys to match CRIME_TYPE_MAP (uppercase)
const COLORBLIND_CATEGORY_COLORS = {
  'THEFT': OKABE_ITO.yellow,
  'BATTERY': OKABE_ITO.orange,
  'CRIMINAL DAMAGE': OKABE_ITO.reddishPurple,
  'NARCOTICS': OKABE_ITO.skyBlue,
  'ASSAULT': OKABE_ITO.vermilion,
  'OTHER OFFENSE': OKABE_ITO.grey,
  'BURGLARY': OKABE_ITO.skyBlue,
  'MOTOR VEHICLE THEFT': OKABE_ITO.bluishGreen,
  'DECEPTIVE PRACTICE': OKABE_ITO.blue,
  'ROBBERY': OKABE_ITO.bluishGreen,
  'VANDALISM': OKABE_ITO.reddishPurple,
  'CRIMINAL TRESPASS': OKABE_ITO.reddishPurple,
  'WEAPONS VIOLATION': OKABE_ITO.orange,
  'OTHER': OKABE_ITO.grey,
};

const LIGHT_CATEGORY_COLORS = {
  'THEFT': '#B8860B', // DarkGoldenRod (darker for contrast on white)
  'BATTERY': '#B45309', // Amber
  'CRIMINAL DAMAGE': '#BE123C', // Rose
  'NARCOTICS': '#0284C7', // Sky
  'ASSAULT': '#CC3700', // Darker OrangeRed
  'OTHER OFFENSE': '#6D28D9', // Violet
  'BURGLARY': '#0066CC', // Darker DodgerBlue
  'MOTOR VEHICLE THEFT': '#15803D', // Green
  'DECEPTIVE PRACTICE': '#0F766E', // Teal
  'ROBBERY': '#008000', // Darker Green
  'VANDALISM': '#9932CC', // DarkOrchid
  'CRIMINAL TRESPASS': '#C026D3', // Fuchsia
  'WEAPONS VIOLATION': '#EA580C', // Orange
  'OTHER': '#666666',
};

export const PALETTES: Record<Theme, Palette> = {
  dark: {
    name: 'Dark (Default)',
    background: '#000000',
    foreground: '#FFFFFF',
    fog: '#000000',
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    categoryColors: DEFAULT_CATEGORY_COLORS,
  },
  light: {
    name: 'Light',
    background: '#FFFFFF',
    foreground: '#000000',
    fog: '#FFFFFF',
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    categoryColors: LIGHT_CATEGORY_COLORS,
  },
  colorblind: {
    name: 'Colorblind Safe',
    background: '#000000', // Keep dark background for high contrast with these colors
    foreground: '#FFFFFF',
    fog: '#000000',
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    categoryColors: COLORBLIND_CATEGORY_COLORS,
  },
};

export const DEFAULT_THEME: Theme = 'light';

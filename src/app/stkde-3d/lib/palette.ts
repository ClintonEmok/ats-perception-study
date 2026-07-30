export type StkdeColorStop = {
  stop: number;
  rgb: [number, number, number];
};

export const STKDE_INTENSITY_STOPS: StkdeColorStop[] = [
  { stop: 0, rgb: [7, 24, 54] },
  { stop: 0.25, rgb: [8, 78, 110] },
  { stop: 0.5, rgb: [14, 148, 163] },
  { stop: 0.75, rgb: [34, 211, 238] },
  { stop: 0.9, rgb: [253, 224, 71] },
  { stop: 1, rgb: [255, 247, 204] },
];

export const LEGACY_STKDE_INTENSITY_STOPS: StkdeColorStop[] = [
  { stop: 0, rgb: [34, 76, 255] },
  { stop: 0.28, rgb: [0, 212, 255] },
  { stop: 0.55, rgb: [42, 255, 163] },
  { stop: 0.75, rgb: [255, 214, 64] },
  { stop: 0.9, rgb: [255, 122, 42] },
  { stop: 1, rgb: [255, 64, 96] },
];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getColorFromStops(stops: StkdeColorStop[], intensity: number, alpha: number): string {
  const t = clamp01(intensity);

  let left = stops[0];
  let right = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i]!;
    const next = stops[i + 1]!;
    if (t >= current.stop && t <= next.stop) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(0.0001, right.stop - left.stop);
  const localT = (t - left.stop) / span;
  const r = lerp(left.rgb[0], right.rgb[0], localT);
  const g = lerp(left.rgb[1], right.rgb[1], localT);
  const b = lerp(left.rgb[2], right.rgb[2], localT);

  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`;
}

export function getStkdeIntensityColor(intensity: number, alpha = 1): string {
  return getColorFromStops(STKDE_INTENSITY_STOPS, intensity, alpha);
}

export function getLegacyStkdeIntensityColor(intensity: number, alpha = 1): string {
  return getColorFromStops(LEGACY_STKDE_INTENSITY_STOPS, intensity, alpha);
}

export function getStkdePaletteGradient(mode: 'field' | 'legacy' = 'field'): string {
  const stops = mode === 'legacy' ? LEGACY_STKDE_INTENSITY_STOPS : STKDE_INTENSITY_STOPS;
  return `linear-gradient(90deg, ${stops.map(({ stop, rgb }) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]}) ${Math.round(stop * 100)}%`).join(', ')})`;
}

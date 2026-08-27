export type StkdeColorStop = {
  stop: number;
  rgb: [number, number, number];
};

export const STKDE_INTENSITY_STOPS: StkdeColorStop[] = [
  { stop: 0, rgb: [250, 244, 215] },
  { stop: 0.25, rgb: [244, 215, 136] },
  { stop: 0.5, rgb: [226, 145, 71] },
  { stop: 0.75, rgb: [190, 70, 45] },
  { stop: 0.9, rgb: [132, 43, 32] },
  { stop: 1, rgb: [79, 27, 27] },
];

export const LEGACY_STKDE_INTENSITY_STOPS: StkdeColorStop[] = [
  { stop: 0, rgb: [250, 244, 215] },
  { stop: 0.28, rgb: [247, 222, 151] },
  { stop: 0.55, rgb: [231, 159, 77] },
  { stop: 0.75, rgb: [201, 82, 43] },
  { stop: 0.9, rgb: [145, 43, 29] },
  { stop: 1, rgb: [86, 28, 26] },
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

/**
 * Signed KDE comparison colors. The normalized input is in [-1, 1]: negative
 * values are B-dominant, zero is neutral, and positive values are A-dominant.
 * This palette is intentionally separate from both absolute sequential ramps.
 */
export const STKDE_SIGNED_DIFFERENCE_STOPS: StkdeColorStop[] = [
  { stop: 0, rgb: [23, 92, 211] },
  { stop: 0.5, rgb: [244, 241, 235] },
  { stop: 1, rgb: [180, 35, 24] },
];

export const SIGNED_STKDE_DIFFERENCE_STOPS = STKDE_SIGNED_DIFFERENCE_STOPS;

export const STKDE_SIGNED_DIFFERENCE_LABELS = {
  negative: 'B-dominant',
  neutral: 'No difference',
  positive: 'A-dominant',
  red: 'Red = A higher',
  neutralColor: 'Neutral = no difference',
  blue: 'Blue = B higher',
} as const;

function clampSignedNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

function safeAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 1;
  return Math.min(1, Math.max(0, alpha));
}

export function getStkdeSignedDifferenceColor(normalizedDifference: number, alpha = 1): string {
  const signed = clampSignedNormalized(normalizedDifference);
  const palettePosition = (signed + 1) / 2;
  return getColorFromStops(STKDE_SIGNED_DIFFERENCE_STOPS, palettePosition, safeAlpha(alpha));
}

export const getSignedDifferenceColor = getStkdeSignedDifferenceColor;

export function getStkdeSignedDifferencePaletteGradient(): string {
  return `linear-gradient(90deg, ${STKDE_SIGNED_DIFFERENCE_STOPS.map(({ stop, rgb }) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]}) ${Math.round(stop * 100)}%`).join(', ')})`;
}

export const getSignedDifferencePaletteGradient = getStkdeSignedDifferencePaletteGradient;

export interface AdaptiveSlicePaletteInput {
  warpEnabled?: boolean;
  warpWeight?: number;
}

export interface AdaptiveSlicePalette {
  fill: string;
  stroke: string;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const interpolateChannel = (start: number, end: number, amount: number): number =>
  Math.round(start + (end - start) * amount);

const interpolateColor = (
  start: [number, number, number],
  end: [number, number, number],
  amount: number,
): [number, number, number] => [
  interpolateChannel(start[0], end[0], amount),
  interpolateChannel(start[1], end[1], amount),
  interpolateChannel(start[2], end[2], amount),
];

const formatRgba = ([red, green, blue]: [number, number, number], alpha: number): string =>
  `rgba(${red}, ${green}, ${blue}, ${alpha})`;

export const resolveAdaptiveSlicePalette = ({
  warpEnabled = true,
  warpWeight = 1,
}: AdaptiveSlicePaletteInput): AdaptiveSlicePalette => {
  if (!warpEnabled) {
    return {
      fill: 'rgba(100, 116, 139, 0.12)',
      stroke: 'rgba(148, 163, 184, 0.72)',
    };
  }

  const safeWeight = Number.isFinite(warpWeight) ? warpWeight : 1;
  const intensity = clamp01((safeWeight - 1) / 1.5);
  const fill = interpolateColor([34, 211, 238], [251, 146, 60], intensity);
  const stroke = interpolateColor([8, 145, 178], [234, 88, 12], intensity);

  return {
    fill: formatRgba(fill, 0.26),
    stroke: formatRgba(stroke, 0.92),
  };
};

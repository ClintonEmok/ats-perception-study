import { describe, expect, it } from 'vitest';
import { resolveAdaptiveSlicePalette } from './adaptive-slice-palette';

describe('resolveAdaptiveSlicePalette', () => {
  it('uses a cool adaptive color for a neutral warp weight', () => {
    expect(resolveAdaptiveSlicePalette({ warpWeight: 1 })).toEqual({
      fill: 'rgba(34, 211, 238, 0.26)',
      stroke: 'rgba(8, 145, 178, 0.92)',
    });
  });

  it('moves stronger warp weights toward a warm color', () => {
    const neutral = resolveAdaptiveSlicePalette({ warpWeight: 1 });
    const strong = resolveAdaptiveSlicePalette({ warpWeight: 2.5 });

    expect(strong.fill).toBe('rgba(251, 146, 60, 0.26)');
    expect(strong.stroke).toBe('rgba(234, 88, 12, 0.92)');
    expect(strong.fill).not.toBe(neutral.fill);
  });

  it('uses a muted palette when a slice is disabled for warping', () => {
    expect(resolveAdaptiveSlicePalette({ warpEnabled: false, warpWeight: 2.5 })).toEqual({
      fill: 'rgba(100, 116, 139, 0.12)',
      stroke: 'rgba(148, 163, 184, 0.72)',
    });
  });

  it('falls back safely for non-finite weights', () => {
    expect(resolveAdaptiveSlicePalette({ warpWeight: Number.NaN })).toEqual(
      resolveAdaptiveSlicePalette({ warpWeight: 1 }),
    );
  });
});

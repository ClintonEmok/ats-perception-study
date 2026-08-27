import { describe, expect, test } from 'vitest';
import {
  adjustBoundary,
  normalizedToSec,
  pickNearest,
  resolveSnapIntervalSec,
  resolveNeighborCandidates,
  resolveSnap,
  secToNormalized,
  type SnapCandidate,
} from './slice-adjustment';

const domainStartSec = 0;
const domainEndSec = 1000;
const minDurationSec = 100;

describe('adjustBoundary', () => {
  test('clamps start handle at domain start with explicit cue', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: -50,
      fixedBoundarySec: 300,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(0);
    expect(result.endSec).toBe(300);
    expect(result.limitCue).toBe('domainStart');
  });

  test('clamps end handle at domain end with explicit cue', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 1200,
      fixedBoundarySec: 700,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(700);
    expect(result.endSec).toBe(1000);
    expect(result.limitCue).toBe('domainEnd');
  });

  test('enforces minimum duration when start drag crosses fixed boundary', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: 550,
      fixedBoundarySec: 600,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(500);
    expect(result.endSec).toBe(600);
    expect(result.limitCue).toBe('minDuration');
  });

  test('enforces minimum duration when end drag crosses fixed boundary', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 280,
      fixedBoundarySec: 300,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(300);
    expect(result.endSec).toBe(400);
    expect(result.limitCue).toBe('minDuration');
  });

  test('selects nearest snap winner within tolerance', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 418,
      fixedBoundarySec: 200,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        toleranceSec: 10,
        gridCandidatesSec: [400, 420],
      },
    });

    expect(result.startSec).toBe(200);
    expect(result.endSec).toBe(420);
    expect(result.appliedSec).toBe(420);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('grid');
  });

  test('bypasses snap candidates while modifier bypass is active', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 418,
      fixedBoundarySec: 200,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        bypass: true,
        toleranceSec: 10,
        gridCandidatesSec: [420],
      },
    });

    expect(result.startSec).toBe(200);
    expect(result.endSec).toBe(418);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('none');
  });

  test('keeps domain hard stops with bypass active', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 1005,
      fixedBoundarySec: 800,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        bypass: true,
        toleranceSec: 10,
        gridCandidatesSec: [990],
      },
    });

    expect(result.startSec).toBe(800);
    expect(result.endSec).toBe(1000);
    expect(result.limitCue).toBe('domainEnd');
    expect(result.snapSource).toBe('none');
  });

  test('keeps minimum duration enforcement with snap disabled', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: 592,
      fixedBoundarySec: 600,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: false,
        toleranceSec: 10,
        gridCandidatesSec: [580],
      },
    });

    expect(result.startSec).toBe(500);
    expect(result.endSec).toBe(600);
    expect(result.limitCue).toBe('minDuration');
    expect(result.snapSource).toBe('none');
  });

  test('falls back to unclamped raw sec when candidate list is empty', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: 222,
      fixedBoundarySec: 600,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        toleranceSec: 10,
        gridCandidatesSec: [],
        neighborCandidatesSec: [],
      },
    });

    expect(result.startSec).toBe(222);
    expect(result.endSec).toBe(600);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('none');
  });
});

describe('snap helpers', () => {
  test('fixed preset interval wins over adaptive interval selection', () => {
    const interval = resolveSnapIntervalSec({
      mode: 'fixed',
      fixedPresetSec: 300,
      domainStartSec: 0,
      domainEndSec: 10 * 86400,
    });

    expect(interval).toBe(300);
  });

  test('falls back to adaptive interval when fixed preset is missing', () => {
    const interval = resolveSnapIntervalSec({
      mode: 'fixed',
      fixedPresetSec: null,
      domainStartSec: 0,
      domainEndSec: 18 * 3600,
    });

    expect(interval).toBe(900);
  });

  test('prefers neighbor candidate over grid on equal distance tie', () => {
    const candidates: SnapCandidate[] = [
      { valueSec: 490, source: 'grid' },
      { valueSec: 510, source: 'neighbor' },
    ];

    const winner = pickNearest(500, candidates, 20);
    expect(winner).toEqual({ valueSec: 510, source: 'neighbor' });
  });

  test('adjustBoundary prefers neighbor snap source on tie', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 500,
      fixedBoundarySec: 200,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        toleranceSec: 20,
        gridCandidatesSec: [490],
        neighborCandidatesSec: [510],
      },
    });

    expect(result.endSec).toBe(510);
    expect(result.snapSource).toBe('neighbor');
  });

  test('resolves deterministic winner with dense overlapping candidates', () => {
    const denseCandidates: SnapCandidate[] = [
      { valueSec: 505, source: 'grid' },
      { valueSec: 503, source: 'neighbor' },
      { valueSec: 504, source: 'grid' },
      { valueSec: 503, source: 'grid' },
      { valueSec: 502, source: 'neighbor' },
      { valueSec: 503, source: 'neighbor' },
      { valueSec: 506, source: 'grid' },
      { valueSec: 504, source: 'neighbor' },
    ];

    for (let i = 0; i < 20; i += 1) {
      const winner = pickNearest(503.4, denseCandidates, 10);
      expect(winner).toEqual({ valueSec: 503, source: 'neighbor' });
    }
  });

  test('resolveSnap returns none when no candidate passes tolerance', () => {
    const result = resolveSnap(500, {
      enabled: true,
      toleranceSec: 5,
      gridCandidatesSec: [520],
      neighborCandidatesSec: [480],
    });

    expect(result).toEqual({ snappedSec: 500, source: 'none' });
  });

  test('collects deterministic neighbor candidates excluding active and fixed boundary', () => {
    const candidates = resolveNeighborCandidates({
      boundaries: [
        { id: 'active', startSec: 100, endSec: 200, isVisible: true },
        { id: 's1', startSec: 320, endSec: 480, isVisible: true },
        { id: 's2', startSec: 260, endSec: 420, isVisible: false },
        { id: 's3', startSec: 50, endSec: 160, isVisible: true },
      ],
      activeSliceId: 'active',
      handle: 'start',
      domainStartSec,
      domainEndSec,
      fixedBoundarySec: 200,
    });

    expect(candidates).toEqual([0, 50, 160, 320, 480]);
  });

  test('round-trips normalized ranges with stable conversion', () => {
    const domainA = 1_704_067_200;
    const domainB = 1_704_153_600;
    const sec = 1_704_103_215;

    const normalized = secToNormalized(sec, domainA, domainB);
    const restored = normalizedToSec(normalized, domainA, domainB);

    expect(normalized).toBeGreaterThanOrEqual(0);
    expect(normalized).toBeLessThanOrEqual(100);
    expect(restored).toBeCloseTo(sec, 6);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard 3D active event wiring', () => {
  it('keeps server surfaces authoritative and limits crime fetching to opt-in active events', () => {
    const source = readFileSync(new URL('./Demo3dSpatialView.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/toMockCrimeEvents/);
    expect(source).toMatch(/projectStkdeResponseToSceneSlices/);
    expect(source).toMatch(/sourceSliceId/);
    expect(source).toMatch(/selectedSourceEvents=\{showRawEvents \? activeEvents : null\}/);
    expect(source).toMatch(/showRawEvents=\{showRawEvents\}/);
    expect(source).toMatch(/buildDurationVolumeProfile\(cubeSlices/);
    expect(source).toMatch(/warpMap: activeWarpMap/);
    expect(source).toMatch(/warpDomain: activeWarpDomain/);
    expect(source).toMatch(/isInterpolated: false/);
    expect(source).not.toMatch(/kdeSlice\.worker/);
    expect(source).not.toMatch(/computeSliceKde/);
    expect(source).toMatch(/\/api\/crimes\/range/);
  });
});

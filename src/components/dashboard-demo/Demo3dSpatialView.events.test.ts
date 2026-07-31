import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard 3D active event wiring', () => {
  it('keeps source-slice event alignment, domain clipping, explicit visibility, and adaptive allocation', () => {
    const source = readFileSync(new URL('./Demo3dSpatialView.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/toMockCrimeEvents/);
    expect(source).toMatch(/buildMockCrimeEventsBySourceSliceId/);
    expect(source).toMatch(/alignMockCrimeEventsToSlices/);
    expect(source).toMatch(/filterMockCrimeEventsByDomain/);
    expect(source).toMatch(/sliceEvents=\{cubeSliceEvents\}/);
    expect(source).toMatch(/showRawEvents=\{showRawEvents\}/);
    expect(source).toMatch(/useState\(false\)/);
    expect(source).toMatch(/buildDurationVolumeProfile\(cubeSlices/);
    expect(source).toMatch(/warpMap: activeWarpMap/);
    expect(source).toMatch(/warpDomain: activeWarpDomain/);
  });
});

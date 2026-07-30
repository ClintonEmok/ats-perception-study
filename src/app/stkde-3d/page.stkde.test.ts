import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/stkde-3d route focus mode', () => {
  test('exposes a single-slice toggle and detail inspector', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const sceneSource = readFileSync(new URL('./components/Stkde3DScene.tsx', import.meta.url), 'utf8');
    const inspectorSource = readFileSync(new URL('./components/SliceInspector.tsx', import.meta.url), 'utf8');
    const stackSource = readFileSync(new URL('./components/StkdeSliceStack.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/Single slice/);
    expect(pageSource).toMatch(/Stack view/);
    expect(pageSource).toMatch(/Raw points/);
    expect(pageSource).toMatch(/Grid field/);
    expect(pageSource).toMatch(/Legacy blobs/);
    expect(pageSource).toMatch(/SliceInspector/);
    expect(pageSource).toMatch(/viewMode={isFocusedView \? 'focus' : 'stack'}/);
    expect(pageSource).toMatch(/sliceEvents={sliceEvents}/);
    expect(pageSource).toMatch(/showRawEvents={showRawEvents}/);
    expect(pageSource).toMatch(/setIsPlaying\(false\)/);
    expect(pageSource).toMatch(/createStkde3DSceneRuntime/);
    expect(pageSource).toMatch(/sourceSliceId/);
    expect(pageSource).toMatch(/timeDomain/);
    expect(pageSource).toMatch(/StandaloneSliceScrubber/);
    expect(pageSource).not.toMatch(/useDashboardDemoCoordinationStore|useDashboardDemoTimeslicingModeStore|useSliceDomainStore|useViewportStore/);
    expect(sceneSource).toMatch(/viewMode\?: 'stack' \| 'focus'/);
    expect(sceneSource).toMatch(/showRawEvents\?: boolean/);
    expect(sceneSource).toMatch(/sliceEvents\?: MockCrimeEvent\[\]\[]/);
    expect(sceneSource).toMatch(/compact={viewMode === 'focus'}/);
    expect(sceneSource).toMatch(/RawEventPoints/);
    expect(stackSource).toMatch(/compact\?: boolean/);
    expect(inspectorSource).toMatch(/Clock range/);
    expect(inspectorSource).toMatch(/Burstiness/);
    expect(sceneSource).not.toMatch(/useDashboardDemoCoordinationStore|useDashboardDemoTimeslicingModeStore|useSliceDomainStore|useViewportStore/);
  });
});

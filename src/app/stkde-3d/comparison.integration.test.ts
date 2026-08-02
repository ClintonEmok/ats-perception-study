import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (relativePath: string): string => readFileSync(
  new URL(`./${relativePath}`, import.meta.url),
  'utf8',
);

describe('/stkde-3d comparison integration contracts', () => {
  test('keeps the route on one range loader effect lifecycle', () => {
    const pageSource = read('page.tsx');
    const loaderSource = read('lib/dataset-loader.ts');

    expect(pageSource).toMatch(/loadStkde3dDataset\(preset\)/);
    expect(pageSource).toMatch(/\[caseStudyPresetId, retryToken\]/);
    expect(pageSource).not.toMatch(/fetch\(`\/api\/crimes\/range/);
    expect(loaderSource).toMatch(/fetchImpl/);
    expect((loaderSource.match(/\/api\/crimes\/range/g) ?? []).length).toBe(1);
  });

  test('does not couple dataset loading to A/B or shared analytical settings', () => {
    const pageSource = read('page.tsx');
    const effectBody = pageSource.match(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[caseStudyPresetId, retryToken\]\);/)?.[0] ?? '';

    expect(effectBody).toContain('loadStkde3dDataset(preset)');
    expect(effectBody).not.toContain('comparison');
    expect(effectBody).not.toContain('kdeParams');
    expect(effectBody).not.toContain('adaptiveTimeEnabled');
    expect(effectBody).not.toContain('heatmapRenderer');
    expect(effectBody).not.toContain('activeSliceOpacity');
    expect(effectBody).not.toContain('hotspotMatchingMode');
    expect(effectBody).not.toContain('hoveredSliceId');
  });

  test('retains stable comparison, source, signed-field, and preset contracts', () => {
    const pageSource = read('page.tsx');
    const controlsSource = read('components/StkdeComparisonControls.tsx');
    const stageSource = read('components/StkdeComparisonStage.tsx');
    const viewportSource = read('components/StkdeComparisonViewport.tsx');
    const differenceSource = read('components/StkdeDifferenceScene.tsx');
    const fixtureSource = read('lib/comparison-fixtures.ts');
    const presetSource = read('lib/comparison-presets.ts');

    expect(pageSource).toContain('sourceSliceId');
    expect(pageSource).toContain('sourceSliceIndex');
    expect(pageSource).toContain('loadConfiguredMockStkde3dDataset');
    expect(controlsSource).toContain('Compare intervals');
    expect(controlsSource).toContain('Select interval A');
    expect(controlsSource).toContain('Select interval B');
    expect(stageSource).toContain('data-comparison-stage');
    expect(stageSource).toContain('data-comparison-mode={mode}');
    expect(viewportSource).toContain('data-interval-slot={slot}');
    expect(viewportSource).toContain('data-source-slice-id=');
    expect(differenceSource).toContain('data-difference-field="signed-kde"');
    expect(differenceSource).not.toMatch(/StkdeSliceStack|RawEventPoints|HotspotTrajectoryOverlay|BurstVolumeRenderer|AdaptiveWarpAxis/);
    expect(presetSource).toContain('full-slice-02-vs-08');
    expect(presetSource).toContain('fourth-of-july-slice-03-vs-09');
    expect(fixtureSource).toContain('buildComparisonSliceFixture');
  });
});

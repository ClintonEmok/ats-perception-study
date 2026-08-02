import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildComparisonSliceFixture } from './lib/comparison-fixtures';

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
    const mapSource = read('components/StkdeComparisonFieldMap.tsx');
    const mapMathSource = read('lib/comparison-map.ts');
    const fixtureSource = read('lib/comparison-fixtures.ts');
    const presetSource = read('lib/comparison-presets.ts');
    const intensityLegendSource = read('components/StkdeIntensityLegend.tsx');

    expect(pageSource).toContain('sourceSliceId');
    expect(pageSource).toContain('sourceSliceIndex');
    expect(pageSource).toContain('loadConfiguredMockStkde3dDataset');
    expect(pageSource).toContain('data-render-status="loading"');
    expect(pageSource).toContain('data-render-status="error"');
    expect(pageSource).toContain('data-render-status="empty"');
    expect(pageSource).toContain('Retry loading');
    expect(pageSource).toContain('Using mock data');
    expect(controlsSource).toContain('Compare intervals');
    expect(controlsSource).toContain('Select interval A');
    expect(controlsSource).toContain('Select interval B');
    expect(controlsSource).toContain('data-selection-slot');
    expect(controlsSource).toContain('activateComparisonSlot');
    expect(controlsSource).toContain('aria-pressed');
    expect(controlsSource).toContain('aria-selected');
    expect(controlsSource).toContain('<select');
    expect(controlsSource).not.toContain('Rendered intervals');
    expect(controlsSource).not.toContain('source:');
    expect(controlsSource).toContain('Unavailable in A − B difference view: signed heatmap only.');
    expect(stageSource).toContain('data-comparison-stage');
    expect(stageSource).toContain('data-comparison-mode={mode}');
    expect((stageSource.match(/resolveComparisonSourceContext/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(stageSource).not.toMatch(/CameraControls|cameraController|onModeChange/);
    expect(viewportSource).toContain('data-interval-slot={slot}');
    expect(viewportSource).toContain('data-source-slice-id=');
    expect(viewportSource).toContain('min-h-[20rem]');
    expect(viewportSource).toContain('StkdeComparisonFieldMap');
    expect(viewportSource).not.toMatch(/CameraControls|Stkde3DScene|selectedSourceIndex/);
    expect(intensityLegendSource).toContain('STKDE intensity');
    expect(differenceSource).toContain('data-difference-field="signed-kde"');
    expect(differenceSource).not.toMatch(/StkdeSliceStack|RawEventPoints|HotspotTrajectoryOverlay|BurstVolumeRenderer|AdaptiveWarpAxis|CameraControls|Top-down spatial field/);
    expect(mapSource).toContain('mapSignedContrast');
    expect(mapMathSource).toContain('COMPARISON_MAP_EXTENT = 100');
    expect(mapMathSource).toContain('Math.pow(Math.abs(ratio), 0.65)');
    expect(presetSource).toContain('full-slice-02-vs-08');
    expect(presetSource).toContain('fourth-of-july-slice-03-vs-09');
    expect(fixtureSource).toContain('buildComparisonSliceFixture');
  });

  test('keeps zero, one, two, and ten rendered-interval fixtures deterministic', () => {
    for (const count of [0, 1, 2, 10] as const) {
      const first = buildComparisonSliceFixture(count);
      const second = buildComparisonSliceFixture(count);

      expect(first).toHaveLength(count);
      expect(first).toEqual(second);
      expect(first.map((slice) => slice.sourceSliceId)).toEqual(
        Array.from({ length: count }, (_, index) => `fixture-slice-${index}`),
      );
    }
  });
});

'use client';

import { useEffect, useMemo, useState } from 'react';
import type * as THREE from 'three';
import type { SliceKdeResult } from '@/lib/kde';
import type { ComparisonSelection } from '../lib/comparison';
import { computeSharedAbsoluteDomain } from '../lib/comparison-difference';
import { resolveComparisonSourceContext } from '../lib/comparison-source-context';
import { StkdeComparisonFieldMap } from './StkdeComparisonFieldMap';
import { StkdeDifferenceScene } from './StkdeDifferenceScene';
import { StkdeIntensityLegend } from './StkdeIntensityLegend';
import { StkdeSignedDifferenceLegend } from './StkdeSignedDifferenceLegend';
import { Stkde3DMapCapture } from './Stkde3DScene';
import { StkdeComparisonViewport } from './StkdeComparisonViewport';
import type { Stkde3DSceneSlice } from './Stkde3DSceneProvider';
import type { StkdeHeatmapRenderer } from './StkdeSliceStack';

export interface StkdeComparisonStageProps {
  selectionA: ComparisonSelection;
  selectionB: ComparisonSelection;
  sourceSlices: readonly Stkde3DSceneSlice[];
  sliceKdeResults: readonly SliceKdeResult[];
  heatmapRenderer?: StkdeHeatmapRenderer;
  mode?: 'absolute' | 'difference';
  comparisonPresetId?: string | null;
}

export function StkdeComparisonStage({
  selectionA,
  selectionB,
  sourceSlices,
  sliceKdeResults,
  heatmapRenderer = 'field',
  mode = 'absolute',
  comparisonPresetId,
}: StkdeComparisonStageProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);

  const sourceContextA = useMemo(() => resolveComparisonSourceContext({
    selection: selectionA,
    slices: sourceSlices,
    sliceKdes: sliceKdeResults,
  }), [selectionA, sliceKdeResults, sourceSlices]);
  const sourceContextB = useMemo(() => resolveComparisonSourceContext({
    selection: selectionB,
    slices: sourceSlices,
    sliceKdes: sliceKdeResults,
  }), [selectionB, sliceKdeResults, sourceSlices]);
  const fieldA = sourceContextA.selectedKde?.field ?? null;
  const fieldB = sourceContextB.selectedKde?.field ?? null;
  const hasComparisonFields = Boolean(fieldA && fieldB);
  const absoluteDomain = useMemo(() => {
    if (!fieldA || !fieldB) return [0, 1] as [number, number];
    return computeSharedAbsoluteDomain(fieldA, fieldB);
  }, [fieldA, fieldB]);

  useEffect(() => () => mapTexture?.dispose(), [mapTexture]);

  return (
    <section
      className="relative flex min-h-[48rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-[#f4f1eb] p-3 sm:p-4"
      data-comparison-stage
      data-comparison-mode={mode}
      data-render-status={hasComparisonFields ? 'ready' : 'error'}
      data-comparison-preset-id={comparisonPresetId ?? undefined}
    >
      <Stkde3DMapCapture onTextureReady={setMapTexture} />

      <header className="relative z-10 mb-3 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-border bg-white px-4 py-4 text-sm text-muted-foreground shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(18rem,40%)] sm:items-stretch sm:px-5 sm:py-4">
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <h2 className="text-xl font-semibold uppercase tracking-[0.18em] text-foreground sm:text-2xl">A/B COMPARISON</h2>
          {mode === 'absolute' ? (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              Shared absolute domain: {absoluteDomain[0].toPrecision(3)} – {absoluteDomain[1].toPrecision(3)}
            </p>
          ) : (
            <p className="text-xs font-medium text-foreground">KDE(A) − KDE(B) · signed difference</p>
          )}
        </div>
        <div className="flex min-w-0 items-center sm:justify-end">
          {mode === 'absolute' ? <StkdeIntensityLegend mode={heatmapRenderer} domain={absoluteDomain} /> : <StkdeSignedDifferenceLegend />}
        </div>
      </header>

      {mode === 'difference' ? (
        <StkdeDifferenceScene fieldA={fieldA} fieldB={fieldB} mapTexture={mapTexture} />
      ) : (
        <div className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(20rem,1fr)_minmax(20rem,1fr)] gap-3">
          <StkdeComparisonViewport
            slot="A"
            selection={selectionA}
            field={fieldA}
            sourceSliceId={sourceContextA.sourceSliceId}
            absoluteDomain={absoluteDomain}
            mapTexture={mapTexture}
            palette={heatmapRenderer}
          />
          <StkdeComparisonViewport
            slot="B"
            selection={selectionB}
            field={fieldB}
            sourceSliceId={sourceContextB.sourceSliceId}
            absoluteDomain={absoluteDomain}
            mapTexture={mapTexture}
            palette={heatmapRenderer}
          />
        </div>
      )}
    </section>
  );
}

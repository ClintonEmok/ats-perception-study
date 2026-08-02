'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraControls } from '@react-three/drei';
import type * as THREE from 'three';
import type { SliceKdeResult } from '@/lib/kde';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import type { HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { MockCrimeEvent } from '../lib/types';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import type { ComparisonSelection } from '../lib/comparison';
import { computeSharedAbsoluteDomain } from '../lib/comparison-difference';
import { createComparisonCameraController, type ComparisonCameraController } from '../lib/comparison-camera';
import { StkdeIntensityLegend } from './StkdeIntensityLegend';
import { Stkde3DMapCapture } from './Stkde3DScene';
import { StkdeComparisonViewport } from './StkdeComparisonViewport';
import type { Stkde3DSceneRuntime, Stkde3DSceneSlice } from './Stkde3DSceneProvider';
import type { StkdeHeatmapRenderer } from './StkdeSliceStack';

export interface StkdeComparisonStageProps {
  selectionA: ComparisonSelection;
  selectionB: ComparisonSelection;
  sourceSlices: readonly Stkde3DSceneSlice[];
  sliceEvents: readonly (readonly MockCrimeEvent[])[];
  sliceKdeResults: readonly SliceKdeResult[];
  hotspotSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  hotspotMatchingOptions?: HotspotMatchingOptions;
  volumeProfile?: readonly DurationVolumeProfileEntry[];
  heatmapRenderer?: StkdeHeatmapRenderer;
  kdeThreshold?: number;
  kdeGridSize?: number;
  showRawEvents?: boolean;
  showHotspotTrajectories?: boolean;
  activeSliceOpacity?: number;
  nonActiveSliceOpacity?: number;
  timeDomain?: [number, number];
  runtime?: Stkde3DSceneRuntime;
  linkedCameras?: boolean;
  onLinkedCamerasChange?: (linked: boolean) => void;
  onResetViews?: () => void;
}

export function StkdeComparisonStage({
  selectionA,
  selectionB,
  sourceSlices,
  sliceEvents,
  sliceKdeResults,
  hotspotSliceResults = null,
  hotspotMatchingOptions,
  volumeProfile,
  heatmapRenderer = 'field',
  kdeThreshold = 0,
  kdeGridSize = 32,
  showRawEvents = false,
  showHotspotTrajectories = true,
  activeSliceOpacity = 1,
  nonActiveSliceOpacity = 0.35,
  timeDomain,
  runtime,
  linkedCameras = true,
  onLinkedCamerasChange,
  onResetViews,
}: StkdeComparisonStageProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const controlsARef = useRef<CameraControls | null>(null);
  const controlsBRef = useRef<CameraControls | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [cameraController, setCameraController] = useState<ComparisonCameraController | null>(null);

  useEffect(() => {
    const controller = createComparisonCameraController({
      getControls: (pane) => pane === 'A' ? controlsARef.current : controlsBRef.current,
      initialLinked: true,
      reducedMotion: prefersReducedMotion,
    });
    setCameraController(controller);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener?.('change', onChange);
    return () => mediaQuery.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    cameraController?.setLinked(linkedCameras);
  }, [cameraController, linkedCameras]);

  const handleCameraUpdateA = useCallback(() => {
    cameraController?.handleUpdate('A');
  }, [cameraController]);
  const handleCameraUpdateB = useCallback(() => {
    cameraController?.handleUpdate('B');
  }, [cameraController]);
  const handleLinkedCamerasChange = useCallback((nextLinked: boolean) => {
    cameraController?.setLinked(nextLinked);
    onLinkedCamerasChange?.(nextLinked);
  }, [cameraController, onLinkedCamerasChange]);
  const handleResetViews = useCallback(() => {
    cameraController?.reset();
    onResetViews?.();
  }, [cameraController, onResetViews]);
  const absoluteDomain = useMemo(() => {
    const fieldA = sliceKdeResults[selectionA.sourceSliceIndex]?.field;
    const fieldB = sliceKdeResults[selectionB.sourceSliceIndex]?.field;
    if (!fieldA || !fieldB) return [0, 1] as [number, number];
    return computeSharedAbsoluteDomain(fieldA, fieldB);
  }, [selectionA.sourceSliceIndex, selectionB.sourceSliceIndex, sliceKdeResults]);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <section
      className="relative flex min-h-[41rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-[#f4f1eb] p-2"
      data-comparison-stage
      data-comparison-mode="absolute"
      data-render-status={mapTexture ? 'ready' : 'loading'}
      data-camera-linked={linkedCameras ? 'true' : 'false'}
    >
      <Stkde3DMapCapture onTextureReady={setMapTexture} />

      <header className="relative z-10 mb-2 flex min-h-8 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-[0.18em] text-foreground">A/B comparison</span>
          <span className="font-mono tabular-nums">shared absolute domain {absoluteDomain[0].toPrecision(3)} – {absoluteDomain[1].toPrecision(3)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={linkedCameras}
            data-camera-linked={linkedCameras ? 'true' : 'false'}
            onClick={() => handleLinkedCamerasChange(!linkedCameras)}
            className={`min-h-8 rounded-md border px-2.5 py-1 text-[10px] transition ${
              linkedCameras
                ? 'border-amber-600/60 bg-amber-50 text-amber-950'
                : 'border-border bg-background text-foreground hover:border-foreground/40'
            }`}
          >
            Linked cameras: {linkedCameras ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={handleResetViews}
            className="min-h-8 rounded-md border border-border bg-background px-2.5 py-1 text-[10px] text-foreground transition hover:border-foreground/40"
          >
            Reset views
          </button>
        </div>
      </header>

      <div className="relative z-10 mb-2 flex justify-end">
        <StkdeIntensityLegend mode={heatmapRenderer} domain={absoluteDomain} />
      </div>

      <div className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(20rem,1fr)_minmax(20rem,1fr)] gap-2">
        <StkdeComparisonViewport
          slot="A"
          selection={selectionA}
          sourceSlices={sourceSlices}
          sliceEvents={sliceEvents}
          sliceKdeResults={sliceKdeResults}
          hotspotSliceResults={hotspotSliceResults}
          hotspotMatchingOptions={hotspotMatchingOptions}
          volumeProfile={volumeProfile}
          heatmapRenderer={heatmapRenderer}
          kdeThreshold={kdeThreshold}
          kdeGridSize={kdeGridSize}
          absoluteDomain={absoluteDomain}
          showRawEvents={showRawEvents}
          showHotspotTrajectories={showHotspotTrajectories}
          activeSliceOpacity={activeSliceOpacity}
          nonActiveSliceOpacity={nonActiveSliceOpacity}
          timeDomain={timeDomain}
          runtime={runtime}
          mapTexture={mapTexture}
          cameraControlsRef={controlsARef}
          onCameraUpdate={handleCameraUpdateA}
        />
        <StkdeComparisonViewport
          slot="B"
          selection={selectionB}
          sourceSlices={sourceSlices}
          sliceEvents={sliceEvents}
          sliceKdeResults={sliceKdeResults}
          hotspotSliceResults={hotspotSliceResults}
          hotspotMatchingOptions={hotspotMatchingOptions}
          volumeProfile={volumeProfile}
          heatmapRenderer={heatmapRenderer}
          kdeThreshold={kdeThreshold}
          kdeGridSize={kdeGridSize}
          absoluteDomain={absoluteDomain}
          showRawEvents={showRawEvents}
          showHotspotTrajectories={showHotspotTrajectories}
          activeSliceOpacity={activeSliceOpacity}
          nonActiveSliceOpacity={nonActiveSliceOpacity}
          timeDomain={timeDomain}
          runtime={runtime}
          mapTexture={mapTexture}
          cameraControlsRef={controlsBRef}
          onCameraUpdate={handleCameraUpdateB}
        />
      </div>
    </section>
  );
}

'use client';

import { useMemo } from 'react';
import type { CameraControls } from '@react-three/drei';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import type { SliceKdeResult } from '@/lib/kde';
import { resolveComparisonSourceContext } from '../lib/comparison-source-context';
import type { ComparisonSelection } from '../lib/comparison';
import type { HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { MockCrimeEvent } from '../lib/types';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import {
  Stkde3DScene,
} from './Stkde3DScene';
import type {
  Stkde3DSceneRuntime,
  Stkde3DSceneSlice,
} from './Stkde3DSceneProvider';
import type { StkdeHeatmapRenderer } from './StkdeSliceStack';
import type * as THREE from 'three';

function formatEpoch(epoch: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(epoch * 1000));
}

export interface StkdeComparisonViewportProps {
  slot: 'A' | 'B';
  selection: ComparisonSelection;
  sourceSlices: readonly Stkde3DSceneSlice[];
  sliceEvents: readonly (readonly MockCrimeEvent[])[];
  sliceKdeResults: readonly SliceKdeResult[];
  hotspotSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  hotspotMatchingOptions?: HotspotMatchingOptions;
  volumeProfile?: readonly DurationVolumeProfileEntry[];
  heatmapRenderer?: StkdeHeatmapRenderer;
  kdeGridSize?: number;
  kdeThreshold?: number;
  absoluteDomain: [number, number];
  showRawEvents?: boolean;
  showHotspotTrajectories?: boolean;
  activeSliceOpacity?: number;
  nonActiveSliceOpacity?: number;
  timeDomain?: [number, number];
  runtime?: Stkde3DSceneRuntime;
  mapTexture?: THREE.CanvasTexture | null;
  cameraControlsRef?: { current: CameraControls | null };
  onCameraUpdate?: () => void;
}

export function StkdeComparisonViewport({
  slot,
  selection,
  sourceSlices,
  sliceEvents,
  sliceKdeResults,
  hotspotSliceResults = null,
  hotspotMatchingOptions,
  volumeProfile,
  heatmapRenderer = 'field',
  kdeGridSize = 32,
  kdeThreshold = 0,
  absoluteDomain,
  showRawEvents = false,
  showHotspotTrajectories = true,
  activeSliceOpacity = 1,
  nonActiveSliceOpacity = 0.35,
  timeDomain,
  runtime,
  mapTexture,
  cameraControlsRef,
  onCameraUpdate,
}: StkdeComparisonViewportProps) {
  const sourceContext = useMemo(() => resolveComparisonSourceContext({
    selection,
    slices: sourceSlices,
    sliceEvents,
    sliceKdes: sliceKdeResults,
    sliceResults: sourceSlices.map((slice) => (
      slice.sourceSliceId ? hotspotSliceResults?.[slice.sourceSliceId] : undefined
    )),
  }), [hotspotSliceResults, selection, sliceEvents, sliceKdeResults, sourceSlices]);

  const selectedSlice = sourceContext.selectedSlice;
  const sourceSliceIndex = sourceContext.sourceSliceIndex ?? selection.sourceSliceIndex;
  const selectedKde = sourceContext.selectedKde;
  const selectedEvents = sourceContext.selectedEvents;
  const focusedSlice = selectedSlice
    ? [{
        ...selectedSlice,
        index: 0,
        sourceSliceIndex,
      }]
    : [];
  const focusedVolumeProfileEntry = volumeProfile?.find((entry) => entry.index === sourceSliceIndex)
    ?? volumeProfile?.[sourceSliceIndex];
  const focusedVolumeProfile = focusedVolumeProfileEntry
    ? [{ ...focusedVolumeProfileEntry, index: 0 }]
    : [];
  const accessibleLabel = selectedSlice
    ? `Interactive focused 3D viewport for interval ${slot}, ${selectedSlice.label}`
    : `Focused 3D viewport for interval ${slot}`;

  return (
    <article
      className="min-h-[20rem] min-w-0 overflow-hidden rounded-2xl border border-border bg-background/45"
      data-interval-slot={slot}
      data-source-slice-id={sourceContext.sourceSliceId ?? selection.sourceSliceId ?? `index-${sourceSliceIndex}`}
      aria-label={accessibleLabel}
    >
      <header className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/95 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="shrink-0 font-mono text-sm font-semibold text-foreground">{slot}</span>
          <span className="min-w-0 break-words font-medium text-foreground" title={selectedSlice?.label ?? selection.label}>
            {selectedSlice?.label ?? selection.label ?? `Slice ${sourceSliceIndex + 1}`}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 font-mono tabular-nums">
          <span className="break-words" title={`${formatEpoch(selection.startEpoch)} to ${formatEpoch(selection.endEpoch)}`}>
            {formatEpoch(selection.startEpoch)} – {formatEpoch(selection.endEpoch)}
          </span>
          <span>{selection.eventCount ?? selectedSlice?.crimeCount ?? 0} events</span>
        </div>
      </header>

      <div className="h-[20rem] min-h-[20rem] min-w-0 lg:h-[22rem]">
        {selectedSlice && selectedKde ? (
          <Stkde3DScene
            slices={focusedSlice}
            sliceKdes={[selectedKde.cells]}
            sliceKdeFields={[selectedKde.field]}
            absoluteDomain={absoluteDomain}
            absoluteThreshold={kdeThreshold}
            volumeProfile={focusedVolumeProfile}
            sliceEvents={sliceEvents as MockCrimeEvent[][]}
            selectedSourceEvents={selectedEvents}
            selectedSourceIndex={sourceSliceIndex}
            sourceSlices={sourceSlices}
            sourceSliceResults={hotspotSliceResults}
            hotspotSliceResults={hotspotSliceResults}
            hotspotMatchingOptions={hotspotMatchingOptions}
            activeIndex={0}
            viewMode="focus"
            showRawEvents={showRawEvents}
            showHotspotTrajectories={showHotspotTrajectories}
            activeSliceOpacity={activeSliceOpacity}
            nonActiveSliceOpacity={nonActiveSliceOpacity}
            timeDomain={timeDomain}
            runtime={runtime}
            heatmapRenderer={heatmapRenderer}
            kdeGridSize={kdeGridSize}
            mapTexture={mapTexture}
            renderMapSource={false}
            cameraControlsRef={cameraControlsRef}
            onCameraUpdate={onCameraUpdate}
            comparisonSelectedSourceSliceIds={sourceContext.sourceSliceId ? [sourceContext.sourceSliceId] : []}
            comparisonSelectedSourceIndices={[sourceSliceIndex]}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            This comparison could not be resolved. Reset comparison and select two distinct intervals.
          </div>
        )}
      </div>
    </article>
  );
}

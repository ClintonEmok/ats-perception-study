'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { START_Y, resolveEpochFromWarpedY, resolveWarpedEpochY } from '../lib/timeline-axis';
import type { EvolvingSlice } from '../lib/types';

export type Stkde3DSceneSlice = EvolvingSlice & {
  sourceSliceId?: string;
  sourceSliceIndex?: number;
  /** Server-authoritative dashboard count; null means the keyed result is unavailable. */
  serverEventCount?: number | null;
};
export type Stkde3DWorldPoint = [number, number, number];

export interface Stkde3DCameraFocusTarget {
  target: Stkde3DWorldPoint;
  position: Stkde3DWorldPoint;
}

export interface Stkde3DSliceInteractionPayload {
  index: number;
  renderedIndex: number;
  sourceSliceId: string | null;
  sourceSliceIndex: number;
  startEpoch: number;
  endEpoch: number;
  eventCount?: number;
  focusPoint: Stkde3DWorldPoint;
}

export interface Stkde3DBurstInteractionPayload {
  burstId: string;
  sampleId: string;
  sampleIndex: number;
  sourceSliceId: string | null;
  sourceSliceIndex?: number;
  startEpoch: number;
  endEpoch: number;
  sampleEpoch: number;
  supportCount: number | null;
  intensityScore: number | null;
  spreadMeters: number | null;
  adaptiveHeight: number | null;
  durationSeconds: number | null;
  focusPoint: Stkde3DWorldPoint;
}

export interface Stkde3DClusterInteractionPayload {
  hotspotId: string;
  trackId: string;
  snapshotIndex: number;
  sourceSliceId: string;
  sourceSliceIndex?: number;
  startEpoch: number;
  endEpoch: number;
  centroidLat: number;
  centroidLng: number;
  radiusMeters: number | null;
  focusPoint: Stkde3DWorldPoint;
}

export interface Stkde3DTemporalWindowPayload {
  startEpoch: number;
  endEpoch: number;
  durationSeconds: number;
  scanY: number;
}

export interface Stkde3DSceneRuntime {
  displayDomain: [number, number];
  warpDomain: [number, number];
  timeScaleMode: 'linear' | 'adaptive';
  warpBlend: number;
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  isPlaying: boolean;
  isInterpolated: boolean;
  sourceSliceIds: readonly string[];
  comparisonSelectionEnabled: boolean;
  resolveSliceY: (slice: Stkde3DSceneSlice) => number;
  resolveEpochY: (epochSec: number) => number;
  yToEpoch: (y: number) => number;
  onActiveIndexChange: (index: number) => void;
  onSliceHover: (payload: Stkde3DSliceInteractionPayload | null) => void;
  onSliceSelect: (payload: Stkde3DSliceInteractionPayload) => void;
  onComparisonSliceSelect: (payload: Stkde3DSliceInteractionPayload) => void;
  onSliceResize: (payload: {
    index: number;
    sourceSliceId: string;
    startEpoch: number;
    endEpoch: number;
  }) => void;
  onBurstHover: (payload: Stkde3DBurstInteractionPayload | null) => void;
  onBurstSelect: (payload: Stkde3DBurstInteractionPayload) => void;
  onClusterHover: (payload: Stkde3DClusterInteractionPayload | null) => void;
  onClusterSelect: (payload: Stkde3DClusterInteractionPayload) => void;
  cameraFocus: (target: Stkde3DCameraFocusTarget | null) => void;
  onTemporalWindowPropose: (payload: Stkde3DTemporalWindowPayload | null) => void;
  onTemporalWindowCommit: (payload: Stkde3DTemporalWindowPayload) => void;
  temporalWindowEnabled: boolean;
  onCreateDraftAtPoint: (payload: { y: number; clientX: number; clientY: number }) => void;
  onCanvasPointerDown: (payload: { clientX: number; clientY: number }) => void;
  onCanvasPointerMissed: () => void;
}

export interface Stkde3DSceneRuntimeOptions {
  displayDomain?: [number, number];
  warpDomain?: [number, number];
  timeScaleMode?: 'linear' | 'adaptive';
  warpBlend?: number;
  warpMap?: Float32Array | null;
  densityMap?: Float32Array | null;
  isPlaying?: boolean;
  isInterpolated?: boolean;
  sourceSliceIds?: readonly string[];
  comparisonSelectionEnabled?: boolean;
  yOffset?: number;
  resolveSliceY?: (slice: Stkde3DSceneSlice) => number;
  resolveEpochY?: (epochSec: number) => number;
  yToEpoch?: (y: number) => number;
  onActiveIndexChange?: (index: number) => void;
  onSliceHover?: (payload: Stkde3DSliceInteractionPayload | null) => void;
  onSliceSelect?: (payload: Stkde3DSliceInteractionPayload) => void;
  onComparisonSliceSelect?: (payload: Stkde3DSliceInteractionPayload) => void;
  onSliceResize?: (payload: {
    index: number;
    sourceSliceId: string;
    startEpoch: number;
    endEpoch: number;
  }) => void;
  onBurstHover?: (payload: Stkde3DBurstInteractionPayload | null) => void;
  onBurstSelect?: (payload: Stkde3DBurstInteractionPayload) => void;
  onClusterHover?: (payload: Stkde3DClusterInteractionPayload | null) => void;
  onClusterSelect?: (payload: Stkde3DClusterInteractionPayload) => void;
  onCameraFocus?: (target: Stkde3DCameraFocusTarget | null) => void;
  onTemporalWindowPropose?: (payload: Stkde3DTemporalWindowPayload | null) => void;
  onTemporalWindowCommit?: (payload: Stkde3DTemporalWindowPayload) => void;
  onCreateDraftAtPoint?: (payload: { y: number; clientX: number; clientY: number }) => void;
  onCanvasPointerDown?: (payload: { clientX: number; clientY: number }) => void;
  onCanvasPointerMissed?: () => void;
}

const DEFAULT_DOMAIN: [number, number] = [0, 1];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function normalizeDomain(domain: [number, number] | undefined, fallback: [number, number]): [number, number] {
  const start = domain?.[0] ?? fallback[0];
  const end = domain?.[1] ?? fallback[1];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [...fallback] as [number, number];
  }
  return [start, end];
}

export function createStkde3DSceneRuntime(options: Stkde3DSceneRuntimeOptions = {}): Stkde3DSceneRuntime {
  const displayDomain = normalizeDomain(options.displayDomain, DEFAULT_DOMAIN);
  const warpDomain = normalizeDomain(options.warpDomain, displayDomain);
  const timeScaleMode = options.timeScaleMode ?? 'linear';
  const warpBlend = clamp(options.warpBlend ?? 0, 0, 1);
  const warpMap = options.warpMap ?? null;
  const yOffset = options.yOffset ?? 0;
  const resolveEpochY = options.resolveEpochY ?? ((epochSec: number) => resolveWarpedEpochY(epochSec, START_Y, {
    timeScaleMode,
    warpBlend,
    warpMap,
    displayDomain,
    warpDomain,
    yOffset,
  }));
  const resolveSliceY = options.resolveSliceY ?? ((slice: Stkde3DSceneSlice) => resolveEpochY(slice.startEpoch));
  const yToEpoch = options.yToEpoch ?? ((y: number) => resolveEpochFromWarpedY(y - yOffset, START_Y, {
    timeScaleMode,
    warpBlend,
    warpMap,
    displayDomain,
    warpDomain,
  }));

  return {
    displayDomain,
    warpDomain,
    timeScaleMode,
    warpBlend,
    densityMap: options.densityMap ?? null,
    warpMap,
    isPlaying: options.isPlaying ?? false,
    isInterpolated: options.isInterpolated ?? false,
    sourceSliceIds: options.sourceSliceIds ?? [],
    comparisonSelectionEnabled: options.comparisonSelectionEnabled ?? false,
    resolveSliceY,
    resolveEpochY,
    yToEpoch,
    onActiveIndexChange: options.onActiveIndexChange ?? (() => undefined),
    onSliceHover: options.onSliceHover ?? (() => undefined),
    onSliceSelect: options.onSliceSelect ?? (() => undefined),
    onComparisonSliceSelect: options.onComparisonSliceSelect ?? (() => undefined),
    onSliceResize: options.onSliceResize ?? (() => undefined),
    onBurstHover: options.onBurstHover ?? (() => undefined),
    onBurstSelect: options.onBurstSelect ?? (() => undefined),
    onClusterHover: options.onClusterHover ?? (() => undefined),
    onClusterSelect: options.onClusterSelect ?? (() => undefined),
    cameraFocus: options.onCameraFocus ?? (() => undefined),
    onTemporalWindowPropose: options.onTemporalWindowPropose ?? (() => undefined),
    onTemporalWindowCommit: options.onTemporalWindowCommit ?? (() => undefined),
    temporalWindowEnabled: Boolean(options.onTemporalWindowPropose && options.onTemporalWindowCommit),
    onCreateDraftAtPoint: options.onCreateDraftAtPoint ?? (() => undefined),
    onCanvasPointerDown: options.onCanvasPointerDown ?? (() => undefined),
    onCanvasPointerMissed: options.onCanvasPointerMissed ?? (() => undefined),
  };
}

export function createCameraFocusTarget(focusPoint: Stkde3DWorldPoint): Stkde3DCameraFocusTarget {
  return {
    target: focusPoint,
    position: [focusPoint[0] + 28, focusPoint[1] + 20, focusPoint[2] + 28],
  };
}

const defaultRuntime = createStkde3DSceneRuntime();
const Stkde3DSceneRuntimeContext = createContext<Stkde3DSceneRuntime>(defaultRuntime);

export function Stkde3DSceneProvider({
  runtime = defaultRuntime,
  children,
}: {
  runtime?: Stkde3DSceneRuntime;
  children: ReactNode;
}) {
  const stableRuntime = useMemo(() => runtime, [runtime]);
  return (
    <Stkde3DSceneRuntimeContext.Provider value={stableRuntime}>
      {children}
    </Stkde3DSceneRuntimeContext.Provider>
  );
}

export function useStkde3DSceneRuntime(): Stkde3DSceneRuntime {
  return useContext(Stkde3DSceneRuntimeContext);
}

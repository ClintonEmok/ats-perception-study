'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { START_Y, resolveEpochFromWarpedY, resolveWarpedEpochY } from '../lib/timeline-axis';
import type { EvolvingSlice } from '../lib/types';

export type Stkde3DSceneSlice = EvolvingSlice & { sourceSliceId?: string };

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
  resolveSliceY: (slice: Stkde3DSceneSlice) => number;
  resolveEpochY: (epochSec: number) => number;
  yToEpoch: (y: number) => number;
  onActiveIndexChange: (index: number) => void;
  onSliceSelect: (payload: { index: number; sourceSliceId: string | null }) => void;
  onSliceResize: (payload: {
    index: number;
    sourceSliceId: string;
    startEpoch: number;
    endEpoch: number;
  }) => void;
  onCreateDraftAtPoint: (payload: { y: number; clientX: number; clientY: number }) => void;
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
  yOffset?: number;
  resolveSliceY?: (slice: Stkde3DSceneSlice) => number;
  resolveEpochY?: (epochSec: number) => number;
  yToEpoch?: (y: number) => number;
  onActiveIndexChange?: (index: number) => void;
  onSliceSelect?: (payload: { index: number; sourceSliceId: string | null }) => void;
  onSliceResize?: (payload: {
    index: number;
    sourceSliceId: string;
    startEpoch: number;
    endEpoch: number;
  }) => void;
  onCreateDraftAtPoint?: (payload: { y: number; clientX: number; clientY: number }) => void;
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
    resolveSliceY,
    resolveEpochY,
    yToEpoch,
    onActiveIndexChange: options.onActiveIndexChange ?? (() => undefined),
    onSliceSelect: options.onSliceSelect ?? (() => undefined),
    onSliceResize: options.onSliceResize ?? (() => undefined),
    onCreateDraftAtPoint: options.onCreateDraftAtPoint ?? (() => undefined),
    onCanvasPointerMissed: options.onCanvasPointerMissed ?? (() => undefined),
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { easeInOutCubic, interpolateKdeCells } from '@/lib/motion/easing';
import { resolveTemporalSlabBounds, START_Y, SLICE_SPACING } from '../lib/timeline-axis';
import { getLegacyStkdeIntensityColor, getStkdeIntensityColor } from '../lib/palette';
import type { KdeCell } from '../lib/types';
import { convertKdeFieldToDisplayCells } from '@/app/stkde-3d/lib/comparison-difference';
import type { KdeField } from '@/lib/kde';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import { createCameraFocusTarget, useStkde3DSceneRuntime, type Stkde3DSceneSlice } from './Stkde3DSceneProvider';

export { AXIS_HEIGHT, START_Y, SLICE_SPACING } from '../lib/timeline-axis';
const TEXTURE_SIZE = 256;
const TRANSITION_DURATION_MS = 240;
const MIN_RESIZE_DURATION_SEC = 3600;

export type StkdeHeatmapRenderer = 'field' | 'legacy';

export function yForIndex(index: number): number {
  return START_Y + index * SLICE_SPACING;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function configureTexture(texture: THREE.CanvasTexture): THREE.CanvasTexture {
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildLegacyHeatmapTexture(cells: KdeCell[]): THREE.CanvasTexture | null {
  if (cells.length === 0 || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  for (const cell of cells) {
    const cx = ((cell.x + 50) / 100) * TEXTURE_SIZE;
    const cy = TEXTURE_SIZE - ((cell.z + 50) / 100) * TEXTURE_SIZE;
    const intensity = Math.min(1, Math.max(0, cell.intensity));
    const radius = Math.max(10, intensity * 44);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, getLegacyStkdeIntensityColor(intensity, 0.98));
    gradient.addColorStop(0.42, getLegacyStkdeIntensityColor(intensity * 0.72, 0.75));
    gradient.addColorStop(0.78, getLegacyStkdeIntensityColor(intensity * 0.24, 0.4));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function buildFieldHeatmapTexture(cells: KdeCell[], gridSize: number): THREE.CanvasTexture | null {
  if (cells.length === 0 || typeof document === 'undefined') return null;

  const safeGridSize = Math.max(4, Math.round(gridSize));
  const canvas = document.createElement('canvas');
  canvas.width = safeGridSize;
  canvas.height = safeGridSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, safeGridSize, safeGridSize);

  for (const cell of cells) {
    const col = Math.min(safeGridSize - 1, Math.max(0, Math.floor(((cell.x + 50) / 100) * safeGridSize)));
    const row = Math.min(safeGridSize - 1, Math.max(0, Math.floor(((cell.z + 50) / 100) * safeGridSize)));
    const intensity = Math.min(1, Math.max(0, cell.intensity));
    const alpha = Math.min(0.95, 0.14 + intensity * 0.86);
    ctx.fillStyle = getStkdeIntensityColor(intensity, alpha);
    ctx.fillRect(col, safeGridSize - row - 1, 1, 1);
  }

  return configureTexture(new THREE.CanvasTexture(canvas));
}

function buildHeatmapTexture(
  cells: KdeCell[],
  renderer: StkdeHeatmapRenderer,
  gridSize: number,
): THREE.CanvasTexture | null {
  return renderer === 'field'
    ? buildFieldHeatmapTexture(cells, gridSize)
    : buildLegacyHeatmapTexture(cells);
}

function flattenKdeCells(cells: KdeCell[]): Float32Array {
  const flat = new Float32Array(cells.length * 4);
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i]!;
    flat[i * 4] = cell.x;
    flat[i * 4 + 1] = cell.z;
    flat[i * 4 + 2] = cell.intensity;
    flat[i * 4 + 3] = cell.support;
  }
  return flat;
}

function unflattenKdeCells(flat: Float32Array): KdeCell[] {
  const cells: KdeCell[] = [];
  for (let i = 0; i < flat.length / 4; i += 1) {
    cells.push({
      x: flat[i * 4],
      z: flat[i * 4 + 1],
      intensity: flat[i * 4 + 2],
      support: flat[i * 4 + 3],
    });
  }
  return cells;
}

function buildInterpolatedTexture(
  fromCells: KdeCell[] | undefined,
  toCells: KdeCell[] | undefined,
  t: number,
  renderer: StkdeHeatmapRenderer,
  gridSize: number,
): THREE.CanvasTexture | null {
  if (!fromCells || !toCells || fromCells.length === 0 || toCells.length === 0) return null;

  if (fromCells.length !== toCells.length) {
    return buildHeatmapTexture(toCells, renderer, gridSize);
  }

  const interpolated = interpolateKdeCells(flattenKdeCells(fromCells), flattenKdeCells(toCells), t);
  return buildHeatmapTexture(unflattenKdeCells(interpolated), renderer, gridSize);
}

interface StkdeSliceStackProps {
  slices: Stkde3DSceneSlice[];
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  activeIndex: number;
  compact?: boolean;
  sliceOpacity?: number;
  activeSliceOpacity?: number;
  nonActiveSliceOpacity?: number;
  heightScale?: number;
  heatmapRenderer?: StkdeHeatmapRenderer;
  kdeGridSize?: number;
  sliceKdeFields?: Array<KdeField | undefined>;
  absoluteDomain?: [number, number];
  absoluteThreshold?: number;
  comparisonSelectedSourceSliceIds?: readonly string[];
  comparisonSelectedSourceIndices?: readonly number[];
}

type ResizeHandle = 'start' | 'end';

interface DragState {
  sliceId: string;
  sliceIndex: number;
  handle: ResizeHandle;
  pointerId: number;
  centerY: number;
  startEpoch: number;
  endEpoch: number;
  previewStartEpoch: number;
  previewEndEpoch: number;
}

interface SliceTransition {
  fromIndex: number;
  toIndex: number;
  startedAt: number;
}

export function StkdeSliceStack({
  slices,
  sliceKdes,
  volumeProfile,
  activeIndex,
  compact = false,
  sliceOpacity = 1,
  activeSliceOpacity = 1,
  nonActiveSliceOpacity = 0.35,
  heightScale = 1,
  heatmapRenderer = 'legacy',
  kdeGridSize = 32,
  sliceKdeFields,
  absoluteDomain,
  absoluteThreshold = 0,
  comparisonSelectedSourceSliceIds = [],
  comparisonSelectedSourceIndices = [],
}: StkdeSliceStackProps) {
  const {
    isPlaying,
    isInterpolated,
    sourceSliceIds,
    resolveSliceY,
    resolveEpochY,
    yToEpoch,
    onActiveIndexChange,
    onSliceHover,
    onSliceSelect,
    onComparisonSliceSelect,
    comparisonSelectionEnabled,
    onSliceResize,
    cameraFocus,
  } = useStkde3DSceneRuntime();
  const { camera, gl } = useThree();

  const [dragState, setDragState] = useState<DragState | null>(null);

  const resolveSourceSliceId = useCallback(
    (sliceIndex: number): string | null => {
      const slice = slices[sliceIndex];
      return slice?.sourceSliceId ?? sourceSliceIds[sliceIndex] ?? null;
    },
    [slices, sourceSliceIds]
  );

  const resolvePointerY = useCallback(
    (clientX: number, clientY: number, planeY: number): number => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        cameraDirection.clone().negate(),
        new THREE.Vector3(0, planeY, 0),
      );

      const target = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, target);
      return intersection?.y ?? planeY;
    },
    [camera, gl.domElement]
  );

  const commitResize = useCallback((state: DragState) => {
    const startEpoch = Math.min(state.previewStartEpoch, state.previewEndEpoch);
    const endEpoch = Math.max(state.previewStartEpoch, state.previewEndEpoch);
    onSliceResize({
      index: state.sliceIndex,
      sourceSliceId: state.sliceId,
      startEpoch,
      endEpoch,
    });
    if (!compact) {
      onActiveIndexChange(state.sliceIndex);
    }
  }, [compact, onActiveIndexChange, onSliceResize]);

  const handleSliceSelect = useCallback((sliceIndex: number) => {
    const slice = slices[sliceIndex];
    if (!slice) return;
    const sourceSliceId = resolveSourceSliceId(sliceIndex);
    const payload = {
      index: compact ? 0 : sliceIndex,
      renderedIndex: compact ? 0 : sliceIndex,
      sourceSliceId,
      sourceSliceIndex: slice.sourceSliceIndex ?? slice.index,
      startEpoch: slice.startEpoch,
      endEpoch: slice.endEpoch,
       eventCount: slice.serverEventCount === undefined
         ? slice.crimeCount
         : slice.serverEventCount ?? undefined,
      focusPoint: [0, resolveSliceY(slice), 0] as [number, number, number],
    };
    if (comparisonSelectionEnabled) {
      onComparisonSliceSelect(payload);
      return;
    }
    onSliceSelect(payload);
    cameraFocus(createCameraFocusTarget(payload.focusPoint));
    if (!compact) {
      onActiveIndexChange(sliceIndex);
    }
  }, [cameraFocus, comparisonSelectionEnabled, compact, onActiveIndexChange, onComparisonSliceSelect, onSliceSelect, resolveSliceY, resolveSourceSliceId, slices]);

  const buildSliceHoverPayload = useCallback((sliceIndex: number) => {
    const slice = slices[sliceIndex];
    if (!slice) return null;
    return {
      index: compact ? 0 : sliceIndex,
      renderedIndex: compact ? 0 : sliceIndex,
      sourceSliceId: resolveSourceSliceId(sliceIndex),
      sourceSliceIndex: slice.sourceSliceIndex ?? slice.index,
      startEpoch: slice.startEpoch,
      endEpoch: slice.endEpoch,
       eventCount: slice.serverEventCount === undefined
         ? slice.crimeCount
         : slice.serverEventCount ?? undefined,
      focusPoint: [0, resolveSliceY(slice), 0] as [number, number, number],
    };
  }, [compact, resolveSliceY, resolveSourceSliceId, slices]);

  const handleHandlePointerDown = useCallback((e: ThreeEvent<PointerEvent>, sliceIndex: number, handle: ResizeHandle, centerY: number) => {
    e.stopPropagation();
    if (comparisonSelectionEnabled) return;
    const sourceSliceId = resolveSourceSliceId(sliceIndex);
    if (!sourceSliceId) return;

    const slice = slices[sliceIndex];
    if (!slice) return;

    handleSliceSelect(sliceIndex);
    gl.domElement.setPointerCapture(e.pointerId);
    setDragState({
      sliceId: sourceSliceId,
      sliceIndex,
      handle,
      pointerId: e.pointerId,
      centerY,
      startEpoch: slice.startEpoch,
      endEpoch: slice.endEpoch,
      previewStartEpoch: slice.startEpoch,
      previewEndEpoch: slice.endEpoch,
    });
  }, [comparisonSelectionEnabled, gl.domElement, handleSliceSelect, resolveSourceSliceId, slices]);

  useEffect(() => {
    if (!dragState) return undefined;

    const onPointerMove = (event: PointerEvent) => {
      const y = resolvePointerY(event.clientX, event.clientY, dragState.centerY);
      const nextEpoch = yToEpoch(y);

      const nextStart = dragState.handle === 'start'
        ? Math.min(nextEpoch, dragState.endEpoch - MIN_RESIZE_DURATION_SEC)
        : dragState.startEpoch;
      const nextEnd = dragState.handle === 'end'
        ? Math.max(nextEpoch, dragState.startEpoch + MIN_RESIZE_DURATION_SEC)
        : dragState.endEpoch;

      setDragState((current) => (current ? {
        ...current,
        previewStartEpoch: nextStart,
        previewEndEpoch: nextEnd,
      } : current));
    };

    const onPointerUp = () => {
      commitResize(dragState);
      setDragState(null);
      try {
        gl.domElement.releasePointerCapture(dragState.pointerId);
      } catch {
        // ignore capture release issues
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [commitResize, dragState, gl.domElement, resolvePointerY, yToEpoch]);

  const renderSliceKdes = useMemo(() => {
    if (!sliceKdeFields || !absoluteDomain) return sliceKdes;

    return sliceKdeFields.map((field, index) => field
      ? convertKdeFieldToDisplayCells(field, absoluteDomain[1], absoluteThreshold)
      : sliceKdes[index] ?? []);
  }, [absoluteDomain, absoluteThreshold, sliceKdeFields, sliceKdes]);

  const textures = useMemo(() => {
    const newTextures = new Map<number, THREE.CanvasTexture>();
    for (let i = 0; i < renderSliceKdes.length; i += 1) {
       const tex = buildHeatmapTexture(renderSliceKdes[i] ?? [], heatmapRenderer, kdeGridSize);
      if (tex) {
        newTextures.set(i, tex);
      }
    }
    return newTextures;
  }, [heatmapRenderer, kdeGridSize, renderSliceKdes]);

  const [transition, setTransition] = useState<SliceTransition | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const previousActiveIndexRef = useRef(activeIndex);

  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex.dispose());
    };
  }, [textures]);

  useEffect(() => {
    const previousIndex = previousActiveIndexRef.current;
    previousActiveIndexRef.current = activeIndex;

    if (previousIndex === activeIndex || previousIndex < 0) return;

    if (!isPlaying || !isInterpolated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on playback pause
      setTransition(null);
      return;
    }

    setTransition({ fromIndex: previousIndex, toIndex: activeIndex, startedAt: performance.now() });
  }, [activeIndex, isInterpolated, isPlaying]);

  useEffect(() => {
    if (!transition) return undefined;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 80);

    return () => window.clearInterval(interval);
  }, [transition]);

  const transitionProgress = useMemo(
    () => (transition ? clamp01((nowMs - transition.startedAt) / TRANSITION_DURATION_MS) : 0),
    [nowMs, transition],
  );

  const hasActiveSlice = activeIndex >= 0 && activeIndex < slices.length;

  const transitionTexture = useMemo(() => {
    if (!transition || !isPlaying || !isInterpolated) return null;
    const fromCells = renderSliceKdes[transition.fromIndex];
    const toCells = renderSliceKdes[transition.toIndex];
    return buildInterpolatedTexture(
      fromCells,
      toCells,
      easeInOutCubic(transitionProgress),
      heatmapRenderer,
      kdeGridSize,
    );
  }, [heatmapRenderer, isInterpolated, isPlaying, kdeGridSize, renderSliceKdes, transition, transitionProgress]);

  useEffect(() => {
    return () => {
      transitionTexture?.dispose();
    };
  }, [transitionTexture]);

  return (
    <group>
      {slices.map((slice) => {
        const i = slice.index;
        const diff = Math.abs(i - activeIndex);
        const isActive = hasActiveSlice && diff === 0;
        const isAdjacent = hasActiveSlice && diff === 1;
        const sourceSliceIndex = slice.sourceSliceIndex ?? slice.index;
        const sourceSliceId = resolveSourceSliceId(i);
        const isComparisonSelected = comparisonSelectionEnabled && (
          (sourceSliceId ? comparisonSelectedSourceSliceIds.includes(sourceSliceId) : false)
          || comparisonSelectedSourceIndices.includes(sourceSliceIndex)
        );
        const isEmphasized = isActive || isComparisonSelected;
        const opacityMultiplier = isActive
          ? activeSliceOpacity
          : isComparisonSelected
            ? activeSliceOpacity
          : isAdjacent
            ? nonActiveSliceOpacity
            : nonActiveSliceOpacity * 0.3;

        const gridOpacity = isEmphasized ? 0.08 : isAdjacent ? 0.03 : 0.01;
        const volume = volumeProfile?.[i];
        const hasVolume = Boolean(volume);
        const visualThickness = (volume?.thickness ?? 0.3) * heightScale;
        const slabBounds = hasVolume
          ? resolveTemporalSlabBounds(slice.startEpoch, slice.endEpoch, resolveEpochY)
          : null;
        const thickness = slabBounds?.height ?? visualThickness;
        const groupY = slabBounds?.centerY ?? resolveSliceY(slice);
        const surfaceY = slabBounds
          ? slabBounds.maxY - slabBounds.centerY + 0.1
          : hasVolume
            ? thickness / 2 + 0.1
            : 0;
        const baseMultiplier = opacityMultiplier * sliceOpacity;
        const slabOpacity = hasVolume
          ? isActive
            ? Math.min(0.48, Math.max(0.08, (volume?.opacity ?? 0.18) * baseMultiplier + 0.24 * activeSliceOpacity))
            : Math.min(0.3, Math.max(0.04, (volume?.opacity ?? 0.18) * baseMultiplier))
          : 0;
        const surfaceOpacity = hasVolume
          ? isActive
            ? Math.min(0.98, Math.max(0.32, ((volume?.opacity ?? 0.18) + 0.2) * baseMultiplier + 0.24 * activeSliceOpacity))
            : Math.min(0.75, Math.max(0.04, ((volume?.opacity ?? 0.18) + 0.2) * baseMultiplier))
          : Math.min(isActive ? 0.85 : 0.7, 0.3 * baseMultiplier + (isActive ? 0.24 * activeSliceOpacity : 0));
        const underlayOpacity = hasVolume
          ? Math.max(0.05, surfaceOpacity * (0.26 + (volume?.falloff ?? 0.1)))
          : 0;
        const texture = textures.get(i) ?? undefined;

        const handleInset = Math.max(0.06, thickness * 0.12);
        const bottomHandleY = slabBounds
          ? slabBounds.startY - slabBounds.centerY
          : hasVolume
            ? handleInset
            : 0.08;
        const topHandleY = slabBounds
          ? slabBounds.endY - slabBounds.centerY
          : hasVolume
            ? Math.max(handleInset + 0.06, thickness - handleInset)
            : 0.18;

        return (
          <group
            key={slice.index}
            position={[0, groupY, 0]}
            onPointerEnter={(event) => {
              event.stopPropagation();
              onSliceHover(buildSliceHoverPayload(i));
            }}
            onPointerLeave={(event) => {
              event.stopPropagation();
              onSliceHover(null);
            }}
            onPointerMissed={() => onSliceHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              handleSliceSelect(i);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {hasVolume ? (
              <>
                <mesh position={[0, slabBounds ? 0 : thickness / 2, 0]}>
                  <boxGeometry args={[100, thickness, 100]} />
                  <meshStandardMaterial
                    color={isEmphasized ? '#b45309' : '#d6d3d1'}
                    transparent
                    opacity={slabOpacity}
                    roughness={0.96}
                    metalness={0.02}
                    depthWrite={false}
                  />
                </mesh>

                {texture ? (
                  <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, surfaceY + 0.01, 0]}>
                      <planeGeometry args={[100 - (volume?.falloff ?? 0.1) * 5, 100 - (volume?.falloff ?? 0.1) * 5]} />
                      <meshBasicMaterial
                        map={texture}
                        transparent
                        opacity={surfaceOpacity}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>

                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, surfaceY - 0.03, 0]}>
                      <planeGeometry args={[96 - (volume?.falloff ?? 0.1) * 7, 96 - (volume?.falloff ?? 0.1) * 7]} />
                      <meshBasicMaterial
                        map={texture}
                        transparent
                        opacity={underlayOpacity}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                  </>
                ) : null}
              </>
            ) : (
              texture ? (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[100, 100]} />
                  <meshBasicMaterial
                    map={texture}
                    transparent
                    opacity={surfaceOpacity}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
              </mesh>
            ) : null
            )}

             {isActive && !comparisonSelectionEnabled && sourceSliceId ? (
              <>
                <mesh
                   position={[50, topHandleY, 0]}
                   onPointerDown={(event) => handleHandlePointerDown(event, i, 'end', groupY)}
                >
                  <sphereGeometry args={[0.9, 16, 16]} />
                  <meshBasicMaterial color={dragState?.sliceId === sourceSliceId && dragState.handle === 'end' ? '#b45309' : '#f4f1eb'} />
                </mesh>
                <mesh
                   position={[50, bottomHandleY, 0]}
                   onPointerDown={(event) => handleHandlePointerDown(event, i, 'start', groupY)}
                >
                  <sphereGeometry args={[0.9, 16, 16]} />
                  <meshBasicMaterial color={dragState?.sliceId === sourceSliceId && dragState.handle === 'start' ? '#b45309' : '#f4f1eb'} />
                </mesh>
              </>
            ) : null}

            <gridHelper
              args={[100, 10]}
              position={[0, hasVolume ? surfaceY + 0.04 : 0.05, 0]}
              rotation={[0, 0, 0]}
            >
              <meshBasicMaterial
                color="#b8a99a"
                transparent
                opacity={gridOpacity * 0.5}
              />
            </gridHelper>

             {isEmphasized && (
              <>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, hasVolume ? surfaceY + 0.1 : 0.08, 0]}
                >
                  <ringGeometry args={[49.2, 50, 64]} />
                   <meshBasicMaterial
                     color={isComparisonSelected ? '#b45309' : '#7c6858'}
                    transparent
                    opacity={0.4}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, hasVolume ? surfaceY + 0.12 : 0.1, 0]}
                >
                  <ringGeometry args={[48.5, 49.8, 64]} />
                  <meshBasicMaterial
                    color="#b8a99a"
                    transparent
                    opacity={0.2}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}

            {isAdjacent && (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, hasVolume ? surfaceY + 0.08 : 0.06, 0]}
              >
                <ringGeometry args={[49.4, 50, 64]} />
                <meshBasicMaterial
                  color="#b45309"
                  transparent
                  opacity={0.05}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {transitionTexture && transition && i === transition.toIndex ? (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, hasVolume ? surfaceY + 0.16 : 0.12, 0]}
                renderOrder={100 + i}
              >
                <planeGeometry args={[98, 98]} />
                <meshBasicMaterial
                  map={transitionTexture}
                  transparent
                  opacity={0.34 * easeInOutCubic(transitionProgress)}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import type { HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { KdeField } from '@/lib/kde';
import type { KdeCell, MockCrimeEvent } from '../lib/types';
import { AdaptiveWarpAxis } from './AdaptiveWarpAxis';
import { HotspotTrajectoryOverlay } from './HotspotTrajectoryOverlay';
import { StkdeSliceStack } from './StkdeSliceStack';
import { BurstVolumeRenderer } from './BurstVolumeRenderer';
import type { BurstVolumeModel } from '@/lib/stkde';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import { buildRawEventPositions, resolveSourceEvents } from '../lib/raw-events';
import { CHICAGO_BOUNDS } from '../lib/chicago-bounds';
import { resolveTemporalSlabBounds } from '../lib/timeline-axis';
import {
  createStkde3DSceneRuntime,
  Stkde3DSceneProvider,
  useStkde3DSceneRuntime,
  type Stkde3DCameraFocusTarget,
  type Stkde3DSceneRuntime,
  type Stkde3DSceneSlice,
} from './Stkde3DSceneProvider';
import type { StkdeHeatmapRenderer } from './StkdeSliceStack';

const CAMERA_POSITION: [number, number, number] = [105, 175, 105];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0];
const SLICE_BOUNDARY_BACKDROP_Z = -50.6;
const SLICE_BOUNDARY_BACKDROP_DEPTH = 1.8;
// Keep semantic camera-focus wiring available, but avoid disorienting jumps by default.
const ENABLE_INTERACTION_CAMERA_FOCUS = false;

const MAP_VIEW_STATE = {
  longitude: -87.649,
  latitude: 41.878,
  zoom: 12.1,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const MAP_PLANE_Y = -38;

function MapTileSource({
  onTextureReady,
}: {
  onTextureReady: (texture: THREE.CanvasTexture | null) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const capturedRef = useRef(false);

  const captureTexture = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || capturedRef.current) return;

    capturedRef.current = true;
    const canvas = map.getCanvas();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    onTextureReady(texture);
  }, [onTextureReady]);

  const handleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.fitBounds(
      [
        [CHICAGO_BOUNDS.west, CHICAGO_BOUNDS.south],
        [CHICAGO_BOUNDS.east, CHICAGO_BOUNDS.north],
      ],
      { padding: 0, duration: 0 },
    );

    map.once('idle', captureTexture);
    window.setTimeout(captureTexture, 400);
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] pointer-events-none opacity-0">
      <Map
        ref={mapRef}
        initialViewState={MAP_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        cursor="default"
        onLoad={handleLoad}
      />
    </div>
  );
}

export function Stkde3DMapCapture({
  onTextureReady,
}: {
  onTextureReady: (texture: THREE.CanvasTexture | null) => void;
}) {
  return <MapTileSource onTextureReady={onTextureReady} />;
}

interface Stkde3DSceneProps {
  slices: Array<Stkde3DSceneSlice>;
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  sliceEvents?: MockCrimeEvent[][];
  hotspotSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  hotspotMatchingOptions?: HotspotMatchingOptions;
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
  showHotspotTrajectories?: boolean;
  showAdaptiveWarpAxis?: boolean;
  showSliceBoundaryBackdrop?: boolean;
  sliceOpacity?: number;
  activeSliceOpacity?: number;
  nonActiveSliceOpacity?: number;
  timeDomain?: [number, number];
  overrideWarpMap?: Float32Array | null;
  overrideWarpDomain?: [number, number];
  onCreateDraftAtPoint?: (payload: { y: number; clientX: number; clientY: number }) => void;
  yOffset?: number;
  heightScale?: number;
  burstVolumeModel?: BurstVolumeModel;
  heatmapRenderer?: StkdeHeatmapRenderer;
  kdeGridSize?: number;
  runtime?: Stkde3DSceneRuntime;
  comparisonSelectedSourceSliceIds?: readonly string[];
  comparisonSelectedSourceIndices?: readonly number[];
  sourceSlices?: readonly Stkde3DSceneSlice[];
  sourceSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  selectedSourceEvents?: readonly MockCrimeEvent[] | null;
  selectedSourceIndex?: number;
  sliceKdeFields?: Array<KdeField | undefined>;
  absoluteDomain?: [number, number];
  absoluteThreshold?: number;
  mapTexture?: THREE.CanvasTexture | null;
  renderMapSource?: boolean;
  cameraControlsRef?: { current: CameraControls | null };
  onCameraUpdate?: () => void;
}

function RawEventPoints({
  slices,
  sliceEvents = [],
  activeIndex,
  resolveEpochY,
  resolveSliceY,
  selectedEvents,
  selectedSourceIndex,
}: Pick<Stkde3DSceneProps, 'slices' | 'sliceEvents' | 'activeIndex'> & {
  resolveEpochY: (epochSec: number) => number;
  resolveSliceY: (slice: Stkde3DSceneSlice) => number;
  selectedEvents?: readonly MockCrimeEvent[] | null;
  selectedSourceIndex?: number;
}) {
  const positions = useMemo(() => {
    if (slices.length === 0) {
      return new Float32Array();
    }

    const slice = slices[activeIndex];
    if (!slice) return new Float32Array();

    const events = resolveSourceEvents(
      selectedSourceIndex ?? slice.sourceSliceIndex,
      selectedEvents,
      sliceEvents,
      slice.index,
    );
    return buildRawEventPositions(events, resolveEpochY, resolveSliceY(slice));
  }, [activeIndex, resolveEpochY, resolveSliceY, selectedEvents, selectedSourceIndex, sliceEvents, slices]);

  if (positions.length === 0) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.85}
        color="#f59e0b"
        transparent
        opacity={0.82}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function SliceBoundaryBackdrop({
  slices,
  resolveEpochY,
}: {
  slices: readonly Stkde3DSceneSlice[];
  resolveEpochY: (epochSec: number) => number;
}) {
  const bands = useMemo(
    () => slices.flatMap((slice) => {
      const bounds = resolveTemporalSlabBounds(slice.startEpoch, slice.endEpoch, resolveEpochY);
      if (
        !Number.isFinite(bounds.minY)
        || !Number.isFinite(bounds.maxY)
        || bounds.height <= 0
      ) {
        return [];
      }

      return [{
        key: `${slice.sourceSliceId ?? slice.index}:${slice.startEpoch}:${slice.endEpoch}`,
        bounds,
      }];
    }),
    [resolveEpochY, slices],
  );
  const boundaryYs = useMemo(
    () => Array.from(
        new globalThis.Map(
        bands.flatMap(({ bounds }) => [bounds.minY, bounds.maxY])
          .filter((value) => Number.isFinite(value))
          .map((value) => [value.toFixed(6), value] as const),
      ).values(),
    ),
    [bands],
  );

  if (bands.length === 0) return null;

  return (
    <group name="slice-boundary-backdrop" renderOrder={-10}>
      {bands.map(({ key, bounds }) => (
        <group key={key}>
          <mesh
            position={[0, bounds.centerY, SLICE_BOUNDARY_BACKDROP_Z]}
            renderOrder={-10}
          >
            <boxGeometry args={[100, bounds.height, SLICE_BOUNDARY_BACKDROP_DEPTH]} />
            <meshBasicMaterial
              color="#d6d3d1"
              transparent
              opacity={0.035}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

        </group>
      ))}
      {boundaryYs.map((boundaryY) => (
        <mesh
          key={boundaryY}
          position={[0, boundaryY, SLICE_BOUNDARY_BACKDROP_Z + 0.05]}
          renderOrder={20}
        >
          <boxGeometry args={[100, 0.08, SLICE_BOUNDARY_BACKDROP_DEPTH]} />
          <meshBasicMaterial
            color="#78716c"
            transparent
            opacity={0.32}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({
  slices,
  sliceKdes,
  volumeProfile,
  sliceEvents = [],
  hotspotSliceResults = null,
  hotspotMatchingOptions,
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  showHotspotTrajectories = true,
  showAdaptiveWarpAxis = true,
  showSliceBoundaryBackdrop = false,
  sliceOpacity = 1,
  activeSliceOpacity = 1,
  nonActiveSliceOpacity = 0.35,
  heightScale = 1,
  burstVolumeModel,
  cameraFocusTarget,
  heatmapRenderer = 'legacy',
  kdeGridSize = 32,
  sliceKdeFields,
  absoluteDomain,
  absoluteThreshold,
  comparisonSelectedSourceSliceIds = [],
  comparisonSelectedSourceIndices = [],
  sourceSlices,
  sourceSliceResults,
  selectedSourceEvents,
  selectedSourceIndex,
  cameraControlsRef,
  onCameraUpdate,
}: Pick<
  Stkde3DSceneProps,
  'slices' | 'sliceKdes' | 'volumeProfile' | 'sliceEvents' | 'hotspotSliceResults' | 'hotspotMatchingOptions' | 'activeIndex' | 'viewMode' |
  'showRawEvents' | 'showHotspotTrajectories' | 'showAdaptiveWarpAxis' | 'showSliceBoundaryBackdrop' | 'sliceOpacity' | 'activeSliceOpacity' | 'nonActiveSliceOpacity' | 'heightScale' | 'burstVolumeModel' | 'heatmapRenderer' | 'kdeGridSize' | 'sliceKdeFields' | 'absoluteDomain' | 'absoluteThreshold' | 'comparisonSelectedSourceSliceIds' | 'comparisonSelectedSourceIndices' | 'sourceSlices' | 'sourceSliceResults' | 'selectedSourceEvents' | 'selectedSourceIndex' | 'cameraControlsRef' | 'onCameraUpdate'
> & {
  cameraFocusTarget: Stkde3DCameraFocusTarget | null;
}) {
  const internalControlsRef = useRef<CameraControls>(null);
  const controlsRef = cameraControlsRef ?? internalControlsRef;
  const {
    resolveSliceY,
    resolveEpochY,
    onCreateDraftAtPoint,
  } = useStkde3DSceneRuntime();
  const focusedSlice = slices[activeIndex]
    ? { ...slices[activeIndex], index: 0 }
    : undefined;
  const focusedSlices = focusedSlice ? [focusedSlice] : [];
  const focusedKdes = sliceKdes[activeIndex] ? [sliceKdes[activeIndex]] : [];
  const focusedVolumeProfile = volumeProfile?.[activeIndex]
    ? [{ ...volumeProfile[activeIndex]!, index: 0 }]
    : [];
  const displayedSlices = viewMode === 'focus' ? focusedSlices : slices;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (cameraFocusTarget) {
      controls.setLookAt(
        cameraFocusTarget.position[0],
        cameraFocusTarget.position[1],
        cameraFocusTarget.position[2],
        cameraFocusTarget.target[0],
        cameraFocusTarget.target[1],
        cameraFocusTarget.target[2],
        true,
      );
      return;
    }

    controls.setLookAt(
      CAMERA_POSITION[0],
      CAMERA_POSITION[1],
      CAMERA_POSITION[2],
      CAMERA_TARGET[0],
      CAMERA_TARGET[1],
      CAMERA_TARGET[2],
      true,
    );
  }, [cameraFocusTarget, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 20]} intensity={0.7} />
      <directionalLight position={[-30, 30, -20]} intensity={0.3} />

      <mesh
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCreateDraftAtPoint?.({ y: event.point.y, clientX: event.clientX, clientY: event.clientY });
        }}
      >
        <planeGeometry args={[360, 260]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {showAdaptiveWarpAxis ? <AdaptiveWarpAxis /> : null}

      {showSliceBoundaryBackdrop ? (
        <SliceBoundaryBackdrop slices={displayedSlices} resolveEpochY={resolveEpochY} />
      ) : null}

      <StkdeSliceStack
        slices={displayedSlices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        volumeProfile={viewMode === 'focus' ? focusedVolumeProfile : volumeProfile}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
        sliceOpacity={sliceOpacity}
        activeSliceOpacity={activeSliceOpacity}
        nonActiveSliceOpacity={nonActiveSliceOpacity}
        heightScale={heightScale}
        heatmapRenderer={heatmapRenderer}
        kdeGridSize={kdeGridSize}
        sliceKdeFields={sliceKdeFields}
        absoluteDomain={absoluteDomain}
        absoluteThreshold={absoluteThreshold}
        comparisonSelectedSourceSliceIds={comparisonSelectedSourceSliceIds}
        comparisonSelectedSourceIndices={comparisonSelectedSourceIndices}
      />

      {burstVolumeModel ? (
        <BurstVolumeRenderer
          model={burstVolumeModel}
          resolveEpochY={resolveEpochY}
          active={!burstVolumeModel.isNeutral}
        />
      ) : null}

      {showHotspotTrajectories ? (
          <HotspotTrajectoryOverlay
            slices={viewMode === 'focus' ? focusedSlices : slices}
            sliceResults={hotspotSliceResults}
            sourceSlices={sourceSlices ?? slices}
            sourceSliceResults={sourceSliceResults ?? hotspotSliceResults}
            resolveEpochY={resolveEpochY}
          matchingOptions={hotspotMatchingOptions}
        />
      ) : null}

      {showRawEvents ? (
        <RawEventPoints
          slices={slices}
          sliceEvents={sliceEvents}
          activeIndex={activeIndex}
          selectedEvents={selectedSourceEvents}
          selectedSourceIndex={selectedSourceIndex}
          resolveEpochY={resolveEpochY}
          resolveSliceY={resolveSliceY}
        />
      ) : null}

      <CameraControls
        ref={controlsRef}
        makeDefault
        smoothTime={0.3}
        minDistance={30}
        maxDistance={500}
        onUpdate={onCameraUpdate}
      />
    </>
  );
}

export function Stkde3DScene({
  slices,
  sliceKdes,
  volumeProfile,
  sliceEvents = [],
  hotspotSliceResults = null,
  hotspotMatchingOptions,
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  showHotspotTrajectories = true,
  showAdaptiveWarpAxis = true,
  showSliceBoundaryBackdrop = false,
  sliceOpacity = 1,
  activeSliceOpacity = 1,
  nonActiveSliceOpacity = 0.35,
  timeDomain,
  overrideWarpMap,
  overrideWarpDomain,
  yOffset = 0,
  heightScale = 1,
  burstVolumeModel,
  heatmapRenderer = 'legacy',
  kdeGridSize = 32,
  runtime,
  onCreateDraftAtPoint,
  comparisonSelectedSourceSliceIds = [],
  comparisonSelectedSourceIndices = [],
  sourceSlices,
  sourceSliceResults,
  selectedSourceEvents,
  selectedSourceIndex,
  sliceKdeFields,
  absoluteDomain,
  absoluteThreshold,
  mapTexture,
  renderMapSource = true,
  cameraControlsRef,
  onCameraUpdate,
}: Stkde3DSceneProps) {
  const [ownedMapTexture, setOwnedMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const [cameraFocusTarget, setCameraFocusTarget] = useState<Stkde3DCameraFocusTarget | null>(null);
  const sceneRuntime = useMemo(
    () => runtime ?? createStkde3DSceneRuntime({
      displayDomain: timeDomain,
      warpDomain: overrideWarpDomain ?? timeDomain,
      warpMap: overrideWarpMap,
      yOffset,
      onCreateDraftAtPoint,
    }),
    [onCreateDraftAtPoint, overrideWarpDomain, overrideWarpMap, runtime, timeDomain, yOffset],
  );
  const interactiveRuntime = useMemo<Stkde3DSceneRuntime>(() => ({
    ...sceneRuntime,
    cameraFocus: (target) => {
      if (target && !ENABLE_INTERACTION_CAMERA_FOCUS) return;
      setCameraFocusTarget(target);
      sceneRuntime.cameraFocus(target);
    },
  }), [sceneRuntime]);
  useEffect(() => {
    return () => {
      ownedMapTexture?.dispose();
    };
  }, [ownedMapTexture]);

  const resolvedMapTexture = renderMapSource ? ownedMapTexture : mapTexture ?? null;

  return (
    <Stkde3DSceneProvider runtime={interactiveRuntime}>
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        {renderMapSource ? <MapTileSource onTextureReady={setOwnedMapTexture} /> : null}
        <div className="absolute inset-0 z-10">
          <Canvas
            camera={{ position: CAMERA_POSITION, fov: 38 }}
            gl={{ alpha: false, antialias: true }}
            style={{ background: 'var(--muted)' }}
            onCreated={({ gl }) => gl.setClearColor('#f4f1eb', 1)}
            onPointerDown={(event) => interactiveRuntime.onCanvasPointerDown({ clientX: event.clientX, clientY: event.clientY })}
            onPointerMissed={() => {
              interactiveRuntime.onSliceHover(null);
              interactiveRuntime.onBurstHover(null);
              interactiveRuntime.onClusterHover(null);
              interactiveRuntime.cameraFocus(null);
              interactiveRuntime.onCanvasPointerMissed();
            }}
          >
            <SceneContent
              slices={slices}
              sliceKdes={sliceKdes}
              volumeProfile={volumeProfile}
              sliceEvents={sliceEvents}
              hotspotSliceResults={hotspotSliceResults}
              hotspotMatchingOptions={hotspotMatchingOptions}
              activeIndex={activeIndex}
              viewMode={viewMode}
              showRawEvents={showRawEvents}
              showHotspotTrajectories={showHotspotTrajectories}
              showAdaptiveWarpAxis={showAdaptiveWarpAxis}
              showSliceBoundaryBackdrop={showSliceBoundaryBackdrop}
              sliceOpacity={sliceOpacity}
              activeSliceOpacity={activeSliceOpacity}
              nonActiveSliceOpacity={nonActiveSliceOpacity}
              heightScale={heightScale}
              burstVolumeModel={burstVolumeModel}
              heatmapRenderer={heatmapRenderer}
              kdeGridSize={kdeGridSize}
              sliceKdeFields={sliceKdeFields}
              absoluteDomain={absoluteDomain}
              absoluteThreshold={absoluteThreshold}
              comparisonSelectedSourceSliceIds={comparisonSelectedSourceSliceIds}
              comparisonSelectedSourceIndices={comparisonSelectedSourceIndices}
              sourceSlices={sourceSlices}
              sourceSliceResults={sourceSliceResults}
              selectedSourceEvents={selectedSourceEvents}
              selectedSourceIndex={selectedSourceIndex}
              cameraControlsRef={cameraControlsRef}
              onCameraUpdate={onCameraUpdate}
              cameraFocusTarget={cameraFocusTarget}
            />

            {resolvedMapTexture ? (
              <group position={[0, MAP_PLANE_Y, 0]} renderOrder={-20}>
                <mesh position={[0, -0.72, 0]}>
                  <boxGeometry args={[98.4, 1.25, 98.4]} />
                  <meshStandardMaterial
                    color="#dedbd2"
                    roughness={1}
                    metalness={0}
                    transparent
                    opacity={0.82}
                    depthWrite={false}
                  />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[96, 96]} />
                  <meshBasicMaterial
                     map={resolvedMapTexture}
                    transparent
                    opacity={0.92}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            ) : null}
          </Canvas>
        </div>
      </div>
    </Stkde3DSceneProvider>
  );
}

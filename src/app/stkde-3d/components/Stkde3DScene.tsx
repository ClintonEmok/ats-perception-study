'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import type { KdeCell, MockCrimeEvent } from '../lib/types';
import { AdaptiveWarpAxis } from './AdaptiveWarpAxis';
import { HotspotTrajectoryOverlay } from './HotspotTrajectoryOverlay';
import { StkdeIntensityLegend } from './StkdeIntensityLegend';
import { StkdeSliceStack } from './StkdeSliceStack';
import { BurstVolumeRenderer } from './BurstVolumeRenderer';
import type { BurstVolumeModel } from '@/lib/stkde';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import { FIXED_SCAN_DURATION_SECONDS, proposeFixedDurationWindowAtY } from '../lib/temporal-interactions';
import { CHICAGO_BOUNDS } from '../lib/chicago-bounds';
import { AXIS_HEIGHT, START_Y } from '../lib/timeline-axis';
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
// Keep semantic camera-focus wiring available, but avoid disorienting jumps by default.
const ENABLE_INTERACTION_CAMERA_FOCUS = false;

const MAP_VIEW_STATE = {
  longitude: -87.649,
  latitude: 41.878,
  zoom: 12.1,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
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

interface Stkde3DSceneProps {
  slices: Array<Stkde3DSceneSlice>;
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  sliceEvents?: MockCrimeEvent[][];
  hotspotSliceResults?: Record<string, StkdeSurfaceResponse> | null;
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
  sliceOpacity?: number;
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
}

function RawEventPoints({
  slices,
  sliceEvents = [],
  activeIndex,
  resolveSliceY,
}: Pick<Stkde3DSceneProps, 'slices' | 'sliceEvents' | 'activeIndex'> & {
  resolveSliceY: (slice: Stkde3DSceneSlice) => number;
}) {
  const positions = useMemo(() => {
    if (sliceEvents.length === 0 || slices.length === 0) {
      return new Float32Array();
    }

    const slice = slices[activeIndex];
    if (!slice) return new Float32Array();

    const events = sliceEvents[slice.index] ?? [];
    const flattened = new Float32Array(events.length * 3);
    let cursor = 0;
    const y = resolveSliceY(slice) + 0.15;

    for (const event of events) {
      flattened[cursor] = event.x;
      flattened[cursor + 1] = y;
      flattened[cursor + 2] = event.z;
      cursor += 3;
    }

    return flattened;
  }, [activeIndex, resolveSliceY, sliceEvents, slices]);

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

function SceneContent({
  slices,
  sliceKdes,
  volumeProfile,
  sliceEvents = [],
  hotspotSliceResults = null,
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
  heightScale = 1,
  burstVolumeModel,
  cameraFocusTarget,
  heatmapRenderer = 'legacy',
  kdeGridSize = 32,
}: Pick<
  Stkde3DSceneProps,
  'slices' | 'sliceKdes' | 'volumeProfile' | 'sliceEvents' | 'hotspotSliceResults' | 'activeIndex' | 'viewMode' |
  'showRawEvents' | 'sliceOpacity' | 'heightScale' | 'burstVolumeModel' | 'heatmapRenderer' | 'kdeGridSize'
> & {
  cameraFocusTarget: Stkde3DCameraFocusTarget | null;
}) {
  const controlsRef = useRef<CameraControls>(null);
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
  }, [cameraFocusTarget]);

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

      <AdaptiveWarpAxis />

      <StkdeSliceStack
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        volumeProfile={viewMode === 'focus' ? focusedVolumeProfile : volumeProfile}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
        sliceOpacity={sliceOpacity}
        heightScale={heightScale}
        heatmapRenderer={heatmapRenderer}
        kdeGridSize={kdeGridSize}
      />

      {burstVolumeModel ? (
        <BurstVolumeRenderer
          model={burstVolumeModel}
          resolveEpochY={resolveEpochY}
          active={!burstVolumeModel.isNeutral}
        />
      ) : null}

      <HotspotTrajectoryOverlay
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceResults={hotspotSliceResults}
        viewMode={viewMode}
        resolveSliceY={resolveSliceY}
      />

      {showRawEvents ? (
        <RawEventPoints
          slices={slices}
          sliceEvents={sliceEvents}
          activeIndex={activeIndex}
          resolveSliceY={resolveSliceY}
        />
      ) : null}

      <CameraControls
        ref={controlsRef}
        makeDefault
        smoothTime={0.3}
        minDistance={30}
        maxDistance={500}
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
  activeIndex,
  viewMode = 'stack',
  showRawEvents = false,
  sliceOpacity = 1,
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
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const [cameraFocusTarget, setCameraFocusTarget] = useState<Stkde3DCameraFocusTarget | null>(null);
  const [scanProgress, setScanProgress] = useState(0.5);
  const [scanDurationSeconds, setScanDurationSeconds] = useState(FIXED_SCAN_DURATION_SECONDS);
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
  const scanY = START_Y + scanProgress * AXIS_HEIGHT;
  const scanWindow = useMemo(
    () => interactiveRuntime.temporalWindowEnabled
      ? proposeFixedDurationWindowAtY(
        scanY,
        interactiveRuntime.yToEpoch,
        scanDurationSeconds,
        interactiveRuntime.displayDomain,
      )
      : null,
    [interactiveRuntime, scanDurationSeconds, scanY],
  );
  const scanProposal = useMemo(() => {
    if (!scanWindow) return null;
    return {
      startEpoch: scanWindow[0],
      endEpoch: scanWindow[1],
      durationSeconds: scanWindow[1] - scanWindow[0],
      scanY,
    };
  }, [scanWindow, scanY]);

  useEffect(() => {
    if (!interactiveRuntime.temporalWindowEnabled) return;
    interactiveRuntime.onTemporalWindowPropose(scanProposal);
  }, [interactiveRuntime, scanProposal]);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <Stkde3DSceneProvider runtime={interactiveRuntime}>
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <MapTileSource onTextureReady={setMapTexture} />
        <div className="absolute left-4 top-4 z-20">
          <StkdeIntensityLegend mode={heatmapRenderer} />
        </div>
        {interactiveRuntime.temporalWindowEnabled ? (
          <div className="absolute bottom-4 left-4 z-20 w-64 rounded-md border border-sky-400/25 bg-slate-950/90 p-2 text-[11px] text-slate-200 shadow-xl backdrop-blur">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium uppercase tracking-[0.16em] text-sky-200">Clock scan</span>
              <select
                value={scanDurationSeconds}
                onChange={(event) => setScanDurationSeconds(Number(event.target.value))}
                className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-200"
                aria-label="Fixed scan duration"
              >
                <option value={12 * 60 * 60}>12 hours</option>
                <option value={FIXED_SCAN_DURATION_SECONDS}>24 hours</option>
                <option value={48 * 60 * 60}>48 hours</option>
              </select>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={scanProgress}
              onChange={(event) => setScanProgress(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
              aria-label="Move fixed clock window through adaptive axis"
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>{scanProposal ? `${new Date(scanProposal.startEpoch * 1000).toLocaleDateString()} – ${new Date(scanProposal.endEpoch * 1000).toLocaleDateString()}` : 'No valid window'}</span>
              <button
                type="button"
                disabled={!scanProposal}
                onClick={() => {
                  if (scanProposal) interactiveRuntime.onTemporalWindowCommit(scanProposal);
                }}
                className="rounded border border-sky-400/50 px-2 py-1 font-medium text-sky-100 transition hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply to timeline
              </button>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-0 z-10">
          <Canvas
            camera={{ position: CAMERA_POSITION, fov: 38 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: 'transparent' }}
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
              activeIndex={activeIndex}
              viewMode={viewMode}
              showRawEvents={showRawEvents}
              sliceOpacity={sliceOpacity}
              heightScale={heightScale}
              burstVolumeModel={burstVolumeModel}
              heatmapRenderer={heatmapRenderer}
              kdeGridSize={kdeGridSize}
              cameraFocusTarget={cameraFocusTarget}
            />

            {mapTexture ? (
              <group position={[0, MAP_PLANE_Y, 0]} renderOrder={-20}>
                <mesh position={[0, -0.72, 0]}>
                  <boxGeometry args={[98.4, 1.25, 98.4]} />
                  <meshStandardMaterial
                    color="#081120"
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
                    map={mapTexture}
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

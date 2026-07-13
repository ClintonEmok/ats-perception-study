'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { START_Y, resolveEpochFromWarpedY, resolveWarpedEpochY } from '../lib/timeline-axis';
import type { KdeCell, EvolvingSlice, MockCrimeEvent } from '../lib/types';
import { AdaptiveWarpAxis } from './AdaptiveWarpAxis';
import { HotspotTrajectoryOverlay } from './HotspotTrajectoryOverlay';
import { StkdeIntensityLegend } from './StkdeIntensityLegend';
import { StkdeSliceStack } from './StkdeSliceStack';
import type { DurationVolumeProfileEntry } from '../lib/volume-encoding';
import { CHICAGO_BOUNDS } from '../lib/chicago-bounds';

const CAMERA_POSITION: [number, number, number] = [105, 175, 105];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0];
const normalizeWarpBlend = (warpFactor: number): number => clamp(warpFactor / 3, 0, 1);

const MAP_VIEW_STATE = {
  longitude: -87.649,
  latitude: 41.878,
  zoom: 12.1,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const MAP_PLANE_Y = -38;

const MIN_DRAFT_WINDOW_SEC = 6 * 60 * 60;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const buildDraftWindow = (
  centerEpoch: number,
  viewportStart: number,
  viewportEnd: number,
): { startEpoch: number; endEpoch: number } | null => {
  if (!Number.isFinite(centerEpoch) || !Number.isFinite(viewportStart) || !Number.isFinite(viewportEnd) || viewportEnd <= viewportStart) {
    return null;
  }

  const windowDuration = Math.min(viewportEnd - viewportStart, MIN_DRAFT_WINDOW_SEC * 2);
  if (windowDuration <= 0) return null;

  const halfWindow = windowDuration / 2;
  let startEpoch = centerEpoch - halfWindow;
  let endEpoch = centerEpoch + halfWindow;

  if (startEpoch < viewportStart) {
    endEpoch = Math.min(viewportEnd, endEpoch + (viewportStart - startEpoch));
    startEpoch = viewportStart;
  }

  if (endEpoch > viewportEnd) {
    startEpoch = Math.max(viewportStart, startEpoch - (endEpoch - viewportEnd));
    endEpoch = viewportEnd;
  }

  return endEpoch > startEpoch ? { startEpoch, endEpoch } : null;
};

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
  slices: Array<EvolvingSlice & { sourceSliceId?: string }>;
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
}

function RawEventPoints({
  slices,
  sliceEvents = [],
  activeIndex,
  resolveSliceY,
}: Pick<Stkde3DSceneProps, 'slices' | 'sliceEvents' | 'activeIndex'> & {
  resolveSliceY: (slice: EvolvingSlice & { sourceSliceId?: string }) => number;
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
  timeDomain,
  overrideWarpMap,
  overrideWarpDomain,
  onCreateDraftAtPoint,
  resolveSliceY,
  yOffset = 0,
  heightScale = 1,
}: Stkde3DSceneProps & {
  resolveSliceY: (slice: EvolvingSlice & { sourceSliceId?: string }) => number;
}) {
  const controlsRef = useRef<CameraControls>(null);
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

    controls.setLookAt(
      CAMERA_POSITION[0],
      CAMERA_POSITION[1],
      CAMERA_POSITION[2],
      CAMERA_TARGET[0],
      CAMERA_TARGET[1],
      CAMERA_TARGET[2],
      false,
    );
    controls.update(0);
  }, []);

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

      <AdaptiveWarpAxis displayDomain={timeDomain} overrideWarpMap={overrideWarpMap} overrideWarpDomain={overrideWarpDomain} />

      <StkdeSliceStack
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceKdes={viewMode === 'focus' ? focusedKdes : sliceKdes}
        volumeProfile={viewMode === 'focus' ? focusedVolumeProfile : volumeProfile}
        activeIndex={viewMode === 'focus' ? 0 : activeIndex}
        compact={viewMode === 'focus'}
        displayDomain={timeDomain}
        sliceOpacity={sliceOpacity}
        yOffset={yOffset}
        heightScale={heightScale}
        overrideWarpMap={overrideWarpMap}
        overrideWarpDomain={overrideWarpDomain}
      />

      <HotspotTrajectoryOverlay
        slices={viewMode === 'focus' ? focusedSlices : slices}
        sliceResults={hotspotSliceResults}
        viewMode={viewMode}
        resolveSliceY={resolveSliceY}
        yOffset={yOffset}
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
}: Stkde3DSceneProps) {
  const [mapTexture, setMapTexture] = useState<THREE.CanvasTexture | null>(null);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const warpBlend = useMemo(() => normalizeWarpBlend(warpFactor), [warpFactor]);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const canvasPointerRef = useRef<{ x: number; y: number } | null>(null);
  const viewportDomain = useMemo<[number, number]>(() => (
    viewportEnd > viewportStart ? [viewportStart, viewportEnd] : [0, 1]
  ), [viewportEnd, viewportStart]);
  const displayDomain = timeDomain ?? viewportDomain;
  const warpDomain = useMemo<[number, number]>(() => (
    mapDomain[1] > mapDomain[0] ? mapDomain : displayDomain
  ), [displayDomain, mapDomain]);
  const resolveSliceY = useCallback((slice: EvolvingSlice & { sourceSliceId?: string }): number => {
    return resolveWarpedEpochY(slice.startEpoch, START_Y, {
      timeScaleMode,
      warpBlend,
      warpMap,
      displayDomain,
      warpDomain,
      yOffset,
    });
  }, [displayDomain, timeScaleMode, warpBlend, warpMap, warpDomain, yOffset]);

  const yToEpoch = useCallback((y: number): number => {
    return resolveEpochFromWarpedY(y, START_Y, {
      timeScaleMode,
      warpBlend,
      warpMap,
      displayDomain,
      warpDomain,
    });
  }, [displayDomain, timeScaleMode, warpBlend, warpMap, warpDomain]);

  const clearActiveSlice = useCallback(() => {
    setActiveSliceIndex(-1);
    setActiveSlice(null);
  }, [setActiveSlice, setActiveSliceIndex]);

  const handleCreateDraftAtPoint = useCallback(({ y, clientX, clientY }: { y: number; clientX: number; clientY: number }) => {
    const pointer = canvasPointerRef.current;
    const movedTooFar = pointer ? Math.hypot(clientX - pointer.x, clientY - pointer.y) > 8 : false;
    if (movedTooFar) return;

    const clickEpoch = yToEpoch(y);
    const draftWindow = buildDraftWindow(clickEpoch, displayDomain[0], displayDomain[1]);
    if (!draftWindow) return;

    const draftId = addManualDraftRange({
      startMs: draftWindow.startEpoch * 1000,
      endMs: draftWindow.endEpoch * 1000,
    });
    setActiveRailTab('slices');
    void computeManualDraftBin(draftId);
  }, [addManualDraftRange, computeManualDraftBin, displayDomain, setActiveRailTab, yToEpoch]);

  const handleCanvasPointerDown = useCallback((event: { clientX: number; clientY: number }) => {
    canvasPointerRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleCanvasPointerMissed = useCallback(() => {
    clearActiveSlice();
  }, [clearActiveSlice]);

  useEffect(() => {
    return () => {
      mapTexture?.dispose();
    };
  }, [mapTexture]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <MapTileSource onTextureReady={setMapTexture} />
      <div className="absolute left-4 top-4 z-20">
        <StkdeIntensityLegend />
      </div>
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: 38 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMissed={handleCanvasPointerMissed}
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
            timeDomain={displayDomain}
            overrideWarpMap={overrideWarpMap}
            overrideWarpDomain={overrideWarpDomain}
            resolveSliceY={resolveSliceY}
            onCreateDraftAtPoint={handleCreateDraftAtPoint}
            yOffset={yOffset}
            heightScale={heightScale}
          />

          {mapTexture ? (
            <group position={[0, MAP_PLANE_Y, 0]} renderOrder={-20}>
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
  );
}

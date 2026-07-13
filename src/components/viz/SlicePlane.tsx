import { useState, useEffect, useMemo } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TimeSlice } from '@/store/useSliceStore';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { sampleStkdeHeatmapColor } from '@/lib/stkde/heatmap-scale';

export const SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16;

interface SlicePlaneProps {
  slice: TimeSlice;
  y: number;
  onUpdate: (updates: Partial<TimeSlice>) => void;
  yToTime: (y: number) => number;
  timeToY: (t: number) => number;
  stkdeSurface?: StkdeSurfaceResponse | null;
  evolutionState?: 'active' | 'previous' | 'next' | 'distant';
}

export function SlicePlane({ slice, y, onUpdate, yToTime, timeToY, stkdeSurface, evolutionState = 'distant' }: SlicePlaneProps) {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isRange = slice.type === 'range';

  // Visual props
  const color = slice.isLocked ? '#94a3b8' : (isRange ? '#a855f7' : '#22d3ee');
  const evolutionMultiplier = evolutionState === 'active' ? 1.25 : evolutionState === 'previous' || evolutionState === 'next' ? 0.9 : 0.62;
  const opacity = (slice.isLocked ? 0.08 : (isRange ? 0.1 : 0.16)) * evolutionMultiplier;
  const helperOpacity = (slice.isLocked ? 0.12 : 0.18) * evolutionMultiplier;

  // Calculate range specifics
  const rangeYStart = isRange ? timeToY(slice.range?.[0] ?? 0) : y;
  const rangeYEnd = isRange ? timeToY(slice.range?.[1] ?? 0) : y;
  const height = isRange ? Math.abs(rangeYEnd - rangeYStart) : 0.1;
  const centerY = isRange ? (rangeYStart + rangeYEnd) / 2 : y;

  const heatmapTexture = useMemo(() => {
    const cells = stkdeSurface?.heatmap.cells ?? [];
    if (cells.length === 0 || typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const lngValues = cells.map((cell) => cell.lng);
    const latValues = cells.map((cell) => cell.lat);
    const minLng = Math.min(...lngValues);
    const maxLng = Math.max(...lngValues);
    const minLat = Math.min(...latValues);
    const maxLat = Math.max(...latValues);
    const lngSpan = Math.max(1e-6, maxLng - minLng);
    const latSpan = Math.max(1e-6, maxLat - minLat);

    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const cell of cells) {
      const x = ((cell.lng - minLng) / lngSpan) * canvas.width;
      const yPos = canvas.height - ((cell.lat - minLat) / latSpan) * canvas.height;
      const intensity = Math.min(1, Math.max(0, cell.intensity));
      const radius = Math.max(10, intensity * 36 + cell.support * 0.75);
      const glow = context.createRadialGradient(x, yPos, 0, x, yPos, radius);
      glow.addColorStop(0, sampleStkdeHeatmapColor(intensity));
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, yPos, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [stkdeSurface]);

  useEffect(() => {
    return () => {
      heatmapTexture?.dispose();
    };
  }, [heatmapTexture]);

  // Handle drag logic
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (slice.isLocked) return;
    e.stopPropagation(); // Stop camera controls
    setIsDragging(true);
    if ('setPointerCapture' in gl.domElement) {
      gl.domElement.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (slice.isLocked) return;
    e.stopPropagation();
    setIsDragging(false);
    if ('releasePointerCapture' in gl.domElement) {
      gl.domElement.releasePointerCapture(e.pointerId);
    }
  };

  // Global pointer move for robust dragging
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      // 1. Calculate NDC
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yNDC = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 2. Raycast from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, yNDC), camera);

      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      
      const planeNormal = cameraDir.clone().negate(); // Face camera
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal, 
        new THREE.Vector3(0, centerY, 0)
      );

      const target = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, target);

      if (intersection) {
        if (isRange) {
          // Simplistic range drag: shift both by same amount
          const deltaY = intersection.y - centerY;
          const newStart = yToTime(rangeYStart + deltaY);
          const newEnd = yToTime(rangeYEnd + deltaY);
          onUpdate({ range: [newStart, newEnd] });
        } else {
          const newTime = yToTime(intersection.y);
          onUpdate({ time: newTime });
        }
      }
    };

    const onPointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, camera, gl.domElement, onUpdate, yToTime, centerY, isRange, rangeYStart, rangeYEnd]);

  // Format label
  const label = useMemo(() => {
    if (isRange) {
      const r = slice.range || [0, 0];
      return `${r[0].toFixed(1)} - ${r[1].toFixed(1)}`;
    }
    if (slice.time > 1000000000) {
      return new Date(slice.time).toLocaleDateString();
    }
    return slice.time.toFixed(1);
  }, [slice.time, slice.range, isRange]);

  if (!slice.isVisible) return null;

  const activeStroke = evolutionState === 'active' ? 'rgba(125, 211, 252, 0.95)' : 'rgba(125, 211, 252, 0.55)';

  return (
    <group position={[0, centerY, 0]}>
      {/* Visual Representation */}
      {isRange ? (
        <mesh>
          <boxGeometry args={[100, height, 100]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <gridHelper args={[100, 10]} position={[0, 0.01, 0]} rotation={[0, 0, 0]}>
            <meshBasicMaterial color={color} transparent opacity={helperOpacity} />
          </gridHelper>
        </>
      )}

      {heatmapTexture ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial map={heatmapTexture} transparent opacity={0.92 * evolutionMultiplier} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      {evolutionState === 'active' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SLICE_CLUSTER_OVERLAY_ELEVATION, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color={activeStroke} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      {/* Handle and Label */}
      <group position={[50, 0, 50]}>
        <mesh 
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color={isDragging || hovered || evolutionState === 'active' ? '#ffffff' : color} />
        </mesh>
        
        <Html position={[2, 0, 0]} center className="pointer-events-none select-none">
          <div className="rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] leading-tight text-foreground shadow-sm whitespace-nowrap backdrop-blur">
            <div className="font-medium tracking-wide">
              {label}
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {slice.isLocked ? 'Locked' : isRange ? 'Range' : 'Point'}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

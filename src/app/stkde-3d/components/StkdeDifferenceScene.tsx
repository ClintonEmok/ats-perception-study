'use client';

import { useEffect, useMemo, useState } from 'react';
import { CameraControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { KdeField } from '@/lib/kde';
import { computeSignedKdeDifference, type SignedKdeDifference } from '../lib/comparison-difference';
import { getStkdeSignedDifferenceColor } from '../lib/palette';

const MAP_PLANE_Y = -1;
const HEATMAP_PLANE_Y = 0;
const SPATIAL_EXTENT = 96;

function buildDifferenceTexture(difference: SignedKdeDifference): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const { field, values, maxAbs } = difference;
  const canvas = document.createElement('canvas');
  canvas.width = field.gridSize;
  canvas.height = field.gridSize;
  const context = canvas.getContext('2d');
  if (!context) return null;

  for (let row = 0; row < field.gridSize; row += 1) {
    for (let column = 0; column < field.gridSize; column += 1) {
      const index = row * field.gridSize + column;
      const value = values[index] ?? 0;
      const normalized = maxAbs > 0 ? value / maxAbs : 0;
      const magnitude = maxAbs > 0 ? Math.min(1, Math.abs(value) / maxAbs) : 0;
      context.fillStyle = getStkdeSignedDifferenceColor(normalized, 0.78 + magnitude * 0.2);
      context.fillRect(column, field.gridSize - row - 1, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface StkdeDifferenceSceneProps {
  fieldA: KdeField | null | undefined;
  fieldB: KdeField | null | undefined;
  mapTexture?: THREE.CanvasTexture | null;
}

export function StkdeDifferenceScene({ fieldA, fieldB, mapTexture }: StkdeDifferenceSceneProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const comparison = useMemo(() => {
    try {
      return { difference: computeSignedKdeDifference(fieldA, fieldB), error: null };
    } catch {
      return {
        difference: null,
        error: 'This comparison could not be resolved. Reset comparison and select two distinct intervals.',
      };
    }
  }, [fieldA, fieldB]);

  const texture = useMemo(
    () => (comparison.difference ? buildDifferenceTexture(comparison.difference) : null),
    [comparison.difference],
  );

  useEffect(() => () => texture?.dispose(), [texture]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener?.('change', onChange);
    return () => mediaQuery.removeEventListener?.('change', onChange);
  }, []);

  if (comparison.error || !comparison.difference) {
    return (
      <div
        className="flex h-full min-h-[20rem] items-center justify-center px-6 text-center text-xs text-destructive"
        data-difference-field="signed-kde"
        role="alert"
      >
        {comparison.error ?? 'This comparison could not be resolved.'}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[20rem] min-w-0 overflow-hidden bg-[#f4f1eb]" data-difference-field="signed-kde" aria-label="Signed KDE difference map: KDE(A) minus KDE(B)">
      <Canvas
        orthographic
        camera={{ position: [0, 120, 0], zoom: 5.5, near: 0.1, far: 500 }}
        gl={{ alpha: false, antialias: true }}
        style={{ background: '#f4f1eb' }}
        onCreated={({ gl }) => gl.setClearColor('#f4f1eb', 1)}
      >
        <mesh position={[0, MAP_PLANE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
          <planeGeometry args={[SPATIAL_EXTENT, SPATIAL_EXTENT]} />
          <meshBasicMaterial
            map={mapTexture ?? undefined}
            color={mapTexture ? '#ffffff' : '#dedbd2'}
            transparent
            opacity={mapTexture ? 0.92 : 1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, HEATMAP_PLANE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[SPATIAL_EXTENT, SPATIAL_EXTENT]} />
          <meshBasicMaterial map={texture} transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <CameraControls
          makeDefault
          smoothTime={prefersReducedMotion ? 0 : 0.3}
          minDistance={30}
          maxDistance={500}
          minPolarAngle={0}
          maxPolarAngle={0.0001}
        />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-card/90 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Top-down spatial field
      </div>
    </div>
  );
}

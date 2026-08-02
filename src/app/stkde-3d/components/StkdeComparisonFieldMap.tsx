'use client';

import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { KdeField } from '@/lib/kde';
import {
  mapAbsoluteIntensity,
  mapKdeRowToCanvasRow,
  mapSignedContrast,
  COMPARISON_MAP_EXTENT,
} from '../lib/comparison-map';
import type { ComparisonDomain } from '../lib/comparison-difference';
import {
  getLegacyStkdeIntensityColor,
  getStkdeIntensityColor,
  getStkdeSignedDifferenceColor,
} from '../lib/palette';

type ComparisonFieldDisplayMode = 'absolute' | 'difference';

export interface StkdeComparisonFieldMapProps {
  field: KdeField | null | undefined;
  displayMode: ComparisonFieldDisplayMode;
  domain: ComparisonDomain;
  mapTexture?: THREE.CanvasTexture | null;
  palette?: 'field' | 'legacy';
  ariaLabel?: string;
}

function buildFieldTexture(
  field: KdeField,
  displayMode: ComparisonFieldDisplayMode,
  domain: ComparisonDomain,
  palette: 'field' | 'legacy',
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = field.gridSize;
  canvas.height = field.gridSize;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const maxAbs = Math.max(Math.abs(domain[0]), Math.abs(domain[1]));
  for (let row = 0; row < field.gridSize; row += 1) {
    for (let column = 0; column < field.gridSize; column += 1) {
      const index = row * field.gridSize + column;
      const rawValue = field.values[index] ?? 0;
      const normalized = displayMode === 'difference'
        ? mapSignedContrast(rawValue, maxAbs)
        : mapAbsoluteIntensity(rawValue, domain);
      const alpha = displayMode === 'difference'
        ? (normalized === 0 ? 0.98 : 0.84 + Math.abs(normalized) * 0.14)
        : normalized === 0 ? 0 : 0.34 + normalized * 0.64;
      const color = displayMode === 'difference'
        ? getStkdeSignedDifferenceColor(normalized, alpha)
        : palette === 'legacy'
          ? getLegacyStkdeIntensityColor(normalized, alpha)
          : getStkdeIntensityColor(normalized, alpha);
      context.fillStyle = color;
      context.fillRect(column, mapKdeRowToCanvasRow(row, field.gridSize), 1, 1);
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

export function StkdeComparisonFieldMap({
  field,
  displayMode,
  domain,
  mapTexture,
  palette = 'field',
  ariaLabel = `${displayMode === 'difference' ? 'Signed KDE difference' : 'Absolute KDE'} map`,
}: StkdeComparisonFieldMapProps) {
  const texture = useMemo(
    () => (field ? buildFieldTexture(field, displayMode, domain, palette) : null),
    [domain, displayMode, field, palette],
  );

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!field || !texture) {
    return (
      <div
        className="flex h-full min-h-[20rem] items-center justify-center px-6 text-center text-xs text-destructive"
        role="alert"
        aria-label={`${ariaLabel}, unresolved`}
      >
        This comparison field could not be resolved. Reset comparison and select two distinct intervals.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[20rem] min-w-0 overflow-hidden bg-[#f4f1eb]" aria-label={ariaLabel}>
      <Canvas
        orthographic
        camera={{ position: [0, 120, 0], zoom: 5.5, near: 0.1, far: 500 }}
        gl={{ alpha: false, antialias: true }}
        style={{ background: '#f4f1eb' }}
        onCreated={({ gl }) => gl.setClearColor('#f4f1eb', 1)}
      >
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
          <planeGeometry args={[COMPARISON_MAP_EXTENT, COMPARISON_MAP_EXTENT]} />
          <meshBasicMaterial
            map={mapTexture ?? undefined}
            color={mapTexture ? '#ffffff' : '#dedbd2'}
            transparent
            opacity={mapTexture ? 0.92 : 1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[COMPARISON_MAP_EXTENT, COMPARISON_MAP_EXTENT]} />
          <meshBasicMaterial map={texture} transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </Canvas>
    </div>
  );
}

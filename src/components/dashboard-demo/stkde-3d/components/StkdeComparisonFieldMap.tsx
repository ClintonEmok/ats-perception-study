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

const COMPARISON_MAP_ASPECT = 1.72;
const NO_ACTIVITY_COLOR = 'rgba(148, 163, 184, 0.34)';

export interface StkdeComparisonFieldMapProps {
  field: KdeField | null | undefined;
  displayMode: ComparisonFieldDisplayMode;
  domain: ComparisonDomain;
  mapTexture?: THREE.CanvasTexture | null;
  palette?: 'field' | 'legacy';
  noActivityMask?: Uint8Array;
  ariaLabel?: string;
}

function buildFieldTexture(
  field: KdeField,
  displayMode: ComparisonFieldDisplayMode,
  domain: ComparisonDomain,
  palette: 'field' | 'legacy',
  noActivityMask?: Uint8Array,
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
      const isNoActivity = displayMode === 'difference' && noActivityMask?.[index] === 1;
      const normalized = displayMode === 'difference'
        ? mapSignedContrast(rawValue, maxAbs)
        : mapAbsoluteIntensity(rawValue, domain);
      const alpha = displayMode === 'difference'
        ? (normalized === 0 ? 0.98 : 0.84 + Math.abs(normalized) * 0.14)
        : normalized === 0 ? 0 : 0.34 + normalized * 0.64;
      const color = isNoActivity
        ? NO_ACTIVITY_COLOR
        : displayMode === 'difference'
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
  noActivityMask,
  ariaLabel = `${displayMode === 'difference' ? 'Signed KDE difference' : 'Absolute KDE'} map`,
}: StkdeComparisonFieldMapProps) {
  const texture = useMemo(
    () => (field ? buildFieldTexture(field, displayMode, domain, palette, noActivityMask) : null),
    [domain, displayMode, field, noActivityMask, palette],
  );

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!field || !texture) {
    return (
      <div
        className="flex h-full min-h-[20rem] w-full min-w-0 items-center justify-center px-6 text-center text-xs text-destructive"
        role="alert"
        aria-label={`${ariaLabel}, unresolved`}
      >
        This comparison field could not be resolved. Reset comparison and select two distinct intervals.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[20rem] w-full min-w-0 items-center justify-center overflow-hidden bg-[#f4f1eb] p-3 sm:p-6" aria-label={ariaLabel}>
      <div className="relative flex h-full min-h-[20rem] w-full min-w-0 max-w-[72rem] items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-[#f4f1eb] shadow-inner aspect-[7/4]">
        <Canvas
          className="!h-full !w-full"
          orthographic
          camera={{ position: [0, 120, 0], zoom: 5.1, near: 0.1, far: 500 }}
          gl={{ alpha: false, antialias: true }}
          style={{ background: '#f4f1eb' }}
          onCreated={({ gl }) => gl.setClearColor('#f4f1eb', 1)}
        >
          <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
            <planeGeometry args={[COMPARISON_MAP_EXTENT * COMPARISON_MAP_ASPECT, COMPARISON_MAP_EXTENT]} />
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
            <planeGeometry args={[COMPARISON_MAP_EXTENT * COMPARISON_MAP_ASPECT, COMPARISON_MAP_EXTENT]} />
            <meshBasicMaterial map={texture} transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </Canvas>
      </div>
    </div>
  );
}

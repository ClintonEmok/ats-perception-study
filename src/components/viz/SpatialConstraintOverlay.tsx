"use client";

import { Edges, Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { toOverlayBox } from './spatialConstraintGeometry';

const FALLBACK_COLOR = '#38bdf8';

const COLOR_TOKENS: Record<string, string> = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  green: '#22c55e',
  indigo: '#6366f1',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  slate: '#64748b',
  violet: '#8b5cf6',
};

const resolveColor = (token?: string) => {
  if (!token) {
    return FALLBACK_COLOR;
  }

  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return FALLBACK_COLOR;
  }

  return COLOR_TOKENS[normalized] ?? normalized;
};

export function SpatialConstraintOverlay() {
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);

  const enabledOverlays = useMemo(
    () => constraints.filter((constraint) => constraint.enabled).map((constraint) => toOverlayBox(constraint)),
    [constraints]
  );

  if (enabledOverlays.length === 0) {
    return null;
  }

  return (
    <group>
      {enabledOverlays.map((overlay) => {
        const isActive = overlay.id === activeConstraintId;
        const color = resolveColor(overlay.colorToken);
        const opacity = isActive ? 0.28 : 0.14;

        return (
          <group key={overlay.id} position={overlay.center}>
            <mesh>
              <boxGeometry args={overlay.size} />
              <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
              <Edges color={color} linewidth={isActive ? 2 : 1} scale={1.001} />
            </mesh>
            <Html position={[0, overlay.size[1] / 2 + 1.5, 0]} center>
              <div
                className={`rounded border px-2 py-1 text-[10px] font-medium shadow-md backdrop-blur ${
                  isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-border bg-background/85 text-foreground'
                }`}
              >
                {overlay.label}
                {isActive ? ' (active)' : ''}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

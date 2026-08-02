'use client';

import { useMemo } from 'react';
import type * as THREE from 'three';
import type { KdeField } from '@/lib/kde';
import { computeSignedKdeDifference } from '../lib/comparison-difference';
import { StkdeComparisonFieldMap } from './StkdeComparisonFieldMap';

export interface StkdeDifferenceSceneProps {
  fieldA: KdeField | null | undefined;
  fieldB: KdeField | null | undefined;
  mapTexture?: THREE.CanvasTexture | null;
}

export function StkdeDifferenceScene({ fieldA, fieldB, mapTexture }: StkdeDifferenceSceneProps) {
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

  if (comparison.error || !comparison.difference) {
    return (
      <div
        className="flex min-h-[20rem] w-full min-w-0 flex-1 items-center justify-center rounded-2xl border border-border bg-white/70 px-6 text-center text-xs text-destructive"
        data-difference-field="signed-kde"
        role="alert"
      >
        {comparison.error ?? 'This comparison could not be resolved.'}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-[20rem] w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white/70"
      data-difference-field="signed-kde"
      aria-label="Signed KDE difference map: KDE(A) minus KDE(B)"
    >
      <StkdeComparisonFieldMap
        field={comparison.difference.field}
        displayMode="difference"
        domain={comparison.difference.domain}
        mapTexture={mapTexture}
        ariaLabel="Signed KDE difference field: red means A higher, neutral means no difference, blue means B higher"
      />
    </div>
  );
}

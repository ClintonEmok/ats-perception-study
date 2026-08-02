'use client';

import type * as THREE from 'three';
import type { KdeField } from '@/lib/kde';
import type { ComparisonSelection } from '../lib/comparison';
import type { ComparisonDomain } from '../lib/comparison-difference';
import { StkdeComparisonFieldMap } from './StkdeComparisonFieldMap';
import type { StkdeHeatmapRenderer } from './StkdeSliceStack';

function formatEpoch(epoch: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(epoch * 1000));
}

export interface StkdeComparisonViewportProps {
  slot: 'A' | 'B';
  selection: ComparisonSelection;
  field: KdeField | null;
  sourceSliceId: string | null;
  absoluteDomain: ComparisonDomain;
  mapTexture?: THREE.CanvasTexture | null;
  palette?: StkdeHeatmapRenderer;
}

export function StkdeComparisonViewport({
  slot,
  selection,
  field,
  sourceSliceId,
  absoluteDomain,
  mapTexture,
  palette = 'field',
}: StkdeComparisonViewportProps) {
  const interval = `${formatEpoch(selection.startEpoch)} – ${formatEpoch(selection.endEpoch)}, ${selection.eventCount ?? 0} events`;

  return (
    <article
      className="min-h-[20rem] min-w-0 overflow-hidden rounded-2xl border border-border bg-background/45"
      data-interval-slot={slot}
      data-source-slice-id={sourceSliceId ?? selection.sourceSliceId ?? `index-${selection.sourceSliceIndex}`}
      aria-label={`Absolute KDE map for interval ${slot}, ${interval}`}
    >
      <StkdeComparisonFieldMap
        field={field}
        displayMode="absolute"
        domain={absoluteDomain}
        mapTexture={mapTexture}
        palette={palette}
        ariaLabel={`Absolute KDE field for interval ${slot}, ${interval}`}
      />
    </article>
  );
}

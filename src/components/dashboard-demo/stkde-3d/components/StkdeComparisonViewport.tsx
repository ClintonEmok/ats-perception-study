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

function formatDate(epoch: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
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
  const displayDate = formatDate(selection.startEpoch);

  return (
    <article
      className="relative flex min-h-[20rem] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white/70"
      data-interval-slot={slot}
      data-interval-date={displayDate}
      data-source-slice-id={sourceSliceId ?? selection.sourceSliceId ?? `index-${selection.sourceSliceIndex}`}
      aria-label={`Absolute KDE map for interval ${slot}, ${interval}`}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-lg border border-border/70 bg-white/90 px-2.5 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
        <span className="font-semibold uppercase tracking-[0.16em] text-foreground">{slot}</span>
        <span className="ml-2 font-mono tabular-nums text-muted-foreground">{displayDate}</span>
      </div>
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

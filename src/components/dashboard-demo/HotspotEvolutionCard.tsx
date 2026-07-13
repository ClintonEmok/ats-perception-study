'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHotspotEvolution } from '@/hooks/useHotspotEvolution';

const STATUS_COLORS: Record<string, string> = {
  stable: 'text-emerald-700 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400',
  transient: 'text-amber-700 border-amber-500/30 bg-amber-500/10 dark:text-amber-400',
  displacing: 'text-rose-700 border-rose-500/30 bg-rose-500/10 dark:text-rose-400',
};

const STATUS_ICONS: Record<string, string> = {
  stable: '\u25CB',
  transient: '\u2191',
  displacing: '\u2192',
};

const TREND_ICONS: Record<string, string> = {
  increasing: '\u2191',
  decreasing: '\u2193',
  stable: '\u2192',
  expanding: '\u2197',
  contracting: '\u2198',
};

export function HotspotEvolutionCard() {
  const { tracks, totalDisplacementKm, sliceCount, hasMultiSlice } = useHotspotEvolution();

  const topTracks = useMemo(() => tracks.slice(0, 5), [tracks]);

  if (!hasMultiSlice || tracks.length === 0) return null;

  const stable = tracks.filter((t) => t.status === 'stable').length;
  const displacing = tracks.filter((t) => t.status === 'displacing').length;
  const transient = tracks.filter((t) => t.status === 'transient').length;

  return (
    <Card className="border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardHeader className="gap-1 px-4 pb-2 pt-3">
        <CardTitle className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Hotspot Evolution
        </CardTitle>
        <CardDescription className="text-[11px] text-muted-foreground">
          {tracks.length} tracked hotspots across {sliceCount} slices
          {' \u00B7 '}
          {totalDisplacementKm.toFixed(1)} km total displacement
        </CardDescription>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {stable > 0 && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
              {stable} stable
            </span>
          )}
          {displacing > 0 && (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-400">
              {displacing} displacing
            </span>
          )}
          {transient > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
              {transient} transient
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-3">
        {topTracks.map((track) => {
          const first = track.snapshots[0];
          const last = track.snapshots[track.snapshots.length - 1];
          const avgIntensity = track.snapshots.reduce((s, hs) => s + hs.intensityScore, 0) / track.snapshots.length;
          const statusClass = STATUS_COLORS[track.status] ?? 'text-muted-foreground border-border/70 bg-muted/50';
          const statusIcon = STATUS_ICONS[track.status] ?? '?';
          const supportIcon = TREND_ICONS[track.supportTrend] ?? '?';
          const extentIcon = TREND_ICONS[track.extentTrend] ?? '?';

          return (
            <div
              key={track.id}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-md border border-border/60 bg-background/50 px-2.5 py-2 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${statusClass}`}>
                  {statusIcon} {track.status}
                </span>
                <span className="truncate font-medium text-foreground">{track.label}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {track.snapshots.length} snapshots
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="whitespace-nowrap">
                  {(track.displacementKm).toFixed(1)} km
                </span>
              </div>
              <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>
                  {first.centroidLat.toFixed(3)}, {first.centroidLng.toFixed(3)}
                </span>
                <span>{supportIcon} support {first.supportCount}→{last.supportCount}</span>
                <span>{extentIcon} extent {Math.round(first.radiusMeters)}m→{Math.round(last.radiusMeters)}m</span>
                <span>intensity {avgIntensity.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

"use client";

import React, { useEffect } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useStore } from 'zustand';
import { useUIStore } from '@/store/ui';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useIntervalProposalStore } from '@/store/useIntervalProposalStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { MainScene } from './MainScene';
import { SimpleCrimeLegend } from './SimpleCrimeLegend';
import { useLogger } from '@/hooks/useLogger';
import { useStkdeStore } from '@/store/useStkdeStore';
import { useClusterStore } from '@/store/useClusterStore';
import type { DashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';

interface CubeVisualizationProps {
  selectionStory?: DashboardDemoSelectionStory | null;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}

export default function CubeVisualization({
  selectionStory = null,
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  timeStoreOverride,
  sliceStoreOverride,
}: CubeVisualizationProps) {
  const { triggerReset } = useUIStore();
  const { loadRealData, isLoading, isMock, dataCount, columns } = useTimelineDataStore();
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;

  const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
  const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const selectedSpatialBounds = useStore(filterStore, (state) => state.selectedSpatialBounds);
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
  const effectiveWarpFactor = Number.isFinite(warpFactor) ? warpFactor : 1;
  const warpProposals = useWarpProposalStore((state) => state.proposals);
  const selectedWarpProposalId = useWarpProposalStore((state) => state.selectedProposalId);
  const appliedWarpProposalId = useWarpProposalStore((state) => state.appliedProposalId);
  const intervalProposals = useIntervalProposalStore((state) => state.proposals);
  const selectedIntervalId = useIntervalProposalStore((state) => state.selectedProposalId);
  const previewIntervalId = useIntervalProposalStore((state) => state.previewProposalId);
  const appliedIntervalId = useIntervalProposalStore((state) => state.appliedProposalId);
  const stkdeResponse = useStkdeStore((state) => state.response);
  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const runMeta = useStkdeStore((state) => state.runMeta);
  const { log } = useLogger();

  const enabledConstraints = constraints.filter((constraint) => constraint.enabled);
  const activeConstraint =
    constraints.find((constraint) => constraint.id === activeConstraintId) ?? enabledConstraints[0] ?? null;
  const activeConstraintLabel = activeConstraint?.label ?? 'None';
  const selectedWarpProposal =
    warpProposals.find((proposal) => proposal.id === selectedWarpProposalId) ?? null;
  const appliedWarpProposal =
    warpProposals.find((proposal) => proposal.id === appliedWarpProposalId) ?? null;
  const appliedProposalLabel = appliedWarpProposal?.label ?? selectedWarpProposal?.label ?? 'None';
  const selectedInterval =
    intervalProposals.find((proposal) => proposal.id === selectedIntervalId) ?? null;
  const previewInterval =
    intervalProposals.find((proposal) => proposal.id === previewIntervalId) ?? null;
  const appliedInterval =
    intervalProposals.find((proposal) => proposal.id === appliedIntervalId) ?? null;
  const previewIntervalLabel = previewInterval?.label ?? 'None';
  const appliedIntervalLabel = appliedInterval?.label ?? 'None';

  const selectedHotspot = stkdeResponse?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null;
  const slices = useStore(sliceStore, (state) => state.slices);
  const clusters = useClusterStore((state) => state.clusters);
  const selectedClusterId = useClusterStore((state) => state.selectedClusterId);
  const hoveredClusterId = useClusterStore((state) => state.hoveredClusterId);
  const activeClusterId = hoveredClusterId ?? selectedClusterId;
  const activeCluster = clusters.find((cluster) => cluster.id === activeClusterId) ?? null;
  const activeClusterState = hoveredClusterId ? 'Hovered' : selectedClusterId ? 'Selected' : 'Idle';

  const formatClusterTimeRange = (range: [number, number]) => {
    const [start, end] = range;
    if (Math.max(start, end) > 10000) {
      return `${new Date(start * 1000).toLocaleDateString()} → ${new Date(end * 1000).toLocaleDateString()}`;
    }

    return `${start.toFixed(1)}% → ${end.toFixed(1)}%`;
  };

  useEffect(() => {
    if (!columns && !isLoading) {
      loadRealData();
    }
  }, [columns, isLoading, loadRealData]);

  const handleReset = () => {
    log('view_reset');
    triggerReset();
  };


  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="h-2" />

      <div className="absolute top-16 right-4 z-10">
        <button
          onClick={handleReset}
          className="rounded-md border border-border bg-background/85 p-2 shadow-sm backdrop-blur transition-colors hover:bg-accent"
          title="Reset View"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-muted/20">
        <MainScene
          showMapBackground={false}
          filterStoreOverride={filterStore}
          coordinationStoreOverride={coordinationStore}
          adaptiveStoreOverride={adaptiveStore}
          timeStoreOverride={timeStore}
          sliceStoreOverride={sliceStore}
        />

        {isLoading && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Loading crime records"
          >
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <Loader2 className="size-8 animate-spin text-foreground" />
              <p className="text-sm font-medium text-foreground">Loading crime records</p>
              <p className="text-[11px] text-muted-foreground">
                Streaming 8.5M+ incidents from DuckDB…
              </p>
              {dataCount !== null && dataCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {dataCount.toLocaleString()} records loaded
                </p>
              )}
            </div>
          </div>
        )}

        {isMock && !isLoading && (
          <div className="absolute top-4 left-4 z-30 max-w-md rounded-md border border-red-200 bg-red-50/95 px-3 py-2 text-[11px] text-red-900 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold">⚠️ Using demo data (mock)</p>
            <p className="mt-1 text-red-800">
              Real DuckDB connection failed. Showing 1,000 mock points at y=0. Check the server console.
            </p>
          </div>
        )}

        <div className="absolute top-4 right-4 z-10 rounded-md border border-border/70 bg-background/85 px-3 py-2 text-[10px] text-foreground shadow-sm backdrop-blur">
          <p>Relational mode: {warpSource} · warp {effectiveWarpFactor.toFixed(2)}</p>
          <p>Active structure: {activeConstraintLabel}</p>
          <p>Linked selection: {selectedInterval?.label ?? appliedIntervalLabel}</p>
          <p>Proposal story: {appliedProposalLabel}</p>
          <p>Comparison cue: {previewIntervalLabel}</p>
          <p>Applied interval: {appliedIntervalLabel}</p>
          <p>
            Slice confidence:{' '}
            {(appliedInterval ?? selectedInterval)?.confidence.band ?? 'None'}
            {' · '}
            {(appliedInterval ?? selectedInterval)?.qualityState ?? 'none'}
            {' · '}
            {(appliedInterval ?? selectedInterval)?.isEdited ? 'Edited' : 'Original'}
          </p>
          {activeCluster ? (
            <div className="mt-2 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-violet-950">
              <p>State: {activeClusterState}</p>
              <p>Cluster context: {activeCluster.dominantType}</p>
              <p>Members: {activeCluster.count}</p>
              <p>Time span: {formatClusterTimeRange(activeCluster.timeRange)}</p>
            </div>
          ) : null}
          {selectionStory ? (
            <div className="mt-2 rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-950">
              <p>Window: {selectionStory.activeWindowLabel}</p>
              <p>Linked: {selectionStory.linkedHighlightLabel}</p>
              <p>{selectionStory.explanationLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <SimpleCrimeLegend />
        </div>
        {!isLoading && slices.length === 0 && clusters.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="rounded-md border border-dashed border-border/70 bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur">
              <p className="font-medium text-foreground">No slices active</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Create slices to see cluster analysis</p>
            </div>
          </div>
        )}
        {(selectedTypes.length > 0 || selectedDistricts.length > 0 || selectedTimeRange || selectedSpatialBounds) && (
          <div className="absolute bottom-4 right-4 z-10 rounded-md border bg-background/85 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground shadow-sm">
            Filters: {[
              selectedTypes.length > 0 ? `Types ${selectedTypes.length}` : null,
              selectedDistricts.length > 0 ? `Districts ${selectedDistricts.length}` : null,
              selectedTimeRange ? 'Time' : null,
              selectedSpatialBounds ? 'Region' : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

          {stkdeResponse ? (
          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-md border border-border/70 bg-background/85 px-3 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            <div className="text-xs font-semibold text-foreground">Relational context</div>
            {selectedHotspot ? (
              <>
                <div className="mt-1 text-foreground">Hotspot {selectedHotspot.id}</div>
                <div className="mt-1">Intensity: {selectedHotspot.intensityScore.toFixed(3)}</div>
                <div className="mt-1">Support: {selectedHotspot.supportCount}</div>
                <div className="mt-1">
                  Time window: {new Date(selectedHotspot.peakStartEpochSec * 1000).toLocaleString()} →{' '}
                  {new Date(selectedHotspot.peakEndEpochSec * 1000).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="mt-1">No hotspot selected</div>
            )}
            {runMeta ? (
              <div className="mt-1 text-sky-700 dark:text-sky-300">
                requested={runMeta.requestedComputeMode} effective={runMeta.effectiveComputeMode}
                {runMeta.truncated ? ' • truncated' : ''}
                {runMeta.fallbackApplied ? ` • fallback=${runMeta.fallbackApplied}` : ''}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

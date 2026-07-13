"use client";

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBinningStore } from '@/store/useBinningStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';

interface DashboardHeaderProps {
  className?: string;
}

const WORKFLOW_LABELS = {
  generate: 'generate',
  review: 'review',
  applied: 'applied',
  refine: 'refine',
} as const;

const SYNC_LABELS = {
  syncing: 'syncing',
  synchronized: 'synchronized',
  partial: 'partial',
} as const;

const badgeClassName = (tone: 'violet' | 'emerald' | 'amber' | 'slate') => {
  if (tone === 'violet') return 'border-violet-400/40 bg-violet-500/10 text-violet-200';
  if (tone === 'emerald') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (tone === 'amber') return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
  return 'border-border/70 bg-muted/40 text-muted-foreground';
};

export function DashboardHeader({ className = '' }: DashboardHeaderProps) {
  const workflowPhase = useCoordinationStore((state) => state.workflowPhase);
  const syncStatus = useCoordinationStore((state) => state.syncStatus);

  const strategy = useBinningStore((state) => state.strategy);
  const granularity = useTimeslicingModeStore((state) => state.generationInputs.granularity);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);

  const appliedSlices = useSliceDomainStore(
    useShallow((state) => state.slices.filter((slice) => slice.source === 'generated-applied' && slice.isVisible))
  );

  const workflowTone =
    workflowPhase === 'generate'
      ? 'violet'
      : workflowPhase === 'review'
        ? 'amber'
        : workflowPhase === 'applied'
          ? 'emerald'
          : 'slate';

  const syncTone =
    syncStatus.status === 'synchronized'
      ? 'emerald'
      : syncStatus.status === 'syncing'
        ? 'amber'
        : 'violet';

  const summary = useMemo(() => {
    const draftCount = pendingGeneratedBins.length;
    const appliedCount = appliedSlices.length;

    return {
      draftCount,
      appliedCount,
      summaryText: `overview · pattern summaries · strategy ${strategy} · granularity ${granularity} · applied ${appliedCount} · draft ${draftCount}`,
    };
  }, [appliedSlices.length, granularity, pendingGeneratedBins.length, strategy]);

  return (
    <header className={`border-b border-border/80 bg-background/95 px-4 py-3 text-foreground backdrop-blur ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Phase 1 · overview and pattern summaries
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Map-first overview surface for recurring patterns. Use the workflow rail for actions.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-foreground md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-border/70 bg-muted/30 px-2.5 py-2 shadow-sm">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">workflow</div>
          <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${badgeClassName(workflowTone)}`}>
            {WORKFLOW_LABELS[workflowPhase]}
          </span>
        </div>

        <div className="rounded border border-border/70 bg-muted/30 px-2.5 py-2 shadow-sm">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">sync status</div>
          <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${badgeClassName(syncTone)}`}>
            {SYNC_LABELS[syncStatus.status]}
          </span>
          {syncStatus.status === 'partial' && syncStatus.reason ? (
            <p className="mt-1 truncate text-[10px] text-violet-700 dark:text-violet-300" title={syncStatus.reason}>
              {syncStatus.panel ? `${syncStatus.panel}: ` : ''}
              {syncStatus.reason}
            </p>
          ) : null}
        </div>

        <div className="rounded border border-border/70 bg-muted/30 px-2.5 py-2 shadow-sm">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">strategy / granularity</div>
          <p className="text-foreground">{strategy}</p>
          <p className="text-muted-foreground">{granularity}</p>
        </div>

        <div className="rounded border border-border/70 bg-muted/30 px-2.5 py-2 shadow-sm">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">slice summary</div>
          <p className="text-foreground">Applied {summary.appliedCount}</p>
          <p className="text-muted-foreground">Draft {summary.draftCount}</p>
        </div>
      </div>

      <p className="mt-2 truncate text-[10px] text-muted-foreground">{summary.summaryText}</p>
    </header>
  );
}

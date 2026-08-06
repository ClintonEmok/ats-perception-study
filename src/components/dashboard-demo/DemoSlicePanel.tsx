"use client";

import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';
import { clampComparableWarpWeight } from '@/lib/binning/warp-scaling';
import { cn } from '@/lib/utils';

const formatDateTime = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Date(value).toLocaleString();
};

const formatCompactDate = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCoefficient = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(2);
};

const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }

  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export function DemoSlicePanel() {
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { currentTime, timeRange, timeResolution } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const { isComputing } = useDebouncedDensity();
  const isEvaluationLocked = useIsEvaluationLocked();

  const slices = useSliceDomainStore((state) => state.slices);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const removeSlice = useSliceDomainStore((state) => state.removeSlice);
  const clearSlices = useSliceDomainStore((state) => state.clearSlices);

  const clearPendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const mergePendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.mergePendingGeneratedBins);
  const splitPendingGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.splitPendingGeneratedBin);
  const deletePendingGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.deletePendingGeneratedBin);
  const computeManualDraftBin = useDashboardDemoTimeslicingModeStore((state) => state.computeManualDraftBin);
  const applySingleGeneratedBin = useDashboardDemoTimeslicingModeStore((state) => state.applySingleGeneratedBin);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const addManualDraftRange = useDashboardDemoTimeslicingModeStore((state) => state.addManualDraftRange);
  const updatePendingBinRange = useDashboardDemoTimeslicingModeStore((state) => state.updatePendingBinRange);
  const clearSelectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.clearSelectedBurstWindows);

  const selectedSlice = useMemo(
    () => slices.find((slice) => slice.id === selectedSliceId) ?? null,
    [selectedSliceId, slices]
  );

  const selectedDraft = useMemo(
    () => pendingGeneratedBins.find((bin) => bin.id === selectedDraftId) ?? null,
    [pendingGeneratedBins, selectedDraftId]
  );

  const selectedSliceLabel = selectedSlice
    ? `${selectedSlice.name?.trim() || 'Applied slice'} · ${selectedSlice.type}`
    : 'Read-only metadata for the selected slice.';

  const selectedDraftLabel = selectedDraft
    ? `${selectedDraft.isNeutralPartition ? 'Neutral slice' : 'Selection-first slice'} · ${selectedDraft.burstClass ?? 'neutral'} · ${selectedDraft.id}`
    : 'Read-only metadata for the selected slice.';

  const handleAddRangeSlice = useCallback(() => {
    const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
    const start = Math.max(timeRange[0], currentTime - stepSize * 2);
    const end = Math.min(timeRange[1], currentTime + stepSize * 2);
    const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
    const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[0], minTimestampSec, maxTimestampSec) * 1000
      : null;
    const endDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[1], minTimestampSec, maxTimestampSec) * 1000
      : null;

    if (startDateTimeMs === null || endDateTimeMs === null) return;
    const binId = addManualDraftRange({ startMs: startDateTimeMs, endMs: endDateTimeMs });
    computeManualDraftBin(binId);
  }, [addManualDraftRange, computeManualDraftBin, currentTime, maxTimestampSec, minTimestampSec, timeRange, timeResolution]);

  const handleMergePendingDraft = useCallback((index: number) => {
    const current = pendingGeneratedBins[index];
    if (!current) {
      return;
    }
    const adjacent = pendingGeneratedBins[index - 1] ?? pendingGeneratedBins[index + 1];
    if (!adjacent) {
      return;
    }
    mergePendingGeneratedBins([adjacent.id, current.id]);
  }, [mergePendingGeneratedBins, pendingGeneratedBins]);

  const handleSplitPendingDraft = useCallback((binId: string) => {
    const target = pendingGeneratedBins.find((bin) => bin.id === binId);
    if (!target) {
      return;
    }
    const splitPoint = Math.round((target.startTime + target.endTime) / 2);
    splitPendingGeneratedBin(binId, splitPoint);
  }, [pendingGeneratedBins, splitPendingGeneratedBin]);

  const handleDeletePendingDraft = useCallback((binId: string) => {
    if (selectedDraftId === binId) {
      setSelectedDraftId(null);
    }
    deletePendingGeneratedBin(binId);
  }, [deletePendingGeneratedBin, selectedDraftId]);

  const handleOpenPendingDraftDetails = useCallback((binId: string) => {
    setSelectedSliceId(null);
    setSelectedDraftId(binId);
  }, [setSelectedDraftId, setSelectedSliceId]);

  const handleSelectedDraftStartChange = useCallback((value: string) => {
    if (!selectedDraft) return;
    const nextStartMs = parseDateTimeLocalValue(value);
    if (nextStartMs === null) return;
    const currentEndMs = selectedDraft.endTime;
    if (!Number.isFinite(currentEndMs)) return;
    const start = Math.min(nextStartMs, currentEndMs);
    const end = Math.max(nextStartMs, currentEndMs);
    updatePendingBinRange(selectedDraft.id, start, end);
  }, [selectedDraft, updatePendingBinRange]);

  const handleSelectedDraftEndChange = useCallback((value: string) => {
    if (!selectedDraft) return;
    const nextEndMs = parseDateTimeLocalValue(value);
    if (nextEndMs === null) return;
    const currentStartMs = selectedDraft.startTime;
    if (!Number.isFinite(currentStartMs)) return;
    const start = Math.min(currentStartMs, nextEndMs);
    const end = Math.max(currentStartMs, nextEndMs);
    updatePendingBinRange(selectedDraft.id, start, end);
  }, [selectedDraft, updatePendingBinRange]);

  const handleOpenSliceDetails = useCallback((sliceId: string) => {
    setSelectedDraftId(null);
    setSelectedSliceId(sliceId);
  }, [setSelectedDraftId, setSelectedSliceId]);

  const handleApplySingleDraft = useCallback((binId: string) => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    const [windowStart, windowEnd] = timeRange;
    const domainStartMs = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const domainEndMs = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;
    // console.log('[SlicePanel] handleApplySingleDraft — binId:', binId, 'domain:', [domainStartMs, domainEndMs], 'timeRange:', timeRange);
    const applied = applySingleGeneratedBin(binId, [domainStartMs, domainEndMs]);
    if (applied) {
      toast.success('Slice applied', { description: 'Slice activated from Detect.' });
      const storeSlices = useSliceDomainStore.getState().slices;
      const visibleRange = storeSlices
        .filter((s) => s.isVisible && s.type === 'range')
        .sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0));
      const newIndex = Math.max(0, visibleRange.length - 1);
      useDashboardDemoCoordinationStore.getState().setActiveSliceIndex(newIndex);
    }
  }, [applySingleGeneratedBin, maxTimestampSec, minTimestampSec, timeRange]);

  const handleClearAll = useCallback(() => {
    setSelectedSliceId(null);
    setSelectedDraftId(null);
    clearSlices();
    clearPendingGeneratedBins();
    clearSelectedBurstWindows();
  }, [clearPendingGeneratedBins, clearSelectedBurstWindows, clearSlices]);

  const pendingItems = useMemo(
    () => [...pendingGeneratedBins].sort((a, b) => a.startTime - b.startTime),
    [pendingGeneratedBins],
  );

  const appliedItems = useMemo(
    () => [...slices].sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0)),
    [slices],
  );

  const toNormalizedFromTimestampMs = useCallback(
    (timestampMs: number | null): number | null => {
      if (timestampMs === null || minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
        return null;
      }

      const epochSec = timestampMs / 1000;
      const normalized = ((epochSec - minTimestampSec) / (maxTimestampSec - minTimestampSec)) * 100;
      return Math.min(100, Math.max(0, normalized));
    },
    [maxTimestampSec, minTimestampSec],
  );

  const handleSelectedSliceStartChange = useCallback((value: string) => {
    if (!selectedSlice) return;

    const nextStartMs = parseDateTimeLocalValue(value);
    if (selectedSlice.type === 'point') {
      const nextTime = toNormalizedFromTimestampMs(nextStartMs);
      updateSlice(selectedSlice.id, {
        startDateTimeMs: nextStartMs,
        ...(nextTime !== null ? { time: nextTime } : {}),
      });
      return;
    }

    const currentStartMs = selectedSlice.startDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[0], minTimestampSec, maxTimestampSec) * 1000
      : null);
    const currentEndMs = selectedSlice.endDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[1], minTimestampSec, maxTimestampSec) * 1000
      : null);

    const resolvedStartMs = nextStartMs ?? currentStartMs;
    const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
    const nextEndNorm = toNormalizedFromTimestampMs(currentEndMs);

    if (nextStartNorm !== null && nextEndNorm !== null) {
      const start = Math.min(nextStartNorm, nextEndNorm);
      const end = Math.max(nextStartNorm, nextEndNorm);
      updateSlice(selectedSlice.id, {
        startDateTimeMs: nextStartMs,
        range: [start, end],
        time: (start + end) / 2,
      });
      return;
    }

    updateSlice(selectedSlice.id, { startDateTimeMs: nextStartMs });
  }, [maxTimestampSec, minTimestampSec, selectedSlice, toNormalizedFromTimestampMs, updateSlice]);

  const handleSelectedSliceEndChange = useCallback((value: string) => {
    if (!selectedSlice || selectedSlice.type !== 'range') return;

    const nextEndMs = parseDateTimeLocalValue(value);
    const currentStartMs = selectedSlice.startDateTimeMs ?? (selectedSlice.range && minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(selectedSlice.range[0], minTimestampSec, maxTimestampSec) * 1000
      : null);
    const nextStartNorm = toNormalizedFromTimestampMs(currentStartMs);
    const nextEndNorm = toNormalizedFromTimestampMs(nextEndMs);

    if (nextStartNorm !== null && nextEndNorm !== null) {
      const start = Math.min(nextStartNorm, nextEndNorm);
      const end = Math.max(nextStartNorm, nextEndNorm);
      updateSlice(selectedSlice.id, {
        endDateTimeMs: nextEndMs,
        range: [start, end],
        time: (start + end) / 2,
      });
      return;
    }

    updateSlice(selectedSlice.id, { endDateTimeMs: nextEndMs });
  }, [maxTimestampSec, minTimestampSec, selectedSlice, toNormalizedFromTimestampMs, updateSlice]);

  const handleSelectedSliceWarpWeightChange = useCallback((value: string) => {
    if (!selectedSlice || value.trim() === '') return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateSlice(selectedSlice.id, {
      warpWeight: clampComparableWarpWeight(parsed),
    });
  }, [selectedSlice, updateSlice]);

  const hasItems = pendingItems.length > 0 || appliedItems.length > 0;

  return (
    <Card className="h-full min-h-0 overflow-y-auto border-border/70 bg-card/80 text-card-foreground shadow-sm" aria-busy={isComputing}>
      <CardHeader className="gap-1 px-4 pb-3 pt-4">
        <CardTitle className="text-sm font-semibold">Review & apply slices</CardTitle>
        <CardDescription className="text-xs">
          Manual drafts land here first, then applied slices stay below for review.
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          {lastAppliedAt ? `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}` : 'No applied state yet'}
        </div>
        {isEvaluationLocked ? (
          <div
            className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            role="note"
            aria-label="setup locked during evaluation"
          >
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
            Setup locked during evaluation.
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRangeSlice}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <Plus className="h-3.5 w-3.5" />
              Range
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={!hasItems || isEvaluationLocked}
              aria-disabled={isEvaluationLocked || !hasItems}
              tabIndex={isEvaluationLocked ? -1 : undefined}
              className={cn('gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {!hasItems ? (
            <div className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
              No slices active. Add a range slice here, then review and apply it below.
            </div>
          ) : (
            <>
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pending drafts</div>
                {pendingItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    No pending drafts. Add a range slice to review it here.
                  </div>
                ) : (
                  pendingItems.map((bin, index) => {
                    const isManualDraft = bin.id.startsWith('manual-range-');
                    const burstScore = formatCoefficient(bin.burstinessCoefficient);
                    const label = isManualDraft ? `Manual ${index + 1}` : `Draft ${index + 1}`;

                    return (
                      <div
                        key={bin.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-ring/40"
                      >
                        <span className="font-medium text-foreground">{label}</span>

                        {!isManualDraft && burstScore && (
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                            {burstScore}
                          </Badge>
                        )}

                        <span className="text-[11px] text-muted-foreground">
                          {formatCompactDate(bin.startTime)} → {formatCompactDate(bin.endTime)}
                        </span>

                        <div className={cn('ml-auto flex shrink-0 items-center gap-1', isEvaluationLocked && 'pointer-events-none opacity-40')}>
                          <Button
                            type="button"
                            variant="default"
                            size="xs"
                            onClick={() => handleApplySingleDraft(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Apply
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenPendingDraftDetails(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 text-[10px]"
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleMergePendingDraft(pendingItems.findIndex((b) => b.id === bin.id))}
                            disabled={pendingItems.length <= 1 || isEvaluationLocked}
                            aria-disabled={isEvaluationLocked || pendingItems.length <= 1}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 text-[10px] text-muted-foreground"
                          >
                            Merge
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleSplitPendingDraft(bin.id)}
                            disabled={bin.endTime <= bin.startTime || isEvaluationLocked}
                            aria-disabled={isEvaluationLocked || bin.endTime <= bin.startTime}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 text-[10px] text-muted-foreground"
                          >
                            Split
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleDeletePendingDraft(bin.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-destructive/30 text-[10px] text-destructive hover:border-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Applied slices</div>
                {appliedItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    Applied slices will appear here after you apply a draft.
                  </div>
                ) : (
                  appliedItems.map((slice) => {
                    const sliceIndex = slices.findIndex((s) => s.id === slice.id);
                    const label = slice.name?.trim() || `Slice ${sliceIndex + 1}`;
                    const warpLabel = (slice.warpEnabled ?? true)
                      ? `Warp ${(slice.warpWeight ?? 1).toFixed(2)}x`
                      : 'Warp disabled';

                    return (
                      <div
                        key={slice.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-xs hover:border-border"
                      >
                        <span className="font-medium text-foreground">{label}</span>

                        <Badge variant="outline" className="rounded-full border-chart-2/30 bg-chart-2/10 px-2 py-0 text-[10px] text-chart-2">
                          {warpLabel}
                        </Badge>

                        <span className="text-[11px] text-muted-foreground">
                          {formatCompactDate(slice.startDateTimeMs)} → {formatCompactDate(slice.endDateTimeMs)}
                        </span>

                        {slice.isBurst && typeof slice.burstinessCoefficient === 'number' && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatCoefficient(slice.burstinessCoefficient)}
                          </span>
                        )}

                        <div className={cn('ml-auto flex shrink-0 items-center gap-1', isEvaluationLocked && 'pointer-events-none opacity-40')}>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenSliceDetails(slice.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 text-[10px]"
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => removeSlice(slice.id)}
                            disabled={isEvaluationLocked}
                            aria-disabled={isEvaluationLocked}
                            tabIndex={isEvaluationLocked ? -1 : undefined}
                            className="h-6 border-destructive/30 text-[10px] text-destructive hover:border-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>

      <Dialog
        open={selectedSlice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSliceId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Slice details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedSliceLabel}
            </DialogDescription>
          </DialogHeader>

          {selectedSlice ? (
            <div className="space-y-3 pt-2">
              <div className="rounded-md border border-border bg-muted/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Boundary editor</div>
                <div className="mt-3 flex gap-2">
                  <label className="min-w-0 flex-1 space-y-1 text-[11px] text-muted-foreground">
                    <span>{selectedSlice.type === 'range' ? 'Start datetime' : 'Datetime'}</span>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocalValue(selectedSlice.startDateTimeMs ?? null)}
                      onChange={(event) => handleSelectedSliceStartChange(event.target.value)}
                    />
                  </label>

                  {selectedSlice.type === 'range' ? (
                    <label className="min-w-0 flex-1 space-y-1 text-[11px] text-muted-foreground">
                      <span>End datetime</span>
                      <Input
                        type="datetime-local"
                        value={toDateTimeLocalValue(selectedSlice.endDateTimeMs ?? null)}
                        onChange={(event) => handleSelectedSliceEndChange(event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Slice summary</div>
                  <div className="mt-2 text-sm text-foreground">{selectedSlice.name?.trim() || 'Unnamed slice'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(selectedSlice.startDateTimeMs)}{selectedSlice.type === 'range' ? ` → ${formatDateTime(selectedSlice.endDateTimeMs)}` : ''}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Burst / warp</div>
                  <div className="mt-2 text-sm text-foreground">{selectedSlice.burstClass ?? '—'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Coefficient {formatCoefficient(selectedSlice.burstinessCoefficient ?? selectedSlice.burstScore) ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Warp {(selectedSlice.warpEnabled ?? true) ? 'enabled' : 'disabled'} · Strength {(selectedSlice.warpWeight ?? 1).toFixed(2)}
                  </div>
                  <label className="mt-3 block space-y-1 text-[11px] text-muted-foreground">
                    <span>Warp weight</span>
                    <Input
                      aria-label="Warp weight"
                      type="number"
                      min={0.25}
                      max={4}
                      step={0.05}
                      value={selectedSlice.warpWeight ?? 1}
                      onChange={(event) => handleSelectedSliceWarpWeightChange(event.target.value)}
                    />
                    <span className="block text-[10px]">Per-slice hint used by authored allocation (0.25–4).</span>
                  </label>
                </div>

                {(selectedSlice.burstProvenance || selectedSlice.tieBreakReason || selectedSlice.thresholdSource) ? (
                  <div className="rounded-md border border-border bg-muted/60 p-3 sm:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Method notes</div>
                    {selectedSlice.burstProvenance ? (
                      <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">
                        {selectedSlice.burstProvenance}
                      </div>
                    ) : null}
                    {selectedSlice.tieBreakReason ? (
                      <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {selectedSlice.tieBreakReason}
                      </div>
                    ) : null}
                    {selectedSlice.thresholdSource ? (
                      <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {selectedSlice.thresholdSource}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDraftId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Draft details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedDraftLabel}
            </DialogDescription>
          </DialogHeader>

          {selectedDraft ? (
            <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/40 p-3 sm:col-span-2 lg:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Boundary editor</div>
                <div className="mt-3 flex gap-2">
                  <label className="min-w-0 flex-1 space-y-1 text-[11px] text-muted-foreground">
                    <span>Start datetime</span>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocalValue(selectedDraft.startTime)}
                      onChange={(event) => handleSelectedDraftStartChange(event.target.value)}
                      className="border-border bg-background text-foreground"
                    />
                  </label>
                  <label className="min-w-0 flex-1 space-y-1 text-[11px] text-muted-foreground">
                    <span>End datetime</span>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocalValue(selectedDraft.endTime)}
                      onChange={(event) => handleSelectedDraftEndChange(event.target.value)}
                      className="border-border bg-background text-foreground"
                    />
                  </label>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(selectedDraft.startTime)} → {formatDateTime(selectedDraft.endTime)} · {selectedDraft.id}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Summary</div>
                <div className="mt-2 grid gap-2 text-sm text-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Events</span>
                    <span>{selectedDraft.count}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Density score</span>
                    <span>{formatCoefficient(selectedDraft.burstScore) ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Burstiness</span>
                    <span>{formatCoefficient(selectedDraft.burstinessCoefficient) ?? '—'}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}

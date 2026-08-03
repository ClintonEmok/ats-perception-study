'use client';

import { useEffect, useRef } from 'react';
import {
  COMPARISON_MESSAGES,
  getComparisonMessage,
  type ComparisonSelection,
  type ComparisonSlot,
  type Stkde3DComparisonState,
} from '../lib/comparison';
import type { ComparisonPresetDefinition } from '../lib/comparison-presets';
import type { Stkde3DSceneSlice } from './Stkde3DSceneProvider';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function formatEpoch(epoch: number): string {
  return DATE_TIME_FORMATTER.format(new Date(epoch * 1000));
}

function selectionMatchesSlice(selection: ComparisonSelection | null, slice: Stkde3DSceneSlice): boolean {
  if (!selection) return false;
  if (selection.sourceSliceId && slice.sourceSliceId) {
    return selection.sourceSliceId === slice.sourceSliceId;
  }
  return selection.sourceSliceIndex === (slice.sourceSliceIndex ?? slice.index);
}

function sliceKey(slice: Stkde3DSceneSlice): string {
  return slice.sourceSliceId ?? `index-${slice.sourceSliceIndex ?? slice.index}`;
}

function intervalCopy(startEpoch: number, endEpoch: number, eventCount: number): string {
  return `${formatEpoch(startEpoch)} – ${formatEpoch(endEpoch)} · ${eventCount} events`;
}

export function StkdeComparisonControls({
  slices,
  comparison,
  onEnterComparison,
  onSelectSlice,
  activateComparisonSlot,
  onResetComparison,
  onBackToStack,
  announcement,
  presets = [],
  selectedPresetId = '',
  pendingPresetId,
  activePresetId,
  presetError,
  onPresetSelect,
  onModeChange,
  renderStatus,
  caseStudyLabel,
  onRetryLoading,
  usingMockData = false,
}: {
  slices: readonly Stkde3DSceneSlice[];
  comparison: Stkde3DComparisonState | null;
  onEnterComparison: () => void;
  onSelectSlice: (slice: Stkde3DSceneSlice) => void;
  activateComparisonSlot: (slot: ComparisonSlot) => void;
  onResetComparison: () => void;
  onBackToStack: () => void;
  announcement?: string | null;
  presets?: readonly ComparisonPresetDefinition[];
  selectedPresetId?: string;
  pendingPresetId?: string | null;
  activePresetId?: string | null;
  presetError?: string | null;
  onPresetSelect?: (presetId: string) => void;
  onModeChange?: (mode: 'absolute' | 'difference') => void;
  renderStatus?: 'loading' | 'ready' | 'empty' | 'error';
  caseStudyLabel?: string;
  onRetryLoading?: () => void;
  usingMockData?: boolean;
}) {
  const intervalSelectRef = useRef<HTMLSelectElement>(null);
  const hasNoIntervals = renderStatus === 'empty' || (renderStatus === undefined && slices.length === 0);
  const hasTooFewIntervals = slices.length === 1 && (renderStatus === undefined || renderStatus === 'ready');
  const isSelecting = comparison?.mode === 'selecting';
  const activeSlot = isSelecting ? comparison?.activeSlot ?? null : null;
  const intervalPrompt = activeSlot === 'A'
    ? 'Select interval A'
    : activeSlot === 'B'
      ? 'Select interval B'
      : 'Choose a comparison slot first';

  useEffect(() => {
    if (isSelecting) {
      intervalSelectRef.current?.focus();
    }
  }, [comparison?.a?.sourceSliceId, comparison?.a?.sourceSliceIndex, comparison?.b?.sourceSliceId, comparison?.b?.sourceSliceIndex, isSelecting]);

  const selectSlice = (value: string) => {
    const slice = slices.find((candidate) => sliceKey(candidate) === value);
    if (!slice || !activeSlot) return;
    onSelectSlice(slice);
  };

  return (
    <section
      aria-labelledby="comparison-controls-heading"
      className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground"
      data-comparison-controls
      data-comparison-preset-id={activePresetId ?? undefined}
      data-selection-slot={activeSlot ?? undefined}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 id="comparison-controls-heading" className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Compare intervals
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Select two rendered intervals without creating new slices.
          </p>
        </div>
        {!comparison ? (
          <button
            type="button"
            onClick={onEnterComparison}
            disabled={slices.length < 2}
            className="min-h-9 shrink-0 rounded-[var(--radius)] border border-amber-600/60 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground motion-reduce:transition-none"
          >
            Compare intervals
          </button>
        ) : null}
      </div>

      {usingMockData ? (
        <p className="mb-2 rounded-lg border border-amber-600/30 bg-amber-50/70 px-2 py-1.5 text-[10px] leading-4 text-amber-950" role="status" aria-live="polite">
          Using mock data
        </p>
      ) : null}

      {renderStatus === 'loading' ? (
        <p className="mb-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-[10px] leading-4" role="status" aria-live="polite">
          Loading {caseStudyLabel ?? 'case study'} data…
        </p>
      ) : null}

      {renderStatus === 'error' ? (
        <div className="mb-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert" aria-live="polite">
          <p className="text-[11px] leading-4 text-destructive">
            Unable to load {caseStudyLabel ?? 'case study'} data. Retry loading or choose another case study.
          </p>
          <button
            type="button"
            onClick={onRetryLoading}
            className="mt-2 min-h-9 rounded-[var(--radius)] border border-destructive/40 bg-background px-2.5 py-1.5 text-foreground transition hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            Retry loading
          </button>
        </div>
      ) : null}

      {presets.length > 0 ? (
        <div className="mb-2 rounded-xl border border-border bg-muted/20 p-2">
          <label htmlFor="comparison-preset" className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Comparison preset
          </label>
          <select
            id="comparison-preset"
            value={selectedPresetId}
            onChange={(event) => onPresetSelect?.(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] text-foreground outline-none transition focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <option value="">Choose an exact A/B pair</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} · A {preset.intervalA.label} vs B {preset.intervalB.label}
              </option>
            ))}
          </select>
          {pendingPresetId ? (
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground" aria-live="polite">Loading comparison preset…</p>
          ) : null}
          {presetError ? (
            <p className="mt-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[10px] leading-4 text-destructive" role="alert" aria-live="polite">
              {presetError}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasNoIntervals ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <h3 className="font-medium text-foreground">No intervals available</h3>
          <p className="mt-1 leading-4">
            This case study returned no rendered intervals. Choose another case study or retry loading.
          </p>
        </div>
      ) : null}

      {hasTooFewIntervals ? (
        <p className="rounded-xl border border-border bg-muted/30 p-3 leading-4">
          Comparison needs at least two rendered intervals.
        </p>
      ) : null}

      {comparison || announcement ? (
        <div
          aria-live="polite"
          role="status"
          className="rounded-xl border border-amber-600/30 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-950"
          data-comparison-status={comparison?.status ?? 'announcement'}
        >
          {comparison ? getComparisonMessage(comparison) : announcement}
        </div>
      ) : null}

      {comparison ? (
        <>
          {isSelecting ? (
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1" role="group" aria-label="Choose comparison slot">
              {(['A', 'B'] as const).map((slot) => {
                const isActive = activeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-label={`Activate comparison slot ${slot}`}
                    aria-pressed={isActive}
                    aria-selected={isActive}
                    data-selection-slot={slot}
                    onClick={() => activateComparisonSlot(slot)}
                    className={`min-h-10 rounded-md border px-2 py-1.5 font-mono text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${isActive ? 'border-amber-600/70 bg-amber-50 text-amber-950' : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'}`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(['A', 'B'] as const).map((slot) => {
              const selection = comparison[slot === 'A' ? 'a' : 'b'];
              const status = selection ? (comparison.mode === 'selecting' ? 'Selected' : 'Ready') : 'Pending';
              const details = selection
                ? intervalCopy(selection.startEpoch, selection.endEpoch, selection.eventCount ?? 0)
                : 'No interval selected';
              return (
                <article
                  key={slot}
                  aria-label={`Interval ${slot}: ${details}; ${status}`}
                  className={`rounded-xl border p-2.5 ${selection ? 'border-amber-600/50 bg-amber-50/40' : 'border-border bg-muted/30'}`}
                  data-comparison-slot={slot}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{slot}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em]">{status}</span>
                  </div>
                  <p className="mt-1 break-words font-mono leading-4 text-foreground">{details}</p>
                </article>
              );
            })}
          </div>

          {isSelecting ? (
            <label className="mt-3 block" htmlFor="comparison-interval-picker">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {intervalPrompt}
              </span>
              <select
                ref={intervalSelectRef}
                id="comparison-interval-picker"
                value=""
                disabled={!activeSlot || slices.length === 0}
                onChange={(event) => selectSlice(event.target.value)}
                aria-label={activeSlot ? `Select interval for slot ${activeSlot}` : 'Choose a comparison slot before selecting an interval'}
                className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] text-foreground outline-none transition focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted motion-reduce:transition-none"
              >
                <option value="">
                  {activeSlot ? `Choose an interval for ${activeSlot}` : 'Choose slot A or B first'}
                </option>
                {slices.map((slice) => {
                  const value = sliceKey(slice);
                  const copy = intervalCopy(slice.startEpoch, slice.endEpoch, slice.crimeCount);
                  const selectedFor = selectionMatchesSlice(comparison.a, slice)
                    ? 'A'
                    : selectionMatchesSlice(comparison.b, slice)
                      ? 'B'
                      : null;
                  return (
                    <option
                      key={value}
                      value={value}
                      title={copy}
                      data-source-slice-id={slice.sourceSliceId ?? undefined}
                    >
                      {copy}{selectedFor ? ` · selected for ${selectedFor}` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onResetComparison}
              className="min-h-9 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              Reset comparison
            </button>
            <button
              type="button"
              onClick={onBackToStack}
              className="min-h-9 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              Back to stack
            </button>
          </div>

          {comparison.a && comparison.b ? (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1" role="tablist" aria-label="Comparison view mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparison.mode === 'absolute'}
                  onClick={() => onModeChange?.('absolute')}
                  className={`min-h-9 rounded-md px-2 py-1.5 text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${comparison.mode === 'absolute' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                >
                  Absolute
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparison.mode === 'difference'}
                  onClick={() => onModeChange?.('difference')}
                  className={`min-h-9 rounded-md px-2 py-1.5 text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${comparison.mode === 'difference' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                >
                  A − B difference
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {presetError && !comparison ? (
        <button
          type="button"
          onClick={onResetComparison}
          className="mt-2 min-h-9 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          Reset comparison
        </button>
      ) : null}

      {!comparison && hasNoIntervals ? (
        <p className="sr-only" aria-live="polite">{COMPARISON_MESSAGES['awaiting-slot']}</p>
      ) : null}
    </section>
  );
}

'use client';

import {
  COMPARISON_MESSAGES,
  getComparisonMessage,
  type ComparisonSelection,
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
  return selection.sourceSliceIndex === slice.index;
}

function selectionDetails(selection: ComparisonSelection | null): string {
  if (!selection) return 'Not selected';
  return `${selection.label ?? `Slice ${selection.sourceSliceIndex + 1}`} · ${formatEpoch(selection.startEpoch)} – ${formatEpoch(selection.endEpoch)} · ${selection.eventCount ?? 0} events`;
}

export function StkdeComparisonControls({
  slices,
  comparison,
  onEnterComparison,
  onSelectSlice,
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
}: {
  slices: readonly Stkde3DSceneSlice[];
  comparison: Stkde3DComparisonState | null;
  onEnterComparison: () => void;
  onSelectSlice: (slice: Stkde3DSceneSlice) => void;
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
}) {
  const hasNoIntervals = slices.length === 0;
  const hasTooFewIntervals = slices.length === 1;
  const isSelecting = comparison?.mode === 'selecting';
  const selectionPrompt = comparison?.activeSlot === 'A' ? 'Select interval A' : 'Select interval B';
  const statusMessage = comparison
    ? comparison.status === 'selecting-a' || comparison.status === 'selecting-b'
      ? selectionPrompt
      : getComparisonMessage(comparison)
    : announcement ?? '';

  return (
    <section
      aria-labelledby="comparison-controls-heading"
      className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground"
      data-comparison-controls
      data-comparison-preset-id={activePresetId ?? undefined}
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
            className="min-h-9 shrink-0 rounded-[var(--radius)] border border-amber-600/60 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
          >
            Compare intervals
          </button>
        ) : null}
      </div>

      {presets.length > 0 ? (
        <div className="mb-2 rounded-xl border border-border bg-muted/20 p-2">
          <label htmlFor="comparison-preset" className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Comparison preset
          </label>
          <select
            id="comparison-preset"
            value={selectedPresetId}
            onChange={(event) => onPresetSelect?.(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] text-foreground outline-none transition focus:border-foreground/40"
          >
            <option value="">Choose an exact A/B pair</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} · {preset.datasetPresetId} · A {preset.intervalA.label} vs B {preset.intervalB.label}
              </option>
            ))}
          </select>
          {pendingPresetId ? (
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">Loading comparison preset…</p>
          ) : null}
          {presetError ? (
            <p className="mt-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[10px] leading-4 text-destructive" role="alert">
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
          className="rounded-xl border border-amber-600/30 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-950"
          data-comparison-status={comparison?.status ?? 'announcement'}
        >
          {statusMessage}
        </div>
      ) : null}

      {comparison ? (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(['A', 'B'] as const).map((slot) => {
              const selection = comparison[slot === 'A' ? 'a' : 'b'];
              return (
                <article
                  key={slot}
                  aria-label={`Interval ${slot}`}
                  className={`rounded-xl border p-2.5 ${selection ? 'border-amber-600/50 bg-amber-50/40' : 'border-border bg-muted/30'}`}
                  data-comparison-slot={slot}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{slot}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em]">
                      {selection ? 'Selected' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-1 break-words leading-4 text-foreground">{selectionDetails(selection)}</p>
                  {selection ? (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      source: {selection.sourceSliceId ?? `index-${selection.sourceSliceIndex}`}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {isSelecting ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Rendered intervals</span>
                <span className="font-mono text-[10px] text-muted-foreground">{slices.length} available</span>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-1.5">
                {slices.map((slice) => {
                  const selectedFor = selectionMatchesSlice(comparison.a, slice)
                    ? 'A'
                    : selectionMatchesSlice(comparison.b, slice)
                      ? 'B'
                      : null;
                  const sourceId = slice.sourceSliceId ?? `index-${slice.index}`;
                  const eligibility = selectedFor ? `Selected for ${selectedFor}` : `Select for ${comparison.activeSlot}`;
                  const accessibleName = `${eligibility}: ${slice.label}, ${formatEpoch(slice.startEpoch)} to ${formatEpoch(slice.endEpoch)}, ${slice.crimeCount} events, source slice ${sourceId}`;

                  return (
                    <button
                      key={sourceId}
                      type="button"
                      title={accessibleName}
                      aria-label={accessibleName}
                      aria-pressed={Boolean(selectedFor)}
                      onClick={() => onSelectSlice(slice)}
                      className={`flex min-h-11 w-full items-start justify-between gap-3 rounded-lg border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selectedFor
                          ? 'border-amber-600/60 bg-amber-50 text-amber-950'
                          : 'border-transparent bg-background hover:border-border hover:bg-card'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block break-words font-medium text-foreground">{slice.label}</span>
                        <span className="mt-0.5 block break-words font-mono text-[10px] text-muted-foreground">
                          {formatEpoch(slice.startEpoch)} – {formatEpoch(slice.endEpoch)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                        <span className="block">{slice.crimeCount} events</span>
                        <span className="block">{selectedFor ?? `slot ${comparison.activeSlot}`}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onResetComparison}
              className="min-h-9 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40"
            >
              Reset comparison
            </button>
            <button
              type="button"
              onClick={onBackToStack}
              className="min-h-9 rounded-[var(--radius)] border border-border bg-background px-2.5 py-1.5 text-foreground transition hover:border-foreground/40"
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
                  className={`min-h-9 rounded-md px-2 py-1.5 text-[10px] transition ${comparison.mode === 'absolute' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                >
                  Absolute
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparison.mode === 'difference'}
                  onClick={() => onModeChange?.('difference')}
                  className={`min-h-9 rounded-md px-2 py-1.5 text-[10px] transition ${comparison.mode === 'difference' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                >
                  A − B difference
                </button>
              </div>
              {comparison.mode === 'difference' ? (
                <p className="mt-2 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-[10px] leading-4 text-muted-foreground">
                  Red = A higher · Neutral = no difference · Blue = B higher.
                  <br />
                  Unavailable in A − B difference view: signed heatmap only.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!comparison && hasNoIntervals ? (
        <p className="sr-only" aria-live="polite">{COMPARISON_MESSAGES['selecting-a']}</p>
      ) : null}
    </section>
  );
}

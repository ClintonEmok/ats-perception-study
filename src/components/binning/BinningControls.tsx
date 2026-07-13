"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { TimeBin } from '@/lib/binning/types';
import { BinningStrategy } from '@/lib/binning/rules';
import { generateBins } from '@/lib/binning/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBinningStore } from '@/store/useBinningStore';
import {
  useTimeslicingModeStore,
  type TimeslicingGranularity,
} from '@/store/useTimeslicingModeStore';
import { getDistrictDisplayName } from '@/lib/category-maps';

type CrimeEventData = {
  timestamp: number;
  type: string;
  district?: string;
};

interface BinningControlsProps {
  bins: TimeBin[];
  strategy: BinningStrategy;
  onStrategyChange: (strategy: BinningStrategy) => void;
  onBinSelect?: (binId: string | null) => void;
  selectedBinId?: string | null;
  onMerge?: (binIds: string[]) => void;
  onSplit?: (binId: string, splitPoint: number) => void;
  onDelete?: (binId: string) => void;
  onResize?: (binId: string, newStartTime: number, newEndTime: number) => void;
  onSaveConfig?: (name: string) => void;
  onLoadConfig?: (configId: string) => void;
  savedConfigs?: Array<{ id: string; name: string }>;
  generationData?: CrimeEventData[];
  generationDomain?: [number, number];
  availableCrimeTypes?: string[];
  availableNeighbourhoods?: string[];
}

const GENERATION_GRANULARITIES: Array<{
  value: TimeslicingGranularity;
  label: string;
  helper: string;
  strategy: BinningStrategy;
}> = [
  { value: 'hourly', label: 'Hourly', helper: 'Focus on bursts within a day', strategy: 'hourly' },
  { value: 'daily', label: 'Daily', helper: 'Compare day-to-day activity', strategy: 'daily' },
  { value: 'weekly', label: 'Weekly', helper: 'Broader investigation windows', strategy: 'weekly' },
  { value: 'monthly', label: 'Monthly', helper: 'Compare activity by calendar month', strategy: 'monthly' },
];

const STRATEGIES: Array<{ value: BinningStrategy; label: string; description: string }> = [
  { value: 'auto-adaptive', label: 'Auto adaptive', description: 'Pick burst-aware bins automatically' },
  { value: 'burstiness', label: 'Burst emphasis', description: 'Narrow dense periods more aggressively' },
  { value: 'crime-type-specific', label: 'Crime-specific', description: 'Bias toward crime-type clustering' },
  { value: 'hourly', label: 'Hourly', description: 'Fixed hourly slices' },
  { value: 'daily', label: 'Daily', description: 'Fixed daily slices' },
  { value: 'weekly', label: 'Weekly', description: 'Fixed weekly slices' },
  { value: 'uniform-time', label: 'Uniform time', description: 'Even time spans across the window' },
  { value: 'uniform-distribution', label: 'Uniform events', description: 'Balance event counts per bin' },
];

const BURST_TAXONOMY_LEGEND = [
  { label: 'prolonged-peak', tone: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  { label: 'isolated-spike', tone: 'bg-rose-500/15 text-rose-200 border-rose-500/30' },
  { label: 'valley', tone: 'bg-sky-500/15 text-sky-200 border-sky-500/30' },
  { label: 'neutral', tone: 'bg-muted/70 text-muted-foreground border-border' },
];

const isFixedIntervalStrategy = (strategy: BinningStrategy) =>
  strategy === 'hourly' || strategy === 'daily' || strategy === 'weekly';

const toDateTimeLocalValue = (timestampMs: number | null) => {
  if (!timestampMs || !Number.isFinite(timestampMs)) return '';
  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalValue = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const formatRange = (start: number, end: number) => {
  const startDate = new Date(start).toLocaleString();
  const endDate = new Date(end).toLocaleString();
  return `${startDate} → ${endDate}`;
};

export function BinningControls({
  bins,
  strategy,
  onStrategyChange,
  onBinSelect,
  selectedBinId,
  onMerge,
  onSplit,
  onDelete,
  onSaveConfig,
  onLoadConfig,
  savedConfigs = [],
  generationData,
  generationDomain,
  availableCrimeTypes = [],
  availableNeighbourhoods = [],
}: BinningControlsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');

  const generationInputs = useTimeslicingModeStore((state) => state.generationInputs);
  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useTimeslicingModeStore((state) => state.generationError);
  const lastGeneratedMetadata = useTimeslicingModeStore((state) => state.lastGeneratedMetadata);
  const setGenerationInputs = useTimeslicingModeStore((state) => state.setGenerationInputs);
  const setGenerationStatus = useTimeslicingModeStore((state) => state.setGenerationStatus);
  const setPendingGeneratedBins = useTimeslicingModeStore((state) => state.setPendingGeneratedBins);
  const setGenerationError = useTimeslicingModeStore((state) => state.setGenerationError);
  const clearPendingGeneratedBins = useTimeslicingModeStore((state) => state.clearPendingGeneratedBins);

  useEffect(() => {
    if (!generationDomain) return;
    const { start, end } = generationInputs.timeWindow;
    if (start === null || end === null || start === end) {
      setGenerationInputs({
        timeWindow: {
          start: generationDomain[0],
          end: generationDomain[1],
        },
      });
    }
  }, [generationDomain, generationInputs.timeWindow, setGenerationInputs]);

  const stats = useMemo(() => {
    const totalEvents = bins.reduce((sum, bin) => sum + bin.count, 0);
    return {
      totalEvents,
      average: bins.length > 0 ? totalEvents / bins.length : 0,
    };
  }, [bins]);

  const handleMerge = useCallback(() => {
    if (!selectedBinId || !onMerge) return;
    const selectedIndex = bins.findIndex((bin) => bin.id === selectedBinId);
    if (selectedIndex > 0) {
      onMerge([bins[selectedIndex - 1].id, selectedBinId]);
    } else if (selectedIndex < bins.length - 1) {
      onMerge([selectedBinId, bins[selectedIndex + 1].id]);
    }
  }, [bins, onMerge, selectedBinId]);

  const handleSplit = useCallback(() => {
    if (!selectedBinId || !onSplit) return;
    const bin = bins.find((entry) => entry.id === selectedBinId);
    if (!bin) return;
    onSplit(selectedBinId, (bin.startTime + bin.endTime) / 2);
  }, [bins, onSplit, selectedBinId]);

  const handleDelete = useCallback(() => {
    if (!selectedBinId || !onDelete) return;
    onDelete(selectedBinId);
  }, [onDelete, selectedBinId]);

  const handleSaveConfig = useCallback(() => {
    if (!configName.trim() || !onSaveConfig) return;
    onSaveConfig(configName.trim());
    setConfigName('');
    setShowSaveDialog(false);
  }, [configName, onSaveConfig]);

  const handleCrimeTypeToggle = (crimeType: string) => {
    const isSelected = generationInputs.crimeTypes.includes(crimeType);
    setGenerationInputs({
      crimeTypes: isSelected
        ? generationInputs.crimeTypes.filter((entry) => entry !== crimeType)
        : [...generationInputs.crimeTypes, crimeType],
    });
  };

  const handleGenerate = useCallback(() => {
    if (!generationData?.length || !generationDomain) {
      setGenerationError('Load crime data before generating slices.');
      return;
    }

    const windowStart = generationInputs.timeWindow.start ?? generationDomain[0];
    const windowEnd = generationInputs.timeWindow.end ?? generationDomain[1];
    const start = Math.min(windowStart, windowEnd);
    const end = Math.max(windowStart, windowEnd);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setGenerationError('Choose a valid time window before generating.');
      return;
    }

    setGenerationStatus('generating');
    setGenerationError(null);

    const filteredEvents = generationData.filter((event) => {
      if (event.timestamp < start || event.timestamp > end) return false;
      if (generationInputs.crimeTypes.length > 0 && !generationInputs.crimeTypes.includes(event.type)) {
        return false;
      }
      if (generationInputs.neighbourhood && event.district !== generationInputs.neighbourhood) {
        return false;
      }
      return true;
    });

    if (filteredEvents.length === 0) {
      clearPendingGeneratedBins();
      setGenerationError('No crimes match the selected crime type, neighbourhood, and time window.');
      return;
    }

    const resolvedStrategy = strategy === 'auto-adaptive'
      ? GENERATION_GRANULARITIES.find((entry) => entry.value === generationInputs.granularity)?.strategy ?? strategy
      : strategy;

    const baseConstraints = useBinningStore.getState().constraints;
    const constraints = isFixedIntervalStrategy(resolvedStrategy)
      ? {
          ...baseConstraints,
          minEvents: 1,
          maxBins: undefined,
          minTimeSpan: undefined,
          maxTimeSpan: undefined,
        }
      : baseConstraints;
    const result = generateBins(filteredEvents, {
      strategy: resolvedStrategy,
      constraints,
      domain: [start, end],
    });

    useBinningStore.setState({
      strategy: resolvedStrategy,
      bins: result.bins,
      metadata: result.metadata,
      isComputing: false,
      data: filteredEvents,
      domain: [start, end],
      selectedBinId: result.bins[0]?.id ?? null,
    });

    const warning = result.bins.length <= 1
      ? 'The current constraints only produced one slice. Review whether a broader window or different strategy would help.'
      : filteredEvents.length < 10
        ? 'Very little data matched these constraints, so the generated slices may be unstable.'
        : null;

    setPendingGeneratedBins(result.bins, {
      binCount: result.metadata.binCount,
      eventCount: filteredEvents.length,
      warning,
      inputs: {
        ...generationInputs,
        timeWindow: { start, end },
      },
    });

    if (result.bins[0]) {
      onBinSelect?.(result.bins[0].id);
    }
  }, [
    clearPendingGeneratedBins,
    generationData,
    generationDomain,
    generationInputs,
    onBinSelect,
    setGenerationError,
    setGenerationStatus,
    setPendingGeneratedBins,
    strategy,
  ]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Generate slices from investigation intent</h3>
            <p className="text-xs text-muted-foreground">
              Choose what happened, where, when, and at what granularity. Generation creates reviewable draft bins first.
            </p>
          </div>
          {lastGeneratedMetadata && (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200">
              Last run: {new Date(lastGeneratedMetadata.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="uppercase tracking-[0.18em] text-muted-foreground">Burst taxonomy</span>
          {BURST_TAXONOMY_LEGEND.map((item) => (
            <span key={item.label} className={`rounded-full border px-2 py-1 ${item.tone}`}>
              {item.label}
            </span>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Neighbourhood</span>
            <select
              value={generationInputs.neighbourhood ?? ''}
              onChange={(event) => setGenerationInputs({ neighbourhood: event.target.value || null })}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">All neighbourhoods</option>
              {availableNeighbourhoods.map((district) => (
                <option key={district} value={district}>
                  {getDistrictDisplayName(district)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Time window start</span>
            <Input
              type="datetime-local"
              value={toDateTimeLocalValue(generationInputs.timeWindow.start)}
              onChange={(event) => setGenerationInputs({
                timeWindow: {
                  start: parseDateTimeLocalValue(event.target.value),
                  end: generationInputs.timeWindow.end,
                },
              })}
              className="border-border bg-background text-foreground"
            />
          </label>

          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Time window end</span>
            <Input
              type="datetime-local"
              value={toDateTimeLocalValue(generationInputs.timeWindow.end)}
              onChange={(event) => setGenerationInputs({
                timeWindow: {
                  start: generationInputs.timeWindow.start,
                  end: parseDateTimeLocalValue(event.target.value),
                },
              })}
              className="border-border bg-background text-foreground"
            />
          </label>

          <div className="space-y-1 text-xs text-muted-foreground">
            <span>Generation strategy</span>
            <select
              value={strategy}
              onChange={(event) => onStrategyChange(event.target.value as BinningStrategy)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {STRATEGIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Granularity</span>
          <div className="grid gap-2 md:grid-cols-3">
            {GENERATION_GRANULARITIES.map((option) => {
              const isActive = generationInputs.granularity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenerationInputs({ granularity: option.value })}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                      : 'border-border bg-background text-muted-foreground hover:border-ring/40 hover:text-foreground'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-[11px] text-muted-foreground">{option.helper}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Crime types</span>
            <button
              type="button"
              onClick={() => setGenerationInputs({ crimeTypes: [] })}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Include all
            </button>
          </div>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
            {availableCrimeTypes.map((crimeType) => {
              const isActive = generationInputs.crimeTypes.includes(crimeType);
              return (
                <button
                  key={crimeType}
                  type="button"
                  onClick={() => handleCrimeTypeToggle(crimeType)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    isActive
                      ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                      : 'border-border bg-background text-muted-foreground hover:border-ring/40 hover:text-foreground'
                  }`}
                >
                  {crimeType}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={generationStatus === 'generating'} className="gap-2">
            {generationStatus === 'generating' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generationStatus === 'generating' ? 'Generating Draft Slices…' : 'Generate Draft Slices'}
          </Button>
          {generationInputs.timeWindow.start && generationInputs.timeWindow.end && (
            <span className="text-xs text-muted-foreground">
              Window: {formatRange(generationInputs.timeWindow.start, generationInputs.timeWindow.end)}
            </span>
          )}
        </div>

        {(generationError || lastGeneratedMetadata?.warning) && (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            generationError
              ? 'border-red-500/40 bg-red-500/10 text-red-100'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          }`}>
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{generationError ?? lastGeneratedMetadata?.warning}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">Generated draft bins</div>
              <div className="text-xs text-muted-foreground">These are the slices users review before apply.</div>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
              {bins.length} bins
            </span>
          </div>

          {bins.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              No generated bins yet. Run generation to create the first reviewable result.
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {bins.map((bin, index) => (
                <button
                  key={bin.id}
                  type="button"
                  onClick={() => onBinSelect?.(bin.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                    selectedBinId === bin.id
                      ? 'border-violet-400/60 bg-violet-500/10 text-violet-50'
                       : 'border-border bg-background text-foreground hover:border-ring/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Draft slice {index + 1}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {bin.count} events
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{formatRange(bin.startTime, bin.endTime)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Review stats</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background p-2">
              <div className="text-[11px] text-muted-foreground">Draft bins</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{bins.length}</div>
            </div>
            <div className="rounded-md border border-border bg-background p-2">
              <div className="text-[11px] text-muted-foreground">Events covered</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{stats.totalEvents}</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-2 text-[11px] text-muted-foreground">
            Average events per draft slice: <span className="font-medium text-foreground">{stats.average.toFixed(1)}</span>
          </div>

          {!!selectedBinId && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="font-medium text-foreground">Optional Phase 61 bin tools</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleMerge} disabled={!onMerge}>Merge</Button>
                <Button variant="outline" size="sm" onClick={handleSplit} disabled={!onSplit}>Split</Button>
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={!onDelete}>Delete</Button>
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <div className="font-medium text-foreground">Save / load strategy setup</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} disabled={!onSaveConfig}>
                Save config
              </Button>
              {savedConfigs.length > 0 && (
                <select
                  onChange={(event) => onLoadConfig?.(event.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  defaultValue=""
                >
                  <option value="" disabled>Load config</option>
                  {savedConfigs.map((config) => (
                    <option key={config.id} value={config.id}>{config.name}</option>
                  ))}
                </select>
              )}
            </div>
            {showSaveDialog && (
              <div className="flex gap-2">
                <Input
                  value={configName}
                  onChange={(event) => setConfigName(event.target.value)}
                  placeholder="Config name"
                  className="border-border bg-background text-foreground"
                />
                <Button size="sm" onClick={handleSaveConfig}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

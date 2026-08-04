import { create } from 'zustand';
import { buildNonUniformDraftBinsFromSelection, partitionSelectionByGranularity } from '@/components/dashboard-demo/lib/demo-burst-generation';
import { fetchCrimeRecordsForPartitions } from '@/components/dashboard-demo/lib/fetchCrimeRecordsForRange';
import type { TimeBin } from '@/lib/binning/types';
import type { CrimeRecord } from '@/types/crime';
import { useSliceDomainStore } from './useSliceDomainStore';
import { useDashboardDemoCoordinationStore } from './useDashboardDemoCoordinationStore';

export type TimeslicingMode = 'auto' | 'manual';

export type TimeslicingGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type GenerationStatus = 'idle' | 'generating' | 'ready' | 'applied' | 'error';

export interface GenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: TimeslicingGranularity;
}

export interface GenerationResultMetadata {
  generatedAt: number;
  binCount: number;
  eventCount: number;
  warning: string | null;
  inputs: GenerationInputs;
}

interface DashboardDemoTimeslicingState {
  mode: TimeslicingMode;
  setMode: (mode: TimeslicingMode) => void;
  customIntervals: Array<{ name: string; startHour: number; endHour: number }>;
  setCustomIntervals: (intervals: Array<{ name: string; startHour: number; endHour: number }>) => void;
  autoConfig: {
    minBurstEvents: number;
    burstThreshold: number;
    maxSlices: number;
  };
  setAutoConfig: (config: Partial<DashboardDemoTimeslicingState['autoConfig']>) => void;
  isCreatingSlice: boolean;
  creationStart: number | null;
  setIsCreatingSlice: (creating: boolean) => void;
  setCreationStart: (start: number | null) => void;
  sliceTemplates: Array<{
    id: string;
    name: string;
    duration: number;
    color: string;
  }>; 
  addSliceTemplate: (template: Omit<DashboardDemoTimeslicingState['sliceTemplates'][0], 'id'>) => void;
  removeSliceTemplate: (id: string) => void;
  generationInputs: GenerationInputs;
  generationStatus: GenerationStatus;
  generationError: string | null;
  pendingGeneratedBins: TimeBin[];
  lastGeneratedMetadata: GenerationResultMetadata | null;
  lastAppliedAt: number | null;
  setGenerationInputs: (inputs: Partial<GenerationInputs>) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setPendingGeneratedBins: (bins: TimeBin[], metadata: Omit<GenerationResultMetadata, 'generatedAt'>) => void;
  generateBurstDraftBinsFromWindows: () => Promise<boolean>;
  setGenerationError: (message: string | null) => void;
  clearPendingGeneratedBins: () => void;
  replacePendingGeneratedBins: (bins: TimeBin[]) => void;
  mergePendingGeneratedBins: (binIds: string[]) => void;
  splitPendingGeneratedBin: (binId: string, splitPoint: number) => void;
  deletePendingGeneratedBin: (binId: string) => void;
  applyGeneratedBins: (domain: [number, number]) => boolean;
  applySingleGeneratedBin: (binId: string, domain: [number, number]) => boolean;
  addManualDraftRange: (range: { startMs: number; endMs: number }) => string;
  updatePendingBinRange: (binId: string, startMs: number, endMs: number) => void;
  computeManualDraftBin: (binId: string) => Promise<boolean>;
}

const mergeBins = (bins: TimeBin[], binIds: string[]): TimeBin[] => {
  if (binIds.length < 2) return bins;

  const selected = binIds
    .map((id) => bins.find((bin) => bin.id === id))
    .filter((bin): bin is TimeBin => Boolean(bin))
    .sort((a, b) => a.startTime - b.startTime);

  if (selected.length < 2) return bins;

  const preservedMetadataSource = selected.find(hasBurstMetadata) ?? selected[0];
  const preservedWarpWeight = Math.max(...selected.map((bin) => bin.warpWeight ?? 1));

  const totalCount = selected.reduce((sum, bin) => sum + bin.count, 0);
  const merged: TimeBin = {
    id: `pending-merged-${Date.now()}`,
    startTime: selected[0].startTime,
    endTime: selected[selected.length - 1].endTime,
    count: totalCount,
    crimeTypes: Array.from(new Set(selected.flatMap((bin) => bin.crimeTypes))),
    districts: Array.from(new Set(selected.flatMap((bin) => bin.districts ?? []))),
    avgTimestamp:
      totalCount > 0
        ? selected.reduce((sum, bin) => sum + bin.avgTimestamp * bin.count, 0) / totalCount
        : (selected[0].startTime + selected[selected.length - 1].endTime) / 2,
    ...copyBurstMetadata(preservedMetadataSource),
    warpWeight: preservedWarpWeight,
    isNeutralPartition: selected.every((bin) => bin.isNeutralPartition),
    isModified: true,
    mergedFrom: selected.map((bin) => bin.id),
  };

  return bins
    .filter((bin) => !binIds.includes(bin.id))
    .concat(merged)
    .sort((a, b) => a.startTime - b.startTime);
};

const splitBin = (bins: TimeBin[], binId: string, splitPoint: number): TimeBin[] => {
  const target = bins.find((bin) => bin.id === binId);
  if (!target) return bins;
  if (splitPoint <= target.startTime || splitPoint >= target.endTime) return bins;

  const leftCount = Math.floor(target.count / 2);
  const rightCount = target.count - leftCount;
  const now = Date.now();
  const inheritedMetadata = copyBurstMetadata(target);

  const left: TimeBin = {
    id: `pending-split-1-${now}`,
    startTime: target.startTime,
    endTime: splitPoint,
    count: leftCount,
    crimeTypes: target.crimeTypes,
    districts: target.districts,
    avgTimestamp: (target.startTime + splitPoint) / 2,
    ...inheritedMetadata,
    isModified: true,
  };

  const right: TimeBin = {
    id: `pending-split-2-${now}`,
    startTime: splitPoint,
    endTime: target.endTime,
    count: rightCount,
    crimeTypes: target.crimeTypes,
    districts: target.districts,
    avgTimestamp: (splitPoint + target.endTime) / 2,
    ...inheritedMetadata,
    isModified: true,
  };

  return bins
    .filter((bin) => bin.id !== binId)
    .concat([left, right])
    .sort((a, b) => a.startTime - b.startTime);
};

const deleteBin = (bins: TimeBin[], binId: string): TimeBin[] => bins.filter((bin) => bin.id !== binId);

const hasValidTimeWindow = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

const BURST_METADATA_KEYS = [
  'burstClass',
  'burstRuleVersion',
  'burstScore',
  'burstinessCoefficient',
  'burstinessFormula',
  'burstinessCalculation',
  'burstinessByType',
  'burstConfidence',
  'warpWeight',
  'isNeutralPartition',
  'burstProvenance',
  'tieBreakReason',
  'thresholdSource',
  'neighborhoodSummary',
] as const;

const hasBurstMetadata = (bin: TimeBin): boolean => BURST_METADATA_KEYS.some((key) => bin[key] !== undefined);

const copyBurstMetadata = (bin: TimeBin | undefined): Partial<TimeBin> => {
  if (!bin) {
    return {};
  }

  return BURST_METADATA_KEYS.reduce<Partial<TimeBin>>((metadata, key) => {
    if (bin[key] !== undefined) {
      (metadata as Record<string, unknown>)[key] = bin[key];
    }
    return metadata;
  }, {});
};

export const stripTransientTimeslicingState = (
  state: Partial<DashboardDemoTimeslicingState> | undefined
): Pick<DashboardDemoTimeslicingState, 'mode' | 'customIntervals' | 'autoConfig' | 'sliceTemplates' | 'generationInputs'> => ({
  mode: state?.mode ?? 'auto',
  customIntervals: state?.customIntervals ?? [],
  autoConfig: state?.autoConfig ?? {
    minBurstEvents: 10,
    burstThreshold: 0.7,
    maxSlices: 20,
  },
  sliceTemplates: state?.sliceTemplates ?? [
    { id: '1h', name: '1 Hour', duration: 3600000, color: '#3b82f6' },
    { id: '4h', name: '4 Hours', duration: 4 * 3600000, color: '#10b981' },
    { id: '8h', name: '8 Hours (Workday)', duration: 8 * 3600000, color: '#f59e0b' },
    { id: '24h', name: '24 Hours (Day)', duration: 24 * 3600000, color: '#8b5cf6' },
    { id: '7d', name: '7 Days (Week)', duration: 7 * 24 * 3600000, color: '#ec4899' },
  ],
  generationInputs: state?.generationInputs ?? {
    crimeTypes: [],
    neighbourhood: null,
    timeWindow: {
      start: null,
      end: null,
    },
    granularity: 'daily',
  },
});

export const useDashboardDemoTimeslicingModeStore = create<DashboardDemoTimeslicingState>()(
  (set, get) => ({
    mode: 'auto',
    setMode: (mode) => set({ mode }),
    customIntervals: [],
    setCustomIntervals: (intervals) => set({ customIntervals: intervals }),
    autoConfig: {
      minBurstEvents: 10,
      burstThreshold: 0.7,
      maxSlices: 20,
    },
    setAutoConfig: (config) => set((state) => ({ autoConfig: { ...state.autoConfig, ...config } })),
    isCreatingSlice: false,
    creationStart: null,
    setIsCreatingSlice: (creating) => set({ isCreatingSlice: creating }),
    setCreationStart: (start) => set({ creationStart: start }),
    sliceTemplates: [
      { id: '1h', name: '1 Hour', duration: 3600000, color: '#3b82f6' },
      { id: '4h', name: '4 Hours', duration: 4 * 3600000, color: '#10b981' },
      { id: '8h', name: '8 Hours (Workday)', duration: 8 * 3600000, color: '#f59e0b' },
      { id: '24h', name: '24 Hours (Day)', duration: 24 * 3600000, color: '#8b5cf6' },
      { id: '7d', name: '7 Days (Week)', duration: 7 * 24 * 3600000, color: '#ec4899' },
    ],
    addSliceTemplate: (template) => set((state) => ({
      sliceTemplates: [...state.sliceTemplates, { ...template, id: `custom-${Date.now()}` }],
    })),
    removeSliceTemplate: (id) => set((state) => ({
      sliceTemplates: state.sliceTemplates.filter((t) => t.id !== id),
    })),
    generationInputs: {
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: null,
        end: null,
      },
      granularity: 'daily',
    },
    generationStatus: 'idle',
    generationError: null,
    pendingGeneratedBins: [],
    lastGeneratedMetadata: null,
    lastAppliedAt: null,
    setGenerationInputs: (inputs) =>
      set((state) => ({
        generationInputs: {
          crimeTypes: inputs.crimeTypes ?? state.generationInputs.crimeTypes,
          neighbourhood: inputs.neighbourhood ?? state.generationInputs.neighbourhood,
          timeWindow: {
            start: inputs.timeWindow?.start ?? state.generationInputs.timeWindow.start,
            end: inputs.timeWindow?.end ?? state.generationInputs.timeWindow.end,
          },
          granularity: inputs.granularity ?? state.generationInputs.granularity,
        },
      })),
    setGenerationStatus: (status) => set({ generationStatus: status }),
    setPendingGeneratedBins: (bins, metadata) =>
      set({
        pendingGeneratedBins: bins,
        lastGeneratedMetadata: { ...metadata, generatedAt: Date.now() },
        generationStatus: 'ready',
        generationError: null,
      }),
    generateBurstDraftBinsFromWindows: async () => {
      const { generationInputs } = get();

      const { timeWindow } = generationInputs;
      if (!hasValidTimeWindow(timeWindow.start) || !hasValidTimeWindow(timeWindow.end)) {
        // console.log('[Store:Generate] invalid time window:', timeWindow);
        set({
          pendingGeneratedBins: [],
          generationStatus: 'error',
            generationError: 'Choose a valid time window before generating burst slices.',
        });
        return false;
      }

      set({ generationStatus: 'generating', generationError: null });
      // console.log('[Store:Generate] starting — timeWindow:', timeWindow, 'granularity:', generationInputs.granularity);

      try {
        const activeStart = timeWindow.start;
        const activeEnd = timeWindow.end;
        const partitions = partitionSelectionByGranularity([activeStart, activeEnd], generationInputs.granularity);
        // console.log('[Store:Generate] partitions:', partitions.length, partitions.map(p => ({ s: p.startTime, e: p.endTime })));
        const fetched = await fetchCrimeRecordsForPartitions(generationInputs, partitions, 50000);
        const crimeRecords = fetched.records;
        const sampled = fetched.sampled;
        // console.log('[Store:Generate] crime records fetched:', crimeRecords.length, 'sampled:', sampled);
        const generated = buildNonUniformDraftBinsFromSelection({
          ...generationInputs,
          eventTimestamps: crimeRecords.map((crime) => crime.timestamp * 1000),
          eventTypes: crimeRecords.map((crime) => crime.type),
        });

        // console.log('[Store:Generate] bins generated:', generated.bins.length, 'eventCount:', generated.eventCount, 'warning:', generated.warning);

        if (generated.bins.length === 0) {
          set({
            pendingGeneratedBins: [],
            generationStatus: 'error',
            generationError: generated.warning ?? 'Could not generate burst slices from the selected window.',
          });
          return false;
        }

        // console.log('[Store:Generate] setting pendingGeneratedBins:', generated.bins.length, 'bins');
        get().setPendingGeneratedBins(generated.bins, {
          binCount: generated.bins.length,
          eventCount: generated.eventCount,
          warning: sampled
            ? 'One or more slice fetches hit the API limit; burstiness may be truncated.'
            : generated.warning,
          inputs: generationInputs,
        });

        // const postSetState = get();
        // console.log('[Store:Generate] after set — pendingGeneratedBins:', postSetState.pendingGeneratedBins.length, 'status:', postSetState.generationStatus);
        return true;
      } catch (error) {
        console.error('[Store:Generate] error:', error);
        set({
          pendingGeneratedBins: [],
          generationStatus: 'error',
          generationError: error instanceof Error ? error.message : 'Failed to fetch crimes for the selected bursts.',
        });
        return false;
      }
    },
    setGenerationError: (message) => set({ generationError: message, generationStatus: message ? 'error' : 'idle' }),
    clearPendingGeneratedBins: () => set({
      pendingGeneratedBins: [],
      generationStatus: 'idle',
      generationError: null,
      lastGeneratedMetadata: null,
    }),
    replacePendingGeneratedBins: (bins) => set({ pendingGeneratedBins: bins }),
    mergePendingGeneratedBins: (binIds) => set((state) => ({ pendingGeneratedBins: mergeBins(state.pendingGeneratedBins, binIds) })),
    splitPendingGeneratedBin: (binId, splitPoint) => set((state) => ({ pendingGeneratedBins: splitBin(state.pendingGeneratedBins, binId, splitPoint) })),
    deletePendingGeneratedBin: (binId) => set((state) => ({ pendingGeneratedBins: deleteBin(state.pendingGeneratedBins, binId) })),
    applyGeneratedBins: (domain) => {
      const { pendingGeneratedBins } = get();

      // console.log('[Store:Apply] applyGeneratedBins — bins:', pendingGeneratedBins.length, 'domain:', domain);

      if (!pendingGeneratedBins.length) {
        // console.log('[Store:Apply] no pending bins, returning false');
        return false;
      }

      useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
      useDashboardDemoCoordinationStore.getState().setWarpSource('density');

      // const postSliceCount = useSliceDomainStore.getState().slices.length;
      // console.log('[Store:Apply] applied — total slices now:', postSliceCount);

      set({
        lastAppliedAt: Date.now(),
        generationStatus: 'applied',
        pendingGeneratedBins: [],
      });

      return true;
    },
    applySingleGeneratedBin: (binId, domain) => {
      const { pendingGeneratedBins } = get();
      const bin = pendingGeneratedBins.find((b) => b.id === binId);
      if (!bin) {
        // console.log('[Store:Apply] single bin not found:', binId);
        return false;
      }

      // console.log('[Store:Apply] applySingleGeneratedBin — bin:', binId, 'domain:', domain, 'binStart:', bin.startTime, 'binEnd:', bin.endTime);
      const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, domain);
      if (sliceId === null) {
        // console.log('[Store:Apply] addSliceFromBin returned null');
        return false;
      }

      useDashboardDemoCoordinationStore.getState().setWarpSource('density');

      // const postSliceCount = useSliceDomainStore.getState().slices.length;
      // console.log('[Store:Apply] single applied — sliceId:', sliceId, 'total slices now:', postSliceCount);

      set({
        lastAppliedAt: Date.now(),
        pendingGeneratedBins: pendingGeneratedBins.filter((b) => b.id !== binId),
      });

      return true;
    },
    addManualDraftRange: (range) => {
      const id = `manual-range-${Date.now()}`;
      set((state) => {
        const bin: TimeBin = {
          id,
          startTime: range.startMs,
          endTime: range.endMs,
          count: 0,
          crimeTypes: ['all-crime-types'],
          districts: [],
          avgTimestamp: (range.startMs + range.endMs) / 2,
          isModified: true,
        };
        return {
          pendingGeneratedBins: [...state.pendingGeneratedBins, bin],
          generationStatus: 'ready',
        };
      });
      return id;
    },
    updatePendingBinRange: (binId, startMs, endMs) =>
      set((state) => ({
        pendingGeneratedBins: state.pendingGeneratedBins.map((bin) =>
          bin.id === binId
            ? { ...bin, startTime: startMs, endTime: endMs, avgTimestamp: (startMs + endMs) / 2 }
            : bin
        ),
      })),
    computeManualDraftBin: async (binId) => {
      const state = get();
      const bin = state.pendingGeneratedBins.find((b) => b.id === binId);
      if (!bin) return false;

      set({ generationStatus: 'generating', generationError: null });

      try {
        const searchParams = new URLSearchParams({
          startEpoch: String(Math.floor(Math.min(bin.startTime, bin.endTime) / 1000)),
          endEpoch: String(Math.floor(Math.max(bin.startTime, bin.endTime) / 1000)),
          bufferDays: '0',
          limit: '100000',
        });

        const response = await fetch(`/api/crimes/range?${searchParams.toString()}`);
        if (!response.ok) throw new Error(`Crime data fetch failed with status ${response.status}`);

        const result = (await response.json()) as { data?: CrimeRecord[] };
        const crimes = Array.isArray(result.data) ? result.data : [];

        const typeSet = new Set<string>();
        crimes.forEach((c) => typeSet.add(c.type));
        const crimeTypes = Array.from(typeSet);

        const avgTs = crimes.length > 0
          ? crimes.reduce((sum, c) => sum + c.timestamp * 1000, 0) / crimes.length
          : (bin.startTime + bin.endTime) / 2;

        const eventTimes = crimes.map((c) => c.timestamp * 1000).sort((a, b) => a - b);
        let burstClass: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral' = 'neutral';
        let burstinessCoefficient = 0;
        let burstScore = 50;
        let burstConfidence = 0;

        if (eventTimes.length >= 2) {
          const intervals = eventTimes.slice(1).map((t, i) => t - eventTimes[i]);
          const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
          const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          const denom = stdDev + mean;
          burstinessCoefficient = denom === 0 ? 0 : (stdDev - mean) / denom;
          burstScore = Math.round(((burstinessCoefficient + 1) / 2) * 100);
          burstConfidence = Math.round(Math.abs(burstinessCoefficient) * 100);

          if (burstinessCoefficient > 0.3) {
            burstClass = 'prolonged-peak';
          } else if (burstinessCoefficient < -0.3) {
            burstClass = 'valley';
          }
        }

        set((s) => ({
          pendingGeneratedBins: s.pendingGeneratedBins.map((b) =>
            b.id === binId
              ? {
                  ...b,
                  count: crimes.length,
                  crimeTypes,
                  avgTimestamp: avgTs,
                  isModified: true,
                  burstClass,
                  burstScore,
                  burstinessCoefficient,
                  burstConfidence,
                  isNeutralPartition: burstClass === 'neutral',
                  warpWeight: burstClass === 'neutral' ? 1 : 1 + Math.max(0, burstinessCoefficient),
                }
              : b
          ),
          generationStatus: 'ready',
        }));

        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to compute manual draft data';
        set({ generationStatus: 'error', generationError: msg });
        return false;
      }
    },
  })
);

export type { TimeBin } from '@/lib/binning/types';

import { create } from 'zustand';
import {
  STKDE_PARAM_LIMITS,
  type StkdeParams,
  type StkdeSpatialFilter,
  type StkdeTemporalFilter,
} from '@/store/useStkdeStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

export type DemoSelectionSource = 'cube' | 'timeline' | 'map' | null;
export type DemoSyncStatusToken = 'syncing' | 'synchronized' | 'partial';
export type DemoPanelName = 'timeline' | 'map' | 'cube';
export type DemoBurstMetric = 'density' | 'burstiness';
export type DemoComparisonSlot = 'left' | 'right';
export type DemoSliceViewMode = 'stack' | 'focus';
export type DemoCrimeFetchStatus = 'idle' | 'loading' | 'success' | 'error';
export type DemoRailTab = 'scan' | 'detect' | 'slices' | 'inspect' | 'compare';
export type DemoWarpScaleMode = 'linear' | 'adaptive';
export type DemoWarpSource = 'density' | 'slice-authored';
export type DemoStkdeScopeMode = 'applied-slices' | 'full-viewport';
export type DemoVolumeNormalizationMode = 'window' | 'reference';
export type DemoCubeScopeMode = 'full' | 'brushed';
export type DemoHotspotMatchingMode = 'fixed' | 'adaptive';
export type DemoHeatmapRenderer = 'field' | 'legacy';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
export const DEFAULT_VOLUME_SCALE_SECONDS = 12 * 60 * 60;
export const DEFAULT_VOLUME_EXAGGERATION = 1.15;
export const DEFAULT_VOLUME_NORMALIZATION_MODE: DemoVolumeNormalizationMode = 'window';

export const ALL_DEMO_DISTRICTS = Array.from({ length: 25 }, (_, index) => String(index + 1));

export interface DemoAnalysisTimeRange {
  startEpoch: number;
  endEpoch: number;
}

function clampParam(input: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = typeof input === 'number' && Number.isFinite(input) ? input : fallback;
  return Math.floor(Math.min(max, Math.max(min, candidate)));
}

export interface DemoBurstWindowSelection {
  id: string;
  start: number;
  end: number;
  metric: DemoBurstMetric;
  peak: number;
  count: number;
  duration: number;
  burstClass: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence: number;
  burstScore: number;
  burstRationale: string;
  burstRuleVersion: string;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
}

export interface DemoDetailPeriodSelection {
  id: string;
  startSec: number;
  endSec: number;
  count: number;
  label: string;
  renderMode: 'points' | 'bins';
  summary: string;
}

export interface DemoSyncStatus {
  status: DemoSyncStatusToken;
  reason?: string;
  panel?: DemoPanelName;
}

export interface DemoPanelNoMatchState {
  panel: DemoPanelName;
  reason: string;
  at: number;
}

export interface DemoReconcileSelectionInput {
  isValid: boolean;
  reason: string;
  panel: DemoPanelName;
}

interface DashboardDemoCoordinationState {
  selectedIndex: number | null;
  selectedSource: DemoSelectionSource;
  lastInteractionAt: number | null;
  lastInteractionSource: DemoSelectionSource;
  brushRange: [number, number] | null;
  selectedBurstWindows: DemoBurstWindowSelection[];
  selectedDetailPeriod: DemoDetailPeriodSelection | null;
  detailsOpen: boolean;
  syncStatus: DemoSyncStatus;
  panelNoMatch: Partial<Record<DemoPanelName, DemoPanelNoMatchState>>;
  comparisonSliceIds: Record<DemoComparisonSlot, string | null>;
  comparisonSelectionOrder: DemoComparisonSlot[];
  activeSliceIndex: number;
  viewMode: DemoSliceViewMode;
  inspectIsPlaying: boolean;
  inspectPlaybackSpeed: number;
  inspectInterpolation: boolean;
  inspectIsScrubbing: boolean;
  inspectSliceOpacity: number;
  inspectActiveSliceOpacity: number;
  inspectNonActiveSliceOpacity: number;
  showRawEvents: boolean;
  showHotspotTrajectories: boolean;
  hotspotMatchingMode: DemoHotspotMatchingMode;
  heatmapRenderer: DemoHeatmapRenderer;
  cubeScopeMode: DemoCubeScopeMode;
  volumeScaleSeconds: number;
  volumeExaggeration: number;
  volumeNormalizationMode: DemoVolumeNormalizationMode;
  crimeFetchStatus: DemoCrimeFetchStatus;
  sliceCrimeCounts: Record<string, number>;
  activeRailTab: DemoRailTab;
  timeScaleMode: DemoWarpScaleMode;
  warpSource: DemoWarpSource;
  warpFactor: number;
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  mapDomain: [number, number];
  isComputing: boolean;
  selectedDistricts: string[];
  timeRange: DemoAnalysisTimeRange;
  stkdeScopeMode: DemoStkdeScopeMode;
  stkdeParams: StkdeParams;
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
  stkdeResponse: StkdeResponse | null;
  selectedPoiId: string | null;
  hoveredTypeId: number | null;
  lastClick: { lat: number; lon: number } | null;
  mapOverlayOpen: boolean;
  setSelectedPoi: (poiId: string | null) => void;
  setActiveRailTab: (tab: string) => void;
  setActiveSliceIndex: (index: number) => void;
  setSliceCrimeCounts: (counts: Record<string, number>) => void;
  setViewMode: (mode: DemoSliceViewMode) => void;
  setInspectIsPlaying: (playing: boolean) => void;
  setInspectSliceOpacity: (opacity: number) => void;
  setInspectActiveSliceOpacity: (opacity: number) => void;
  setInspectNonActiveSliceOpacity: (opacity: number) => void;
  setShowRawEvents: (show: boolean) => void;
  toggleShowRawEvents: () => void;
  setShowHotspotTrajectories: (show: boolean) => void;
  toggleShowHotspotTrajectories: () => void;
  setHotspotMatchingMode: (mode: DemoHotspotMatchingMode) => void;
  setHeatmapRenderer: (renderer: DemoHeatmapRenderer) => void;
  setInspectInterpolation: (enabled: boolean) => void;
  toggleInspectInterpolation: () => void;
  setInspectIsScrubbing: (scrubbing: boolean) => void;
  setCubeScopeMode: (mode: DemoCubeScopeMode) => void;
  resetTemporalSettings: () => void;
  setVolumeScaleSeconds: (seconds: number) => void;
  setVolumeExaggeration: (value: number) => void;
  setVolumeNormalizationMode: (mode: DemoVolumeNormalizationMode) => void;
  resetVolumeSettings: () => void;
  setCrimeFetchStatus: (status: DemoCrimeFetchStatus) => void;
  setInspectPlaybackSpeed: (speed: number) => void;
  toggleInspectPlayback: () => void;
  setSelectedIndex: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  commitSelection: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  clearSelection: (reason?: string) => void;
  reconcileSelection: (input: DemoReconcileSelectionInput) => void;
  setSyncStatus: (status: DemoSyncStatusToken, reason?: string, panel?: DemoPanelName) => void;
  setBrushRange: (range: [number, number] | null) => void;
  toggleBurstWindow: (window: DemoBurstWindowSelection) => void;
  clearSelectedBurstWindows: () => void;
  setSelectedDetailPeriod: (period: DemoDetailPeriodSelection | null) => void;
  clearSelectedDetailPeriod: () => void;
  setDetailsOpen: (open: boolean) => void;
  setComparisonSliceId: (slot: DemoComparisonSlot, sliceId: string | null) => void;
  pushComparisonSlice: (sliceId: string) => void;
  swapComparisonSlices: () => void;
  clearComparisonSlices: () => void;
  setTimeScaleMode: (mode: DemoWarpScaleMode) => void;
  setWarpSource: (source: DemoWarpSource) => void;
  setWarpFactor: (value: number) => void;
  setPrecomputedMaps: (densityMap: Float32Array | null, warpMap: Float32Array | null, domain: [number, number]) => void;
  setIsComputing: (value: boolean) => void;
  resetWarp: () => void;
  setSelectedDistricts: (districts: string[]) => void;
  toggleDistrict: (district: string) => void;
  setTimeRange: (startEpoch: number, endEpoch: number) => void;
  setStkdeScopeMode: (mode: DemoStkdeScopeMode) => void;
  setStkdeParams: (patch: Partial<StkdeParams>) => void;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHoveredHotspot: (hotspotId: string | null) => void;
  setSpatialFilter: (filter: StkdeSpatialFilter | null) => void;
  setTemporalFilter: (filter: StkdeTemporalFilter | null) => void;
  setStkdeResponse: (response: StkdeResponse | null) => void;
  setHoveredTypeId: (id: number | null) => void;
  setLastClick: (click: { lat: number; lon: number } | null) => void;
  setMapOverlayOpen: (open: boolean) => void;
  resetAnalysis: () => void;
}

export const useDashboardDemoCoordinationStore = create<DashboardDemoCoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  lastInteractionAt: null,
  lastInteractionSource: null,
  brushRange: null,
  selectedBurstWindows: [],
  selectedDetailPeriod: null,
  detailsOpen: false,
  syncStatus: { status: 'synchronized' },
  panelNoMatch: {},
  comparisonSliceIds: { left: null, right: null },
  comparisonSelectionOrder: [],
  activeSliceIndex: 0,
  viewMode: 'stack',
  inspectIsPlaying: false,
  inspectPlaybackSpeed: 1,
  inspectInterpolation: true,
  inspectIsScrubbing: false,
  inspectSliceOpacity: 1,
  inspectActiveSliceOpacity: 1,
  inspectNonActiveSliceOpacity: 0.35,
  showRawEvents: false,
  showHotspotTrajectories: true,
  hotspotMatchingMode: 'adaptive' as DemoHotspotMatchingMode,
  heatmapRenderer: 'field' as DemoHeatmapRenderer,
  cubeScopeMode: 'full',
  volumeScaleSeconds: DEFAULT_VOLUME_SCALE_SECONDS,
  volumeExaggeration: DEFAULT_VOLUME_EXAGGERATION,
  volumeNormalizationMode: DEFAULT_VOLUME_NORMALIZATION_MODE,
  crimeFetchStatus: 'idle',
  sliceCrimeCounts: {},
  activeRailTab: 'scan',
  // Demo starts in adaptive mode so the 3D cube's non-uniform time axis
  // (the thesis's core contribution) is visible by default. The user can
  // still toggle to 'linear' for comparison via the Time scale control.
  timeScaleMode: 'adaptive',
  warpSource: 'density',
  warpFactor: 1,
  densityMap: null,
  warpMap: null,
  mapDomain: [0, 100],
  isComputing: false,
  selectedDistricts: [] as string[],
  timeRange: { startEpoch: DEFAULT_START_EPOCH, endEpoch: DEFAULT_END_EPOCH },
  stkdeScopeMode: 'applied-slices' as DemoStkdeScopeMode,
  stkdeParams: {
    spatialBandwidthMeters: 750,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 12,
    minSupport: 5,
    timeWindowHours: 24,
  },
  selectedHotspotId: null,
  hoveredHotspotId: null,
  selectedPoiId: null,
  hoveredTypeId: null,
  lastClick: null,
  mapOverlayOpen: false,
  spatialFilter: null,
  temporalFilter: null,
  stkdeResponse: null,
  setActiveRailTab: (tab) => set({ activeRailTab: tab as DemoRailTab }),
  setActiveSliceIndex: (activeSliceIndex) => set({ activeSliceIndex }),
  setViewMode: (viewMode) => set({ viewMode }),
  setInspectIsPlaying: (inspectIsPlaying) => set({ inspectIsPlaying }),
  setInspectSliceOpacity: (inspectSliceOpacity) => set({ inspectSliceOpacity: Math.min(1.5, Math.max(0, inspectSliceOpacity)) }),
  setInspectActiveSliceOpacity: (inspectActiveSliceOpacity) => set({ inspectActiveSliceOpacity: Math.min(1, Math.max(0, inspectActiveSliceOpacity)) }),
  setInspectNonActiveSliceOpacity: (inspectNonActiveSliceOpacity) => set({ inspectNonActiveSliceOpacity: Math.min(1, Math.max(0, inspectNonActiveSliceOpacity)) }),
  setShowRawEvents: (showRawEvents) => set({ showRawEvents }),
  toggleShowRawEvents: () => set((state) => ({ showRawEvents: !state.showRawEvents })),
  setShowHotspotTrajectories: (showHotspotTrajectories) => set({ showHotspotTrajectories }),
  toggleShowHotspotTrajectories: () => set((state) => ({ showHotspotTrajectories: !state.showHotspotTrajectories })),
  setHotspotMatchingMode: (hotspotMatchingMode) => set({ hotspotMatchingMode }),
  setHeatmapRenderer: (heatmapRenderer) => set({ heatmapRenderer }),
  setInspectInterpolation: (inspectInterpolation) => set({ inspectInterpolation }),
  toggleInspectInterpolation: () => set((state) => ({ inspectInterpolation: !state.inspectInterpolation })),
  setInspectIsScrubbing: (inspectIsScrubbing) => set({ inspectIsScrubbing }),
  setCubeScopeMode: (cubeScopeMode) => set({ cubeScopeMode }),
  setVolumeScaleSeconds: (volumeScaleSeconds) =>
    set({ volumeScaleSeconds: Math.max(1, Math.floor(volumeScaleSeconds)) }),
  setVolumeExaggeration: (volumeExaggeration) =>
    set({ volumeExaggeration: Math.max(0.1, Math.min(4, volumeExaggeration)) }),
  setVolumeNormalizationMode: (volumeNormalizationMode) => set({ volumeNormalizationMode }),
  resetVolumeSettings: () =>
    set({
      volumeScaleSeconds: DEFAULT_VOLUME_SCALE_SECONDS,
      volumeExaggeration: DEFAULT_VOLUME_EXAGGERATION,
      volumeNormalizationMode: DEFAULT_VOLUME_NORMALIZATION_MODE,
    }),
  resetTemporalSettings: () =>
    set({
      inspectIsPlaying: false,
      inspectPlaybackSpeed: 1,
       inspectInterpolation: true,
       inspectIsScrubbing: false,
       cubeScopeMode: 'full',
       showRawEvents: false,
       showHotspotTrajectories: true,
       hotspotMatchingMode: 'fixed',
       heatmapRenderer: 'field',
       inspectActiveSliceOpacity: 1,
       inspectNonActiveSliceOpacity: 0.35,
    }),
  setCrimeFetchStatus: (crimeFetchStatus) => set({ crimeFetchStatus }),
  setSliceCrimeCounts: (sliceCrimeCounts) => set({ sliceCrimeCounts }),
  setInspectPlaybackSpeed: (inspectPlaybackSpeed) =>
    set({ inspectPlaybackSpeed: Math.max(0.25, Math.min(4, inspectPlaybackSpeed)) }),
  toggleInspectPlayback: () => set((state) => ({ inspectIsPlaying: !state.inspectIsPlaying })),
  setSelectedIndex: (index, source) =>
    set({
      selectedIndex: index,
      selectedSource: source,
      lastInteractionAt: Date.now(),
      lastInteractionSource: source,
      syncStatus: { status: 'synchronized' },
      panelNoMatch: {},
    }),
  commitSelection: (index, source) =>
    set({
      selectedIndex: index,
      selectedSource: source,
      lastInteractionAt: Date.now(),
      lastInteractionSource: source,
      syncStatus: { status: 'syncing' },
      panelNoMatch: {},
    }),
  clearSelection: (reason) =>
    set({
      selectedIndex: null,
      selectedSource: null,
      syncStatus: reason ? { status: 'partial', reason } : { status: 'synchronized' },
      panelNoMatch: {},
    }),
  reconcileSelection: ({ isValid, reason, panel }) =>
    set((state) => {
      if (isValid) {
        const nextNoMatch = { ...state.panelNoMatch };
        delete nextNoMatch[panel];
        const remaining = Object.values(nextNoMatch);
        if (remaining.length > 0) {
          return {
            panelNoMatch: nextNoMatch,
            syncStatus: {
              status: 'partial',
              reason: remaining[remaining.length - 1]?.reason,
              panel: remaining[remaining.length - 1]?.panel,
            },
          };
        }
        return { panelNoMatch: nextNoMatch, syncStatus: { status: 'synchronized' } };
      }
      const nextNoMatch = { ...state.panelNoMatch, [panel]: { panel, reason, at: Date.now() } };
      return { panelNoMatch: nextNoMatch, syncStatus: { status: 'partial', reason, panel } };
    }),
  setSyncStatus: (status, reason, panel) =>
    set({ syncStatus: { status, ...(reason ? { reason } : {}), ...(panel ? { panel } : {}) } }),
  setBrushRange: (range) => set({ brushRange: range }),
  toggleBurstWindow: (window) =>
    set((state) => {
      const active = state.selectedBurstWindows[0];
      const isSameWindow =
        active?.id === window.id && active.start === window.start && active.end === window.end && active.metric === window.metric;
      return { selectedBurstWindows: isSameWindow ? [active] : [window] };
    }),
  clearSelectedBurstWindows: () => set({ selectedBurstWindows: [] }),
  setSelectedDetailPeriod: (selectedDetailPeriod) => set({ selectedDetailPeriod }),
  clearSelectedDetailPeriod: () => set({ selectedDetailPeriod: null }),
  setDetailsOpen: (open) => set({ detailsOpen: open }),
  setComparisonSliceId: (slot, sliceId) =>
    set((state) => {
      const otherSlot: DemoComparisonSlot = slot === 'left' ? 'right' : 'left';
      if (sliceId !== null && state.comparisonSliceIds[otherSlot] === sliceId) {
        return state;
      }
      const nextIds = { ...state.comparisonSliceIds, [slot]: sliceId };
      const nextOrder = state.comparisonSelectionOrder.filter((item) => item !== slot);
      if (sliceId !== null) nextOrder.push(slot);
      return { comparisonSliceIds: nextIds, comparisonSelectionOrder: nextOrder };
    }),
  pushComparisonSlice: (sliceId) =>
    set((state) => {
      const { left, right } = state.comparisonSliceIds;
      if (left === sliceId || right === sliceId) return state;
      if (left === null) {
        return { comparisonSliceIds: { left: sliceId, right }, comparisonSelectionOrder: ['left', ...(right === null ? [] : ['right'])] as DemoComparisonSlot[] };
      }
      if (right === null) {
        return { comparisonSliceIds: { left, right: sliceId }, comparisonSelectionOrder: ['left', 'right'] as DemoComparisonSlot[] };
      }
      const oldestSlot = state.comparisonSelectionOrder[0] ?? 'left';
      const newestOrder = (oldestSlot === 'left' ? ['right', 'left'] : ['left', 'right']) as DemoComparisonSlot[];
      return { comparisonSliceIds: { left: oldestSlot === 'left' ? sliceId : left, right: oldestSlot === 'right' ? sliceId : right }, comparisonSelectionOrder: newestOrder };
    }),
  swapComparisonSlices: () =>
    set((state) => {
      const nextIds = { left: state.comparisonSliceIds.right, right: state.comparisonSliceIds.left };
      return {
        comparisonSliceIds: nextIds,
        comparisonSelectionOrder: state.comparisonSelectionOrder.length === 2
          ? [...state.comparisonSelectionOrder].reverse() as DemoComparisonSlot[]
          : state.comparisonSelectionOrder,
      };
    }),
  clearComparisonSlices: () =>
    set({ comparisonSliceIds: { left: null, right: null }, comparisonSelectionOrder: [] }),
  setTimeScaleMode: (mode) => set({ timeScaleMode: mode }),
  setWarpSource: (source) => set({ warpSource: source }),
  setWarpFactor: (value) => set({ warpFactor: Math.min(3, Math.max(0, value)) }),
  setPrecomputedMaps: (densityMap, warpMap, domain) =>
    set({ densityMap, warpMap, mapDomain: domain, isComputing: false }),
  setIsComputing: (value) => set({ isComputing: value }),
  resetWarp: () =>
    set({ timeScaleMode: 'linear', warpFactor: 0, warpSource: 'density', isComputing: false }),
  setSelectedDistricts: (districts) => set({ selectedDistricts: districts }),
  toggleDistrict: (district) =>
    set((state) => {
      const next = state.selectedDistricts.includes(district)
        ? state.selectedDistricts.filter((entry) => entry !== district)
        : [...state.selectedDistricts, district];
      return { selectedDistricts: next };
    }),
  setTimeRange: (startEpoch, endEpoch) =>
    set({ timeRange: { startEpoch: Math.min(startEpoch, endEpoch), endEpoch: Math.max(endEpoch, startEpoch + 1) } }),
  setStkdeScopeMode: (stkdeScopeMode) => set({ stkdeScopeMode }),
  setStkdeParams: (patch) =>
    set((state) => ({
      stkdeParams: {
        spatialBandwidthMeters: clampParam(patch.spatialBandwidthMeters, state.stkdeParams.spatialBandwidthMeters, STKDE_PARAM_LIMITS.spatialBandwidthMeters.min, STKDE_PARAM_LIMITS.spatialBandwidthMeters.max),
        temporalBandwidthHours: clampParam(patch.temporalBandwidthHours, state.stkdeParams.temporalBandwidthHours, STKDE_PARAM_LIMITS.temporalBandwidthHours.min, STKDE_PARAM_LIMITS.temporalBandwidthHours.max),
        gridCellMeters: clampParam(patch.gridCellMeters, state.stkdeParams.gridCellMeters, STKDE_PARAM_LIMITS.gridCellMeters.min, STKDE_PARAM_LIMITS.gridCellMeters.max),
        topK: clampParam(patch.topK, state.stkdeParams.topK, STKDE_PARAM_LIMITS.topK.min, STKDE_PARAM_LIMITS.topK.max),
        minSupport: clampParam(patch.minSupport, state.stkdeParams.minSupport, STKDE_PARAM_LIMITS.minSupport.min, STKDE_PARAM_LIMITS.minSupport.max),
        timeWindowHours: clampParam(patch.timeWindowHours, state.stkdeParams.timeWindowHours, STKDE_PARAM_LIMITS.timeWindowHours.min, STKDE_PARAM_LIMITS.timeWindowHours.max),
      },
    })),
  setSelectedHotspot: (selectedHotspotId) => set({ selectedHotspotId }),
  setHoveredHotspot: (hoveredHotspotId) => set({ hoveredHotspotId }),
  setSpatialFilter: (spatialFilter) => set({ spatialFilter }),
  setTemporalFilter: (temporalFilter) => set({ temporalFilter }),
  setStkdeResponse: (stkdeResponse) => set({ stkdeResponse }),
  setSelectedPoi: (selectedPoiId) => set({ selectedPoiId }),
  setHoveredTypeId: (hoveredTypeId) => set({ hoveredTypeId }),
  setLastClick: (lastClick) => set({ lastClick }),
  setMapOverlayOpen: (mapOverlayOpen) => set({ mapOverlayOpen }),
  resetAnalysis: () =>
    set({
      selectedDistricts: [],
      timeRange: { startEpoch: DEFAULT_START_EPOCH, endEpoch: DEFAULT_END_EPOCH },
      stkdeScopeMode: 'applied-slices',
      stkdeParams: { spatialBandwidthMeters: 750, temporalBandwidthHours: 24, gridCellMeters: 500, topK: 12, minSupport: 5, timeWindowHours: 24 },
      volumeScaleSeconds: DEFAULT_VOLUME_SCALE_SECONDS,
      volumeExaggeration: DEFAULT_VOLUME_EXAGGERATION,
      volumeNormalizationMode: DEFAULT_VOLUME_NORMALIZATION_MODE,
      inspectIsPlaying: false,
      inspectPlaybackSpeed: 1,
       inspectInterpolation: true,
       inspectIsScrubbing: false,
       inspectActiveSliceOpacity: 1,
       inspectNonActiveSliceOpacity: 0.35,
       showRawEvents: false,
       showHotspotTrajectories: true,
       hotspotMatchingMode: 'adaptive',
       heatmapRenderer: 'field',
      selectedHotspotId: null,
      hoveredHotspotId: null,
      spatialFilter: null,
      temporalFilter: null,
      stkdeResponse: null,
    }),
}));

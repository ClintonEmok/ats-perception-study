import type { StateCreator } from 'zustand';
import type { TimeBin } from '@/lib/binning/types';
import type { AdjustmentHandle, LimitCue, SnapMode } from '@/lib/slice-adjustment';

export type TimeSliceSource = 'manual' | 'generated-applied' | 'suggestion';

export interface TimeSlice {
  id: string;
  name?: string;
  color?: string;
  notes?: string;
  source?: TimeSliceSource;
  warpEnabled?: boolean;
  warpWeight?: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstRuleVersion?: string;
  burstScore?: number;
  burstConfidence?: number;
  burstProvenance?: string;
  burstinessCoefficient?: number;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
  type: 'point' | 'range';
  time: number;
  range?: [number, number];
  startDateTimeMs?: number | null;
  endDateTimeMs?: number | null;
  isBurst?: boolean;
  burstSliceId?: string;
  isLocked: boolean;
  isVisible: boolean;
}

export interface ReplaceSlicesFromBinsOptions {
  preserveWarpWeight?: boolean;
}

export type SliceCoreState = {
  slices: TimeSlice[];
  activeSliceId: string | null;
  activeSliceUpdatedAt: number;
  getOverlapCounts: () => Record<string, number>;
  addSlice: (initial: Partial<TimeSlice>) => void;
  addBurstSlice: (burstWindow: { start: number; end: number }) => TimeSlice | null;
  findMatchingSlice: (
    start: number,
    end: number,
    tolerance?: number,
    options?: { burstOnly?: boolean }
  ) => TimeSlice | undefined;
  removeSlice: (id: string) => void;
  mergeSlices: (ids: string[]) => string | null;
  updateSlice: (id: string, updates: Partial<TimeSlice> & { color?: string; notes?: string }) => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  addSliceFromBin: (bin: TimeBin, domain: [number, number]) => string | null;
  replaceSlicesFromBins: (
    bins: TimeBin[],
    domain: [number, number],
    options?: ReplaceSlicesFromBinsOptions,
  ) => void;
  clearSlices: () => void;
  setActiveSlice: (id: string | null) => void;
};

export type SliceSelectionState = {
  selectedIds: Set<string>;
  selectedCount: number;
  selectSlice: (id: string) => void;
  deselectSlice: (id: string) => void;
  toggleSlice: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
};

export type CreationMode = 'click' | 'drag';

export type GhostPosition = {
  x: number;
  width: number;
};

export type PreviewFeedback = {
  isValid: boolean;
  reason?: string;
  durationLabel?: string;
  timeRangeLabel?: string;
  snapInterval?: number;
};

export type SliceCreationState = {
  isCreating: boolean;
  creationMode: CreationMode | null;
  dragActive: boolean;
  snapEnabled: boolean;
  previewStart: number | null;
  previewEnd: number | null;
  ghostPosition: GhostPosition | null;
  previewIsValid: boolean;
  previewReason: string | null;
  previewDurationLabel: string | null;
  previewTimeRangeLabel: string | null;
  snapInterval: number | null;
  startCreation: (mode: CreationMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setDragActive: (active: boolean) => void;
  updatePreview: (start: number, end: number) => void;
  setPreviewFeedback: (feedback: PreviewFeedback) => void;
  commitCreation: () => TimeSlice | null;
  cancelCreation: () => void;
};

export type TooltipPayload = {
  x: number;
  y: number;
  boundarySec: number;
  durationSec: number;
  label: string;
  snapState: 'snapped' | 'free' | 'bypass';
};

export type DragPayload = {
  sliceId: string;
  handle: AdjustmentHandle;
};

export type SliceAdjustmentState = {
  draggingSliceId: string | null;
  draggingHandle: AdjustmentHandle | null;
  liveBoundarySec: number | null;
  liveBoundaryX: number | null;
  hoverSliceId: string | null;
  hoverHandle: AdjustmentHandle | null;
  tooltip: TooltipPayload | null;
  limitCue: LimitCue;
  modifierBypass: boolean;
  snapEnabled: boolean;
  snapMode: SnapMode;
  fixedSnapPresetSec: number | null;
  beginDrag: (payload: DragPayload) => void;
  updateDrag: (
    payload: Partial<
      Pick<SliceAdjustmentState, 'limitCue' | 'modifierBypass' | 'liveBoundarySec' | 'liveBoundaryX'>
    >
  ) => void;
  endDrag: () => void;
  setHover: (sliceId: string | null, handle: AdjustmentHandle | null) => void;
  updateTooltip: (tooltip: TooltipPayload | null) => void;
  setSnap: (
    payload: Partial<Pick<SliceAdjustmentState, 'snapEnabled' | 'snapMode' | 'fixedSnapPresetSec'>>
  ) => void;
};

export type SliceDomainState =
  & SliceCoreState
  & SliceSelectionState
  & SliceCreationState
  & SliceAdjustmentState;

export type SliceDomainStateCreator<T> = StateCreator<SliceDomainState, [], [], T>;

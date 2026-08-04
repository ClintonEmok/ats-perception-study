import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSliceAdjustmentSlice } from './slice-domain/createSliceAdjustmentSlice';
import { createSliceCoreSlice } from './slice-domain/createSliceCoreSlice';
import { createSliceCreationSlice } from './slice-domain/createSliceCreationSlice';
import { createSliceSelectionSlice } from './slice-domain/createSliceSelectionSlice';
import type { SliceDomainState } from './slice-domain/types';

export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    {
      name: 'slice-domain-v1',
      partialize: (state) => ({ slices: state.slices }),
    }
  )
);

export type {
  CreationMode,
  SliceAdjustmentState,
  SliceCoreState,
  SliceCreationState,
  SliceDomainState,
  SliceSelectionState,
  TimeSlice,
  ReplaceSlicesFromBinsOptions,
  TooltipPayload,
} from './slice-domain/types';

export {
  select,
  selectActiveSlice,
  selectActiveSliceId,
  selectActiveSliceUpdatedAt,
  selectAdjustmentFixedSnapPresetSec,
  selectAdjustmentLimitCue,
  selectAdjustmentModifierBypass,
  selectAdjustmentSnapEnabled,
  selectAdjustmentSnapMode,
  selectAdjustmentTooltip,
  selectCreationMode,
  selectCreationPreviewEnd,
  selectCreationPreviewFeedback,
  selectCreationPreviewRange,
  selectCreationPreviewStart,
  selectCreationSnapEnabled,
  selectDraggingHandle,
  selectDraggingSliceId,
  selectHasSelection,
  selectHoverHandle,
  selectHoverSliceId,
  selectIsCreating,
  selectLiveBoundarySec,
  selectLiveBoundaryX,
  selectSelectedCount,
  selectSelectedIds,
  selectSlices,
  selectVisibleSlices,
} from './slice-domain/selectors';

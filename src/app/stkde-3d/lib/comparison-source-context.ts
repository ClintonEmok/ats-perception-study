import type { ComparisonSelection } from './comparison';

export type ComparisonSourceSlice = {
  index: number;
  sourceSliceId?: string | null;
  sourceSliceIndex?: number;
};

export type ComparisonSourceContext<TSlice extends ComparisonSourceSlice, TEventGroup, TKdeGroup, TResult> = {
  sourceSliceIndex: number | null;
  sourceSliceId: string | null;
  selectedSlice: TSlice | null;
  selectedEvents: TEventGroup | null;
  selectedKde: TKdeGroup | null;
  trajectorySlices: readonly TSlice[];
  trajectoryResults: readonly TResult[];
};

export function resolveComparisonSourceContext<
  TSlice extends ComparisonSourceSlice,
  TEventGroup,
  TKdeGroup,
  TResult,
>({
  selection,
  slices,
  sliceEvents = [],
  sliceKdes = [],
  sliceResults = [],
}: {
  selection: ComparisonSelection | null;
  slices: readonly TSlice[];
  sliceEvents?: readonly TEventGroup[];
  sliceKdes?: readonly TKdeGroup[];
  sliceResults?: readonly TResult[];
}): ComparisonSourceContext<TSlice, TEventGroup, TKdeGroup, TResult> {
  if (!selection) {
    return {
      sourceSliceIndex: null,
      sourceSliceId: null,
      selectedSlice: null,
      selectedEvents: null,
      selectedKde: null,
      trajectorySlices: slices,
      trajectoryResults: sliceResults,
    };
  }

  const idMatch = selection.sourceSliceId
    ? slices.find((slice) => slice.sourceSliceId === selection.sourceSliceId)
    : undefined;
  const sourceIndex = selection.sourceSliceIndex ?? selection.index;
  const indexMatch = idMatch ?? slices.find((slice) => (
    slice.sourceSliceIndex === sourceIndex || slice.index === sourceIndex
  ));
  const selectedArrayIndex = indexMatch ? slices.indexOf(indexMatch) : -1;
  const selectedSourceIndex = indexMatch
    ? indexMatch.sourceSliceIndex ?? indexMatch.index
    : sourceIndex;
  const selectedSourceId = indexMatch?.sourceSliceId ?? selection.sourceSliceId ?? null;

  return {
    sourceSliceIndex: selectedSourceIndex,
    sourceSliceId: selectedSourceId,
    selectedSlice: indexMatch ?? null,
    selectedEvents: sliceEvents[selectedSourceIndex] ?? sliceEvents[selectedArrayIndex] ?? null,
    selectedKde: sliceKdes[selectedSourceIndex] ?? sliceKdes[selectedArrayIndex] ?? null,
    trajectorySlices: slices,
    trajectoryResults: sliceResults,
  };
}

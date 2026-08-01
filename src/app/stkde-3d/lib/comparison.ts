export type ComparisonSlot = 'A' | 'B';

export type ComparisonMode = 'selecting' | 'absolute' | 'difference';

export type ComparisonStatus =
  | 'selecting-a'
  | 'selecting-b'
  | 'duplicate-b'
  | 'ready'
  | 'difference'
  | 'reset'
  | 'invalidated'
  | 'exited';

export type ComparisonSelection = {
  index: number;
  sourceSliceId: string | null;
  sourceSliceIndex: number;
  startEpoch: number;
  endEpoch: number;
  label?: string;
  eventCount?: number;
};

export type ComparisonSelectionInput = Omit<ComparisonSelection, 'sourceSliceIndex'> & {
  sourceSliceIndex?: number;
};

export type Stkde3DComparisonState = {
  mode: ComparisonMode;
  activeSlot: ComparisonSlot;
  a: ComparisonSelection | null;
  b: ComparisonSelection | null;
  linkedCameras: boolean;
  status: ComparisonStatus;
};

export const COMPARISON_MESSAGES: Record<ComparisonStatus, string> = {
  'selecting-a': 'Select interval A',
  'selecting-b': 'Select interval B',
  'duplicate-b': 'Choose a different interval for B.',
  ready: 'A/B comparison ready',
  difference: 'A − B difference',
  reset: 'Comparison reset. Select interval A.',
  invalidated: 'The dataset changed. Select new A and B intervals.',
  exited: 'Back to stack',
};

export function createInitialComparisonState(
  status: ComparisonStatus = 'selecting-a',
): Stkde3DComparisonState {
  return {
    mode: 'selecting',
    activeSlot: 'A',
    a: null,
    b: null,
    linkedCameras: true,
    status,
  };
}

export function enterComparison(): Stkde3DComparisonState {
  return createInitialComparisonState();
}

export function normalizeComparisonSelection(
  selection: ComparisonSelectionInput,
): ComparisonSelection {
  return {
    ...selection,
    sourceSliceId: selection.sourceSliceId ?? null,
    sourceSliceIndex: selection.sourceSliceIndex ?? selection.index,
  };
}

export function areComparisonSelectionsEqual(
  first: ComparisonSelection,
  second: ComparisonSelection,
): boolean {
  if (first.sourceSliceId && second.sourceSliceId && first.sourceSliceId === second.sourceSliceId) {
    return true;
  }

  return first.sourceSliceIndex === second.sourceSliceIndex || first.index === second.index;
}

export function selectComparisonSlice(
  state: Stkde3DComparisonState,
  selectionInput: ComparisonSelectionInput,
): Stkde3DComparisonState {
  if (state.mode !== 'selecting') {
    return state;
  }

  const selection = normalizeComparisonSelection(selectionInput);

  if (state.activeSlot === 'A') {
    return {
      ...state,
      activeSlot: 'B',
      a: selection,
      status: 'selecting-b',
    };
  }

  if (!state.a || areComparisonSelectionsEqual(state.a, selection)) {
    return {
      ...state,
      status: 'duplicate-b',
    };
  }

  return {
    ...state,
    activeSlot: 'B',
    b: selection,
    mode: 'absolute',
    status: 'ready',
  };
}

export function resetComparison(): Stkde3DComparisonState {
  return createInitialComparisonState('reset');
}

export function invalidateComparison(): Stkde3DComparisonState {
  return createInitialComparisonState('invalidated');
}

export function exitComparison(): null {
  return null;
}

export function setComparisonMode(
  state: Stkde3DComparisonState,
  mode: Extract<ComparisonMode, 'absolute' | 'difference'>,
): Stkde3DComparisonState {
  if (!state.a || !state.b) {
    return state;
  }

  return {
    ...state,
    mode,
    status: mode === 'difference' ? 'difference' : 'ready',
  };
}

export function getComparisonMessage(state: Stkde3DComparisonState): string {
  return COMPARISON_MESSAGES[state.status];
}

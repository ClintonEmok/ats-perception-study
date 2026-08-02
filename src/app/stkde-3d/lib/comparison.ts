export type ComparisonSlot = 'A' | 'B';

export type ComparisonMode = 'selecting' | 'absolute' | 'difference';

export type ComparisonStatus =
  | 'awaiting-slot'
  | 'selecting-a'
  | 'selecting-b'
  | 'duplicate-a'
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
  activeSlot: ComparisonSlot | null;
  a: ComparisonSelection | null;
  b: ComparisonSelection | null;
  linkedCameras: boolean;
  status: ComparisonStatus;
};

export const COMPARISON_MESSAGES: Record<ComparisonStatus, string> = {
  'awaiting-slot': 'Choose comparison slot A or B',
  'selecting-a': 'Select interval A',
  'selecting-b': 'Select interval B',
  'duplicate-a': 'Choose a different interval for A.',
  'duplicate-b': 'Choose a different interval for B.',
  ready: 'A/B comparison ready',
  difference: 'A − B difference',
  reset: 'Comparison reset. Select interval A.',
  invalidated: 'The dataset changed. Select new A and B intervals.',
  exited: 'Back to stack',
};

export function createInitialComparisonState(
  status: ComparisonStatus = 'awaiting-slot',
  activeSlot: ComparisonSlot | null = status === 'reset' || status === 'invalidated' ? 'A' : null,
): Stkde3DComparisonState {
  return {
    mode: 'selecting',
    activeSlot,
    a: null,
    b: null,
    linkedCameras: true,
    status,
  };
}

export function enterComparison(): Stkde3DComparisonState {
  return createInitialComparisonState();
}

export function activateComparisonSlot(
  state: Stkde3DComparisonState,
  slot: ComparisonSlot,
): Stkde3DComparisonState {
  if (state.mode !== 'selecting') {
    return state;
  }

  return {
    ...state,
    activeSlot: slot,
    status: slot === 'A' ? 'selecting-a' : 'selecting-b',
  };
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

  if (!state.activeSlot) {
    return state;
  }

  const otherSelection = state.activeSlot === 'A' ? state.b : state.a;
  if (otherSelection && areComparisonSelectionsEqual(otherSelection, selection)) {
    return {
      ...state,
      status: state.activeSlot === 'A' ? 'duplicate-a' : 'duplicate-b',
    };
  }

  const nextState: Stkde3DComparisonState = {
    ...state,
    [state.activeSlot === 'A' ? 'a' : 'b']: selection,
  };

  if (nextState.a && nextState.b) {
    return {
      ...nextState,
      activeSlot: null,
      mode: 'absolute',
      status: 'ready',
    };
  }

  const nextActiveSlot = state.activeSlot === 'A' ? 'B' : 'A';
  return {
    ...nextState,
    activeSlot: nextActiveSlot,
    status: nextActiveSlot === 'A' ? 'selecting-a' : 'selecting-b',
  };
}

export function resetComparison(): Stkde3DComparisonState {
  return createInitialComparisonState('reset', 'A');
}

export function invalidateComparison(): Stkde3DComparisonState {
  return createInitialComparisonState('invalidated', 'A');
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

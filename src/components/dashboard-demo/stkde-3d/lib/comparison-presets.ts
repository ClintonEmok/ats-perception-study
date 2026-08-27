import type { KdeParams } from '@/lib/kde';
import type { StkdeHeatmapRenderer } from '../components/StkdeSliceStack';
import type { ComparisonSelection } from './comparison';
import type { Stkde3DSceneSlice } from '../components/Stkde3DSceneProvider';

export type ComparisonDatasetPresetId = 'full' | 'fourth-of-july' | 'spring-break' | 'new-years';
export type ComparisonView = 'absolute' | 'difference';
export type ComparisonLayer = 'heatmap' | 'heatmap-with-events' | 'heatmap-with-trajectories';

export type ComparisonPresetIntervalReference = {
  sliceIndex: number;
  label: string;
};

export type ComparisonPresetInterval = ComparisonPresetIntervalReference & {
  startEpoch: number;
  endEpoch: number;
  sourceSliceId: string;
};

export type ComparisonPresetParameters = {
  kde: KdeParams;
  adaptiveTime: boolean;
  renderer: StkdeHeatmapRenderer;
};

export type ComparisonPresetDefinition = {
  id: string;
  label: string;
  datasetPresetId: ComparisonDatasetPresetId;
  intervalA: ComparisonPresetIntervalReference;
  intervalB: ComparisonPresetIntervalReference;
  view: ComparisonView;
  parameters: ComparisonPresetParameters;
  layer: ComparisonLayer;
  camera: 'front-oblique';
};

export type ResolvedComparisonPreset = Omit<ComparisonPresetDefinition, 'intervalA' | 'intervalB'> & {
  intervalA: ComparisonPresetInterval;
  intervalB: ComparisonPresetInterval;
};

export type ResolvedComparisonPresetResult = {
  preset: ResolvedComparisonPreset;
  selectionA: ComparisonSelection;
  selectionB: ComparisonSelection;
};

export class ComparisonPresetResolutionError extends Error {
  readonly code:
    | 'dataset-mismatch'
    | 'index-out-of-bounds'
    | 'label-mismatch'
    | 'duplicate-interval'
    | 'source-identity-mismatch'
    | 'invalid-interval';

  constructor(code: ComparisonPresetResolutionError['code'], message: string) {
    super(message);
    this.name = 'ComparisonPresetResolutionError';
    this.code = code;
  }
}

const EXPERIMENTAL_COMPARISON_KDE_PARAMS: KdeParams = {
  gridSize: 48,
  sigmaCells: 1.35,
  smoothingMeters: 150,
  kernelRadiusCells: 4,
  threshold: 0.2,
};

export const COMPARISON_PRESETS: readonly ComparisonPresetDefinition[] = [
  {
    id: 'full-slice-02-vs-08',
    label: 'Full data · Slice 2 vs Slice 8',
    datasetPresetId: 'full',
    intervalA: { sliceIndex: 1, label: 'Slice 2' },
    intervalB: { sliceIndex: 7, label: 'Slice 8' },
    view: 'absolute',
    parameters: {
      kde: { ...EXPERIMENTAL_COMPARISON_KDE_PARAMS },
      adaptiveTime: true,
      renderer: 'field',
    },
    layer: 'heatmap-with-trajectories',
    camera: 'front-oblique',
  },
  {
    id: 'fourth-of-july-slice-03-vs-09',
    label: 'Fourth of July · Slice 3 vs Slice 9',
    datasetPresetId: 'fourth-of-july',
    intervalA: { sliceIndex: 2, label: 'Slice 3' },
    intervalB: { sliceIndex: 8, label: 'Slice 9' },
    view: 'difference',
    parameters: {
      kde: { ...EXPERIMENTAL_COMPARISON_KDE_PARAMS },
      adaptiveTime: true,
      renderer: 'field',
    },
    layer: 'heatmap-with-trajectories',
    camera: 'front-oblique',
  },
] as const;

function resolveInterval(
  preset: ComparisonPresetDefinition,
  interval: ComparisonPresetIntervalReference,
  sceneSlices: readonly Stkde3DSceneSlice[],
  slot: 'A' | 'B',
): ComparisonPresetInterval {
  if (!Number.isInteger(interval.sliceIndex) || interval.sliceIndex < 0 || interval.sliceIndex >= sceneSlices.length) {
    throw new ComparisonPresetResolutionError(
      'index-out-of-bounds',
      `Comparison preset ${preset.id} has an unavailable ${slot} slice index ${interval.sliceIndex}`,
    );
  }

  const slice = sceneSlices[interval.sliceIndex];
  if (!slice || slice.index !== interval.sliceIndex || slice.label !== interval.label) {
    throw new ComparisonPresetResolutionError(
      'label-mismatch',
      `Comparison preset ${preset.id} does not match the rendered ${slot} interval at index ${interval.sliceIndex}`,
    );
  }

  const sourceSliceIndex = slice.sourceSliceIndex ?? slice.index;
  if (
    sourceSliceIndex !== interval.sliceIndex
    || typeof slice.sourceSliceId !== 'string'
    || slice.sourceSliceId.length === 0
  ) {
    throw new ComparisonPresetResolutionError(
      'source-identity-mismatch',
      `Comparison preset ${preset.id} cannot prove the rendered source identity for interval ${slot}`,
    );
  }

  if (!Number.isFinite(slice.startEpoch) || !Number.isFinite(slice.endEpoch) || slice.endEpoch < slice.startEpoch) {
    throw new ComparisonPresetResolutionError(
      'invalid-interval',
      `Comparison preset ${preset.id} resolved an invalid ${slot} interval`,
    );
  }

  return {
    ...interval,
    startEpoch: slice.startEpoch,
    endEpoch: slice.endEpoch,
    sourceSliceId: slice.sourceSliceId,
  };
}

function toSelection(interval: ComparisonPresetInterval): ComparisonSelection {
  return {
    index: interval.sliceIndex,
    sourceSliceId: interval.sourceSliceId,
    sourceSliceIndex: interval.sliceIndex,
    startEpoch: interval.startEpoch,
    endEpoch: interval.endEpoch,
    label: interval.label,
  };
}

export function resolveComparisonPreset(
  preset: ComparisonPresetDefinition,
  datasetPresetId: string,
  sceneSlices: readonly Stkde3DSceneSlice[],
): ResolvedComparisonPresetResult {
  if (preset.datasetPresetId !== datasetPresetId) {
    throw new ComparisonPresetResolutionError(
      'dataset-mismatch',
      `Comparison preset ${preset.id} requires dataset ${preset.datasetPresetId}, received ${datasetPresetId}`,
    );
  }

  if (preset.intervalA.sliceIndex === preset.intervalB.sliceIndex) {
    throw new ComparisonPresetResolutionError(
      'duplicate-interval',
      `Comparison preset ${preset.id} must reference two distinct intervals`,
    );
  }

  const intervalA = resolveInterval(preset, preset.intervalA, sceneSlices, 'A');
  const intervalB = resolveInterval(preset, preset.intervalB, sceneSlices, 'B');
  if (intervalA.sourceSliceId === intervalB.sourceSliceId) {
    throw new ComparisonPresetResolutionError(
      'duplicate-interval',
      `Comparison preset ${preset.id} resolved duplicate source intervals`,
    );
  }

  return {
    preset: {
      ...preset,
      intervalA,
      intervalB,
    },
    selectionA: toSelection(intervalA),
    selectionB: toSelection(intervalB),
  };
}

export function getComparisonPreset(id: string): ComparisonPresetDefinition | undefined {
  return COMPARISON_PRESETS.find((preset) => preset.id === id);
}

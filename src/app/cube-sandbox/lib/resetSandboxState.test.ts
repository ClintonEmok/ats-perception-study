/* @vitest-environment node */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSandboxState } from './resetSandboxState';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useIntervalProposalStore } from '@/store/useIntervalProposalStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';

describe('resetSandboxState', () => {
  beforeEach(() => {
    useTimeStore.setState({ timeScaleMode: 'adaptive' });
    useAdaptiveStore.setState({
      warpFactor: 0.65,
      warpSource: 'slice-authored',
      densityScope: 'global',
    });
    useFilterStore.setState({
      selectedTypes: [1],
      selectedDistricts: [2],
      selectedTimeRange: [123, 456],
      selectedSpatialBounds: {
        minX: 0,
        maxX: 10,
        minZ: 0,
        maxZ: 10,
        minLat: 0,
        maxLat: 1,
        minLon: 0,
        maxLon: 1,
      },
    });
    useSliceStore.setState({
      slices: [
        {
          id: 'slice-a',
          type: 'range',
          time: 50,
          range: [20, 40],
          isLocked: false,
          isVisible: true,
        },
      ],
      activeSliceId: 'slice-a',
    });
    useWarpSliceStore.setState({
      slices: [
        {
          id: 'warp-a',
          label: 'Warp A',
          range: [10, 30],
          weight: 2,
          enabled: true,
          source: 'manual',
          warpProfileId: null,
        },
      ],
    });
    useWarpProposalStore.setState({
      proposals: [
        {
          id: 'proposal-constraint-a',
          label: 'Downtown candidate',
          constraintId: 'constraint-a',
          payload: {
            warpFactor: 0.62,
            range: [20, 45],
          },
          rationale: {
            summary: 'Candidate summary',
            densityConcentration: 81,
            hotspotCoverage: 67,
            confidenceBand: 'High',
            confidenceScore: 84,
          },
          score: 75,
        },
      ],
      selectedProposalId: 'proposal-constraint-a',
      appliedProposalId: 'proposal-constraint-a',
      generation: {
        generatedAt: 123,
        sourceConstraintIds: ['constraint-a'],
      },
    });
    useIntervalProposalStore.setState({
      proposals: [
        {
          id: 'interval-constraint-a-burst-1',
          label: 'Downtown interval 20-45',
          constraintId: 'constraint-a',
          constraintLabel: 'Downtown cube',
          range: [20, 45],
          sourceProposalId: 'interval-constraint-a-burst-1',
          sourceRange: [20, 45],
          editedRange: null,
          isEdited: false,
          qualityState: 'valid',
          rationale: {
            summary: 'Interval summary',
            densityConcentration: 78,
            hotspotCoverage: 69,
            confidenceBand: 'High',
            confidenceScore: 83,
          },
          confidence: {
            band: 'High',
            score: 83,
          },
          quality: {
            densityConcentration: 78,
            hotspotCoverage: 69,
          },
          score: 80,
        },
      ],
      selectedProposalId: 'interval-constraint-a-burst-1',
      generation: {
        generatedAt: 456,
        sourceConstraintIds: ['constraint-a'],
      },
    });
    useCubeSpatialConstraintsStore.setState({
      constraints: [
        {
          id: 'constraint-a',
          label: 'Downtown cube',
          geometry: {
            shape: 'axis-aligned-cube',
            bounds: {
              minX: 0,
              maxX: 10,
              minY: 1,
              maxY: 6,
              minZ: 2,
              maxZ: 9,
            },
          },
          enabled: true,
          createdAt: 10,
          updatedAt: 10,
          colorToken: 'amber',
        },
        {
          id: 'constraint-b',
          label: 'Northwest cube',
          geometry: {
            shape: 'axis-aligned-cube',
            bounds: {
              minX: 12,
              maxX: 18,
              minY: 0,
              maxY: 4,
              minZ: 11,
              maxZ: 16,
            },
          },
          enabled: false,
          createdAt: 20,
          updatedAt: 20,
          colorToken: 'emerald',
        },
      ],
      activeConstraintId: 'constraint-a',
    });
  });

  test('restores uniform mode, clears filters, and empties slice state', async () => {
    const loadRealData = vi.fn(async () => {});
    useTimelineDataStore.setState({ loadRealData });

    await resetSandboxState();

    expect(useTimeStore.getState().timeScaleMode).toBe('linear');
    expect(useAdaptiveStore.getState().warpFactor).toBe(0);
    expect(useAdaptiveStore.getState().warpSource).toBe('density');

    const filterState = useFilterStore.getState();
    expect(filterState.selectedTypes).toEqual([]);
    expect(filterState.selectedDistricts).toEqual([]);
    expect(filterState.selectedTimeRange).toBeNull();
    expect(filterState.selectedSpatialBounds).toBeNull();

    expect(useSliceStore.getState().slices).toEqual([]);
    expect(useSliceStore.getState().activeSliceId).toBeNull();
    expect(useWarpSliceStore.getState().slices).toEqual([]);

    const warpProposalState = useWarpProposalStore.getState();
    expect(warpProposalState.proposals).toEqual([]);
    expect(warpProposalState.selectedProposalId).toBeNull();
    expect(warpProposalState.appliedProposalId).toBeNull();
    expect(warpProposalState.generation.generatedAt).toBeNull();
    expect(warpProposalState.generation.sourceConstraintIds).toEqual([]);

    const intervalProposalState = useIntervalProposalStore.getState();
    expect(intervalProposalState.proposals).toEqual([]);
    expect(intervalProposalState.selectedProposalId).toBeNull();
    expect(intervalProposalState.generation.generatedAt).toBeNull();
    expect(intervalProposalState.generation.sourceConstraintIds).toEqual([]);

    const constraintState = useCubeSpatialConstraintsStore.getState();
    expect(constraintState.constraints).toHaveLength(2);
    expect(constraintState.constraints.map((constraint) => constraint.id)).toEqual([
      'constraint-a',
      'constraint-b',
    ]);
    expect(constraintState.constraints[0].enabled).toBe(true);
    expect(constraintState.constraints[1].enabled).toBe(false);
    expect(constraintState.activeConstraintId).toBeNull();

    constraintState.setActiveConstraint('constraint-b');
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe('constraint-b');

    expect(loadRealData).toHaveBeenCalledTimes(1);
  });
});

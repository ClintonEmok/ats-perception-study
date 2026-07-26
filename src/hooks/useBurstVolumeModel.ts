import { useMemo } from 'react';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { buildBurstVolumeModel, type BurstVolumeInput, type BurstVolumeModel } from '@/lib/stkde';

function buildBurstVolumeInputFromDashboardSelection(
  selectedBurstWindow: {
    id: string;
    start: number;
    end: number;
    peak: number;
    count: number;
    burstClass: string;
    burstScore: number;
    burstRationale: string;
  } | null | undefined,
  sliceResults: BurstVolumeInput['sliceResults'],
): BurstVolumeInput {
  if (!selectedBurstWindow) {
    return { burstWindow: null, sliceResults };
  }

  return {
    burstWindow: {
      id: selectedBurstWindow.id,
      startEpochSec: selectedBurstWindow.start,
      peakEpochSec: selectedBurstWindow.peak,
      endEpochSec: selectedBurstWindow.end,
      count: selectedBurstWindow.count,
      burstScore: selectedBurstWindow.burstScore,
      burstClass: selectedBurstWindow.burstClass,
      label: selectedBurstWindow.burstRationale,
    },
    sliceResults,
    label: selectedBurstWindow.burstRationale,
  };
}

export function buildBurstVolumeModelFromDashboardState(
  selectedBurstWindow: Parameters<typeof buildBurstVolumeInputFromDashboardSelection>[0],
  sliceResults: BurstVolumeInput['sliceResults'],
): BurstVolumeModel {
  return buildBurstVolumeModel(buildBurstVolumeInputFromDashboardSelection(selectedBurstWindow, sliceResults));
}

export function useBurstVolumeModel(): BurstVolumeModel {
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const stkdeResponse = useDashboardDemoCoordinationStore((state) => state.stkdeResponse);

  return useMemo(() => {
    return buildBurstVolumeModelFromDashboardState(selectedBurstWindows[0] ?? null, stkdeResponse?.sliceResults);
  }, [selectedBurstWindows, stkdeResponse]);
}

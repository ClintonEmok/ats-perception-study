"use client";

import { useCallback, useEffect, useMemo } from "react";
import { SliceToolbar } from "@/app/timeline-test/components/SliceToolbar";
import { WarpSliceEditor } from "@/app/timeline-test/components/WarpSliceEditor";
import { planFullAutoAcceptanceArtifacts } from "@/app/timeslicing/full-auto-acceptance";
import { SuggestionPanel } from "./components/SuggestionPanel";
import { SuggestionToolbar } from "@/app/timeslicing/components/SuggestionToolbar";
import { DualTimeline } from "@/components/timeline/DualTimeline";
import { BurstList } from "@/components/viz/BurstList";
import { useCrimeData } from "@/hooks/useCrimeData";
import { useViewportStore } from "@/lib/stores/viewportStore";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useTimelineDataStore } from "@/store/useTimelineDataStore";
import { useFilterStore } from "@/store/useFilterStore";
import { useSliceStore } from "@/store/useSliceStore";
import { useSuggestionStore } from "@/store/useSuggestionStore";
import { useSuggestionHistoryStore } from "@/store/useSuggestionHistoryStore";
import type { IntervalBoundaryData, TimeScaleData } from "@/types/suggestion";
import { useTimeStore } from "@/store/useTimeStore";
import { useWarpSliceStore } from "@/store/useWarpSliceStore";
import {
  buildSliceAuthoredWarpMap,
} from "./lib/route-orchestration";
import { TimelineTest3DScene } from "./components/TimelineTest3DScene";

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;
const MIN_VALID_DATA_EPOCH = 946684800;

export default function TimelineTest3DPage() {
  const mapDomain = useAdaptiveStore((state) => state.mapDomain) ?? [0, 100];
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const warpSlices = useWarpSliceStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const addSlice = useSliceStore((state) => state.addSlice);
  const clearSlices = useSliceStore((state) => state.clearSlices);
  const addWarpSlice = useWarpSliceStore((state) => state.addSlice);
  const clearWarpSlices = useWarpSliceStore((state) => state.clearSlices);
  const setActiveWarp = useWarpSliceStore((state) => state.setActiveWarp);
  const fullAutoProposalSets = useSuggestionStore((state) => state.fullAutoProposalSets);
  const selectedFullAutoSetId = useSuggestionStore(
    (state) => state.selectedFullAutoSetId
  );
  const fullAutoNoResultReason = useSuggestionStore(
    (state) => state.fullAutoNoResultReason
  );
  const addToHistory = useSuggestionHistoryStore((state) => state.addToHistory);

  const hasValidAdaptiveDomain =
    mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;

  const domainStartSec = hasValidAdaptiveDomain
    ? mapDomain[0]
    : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain
    ? mapDomain[1]
    : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const { data: crimes, meta: crimeMeta, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  useEffect(() => {
    if (!crimes || crimes.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    const timestamps = new Float32Array(crimes.length);
    const points = crimes.map((crime, index) => {
      minX = Math.min(minX, crime.x);
      maxX = Math.max(maxX, crime.x);
      minZ = Math.min(minZ, crime.z);
      maxZ = Math.max(maxZ, crime.z);
      timestamps[index] = crime.timestamp;

      return {
        id: `${crime.timestamp}-${index}`,
        timestamp: crime.timestamp,
        x: crime.x,
        y: 0,
        z: crime.z,
        type: crime.type,
      };
    });

    useTimelineDataStore.setState({
      data: points,
      columns: null,
      minTimestampSec: domainStartSec,
      maxTimestampSec: domainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore
      .getState()
      .computeMaps(timestamps, [domainStartSec, domainEndSec]);
  }, [crimes, domainEndSec, domainStartSec]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    const returned = crimeMeta?.returned ?? crimes.length;
    const total = crimeMeta?.totalMatches ?? returned;
    if (total === 0) return "No data";
    return `${total.toLocaleString()} crimes`;
  }, [crimeMeta, crimes.length, isLoading]);

  const [selectionStart, selectionEnd] = useMemo<[number, number]>(() => {
    if (
      selectedTimeRange &&
      Number.isFinite(selectedTimeRange[0]) &&
      Number.isFinite(selectedTimeRange[1])
    ) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (end > start) {
        return [start, end];
      }
    }
    const fallbackStart = Math.min(viewportStart, viewportEnd);
    const fallbackEnd = Math.max(viewportStart, viewportEnd);
    return fallbackEnd > fallbackStart
      ? [fallbackStart, fallbackEnd]
      : [domainStartSec, domainEndSec];
  }, [domainEndSec, domainStartSec, selectedTimeRange, viewportEnd, viewportStart]);

  const authoredWarpMap = useMemo(() => {
    if (timeScaleMode !== "adaptive" || warpSource !== "slice-authored") {
      return null;
    }

    return buildSliceAuthoredWarpMap(
      warpSlices,
      [domainStartSec, domainEndSec],
      Math.max(96, densityMap?.length || 0)
    );
  }, [
    densityMap?.length,
    domainEndSec,
    domainStartSec,
    timeScaleMode,
    warpSlices,
    warpSource,
  ]);

  const handleAcceptWarpProfile = useCallback(
    (suggestionId: string, data: TimeScaleData) => {
      clearWarpSlices();
      setActiveWarp(suggestionId);

      data.intervals.forEach((interval, index) => {
        addWarpSlice({
          label: `${data.name} ${index + 1}`,
          range: [interval.startPercent, interval.endPercent],
          weight: interval.strength,
          enabled: true,
          source: "suggestion",
          warpProfileId: suggestionId,
        });
      });

      useTimeStore.getState().setTimeScaleMode("adaptive");
      useAdaptiveStore.getState().setWarpFactor(1);
    },
    [addWarpSlice, clearWarpSlices, setActiveWarp]
  );

  const handleAcceptIntervalBoundary = useCallback(
    (data: IntervalBoundaryData) => {
      if (data.boundaries.length < 2 || selectionEnd <= selectionStart) return;

      const sorted = [...data.boundaries].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const startEpoch = sorted[i];
        const endEpoch = sorted[i + 1];
        const startPercent =
          ((startEpoch - selectionStart) / (selectionEnd - selectionStart)) * 100;
        const endPercent =
          ((endEpoch - selectionStart) / (selectionEnd - selectionStart)) * 100;

        addSlice({
          name: `Interval ${i + 1}`,
          type: "range",
          range: [
            Math.max(0, Math.min(100, startPercent)),
            Math.max(0, Math.min(100, endPercent)),
          ],
          isLocked: false,
          isVisible: true,
        });
      }
    },
    [addSlice, selectionEnd, selectionStart]
  );

  const handleAcceptFullAutoPackage = useCallback(
    (proposalSetId?: string) => {
      if (fullAutoNoResultReason) return;

      const targetId = proposalSetId ?? selectedFullAutoSetId;
      if (!targetId) return;

      const proposalSet = fullAutoProposalSets.find((entry) => entry.id === targetId);
      if (!proposalSet || proposalSet.warp.intervals.length === 0) return;

      const previousWarpState = useWarpSliceStore.getState();
      const previousSliceState = useSliceStore.getState();

      try {
        clearWarpSlices();
        clearSlices();
        setActiveWarp(proposalSet.id);

        const artifactPlan = planFullAutoAcceptanceArtifacts(proposalSet);

        artifactPlan.warpIntervals.forEach((interval, index) => {
          addWarpSlice({
            label: `${proposalSet.warp.name} ${index + 1}`,
            range: [interval.startPercent, interval.endPercent],
            weight: interval.strength,
            enabled: true,
            source: "suggestion",
            warpProfileId: proposalSet.id,
          });
        });

        useTimeStore.getState().setTimeScaleMode("adaptive");
        useAdaptiveStore.getState().setWarpFactor(1);

        if (artifactPlan.intervalBoundaries) {
          handleAcceptIntervalBoundary({
            boundaries: artifactPlan.intervalBoundaries,
          });
        }

        const acceptedAt = Date.now();
        addToHistory({
          id: `full-auto-package-${proposalSet.id}-warp-${acceptedAt}`,
          suggestion: {
            id: `full-auto-package-${proposalSet.id}-warp-${acceptedAt}`,
            type: "time-scale",
            confidence: proposalSet.confidence,
            data: {
              name: `${proposalSet.warp.name} (Package Rank ${proposalSet.rank})`,
              intervals: proposalSet.warp.intervals,
            },
            createdAt: acceptedAt,
            status: "accepted",
          },
          acceptedAt,
        });
      } catch {
        useWarpSliceStore.setState({
          slices: previousWarpState.slices,
          activeWarpId: previousWarpState.activeWarpId,
        });
        useSliceStore.setState({
          slices: previousSliceState.slices,
          activeSliceId: previousSliceState.activeSliceId,
          activeSliceUpdatedAt: previousSliceState.activeSliceUpdatedAt,
        });
      }
    },
    [
      addToHistory,
      addWarpSlice,
      clearSlices,
      clearWarpSlices,
      fullAutoNoResultReason,
      fullAutoProposalSets,
      handleAcceptIntervalBoundary,
      selectedFullAutoSetId,
      setActiveWarp,
    ]
  );

  useEffect(() => {
    const handleWarpEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; data: TimeScaleData }>;
      handleAcceptWarpProfile(customEvent.detail.id, customEvent.detail.data);
    };

    const handleIntervalEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ data: IntervalBoundaryData }>;
      handleAcceptIntervalBoundary(customEvent.detail.data);
    };

    const handleFullAutoPackageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ proposalSetId?: string }>;
      handleAcceptFullAutoPackage(customEvent.detail?.proposalSetId);
    };

    window.addEventListener("accept-time-scale", handleWarpEvent);
    window.addEventListener("accept-interval-boundary", handleIntervalEvent);
    window.addEventListener("accept-full-auto-package", handleFullAutoPackageEvent);

    return () => {
      window.removeEventListener("accept-time-scale", handleWarpEvent);
      window.removeEventListener("accept-interval-boundary", handleIntervalEvent);
      window.removeEventListener(
        "accept-full-auto-package",
        handleFullAutoPackageEvent
      );
    };
  }, [
    handleAcceptFullAutoPackage,
    handleAcceptIntervalBoundary,
    handleAcceptWarpProfile,
  ]);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timeline Test 3D</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dedicated 3D route foundation with route-local orchestration helpers.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card/65 p-5 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-6">
            <span>
              Data: <strong className="text-foreground">{dataSummaryLabel}</strong>
            </span>
            <span>
              Range:{" "}
              <strong className="text-foreground">
                {new Date(domainStartSec * 1000).toLocaleDateString()} -{" "}
                {new Date(domainEndSec * 1000).toLocaleDateString()}
              </strong>
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <SuggestionToolbar />
            <SuggestionPanel />
            <SliceToolbar />
            <WarpSliceEditor />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-background/60 p-3">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Loading crime data...
              </div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center text-red-400">
                Error loading data: {error.message}
              </div>
            ) : (
              <>
                <DualTimeline
                  adaptiveWarpMapOverride={
                    warpSource === "slice-authored" ? authoredWarpMap : undefined
                  }
                  adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
                  detailRangeOverride={[selectionStart, selectionEnd]}
                  disableAutoBurstSlices={true}
                  tickLabelStrategy="span-aware"
                />
                <BurstList />
              </>
            )}
          </div>
          <TimelineTest3DScene />
        </section>
      </div>
    </main>
  );
}

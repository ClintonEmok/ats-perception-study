"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DEMO_PRESETS,
  DEMO_PRESET_ORDER,
  type DemoPreset,
  type DemoPresetId,
} from '@/lib/demo/preset-windows';
import {
  CASE_STUDY_PRESETS,
  CASE_STUDY_SLICE_COUNT,
  buildCaseStudySliceRanges,
  getCaseStudyPreset,
  type CaseStudyPresetId,
} from '@/lib/demo/case-study-presets';
import { applyDemoPreset } from '@/components/dashboard-demo/lib/applyDemoPreset';
import { applyDashboardCaseStudy } from '@/components/dashboard-demo/lib/applyDashboardCaseStudy';
import { fetchCrimeRecordsForPartitions } from '@/components/dashboard-demo/lib/fetchCrimeRecordsForRange';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

const TOOLTIP_NO_DATA = 'Load data first';
const SELECT_PLACEHOLDER = 'Demo presets';
const NONE_VALUE = '__demo_preset_none__';
type DashboardPresetId = DemoPresetId | CaseStudyPresetId;

interface PresetGroup {
  label: string;
  ids: readonly DemoPresetId[];
}

const PRESET_GROUPS: ReadonlyArray<PresetGroup> = [
  { label: 'Reset', ids: ['reset'] },
  { label: 'Study tasks', ids: ['T4', 'T1u', 'T1a', 'T2u', 'T2a', 'T3a', 'T3b', 'T8u', 'T8a'] },
];

/**
 * Demo presets for the final dashboard route.
 *
 * Selecting a preset updates the entire time-window surface — filter store
 * (epoch), coordination brush range (normalized), demo time store
 * (normalized), and time scale mode — through the `applyDemoPreset` action
 * helper. The helper also clamps `currentTime` to the new range and warms
 * `warpFactor` for adaptive presets (same convention as
 * `GlobalWarpControls`).
 */
export function DemoPresetSelect({ onCaseStudyApplied }: { onCaseStudyApplied?: () => void } = {}) {
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const isLoading = useTimelineDataStore((state) => state.isLoading);
  const dataCount = useTimelineDataStore((state) => state.dataCount);

  const setFilterTimeRange = useDashboardDemoFilterStore((state) => state.setTimeRange);
  const setBrushRange = useDashboardDemoCoordinationStore((state) => state.setBrushRange);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const setDemoTimeRange = useDashboardDemoTimeStore((state) => state.setRange);
  const setDemoTime = useDashboardDemoTimeStore((state) => state.setTime);
  const setCoordinationTimeRange = useDashboardDemoCoordinationStore((state) => state.setTimeRange);
  const setCoordinationTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const setDemoTimeScaleMode = useDashboardDemoTimeStore((state) => state.setTimeScaleMode);
  const setStkdeScopeMode = useDashboardDemoCoordinationStore((state) => state.setStkdeScopeMode);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const clearComparisonSlices = useDashboardDemoCoordinationStore((state) => state.clearComparisonSlices);
  const currentTime = useDashboardDemoTimeStore((state) => state.currentTime);

  const [activePresetId, setActivePresetId] = useState<DashboardPresetId | null>(null);
  const [isApplyingCaseStudy, setIsApplyingCaseStudy] = useState(false);
  const caseStudyRequestRef = useRef(0);

  const hasData = !isLoading && (dataCount ?? 0) > 0;
  const disabled = !hasData || isApplyingCaseStudy;
  const visiblePresetId = hasData ? activePresetId : null;

  const groupedPresets = useMemo(
    () =>
      PRESET_GROUPS.map((group) => ({
        label: group.label,
        presets: group.ids
          .map((id) => DEMO_PRESETS[id])
          .filter((preset): preset is DemoPreset => preset !== undefined),
      })),
    [],
  );

  const handleSelect = useCallback(
    async (presetId: string) => {
      if (presetId === NONE_VALUE) {
        setActivePresetId(null);
        return;
      }

      const caseStudyPreset = getCaseStudyPreset(presetId);
      if (caseStudyPreset) {
        const requestId = caseStudyRequestRef.current + 1;
        caseStudyRequestRef.current = requestId;
        setIsApplyingCaseStudy(true);

        try {
          const partitions = buildCaseStudySliceRanges(caseStudyPreset, CASE_STUDY_SLICE_COUNT).map((range) => ({
            startTime: range.startEpoch * 1000,
            endTime: range.endEpoch * 1000,
          }));
          const fetched = await fetchCrimeRecordsForPartitions(
            { crimeTypes: [], neighbourhood: null },
            partitions,
            caseStudyPreset.limit,
          );

          if (requestId !== caseStudyRequestRef.current) return;

          const result = applyDashboardCaseStudy({
            preset: caseStudyPreset,
            minTimestampSec,
            maxTimestampSec,
            currentTime,
            eventTimestamps: fetched.records.map((crime) => crime.timestamp * 1000),
            eventTypes: fetched.records.map((crime) => crime.type),
            actions: {
              setFilterTimeRange,
              setCoordinationTimeRange,
              setBrushRange,
              setDemoTimeRange,
              setDemoTime,
              setCoordinationTimeScaleMode,
              setDemoTimeScaleMode,
              setStkdeScopeMode,
              clearPendingGeneratedBins: () => useDashboardDemoTimeslicingModeStore.getState().clearPendingGeneratedBins(),
              setPendingGeneratedBins: (bins, metadata) => useDashboardDemoTimeslicingModeStore.getState().setPendingGeneratedBins(bins, metadata),
              applyGeneratedBins: (domain, options) => useDashboardDemoTimeslicingModeStore.getState().applyGeneratedBins(domain, options),
              setActiveSliceIndex,
              clearComparisonSlices,
              setScreenshotReadyState: () => onCaseStudyApplied?.(),
            },
          });

          if (!result.ok) {
            toast.error(`Cannot load ${caseStudyPreset.label}`, {
              description: 'Timeline bounds unavailable. Wait for data to finish loading.',
            });
            return;
          }

          setActivePresetId(caseStudyPreset.id);
          toast.success(`Loaded ${caseStudyPreset.label}`, {
            description: `${caseStudyPreset.rangeLabel} · ${caseStudyPreset.screenshotMode} · ${result.bins.length} applied slices`,
          });
          if (fetched.sampled) {
            toast.warning('Case study uses sampled crime data', {
              description: 'One or more API responses were sampled; counts and burstiness may be truncated.',
            });
          }
        } catch (error) {
          if (requestId !== caseStudyRequestRef.current) return;
          toast.error(`Cannot load ${caseStudyPreset.label}`, {
            description: error instanceof Error ? error.message : 'Crime data could not be loaded for the case study.',
          });
        } finally {
          if (requestId === caseStudyRequestRef.current) {
            setIsApplyingCaseStudy(false);
          }
        }
        return;
      }

      const preset = DEMO_PRESETS[presetId as DemoPresetId];
      if (!preset) return;

      const result = applyDemoPreset({
        preset,
        minTimestampSec,
        maxTimestampSec,
        currentTime,
        actions: {
          setFilterTimeRange,
          setBrushRange,
          setDemoTimeRange,
          setDemoTime,
          setTimeScaleMode,
          setDemoTimeScaleMode,
        },
      });

      if (!result.ok) {
        if (preset.timeRange === null) {
          // Reset should always succeed; bail silently if not.
          setActivePresetId(null);
          return;
        }
        toast.error(`Cannot load ${preset.id}`, {
          description:
            result.reason === 'no-data-bounds'
              ? 'Timeline bounds unavailable. Wait for data to finish loading.'
              : 'Preset dates failed to parse. Pick a different preset.',
        });
        return;
      }

      if (preset.timeRange === null) {
        setActivePresetId(null);
        toast.success(`Loaded ${preset.id}: ${preset.chip}`, {
          description: 'Full data range · linear scale',
        });
        return;
      }

      setActivePresetId(preset.id);
      toast.success(`Loaded ${preset.id}: ${preset.chip}`, {
        description: `${preset.timeRange[0]} → ${preset.timeRange[1]} · ${preset.mode}`,
      });
    },
    [
      currentTime,
      maxTimestampSec,
      minTimestampSec,
      setBrushRange,
      setDemoTime,
      setDemoTimeRange,
      setFilterTimeRange,
      setTimeScaleMode,
      setCoordinationTimeRange,
      setCoordinationTimeScaleMode,
      setDemoTimeScaleMode,
      setStkdeScopeMode,
      setActiveSliceIndex,
      clearComparisonSlices,
      onCaseStudyApplied,
    ],
  );

  const trigger = (
    <Select onValueChange={handleSelect} value={activePresetId ?? NONE_VALUE} disabled={disabled}>
      <SelectTrigger
        size="sm"
        data-testid="demo-preset-select-trigger"
        className="h-8 min-w-[160px] rounded-full border bg-background/70 px-3 text-xs text-muted-foreground hover:bg-muted"
        aria-label="Demo presets"
      >
        <SelectValue placeholder={SELECT_PLACEHOLDER} />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[280px]">
        {groupedPresets.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.presets.map((preset) => (
              <SelectItem
                key={preset.id}
                value={preset.id}
                data-testid={`demo-preset-option-${preset.id}`}
              >
                <span className="flex items-center gap-2">
                  <span>{preset.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {preset.chip}
                  </span>
                </span>
              </SelectItem>
            ))}
           </SelectGroup>
         ))}
         <SelectGroup>
           <SelectLabel>Case studies</SelectLabel>
           {CASE_STUDY_PRESETS.map((preset) => (
             <SelectItem
               key={preset.id}
               value={preset.id}
               data-testid={`demo-preset-option-${preset.id}`}
             >
               <span className="flex items-center gap-2">
                 <span>{preset.label}</span>
                 <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                   {preset.rangeLabel}
                 </span>
               </span>
             </SelectItem>
           ))}
         </SelectGroup>
       </SelectContent>
    </Select>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2" data-testid="demo-preset-select">
        {disabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                {trigger}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{TOOLTIP_NO_DATA}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
        {visiblePresetId !== null ? (
          <Badge
            variant="secondary"
            data-testid="demo-preset-chip"
            className="font-mono text-[10px]"
          >
             {getCaseStudyPreset(visiblePresetId)?.label ?? DEMO_PRESETS[visiblePresetId as DemoPresetId]?.chip ?? visiblePresetId}
          </Badge>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export { DEMO_PRESET_ORDER, DEMO_PRESETS };
export type { DemoPreset, DemoPresetId };

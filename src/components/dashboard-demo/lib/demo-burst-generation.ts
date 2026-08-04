import { buildBurstWindowsFromSeries, type BurstWindow } from '@/components/viz/BurstList';
import { BURST_TAXONOMY_RULE_VERSION } from '@/lib/binning/burst-taxonomy';
import type { TimeBin } from '@/lib/binning/types';

export interface BurstDraftGenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface BurstDraftGenerationResult {
  bins: TimeBin[];
  eventCount: number;
  warning: string | null;
}

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const isValidNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasOverlap = (left: [number, number], right: [number, number]): boolean => left[0] < right[1] && right[0] < left[1];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export type DemoSelectionGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface DemoSelectionPartition {
  startTime: number;
  endTime: number;
}

export interface NonUniformDraftGenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: DemoSelectionGranularity;
  /** Optional authoritative partitions, used when a caller owns fixed boundaries. */
  partitions?: DemoSelectionPartition[];
  eventTimestamps?: number[];
  eventTypes?: string[];
}

const getGranularityStepMs = (granularity: Exclude<DemoSelectionGranularity, 'monthly' | 'quarterly'>): number => {
  switch (granularity) {
    case 'hourly':
      return HOUR_MS;
    case 'weekly':
      return WEEK_MS;
    case 'daily':
    default:
      return DAY_MS;
  }
};

const getMonthlyPartitionEnd = (cursor: number): number => {
  const current = new Date(cursor);
  const nextMonthStart = new Date(current.getFullYear(), current.getMonth() + 1, 1).getTime();
  return Number.isFinite(nextMonthStart) && nextMonthStart > cursor ? nextMonthStart : cursor + DAY_MS;
};

const getQuarterlyPartitionEnd = (cursor: number): number => {
  const current = new Date(cursor);
  const currentQuarterStartMonth = Math.floor(current.getMonth() / 3) * 3;
  const nextQuarterStart = new Date(current.getFullYear(), currentQuarterStartMonth + 3, 1).getTime();
  return Number.isFinite(nextQuarterStart) && nextQuarterStart > cursor ? nextQuarterStart : cursor + (3 * DAY_MS);
};

const getPartitionEnd = (cursor: number, end: number, granularity: DemoSelectionGranularity): number => {
  if (granularity === 'monthly') {
    return Math.min(end, getMonthlyPartitionEnd(cursor));
  }

  if (granularity === 'quarterly') {
    return Math.min(end, getQuarterlyPartitionEnd(cursor));
  }

  return Math.min(end, cursor + getGranularityStepMs(granularity));
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const NEUTRAL_COEFFICIENT_EPSILON = 0.03;

export const partitionSelectionByGranularity = (
  selectionRange: [number, number],
  granularity: DemoSelectionGranularity,
): DemoSelectionPartition[] => {
  const [start, end] = normalizeRange(selectionRange[0], selectionRange[1]);
  if (!isValidNumber(start) || !isValidNumber(end) || end <= start) {
    return [];
  }

  const partitions: DemoSelectionPartition[] = [];
  let cursor = start;

  while (cursor < end) {
    const nextEnd = getPartitionEnd(cursor, end, granularity);
    partitions.push({
      startTime: cursor,
      endTime: nextEnd,
    });
    cursor = nextEnd;
  }

  return partitions;
};

const resolveExplicitPartitions = (
  selectionRange: [number, number],
  partitions: DemoSelectionPartition[],
): DemoSelectionPartition[] | null => {
  if (partitions.length === 0) {
    return null;
  }

  const [selectionStart, selectionEnd] = selectionRange;
  let previousEnd = selectionStart;

  for (const partition of partitions) {
    if (
      !isValidNumber(partition.startTime)
      || !isValidNumber(partition.endTime)
      || partition.endTime <= partition.startTime
      || partition.startTime !== previousEnd
    ) {
      return null;
    }

    previousEnd = partition.endTime;
  }

  return previousEnd === selectionEnd ? partitions : null;
};

export const recommendGranularityForSelection = (
  timeWindow: { start: number | null; end: number | null } | null | undefined
): DemoSelectionGranularity => {
  const start = timeWindow?.start;
  const end = timeWindow?.end;

  if (!isValidNumber(start) || !isValidNumber(end) || end <= start) {
    return 'daily';
  }

  const durationMs = Math.abs(end - start);

  if (durationMs <= 14 * DAY_MS) {
    return 'hourly';
  }

  if (durationMs <= 90 * DAY_MS) {
    return 'daily';
  }

  if (durationMs <= 365 * DAY_MS) {
    return 'monthly';
  }

  return 'quarterly';
};

const filterAndSortEventsWithinSelection = (events: TimedEvent[], selectionRange: [number, number]): TimedEvent[] => {
  const [selectionStart, selectionEnd] = selectionRange;
  const sortedEvents = [...events]
    .filter((event) => isValidNumber(event.time) && event.time >= selectionStart && event.time <= selectionEnd)
    .sort((left, right) => left.time - right.time);

  return sortedEvents;
};

const BURSTINESS_FORMULA = 'B = (σ - μ) / (σ + μ)';

const normalizeTypeFilters = (crimeTypes: string[]): Set<string> =>
  new Set(
    crimeTypes
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.length > 0 && type !== 'all-crime-types')
  );

const normalizeEventType = (type: string | undefined | null): string => String(type ?? 'Unknown').trim();

const formatInterval = (milliseconds: number): string => {
  if (milliseconds >= DAY_MS) {
    return `${roundToTwoDecimals(milliseconds / DAY_MS)}d`;
  }

  if (milliseconds >= HOUR_MS) {
    return `${roundToTwoDecimals(milliseconds / HOUR_MS)}h`;
  }

  if (milliseconds >= 60 * 1000) {
    return `${roundToTwoDecimals(milliseconds / (60 * 1000))}m`;
  }

  return `${roundToTwoDecimals(milliseconds / 1000)}s`;
};

const calculateMean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

interface PartitionBurstinessAnalysis {
  coefficient: number;
  normalizedScore: number;
  formula: string;
  calculation: string;
  intervals: number[];
  byType: Array<{
    type: string;
    count: number;
    coefficient: number;
    normalizedScore: number;
    formula: string;
    calculation: string;
  }>;
}

interface TimedEvent {
  time: number;
  type: string;
}

const calculateBurstinessFromTimes = (eventTimes: number[]): Omit<PartitionBurstinessAnalysis, 'byType'> => {
  if (eventTimes.length < 2) {
    return {
      coefficient: 0,
      normalizedScore: 50,
      formula: BURSTINESS_FORMULA,
      calculation: 'fewer than 2 events -> no inter-event intervals; B = 0',
      intervals: [],
    };
  }

  const intervals = eventTimes.slice(1).map((eventTime, index) => eventTime - eventTimes[index]);
  const mean = calculateMean(intervals);
  const standardDeviation = calculateStandardDeviation(intervals, mean);
  const denominator = standardDeviation + mean;
  const coefficient = denominator === 0 ? 0 : (standardDeviation - mean) / denominator;
  const normalizedScore = Math.round(((coefficient + 1) / 2) * 100);
  const formattedMean = formatInterval(mean);
  const formattedStdDev = formatInterval(standardDeviation);

  return {
    coefficient,
    normalizedScore,
    formula: BURSTINESS_FORMULA,
    calculation: `intervals=[${intervals.map(formatInterval).join(', ')}], μ=${formattedMean}, σ=${formattedStdDev} -> B = (${formattedStdDev} - ${formattedMean}) / (${formattedStdDev} + ${formattedMean}) = ${coefficient.toFixed(2)}`,
    intervals,
  };
};

const calculatePartitionBurstiness = (events: TimedEvent[]): PartitionBurstinessAnalysis => {
  const byType = Array.from(
    events.reduce((map, event) => {
      const key = normalizeEventType(event.type);
      const next = map.get(key) ?? [];
      next.push(event.time);
      map.set(key, next);
      return map;
    }, new Map<string, number[]>())
  ).map(([type, typeEventTimes]) => {
    const typeAnalysis = calculateBurstinessFromTimes(typeEventTimes.slice().sort((left, right) => left - right));
    return {
      type,
      count: typeEventTimes.length,
      coefficient: typeAnalysis.coefficient,
      normalizedScore: typeAnalysis.normalizedScore,
      formula: typeAnalysis.formula,
      calculation: typeAnalysis.calculation,
    };
  });

  const overallAnalysis = calculateBurstinessFromTimes(events.map((event) => event.time));

  return {
    ...overallAnalysis,
    byType,
  };
};

const groupEventsByPartition = (
  events: TimedEvent[],
  partitions: DemoSelectionPartition[],
): TimedEvent[][] => {
  const groupedEvents = partitions.map(() => [] as TimedEvent[]);
  let partitionIndex = 0;

  events.forEach((eventTime) => {
    while (partitionIndex < partitions.length - 1 && eventTime.time >= partitions[partitionIndex].endTime) {
      partitionIndex += 1;
    }

    const partition = partitions[partitionIndex];
    if (!partition) {
      return;
    }

    const isLastPartition = partitionIndex === partitions.length - 1;
    const withinPartition = eventTime.time >= partition.startTime && (isLastPartition ? eventTime.time <= partition.endTime : eventTime.time < partition.endTime);
    if (withinPartition) {
      groupedEvents[partitionIndex].push(eventTime);
    }
  });

  return groupedEvents;
};

const buildNeutralPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  events: TimedEvent[],
  analysis: PartitionBurstinessAnalysis,
): TimeBin => ({
  id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
  startTime: partition.startTime,
  endTime: partition.endTime,
  count: events.length,
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: (partition.startTime + partition.endTime) / 2,
  warpWeight: 1,
  burstClass: 'neutral',
  burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
  burstScore: analysis.normalizedScore,
  burstinessCoefficient: analysis.coefficient,
  burstinessFormula: analysis.formula,
  burstinessCalculation: analysis.calculation,
  burstinessByType: analysis.byType,
  burstConfidence: 0,
  burstProvenance: analysis.intervals.length > 0 ? `intervals=${analysis.intervals.length}; coefficient=${analysis.coefficient.toFixed(2)}` : 'neutral-partition',
  tieBreakReason: 'no bin stands out; keep the brushed selection evenly partitioned',
  thresholdSource: `granularity:${generationInputs.granularity}`,
  neighborhoodSummary: `count=${events.length}; partition=${index + 1}`,
  isNeutralPartition: true,
});

const buildBurstPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  events: TimedEvent[],
  analysis: PartitionBurstinessAnalysis,
  maxCoefficient: number,
  secondMaxCoefficient: number,
  averageCoefficient: number,
): TimeBin => {
  const coefficient = analysis.coefficient;

  return {
    id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
    startTime: partition.startTime,
    endTime: partition.endTime,
    count: events.length,
    crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
    districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
    avgTimestamp: (partition.startTime + partition.endTime) / 2,
    warpWeight: roundToTwoDecimals(1 + Math.max(0, coefficient)),
    burstClass: coefficient === maxCoefficient && coefficient > secondMaxCoefficient ? 'isolated-spike' : 'prolonged-peak',
    burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
    burstScore: analysis.normalizedScore,
    burstinessCoefficient: coefficient,
    burstinessFormula: analysis.formula,
    burstinessCalculation: analysis.calculation,
    burstinessByType: analysis.byType,
    burstConfidence: Math.round(clamp01(Math.abs(coefficient)) * 100),
    burstProvenance: `coefficient=${coefficient.toFixed(2)}; avgCoefficient=${averageCoefficient.toFixed(2)}`,
    tieBreakReason: coefficient === maxCoefficient
      ? 'highest burstiness coefficient gets the warp lead'
      : 'lower burstiness stays near-neutral',
    thresholdSource: `granularity:${generationInputs.granularity}; contrast:${Math.round(Math.max(0, coefficient - secondMaxCoefficient) * 100)}%`,
    neighborhoodSummary: `count=${events.length}; partition=${index + 1}; coefficient=${coefficient.toFixed(2)}`,
  };
};

const buildValleyPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  events: TimedEvent[],
  analysis: PartitionBurstinessAnalysis,
  minCoefficient: number,
  secondMinCoefficient: number,
  averageCoefficient: number,
): TimeBin => {
  const coefficient = analysis.coefficient;

  return {
    id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
    startTime: partition.startTime,
    endTime: partition.endTime,
    count: events.length,
    crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
    districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
    avgTimestamp: (partition.startTime + partition.endTime) / 2,
    warpWeight: roundToTwoDecimals(Math.max(0.75, 1 + coefficient * 0.25)),
    burstClass: 'valley',
    burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
    burstScore: analysis.normalizedScore,
    burstinessCoefficient: coefficient,
    burstinessFormula: analysis.formula,
    burstinessCalculation: analysis.calculation,
    burstinessByType: analysis.byType,
    burstConfidence: Math.round(clamp01(Math.abs(coefficient)) * 100),
    burstProvenance: `coefficient=${coefficient.toFixed(2)}; avgCoefficient=${averageCoefficient.toFixed(2)}`,
    tieBreakReason: coefficient === minCoefficient
      ? 'lowest burstiness coefficient gets the valley lead'
      : 'lower burstiness stays in valley form',
    thresholdSource: `granularity:${generationInputs.granularity}; contrast:${Math.round(Math.abs(coefficient - secondMinCoefficient) * 100)}%`,
    neighborhoodSummary: `count=${events.length}; partition=${index + 1}; coefficient=${coefficient.toFixed(2)}`,
  };
};

export const buildNonUniformDraftBinsFromSelection = (
  generationInputs: NonUniformDraftGenerationInputs,
): BurstDraftGenerationResult => {
  const activeStart = generationInputs.timeWindow.start;
  const activeEnd = generationInputs.timeWindow.end;

  if (!isValidNumber(activeStart) || !isValidNumber(activeEnd)) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst slices.',
    };
  }

  const activeSelection = normalizeRange(activeStart, activeEnd);
  if (activeSelection[1] <= activeSelection[0]) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst slices.',
    };
  }

  const partitions = generationInputs.partitions === undefined
    ? partitionSelectionByGranularity(activeSelection, generationInputs.granularity)
    : resolveExplicitPartitions(activeSelection, generationInputs.partitions);
  if (!partitions || partitions.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst slices.',
    };
  }

  const typeFilters = normalizeTypeFilters(generationInputs.crimeTypes);
  const events = filterAndSortEventsWithinSelection(
    (generationInputs.eventTimestamps ?? []).map((time, index) => ({
      time,
      type: normalizeEventType(generationInputs.eventTypes?.[index]),
    })),
    activeSelection,
  ).filter((event) => typeFilters.size === 0 || typeFilters.has(event.type.toLowerCase()));

  const groupedEvents = groupEventsByPartition(events, partitions);
  const analyses = groupedEvents.map(calculatePartitionBurstiness);
  const totalCount = groupedEvents.reduce((sum, partitionEvents) => sum + partitionEvents.length, 0);

  if (totalCount === 0) {
    return {
      bins: partitions.map((partition, index) => buildNeutralPartitionBin(
        partition,
        generationInputs,
        index,
        groupedEvents[index] ?? [],
        analyses[index] ?? calculatePartitionBurstiness([] as TimedEvent[]),
      )),
      eventCount: 0,
      warning: null,
    };
  }

  const coefficientValues = analyses.map((analysis) => analysis.coefficient);
  const positiveCoefficients = coefficientValues.filter((value) => value > NEUTRAL_COEFFICIENT_EPSILON);
  const negativeCoefficients = coefficientValues.filter((value) => value < -NEUTRAL_COEFFICIENT_EPSILON);
  const maxCoefficient = positiveCoefficients.length > 0 ? Math.max(...positiveCoefficients) : Math.max(...coefficientValues);
  const sortedPositiveCoefficients = [...positiveCoefficients].sort((left, right) => right - left);
  const secondMaxCoefficient = sortedPositiveCoefficients[1] ?? 0;
  const minCoefficient = negativeCoefficients.length > 0 ? Math.min(...negativeCoefficients) : Math.min(...coefficientValues);
  const sortedNegativeCoefficients = [...negativeCoefficients].sort((left, right) => left - right);
  const secondMinCoefficient = sortedNegativeCoefficients[1] ?? 0;
  const averageCoefficient = coefficientValues.reduce((sum, value) => sum + value, 0) / coefficientValues.length;
  const noMeaningfulSignal = coefficientValues.every((value) => Math.abs(value) <= NEUTRAL_COEFFICIENT_EPSILON);

  if (noMeaningfulSignal) {
    return {
      bins: partitions.map((partition, index) => buildNeutralPartitionBin(
        partition,
        generationInputs,
        index,
        groupedEvents[index] ?? [],
        analyses[index] ?? calculatePartitionBurstiness([] as TimedEvent[]),
      )),
      eventCount: totalCount,
      warning: null,
    };
  }

  return {
    bins: partitions.map((partition, index) => {
      const partitionEvents = groupedEvents[index] ?? [];
      const analysis = analyses[index] ?? calculatePartitionBurstiness(partitionEvents);
      const coefficient = analysis.coefficient;

      if (coefficient > NEUTRAL_COEFFICIENT_EPSILON) {
        if (coefficient === maxCoefficient && coefficient > secondMaxCoefficient) {
          return buildBurstPartitionBin(
            partition,
            generationInputs,
            index,
            partitionEvents,
            analysis,
            maxCoefficient,
            secondMaxCoefficient,
            averageCoefficient,
          );
        }

        return {
          ...buildNeutralPartitionBin(partition, generationInputs, index, partitionEvents, analysis),
          burstClass: 'prolonged-peak',
          warpWeight: roundToTwoDecimals(1 + coefficient),
          burstConfidence: Math.round(clamp01(Math.abs(coefficient)) * 100),
          tieBreakReason: 'positive burstiness stays in prolonged-peak form',
          thresholdSource: `granularity:${generationInputs.granularity}; contrast:${Math.round(Math.max(0, coefficient - secondMaxCoefficient) * 100)}%`,
        };
      }

      if (coefficient < -NEUTRAL_COEFFICIENT_EPSILON) {
        return buildValleyPartitionBin(
          partition,
          generationInputs,
          index,
          partitionEvents,
          analysis,
          minCoefficient,
          secondMinCoefficient,
          averageCoefficient,
        );
      }

      return {
        ...buildNeutralPartitionBin(partition, generationInputs, index, partitionEvents, analysis),
        warpWeight: roundToTwoDecimals(1 + Math.max(0, analysis.coefficient) * 0.25),
      };
    }),
    eventCount: totalCount,
    warning: null,
  };
};

export interface DemoBurstWindowSelectionInputs {
  densityMap: Float32Array | null;
  burstThreshold: number;
  mapDomain: [number, number];
  selectionRange?: [number, number] | null;
}

export const buildDemoBurstWindowsFromSelection = ({
  densityMap,
  burstThreshold,
  mapDomain,
  selectionRange,
}: DemoBurstWindowSelectionInputs): BurstWindow[] => {
  if (!densityMap || densityMap.length === 0) {
    return [];
  }

  if (!Number.isFinite(mapDomain[0]) || !Number.isFinite(mapDomain[1]) || mapDomain[1] <= mapDomain[0]) {
    return [];
  }

  if (!Number.isFinite(burstThreshold)) {
    return [];
  }

  return buildBurstWindowsFromSeries({
    densityMap,
    burstinessMap: null,
    countMap: null,
    burstMetric: 'density',
    burstThreshold: Math.max(0, Math.min(1, burstThreshold)),
    mapDomain,
    selectionRange,
  });
};

const buildDraftBin = (
  burstWindow: BurstWindow,
  startTimeSec: number,
  endTimeSec: number,
  generationInputs: BurstDraftGenerationInputs,
  index: number,
): TimeBin => ({
  id: `burst-draft-${burstWindow.id}-${index}`,
  startTime: startTimeSec * 1000,
  endTime: endTimeSec * 1000,
  count: Math.max(1, Math.round(burstWindow.count)),
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: ((startTimeSec + endTimeSec) / 2) * 1000,
  burstClass: burstWindow.burstClass,
  burstRuleVersion: burstWindow.burstRuleVersion,
  burstScore: burstWindow.burstScore,
  burstConfidence: burstWindow.burstConfidence,
  burstProvenance: burstWindow.burstProvenance,
  tieBreakReason: burstWindow.tieBreakReason,
  thresholdSource: burstWindow.thresholdSource,
  neighborhoodSummary: burstWindow.neighborhoodSummary,
});

export const buildBurstDraftBinsFromWindows = (
  burstWindows: BurstWindow[],
  generationInputs: BurstDraftGenerationInputs,
): BurstDraftGenerationResult => {
  const activeStart = generationInputs.timeWindow.start;
  const activeEnd = generationInputs.timeWindow.end;

  if (!isValidNumber(activeStart) || !isValidNumber(activeEnd)) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst slices.',
    };
  }

  // Demo selections are stored as epoch milliseconds; burst windows are tracked in seconds.
  const activeSelection = normalizeRange(activeStart / 1000, activeEnd / 1000);
  if (activeSelection[1] <= activeSelection[0]) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst slices.',
    };
  }

  const overlappingWindows = burstWindows.filter((burstWindow) => {
    const burstRange = normalizeRange(burstWindow.start, burstWindow.end);
    return hasOverlap(burstRange, activeSelection);
  });

  if (overlappingWindows.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'No burst windows overlap the selected range.',
    };
  }

  const bins = overlappingWindows
    .map((burstWindow, index): TimeBin | null => {
      const burstRange = normalizeRange(burstWindow.start, burstWindow.end);
      const clippedStart = Math.max(burstRange[0], activeSelection[0]);
      const clippedEnd = Math.min(burstRange[1], activeSelection[1]);

      if (!Number.isFinite(clippedStart) || !Number.isFinite(clippedEnd) || clippedEnd <= clippedStart) {
        return null;
      }

      return buildDraftBin(burstWindow, clippedStart, clippedEnd, generationInputs, index);
    })
    .filter((bin): bin is TimeBin => bin !== null)
    .sort((left, right) => left.startTime - right.startTime);

  if (bins.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'No burst windows overlap the selected range.',
    };
  }

  return {
    bins,
    eventCount: bins.reduce((sum, bin) => sum + bin.count, 0),
    warning: null,
  };
};

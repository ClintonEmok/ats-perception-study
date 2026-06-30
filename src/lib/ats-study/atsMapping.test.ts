import { describe, expect, it } from "vitest";
import {
  DEFAULT_ATS_OPTIONS,
  computeAtsIntervals,
  uniformIntervals,
} from "./atsMapping";

describe("computeAtsIntervals", () => {
  it("returns empty for empty input", () => {
    expect(computeAtsIntervals([])).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const events = Array.from({ length: 100 }, (_, i) => i * 10 + (i % 7));
    const a = computeAtsIntervals(events);
    const b = computeAtsIntervals(events);
    expect(a).toEqual(b);
  });

  it("produces contiguous intervals covering the data span", () => {
    const events = Array.from({ length: 80 }, (_, i) => i * 5);
    const intervals = computeAtsIntervals(events);
    expect(intervals.length).toBeGreaterThan(0);
    expect(intervals[0]!.start).toBeCloseTo(events[0]!, 5);
    const last = intervals[intervals.length - 1]!;
    expect(last.end).toBeCloseTo(events[events.length - 1]!, 5);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]!.start).toBeCloseTo(intervals[i - 1]!.end, 5);
    }
  });

  it("expands intervals in dense regions and compresses in sparse regions", () => {
    const sparse = [0, 100, 200, 300, 400];
    const dense = Array.from({ length: 50 }, (_, i) => 480 + i);
    const events = [...sparse, ...dense];
    const intervals = computeAtsIntervals(events, DEFAULT_ATS_OPTIONS);
    const widths = intervals.map((i) => i.width);
    const maxWidth = Math.max(...widths);
    const minWidth = Math.min(...widths);
    expect(maxWidth).toBeGreaterThan(minWidth);
  });

  it("respects min and max width bounds", () => {
    const events = Array.from({ length: 30 }, (_, i) => i);
    const intervals = computeAtsIntervals(events, {
      targetBins: 4,
      minWidth: 5,
      maxWidth: 20,
      weightFloor: 0.1,
    });
    for (const interval of intervals) {
      expect(interval.width).toBeGreaterThanOrEqual(5);
      expect(interval.width).toBeLessThanOrEqual(20 + 1e-9);
    }
  });
});

describe("uniformIntervals", () => {
  it("produces equal-width bins covering the data span", () => {
    const events = Array.from({ length: 40 }, (_, i) => i * 10);
    const bins = uniformIntervals(events, 4);
    expect(bins).toHaveLength(4);
    const widths = new Set(bins.map((b) => b.width));
    expect(widths.size).toBe(1);
    expect(bins[0]!.start).toBe(0);
    expect(bins[3]!.end).toBeCloseTo(events[events.length - 1]!, 5);
  });
});

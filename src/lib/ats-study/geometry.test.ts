import { describe, expect, it } from "vitest";
import {
  bandsFromIntervals,
  eventRugPoints,
  mapTimeToX,
} from "./geometry";

describe("mapTimeToX", () => {
  it("maps domain start to 0 and end to width", () => {
    expect(mapTimeToX(0, { min: 0, max: 1000 }, 500)).toBe(0);
    expect(mapTimeToX(1000, { min: 0, max: 1000 }, 500)).toBe(500);
  });

  it("scales linearly with width", () => {
    expect(mapTimeToX(500, { min: 0, max: 1000 }, 200)).toBe(100);
    expect(mapTimeToX(250, { min: 0, max: 1000 }, 400)).toBe(100);
  });

  it("handles zero-span domain without dividing by zero", () => {
    expect(mapTimeToX(5, { min: 5, max: 5 }, 200)).toBe(0);
  });
});

describe("eventRugPoints", () => {
  it("returns empty for empty input", () => {
    expect(eventRugPoints([], { min: 0, max: 1 }, { width: 100, height: 50 }, 10)).toEqual([]);
  });

  it("places every event at the projected x", () => {
    const events = [0, 250, 500, 750, 1000];
    const points = eventRugPoints(events, { min: 0, max: 1000 }, { width: 200, height: 60 }, 20);
    expect(points).toHaveLength(events.length);
    expect(points.map((p) => p.x)).toEqual([0, 50, 100, 150, 200]);
    for (const point of points) {
      expect(point.y).toBeGreaterThan(20);
    }
  });
});

describe("bandsFromIntervals", () => {
  it("produces rects with non-zero width and consistent x positions", () => {
    const intervals = [
      { index: 0, start: 0, end: 250, weight: 0.5 },
      { index: 1, start: 250, end: 1000, weight: 0.5 },
    ];
    const rects = bandsFromIntervals(intervals, { min: 0, max: 1000 }, { width: 400, height: 60 }, 20);
    expect(rects).toHaveLength(2);
    expect(rects[0]!.x).toBe(0);
    expect(rects[0]!.width).toBe(100);
    expect(rects[1]!.x).toBe(100);
    expect(rects[1]!.width).toBe(300);
    for (const rect of rects) {
      expect(rect.y).toBe(0);
      expect(rect.height).toBe(20);
    }
  });
});

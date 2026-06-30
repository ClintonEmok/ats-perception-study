import { describe, expect, it } from "vitest";
import { createTimingSource } from "./timing";

class FakePerformance {
  current: number;
  constructor(start = 1000) {
    this.current = start;
  }
  now(): number {
    return this.current;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

class FakeDocument {
  hidden = false;
  listeners: Array<() => void> = [];
  addEventListener(_event: string, fn: () => void): void {
    this.listeners.push(fn);
  }
  removeEventListener(_event: string, fn: () => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }
  fireVisibilityChange(): void {
    for (const l of this.listeners) l();
  }
}

describe("createTimingSource", () => {
  it("throws if no performance is available", () => {
    expect(() => createTimingSource({ performance: undefined as unknown as undefined, document: null })).toThrow();
  });

  it("captures onset and response with monotonic deltas", () => {
    const perf = new FakePerformance();
    const doc = new FakeDocument();
    const src = createTimingSource({ performance: perf, document: doc });
    const onset = src.markOnset();
    expect(onset).toBe(1000);
    perf.advance(750);
    const response = src.markResponse();
    expect(response).toBe(1750);
    expect(src.getResponseTimeMs()).toBe(750);
  });

  it("returns null RT before either mark is captured", () => {
    const perf = new FakePerformance();
    const src = createTimingSource({ performance: perf, document: null });
    expect(src.getResponseTimeMs()).toBeNull();
    src.markOnset();
    expect(src.getResponseTimeMs()).toBeNull();
  });

  it("notifies visibility listeners when the document changes", () => {
    const perf = new FakePerformance();
    const doc = new FakeDocument();
    const src = createTimingSource({ performance: perf, document: doc });
    const calls: boolean[] = [];
    const off = src.onVisibilityChange((hidden) => calls.push(hidden));
    doc.hidden = true;
    doc.fireVisibilityChange();
    off();
    doc.hidden = false;
    doc.fireVisibilityChange();
    expect(calls).toEqual([true]);
  });

  it("clamps negative RT to zero", () => {
    const perf = new FakePerformance();
    const doc = new FakeDocument();
    const src = createTimingSource({ performance: perf, document: doc });
    src.markOnset();
    perf.advance(-50);
    src.markResponse();
    expect(src.getResponseTimeMs()).toBe(0);
  });
});

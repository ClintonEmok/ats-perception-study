import { describe, expect, it } from "vitest";
import { scoreComparison, scorePattern, scorePeak, scoreTrial } from "./scoring";

describe("scoring", () => {
  it("scores peak task", () => {
    expect(scorePeak({ chosen: "A", correct: "A" })).toBe(true);
    expect(scorePeak({ chosen: "B", correct: "A" })).toBe(false);
  });

  it("scores period comparison", () => {
    expect(scoreComparison({ chosen: "first", correct: "first" })).toBe(true);
    expect(scoreComparison({ chosen: "second", correct: "first" })).toBe(false);
  });

  it("scores pattern recognition", () => {
    expect(scorePattern({ chosen: "single-burst", correct: "single-burst" })).toBe(true);
    expect(scorePattern({ chosen: "uniform", correct: "gradual-change" })).toBe(false);
  });

  it("dispatches to the right scorer via scoreTrial", () => {
    expect(scoreTrial("peak", { chosen: "C", correct: "C" })).toBe(true);
    expect(scoreTrial("comparison", { chosen: "second", correct: "first" })).toBe(false);
    expect(scoreTrial("pattern", { chosen: "uniform", correct: "uniform" })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_ANCHORS,
  MIN_FREE_TEXT_CHARS,
  PREFERENCE_LABELS_5PT,
  confidenceAnchor,
  isPreference,
  isPreference3way,
  isPreference5pt,
  validateFreeText,
} from "./questionnaire";

describe("questionnaire constants", () => {
  it("exposes 5 confidence anchors in published-study order", () => {
    expect(CONFIDENCE_ANCHORS).toEqual([
      "Very unconfident",
      "Unconfident",
      "Neutral",
      "Confident",
      "Very confident",
    ]);
  });

  it("exposes 5 preference labels from Strongly uniform to Strongly ATS", () => {
    expect(PREFERENCE_LABELS_5PT).toEqual([
      "Strongly uniform",
      "Uniform",
      "Neutral",
      "ATS",
      "Strongly ATS",
    ]);
    expect(MIN_FREE_TEXT_CHARS).toBe(10);
  });
});

describe("confidenceAnchor", () => {
  it("returns the right anchor for 1..5", () => {
    expect(confidenceAnchor(1)).toBe("Very unconfident");
    expect(confidenceAnchor(3)).toBe("Neutral");
    expect(confidenceAnchor(5)).toBe("Very confident");
  });

  it("returns undefined for out-of-range or non-integer values", () => {
    expect(confidenceAnchor(0)).toBeUndefined();
    expect(confidenceAnchor(6)).toBeUndefined();
    expect(confidenceAnchor(2.5)).toBeUndefined();
    expect(confidenceAnchor(NaN)).toBeUndefined();
  });
});

describe("isPreference guards", () => {
  it("recognises 5-point labels", () => {
    expect(isPreference5pt("Strongly uniform")).toBe(true);
    expect(isPreference5pt("uniform")).toBe(false);
  });

  it("recognises 3-way labels", () => {
    expect(isPreference3way("uniform")).toBe(true);
    expect(isPreference3way("Strongly uniform")).toBe(false);
  });

  it("recognises the union of both scales", () => {
    expect(isPreference("uniform")).toBe(true);
    expect(isPreference("Strongly ATS")).toBe(true);
    expect(isPreference("no-preference")).toBe(true);
    expect(isPreference("unknown")).toBe(false);
  });
});

describe("validateFreeText", () => {
  it("flags empty text", () => {
    expect(validateFreeText("")).toEqual({ ok: false, reason: "empty", remaining: MIN_FREE_TEXT_CHARS });
    expect(validateFreeText("   ")).toEqual({ ok: false, reason: "empty", remaining: MIN_FREE_TEXT_CHARS });
  });

  it("flags text shorter than the minimum", () => {
    const result = validateFreeText("hi");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("too-short");
    expect(result.remaining).toBe(MIN_FREE_TEXT_CHARS - "hi".length);
  });

  it("passes text that meets the minimum", () => {
    expect(validateFreeText("a".repeat(MIN_FREE_TEXT_CHARS))).toEqual({ ok: true, reason: "ok", remaining: 0 });
    expect(validateFreeText("   padded with spaces and much more   ".trim())).toEqual({ ok: true, reason: "ok", remaining: 0 });
  });
});

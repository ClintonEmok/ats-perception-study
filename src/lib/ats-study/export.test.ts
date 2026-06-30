import { describe, expect, it } from "vitest";
import {
  exportSessionData,
  exportSessionDataAsCsv,
  exportSessionDataAsJson,
  type ExportInput,
} from "./export";

const input: ExportInput = {
  sessions: [
    {
      sessionId: "s1",
      experimentSlug: "ats-perception-v4",
      participantIndex: 0,
      participantName: "Alex",
      conditionOrder: ["uniform", "ats"],
      startedAt: 1000,
      finishedAt: 2000,
    },
  ],
  trials: [
    {
      sessionId: "s1",
      experimentSlug: "ats-perception-v4",
      trialIndex: 0,
      taskType: "peak",
      condition: "uniform",
      datasetId: "ds-01-uniform-200--uniform",
      isPractice: false,
      chosen: "A",
      correct: "A",
      isCorrect: true,
      responseTimeMs: 1500,
      confidence: 4,
      recordedAt: 1100,
    },
    {
      sessionId: "s1",
      experimentSlug: "ats-perception-v4",
      trialIndex: 1,
      taskType: "peak",
      condition: "ats",
      datasetId: "ds-02-single-burst-220--ats",
      isPractice: false,
      chosen: "B",
      correct: "A",
      isCorrect: false,
      responseTimeMs: 2100,
      confidence: 3,
      recordedAt: 1200,
    },
  ],
  questionnaires: [
    {
      sessionId: "s1",
      preference: "ats",
      freeText: 'I found ATS easier, "less crowded".',
      participantName: "Alex",
      submittedAt: 1500,
    },
  ],
};

describe("export", () => {
  it("emits a CSV with header rows and proper escaping", () => {
    const csv = exportSessionDataAsCsv(input);
    expect(csv.sessionsCsv.split("\n")[0]).toBe(
      "sessionId,experimentSlug,participantIndex,participantName,conditionOrder,startedAt,finishedAt",
    );
    expect(csv.trialsCsv).toContain("trialIndex,taskType,condition,datasetId");
    // free text contains a comma + double-quote — must be escaped.
    expect(csv.questionnairesCsv).toContain('"I found ATS easier, ""less crowded""."');
  });

  it("emits well-formed JSON", () => {
    const json = exportSessionDataAsJson(input);
    const parsed = JSON.parse(json);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.trials).toHaveLength(2);
    expect(parsed.questionnaires[0].preference).toBe("ats");
  });

  it("returns both CSV and JSON from a single call", () => {
    const result = exportSessionData(input);
    expect(result.sessionsCsv).toBeTruthy();
    expect(result.trialsCsv).toBeTruthy();
    expect(result.questionnairesCsv).toBeTruthy();
    expect(result.combinedJson).toBeTruthy();
    JSON.parse(result.combinedJson);
  });

  it("handles empty input sets", () => {
    const empty = exportSessionData({ sessions: [], trials: [], questionnaires: [] });
    expect(empty.sessionsCsv).toBe("");
    expect(empty.trialsCsv).toBe("");
    expect(empty.questionnairesCsv).toBe("");
  });
});

export interface ExportableSession {
  sessionId: string;
  participantIndex: number;
  conditionOrder: ReadonlyArray<"uniform" | "ats">;
  startedAt: number;
  finishedAt: number | null;
}

export interface ExportableTrial {
  sessionId: string;
  trialIndex: number;
  taskType: "peak" | "comparison" | "pattern";
  condition: "uniform" | "ats";
  datasetId: string;
  isPractice: boolean;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  responseTimeMs: number;
  confidence: number;
  recordedAt: number;
}

export interface ExportableQuestionnaire {
  sessionId: string;
  preference:
    | "uniform"
    | "ats"
    | "no-preference"
    | "Strongly uniform"
    | "Uniform"
    | "Neutral"
    | "ATS"
    | "Strongly ATS"
    | null;
  freeText: string;
  submittedAt: number;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] as object);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export interface ExportInput {
  sessions: ReadonlyArray<ExportableSession>;
  trials: ReadonlyArray<ExportableTrial>;
  questionnaires: ReadonlyArray<ExportableQuestionnaire>;
}

export interface ExportResult {
  sessionsCsv: string;
  trialsCsv: string;
  questionnairesCsv: string;
  combinedJson: string;
}

export function exportSessionDataAsCsv(input: ExportInput): Pick<ExportResult, "sessionsCsv" | "trialsCsv" | "questionnairesCsv"> {
  return {
    sessionsCsv: toCsv(input.sessions as unknown as ReadonlyArray<Record<string, unknown>>),
    trialsCsv: toCsv(input.trials as unknown as ReadonlyArray<Record<string, unknown>>),
    questionnairesCsv: toCsv(input.questionnaires as unknown as ReadonlyArray<Record<string, unknown>>),
  };
}

export function exportSessionDataAsJson(input: ExportInput): string {
  return JSON.stringify(input, null, 2);
}

export function exportSessionData(input: ExportInput): ExportResult {
  const csv = exportSessionDataAsCsv(input);
  return {
    ...csv,
    combinedJson: exportSessionDataAsJson(input),
  };
}

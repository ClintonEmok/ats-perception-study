"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useExperimentStore, type ConvexWrites } from "@/store/useExperimentStore";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

const failingWrites: ConvexWrites = {
  startSession: async () => {
    throw new Error("Convex client is not configured");
  },
  completeSession: async () => {
    throw new Error("Convex client is not configured");
  },
  recordAbResponse: async () => {
    throw new Error("Convex client is not configured");
  },
  submitQuestionnaire: async () => {
    throw new Error("Convex client is not configured");
  },
};

function OfflineWritesBridge({ children }: { children: ReactNode }) {
  const setConvexWrites = useExperimentStore((state) => state.setConvexWrites);

  useEffect(() => {
    console.warn(
      "[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set; responses will fall back to JSON export.",
    );
    setConvexWrites(failingWrites);
  }, [setConvexWrites]);

  return <>{children}</>;
}

function ConvexWritesBridge({ children }: { children: ReactNode }) {
  const setConvexWrites = useExperimentStore((state) => state.setConvexWrites);
  const startSessionMutation = useMutation(api.study.startSession);
  const completeSessionMutation = useMutation(api.study.completeSession);
  const recordAbResponseMutation = useMutation(api.study.recordAbResponse);
  const submitQuestionnaireMutation = useMutation(api.study.submitQuestionnaire);

  useEffect(() => {
    setConvexWrites({
      startSession: async ({ sessionId, participantName, startedAt, conditionOrder }) => {
        const createdSessionId = await startSessionMutation({
          participantId: sessionId,
          participantName: participantName ?? undefined,
          startedAt,
          conditionOrder: [...conditionOrder],
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
        useExperimentStore.setState({ convexSessionId: String(createdSessionId) });
      },
      completeSession: async ({ finishedAt }) => {
        const convexSessionId = useExperimentStore.getState().convexSessionId;
        if (!convexSessionId) throw new Error("Convex session id missing");
        await completeSessionMutation({
          sessionId: convexSessionId as Id<"studySessions">,
          finishedAt,
        });
      },
      recordAbResponse: async ({ windowKey, taskType, choice, rationale, responseTimeMs, confidence, recordedAt }) => {
        const convexSessionId = useExperimentStore.getState().convexSessionId;
        if (!convexSessionId) throw new Error("Convex session id missing");
        await recordAbResponseMutation({
          sessionId: convexSessionId as Id<"studySessions">,
          windowKey,
          taskType,
          choice,
          rationale,
          responseTimeMs,
          confidence,
          recordedAt,
        });
      },
       submitQuestionnaire: async ({ freeText, participantName, submittedAt }) => {
        const convexSessionId = useExperimentStore.getState().convexSessionId;
        if (!convexSessionId) throw new Error("Convex session id missing");
        await submitQuestionnaireMutation({
          sessionId: convexSessionId as Id<"studySessions">,
          freeText,
          participantName: participantName ?? undefined,
          submittedAt,
        });
      },
    });
  }, [
    completeSessionMutation,
    recordAbResponseMutation,
    setConvexWrites,
    startSessionMutation,
    submitQuestionnaireMutation,
  ]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <OfflineWritesBridge>{children}</OfflineWritesBridge>;
  }

  return (
    <ConvexProvider client={convexClient}>
      <ConvexWritesBridge>{children}</ConvexWritesBridge>
    </ConvexProvider>
  );
}

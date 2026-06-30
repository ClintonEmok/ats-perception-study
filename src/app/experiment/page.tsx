"use client";

import { ParticipantFlow } from "@/components/study/ParticipantFlow";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import type { ConvexWrites } from "@/store/useExperimentStore";

const noopWrites: ConvexWrites = {
  startSession: async () => undefined,
  completeSession: async () => undefined,
  startTrial: async () => undefined,
  completeTrial: async () => undefined,
  submitQuestionnaire: async () => undefined,
};

export default function ExperimentPage() {
  return (
    <ConvexClientProvider>
      <ParticipantFlow convexWrites={noopWrites} participantIndex={0} />
    </ConvexClientProvider>
  );
}

"use client";

import { useEffect } from "react";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { useExperimentStore, type ConvexWrites } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

const noopWrites: ConvexWrites = {
  startSession: async () => undefined,
  completeSession: async () => undefined,
  startTrial: async () => undefined,
  completeTrial: async () => undefined,
  submitQuestionnaire: async () => undefined,
};

export default function ExperimentLayout({ children }: { children: React.ReactNode }) {
  const phase = useExperimentStore((state) => state.phase);
  const sessionId = useExperimentStore((state) => state.sessionId);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const participantIndex = useExperimentStore((state) => state.participantIndex);
  const startSession = useExperimentStore((state) => state.startSession);
  const setConvexWrites = useExperimentStore((state) => state.setConvexWrites);

  useEffect(() => {
    if (sessionId !== null) {
      setConvexWrites(noopWrites);
      return;
    }
    if (!consentAccepted) return;
    void startSession(participantIndex, noopWrites);
  }, [sessionId, participantIndex, consentAccepted, startSession, setConvexWrites]);

  useNavigationGuard({ active: phase !== "debrief" && phase !== "consent" });

  return (
    <ConvexClientProvider>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">{children}</main>
    </ConvexClientProvider>
  );
}

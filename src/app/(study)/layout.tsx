"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { useExperimentStore, type ConvexWrites } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

const noopWrites: ConvexWrites = {
  startSession: async () => undefined,
  completeSession: async () => undefined,
  recordAbResponse: async () => undefined,
  submitQuestionnaire: async () => undefined,
};

export default function StudyLayout({ children }: { children: ReactNode }) {
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

  useNavigationGuard({ active: consentAccepted || sessionId !== null });

  return (
    <ConvexClientProvider>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">{children}</main>
    </ConvexClientProvider>
  );
}

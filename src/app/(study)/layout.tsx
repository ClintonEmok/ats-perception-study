"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { useExperimentStore } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

export default function StudyLayout({ children }: { children: ReactNode }) {
  const sessionId = useExperimentStore((state) => state.sessionId);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const participantIndex = useExperimentStore((state) => state.participantIndex);
  const startSession = useExperimentStore((state) => state.startSession);
  const convexWrites = useExperimentStore((state) => state.convexWrites);
  const hasHydrated = useExperimentStore((state) => state.hasHydrated);

  useEffect(() => {
    const unsubscribe = useExperimentStore.persist.onFinishHydration((state) => {
      if (state && !state.hasHydrated) {
        useExperimentStore.setState({ hasHydrated: true });
      }
    });

    if (!useExperimentStore.persist.hasHydrated()) {
      void useExperimentStore.persist.rehydrate();
    } else if (!hasHydrated) {
      useExperimentStore.setState({ hasHydrated: true });
    }

    return unsubscribe;
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !consentAccepted || sessionId !== null || !convexWrites) return;
    void startSession(participantIndex, convexWrites);
  }, [hasHydrated, sessionId, participantIndex, consentAccepted, convexWrites, startSession]);

  useNavigationGuard({ active: consentAccepted || sessionId !== null });

  return (
    <ConvexClientProvider>
      <main className="mx-auto flex w-full max-w-none flex-col gap-6 px-8 py-6">{children}</main>
    </ConvexClientProvider>
  );
}

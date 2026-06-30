"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import type { ProtocolPhase } from "@/lib/ats-study/protocol";

const ROUTE_BY_PHASE: Record<ProtocolPhase, string> = {
  consent: "/experiment/consent",
  instructions: "/experiment/instructions",
  practice: "/experiment/practice",
  "block-a": "/experiment/block-a",
  "block-b": "/experiment/block-b",
  questionnaire: "/experiment/questionnaire",
  debrief: "/experiment/debrief",
};

export function useRouteGuard(expectedPhase: ProtocolPhase): boolean {
  const router = useRouter();
  const phase = useExperimentStore((state) => state.phase);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (phase === expectedPhase) {
      setReady(true);
      return;
    }
    setReady(false);
    const target = ROUTE_BY_PHASE[phase] ?? "/experiment/consent";
    router.replace(target);
  }, [phase, expectedPhase, router]);

  return ready;
}

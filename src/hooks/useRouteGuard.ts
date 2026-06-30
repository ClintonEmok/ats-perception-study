"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import type { ProtocolPhase } from "@/lib/ats-study/protocol";

export function useRouteGuard(expectedPhase?: ProtocolPhase): boolean {
  const router = useRouter();
  const phase = useExperimentStore((state) => state.phase);
  const slug = useExperimentStore((state) => state.experimentSlug);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (expectedPhase && phase !== expectedPhase) {
      setReady(false);
      const target = slug ? `/experiment/${slug}` : "/";
      router.replace(target);
      return;
    }
    setReady(true);
  }, [phase, expectedPhase, slug, router]);

  return ready;
}
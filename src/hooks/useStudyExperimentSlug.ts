"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { resolveStudyExperimentSlug } from "@/lib/ats-study/routes";

export function useStudyExperimentSlug(): string {
  const searchParams = useSearchParams();
  const requested = searchParams?.get("next") ?? null;
  const slug = resolveStudyExperimentSlug(requested);
  const storeSlug = useExperimentStore((state) => state.experimentSlug);

  useEffect(() => {
    if (storeSlug !== slug) {
      useExperimentStore.setState({ experimentSlug: slug });
    }
  }, [slug, storeSlug]);

  return slug;
}

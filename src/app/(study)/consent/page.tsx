"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

export default function ConsentPage() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);

  useEffect(() => {
    if (consentAccepted) {
      router.replace(studyStepHref("instructions", slug));
    }
  }, [consentAccepted, router, slug]);

  return <ConsentScreen onAccept={() => router.push(studyStepHref("instructions", slug))} />;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { InstructionsScreen } from "@/components/study/screens/InstructionsScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

export default function InstructionsPage() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const instructionsSeen = useExperimentStore((state) => state.instructionsSeen);

  useEffect(() => {
    if (!consentAccepted) {
      router.replace(studyStepHref("consent", slug));
      return;
    }
    if (instructionsSeen) {
      router.replace(studyStepHref("trial", slug));
    }
  }, [consentAccepted, instructionsSeen, router, slug]);

  return <InstructionsScreen onBegin={() => router.push(studyStepHref("trial", slug))} />;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { QuestionnaireScreen } from "@/components/study/screens/QuestionnaireScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

export default function QuestionnairePage() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const instructionsSeen = useExperimentStore((state) => state.instructionsSeen);
  const phase = useExperimentStore((state) => state.phase);

  useEffect(() => {
    if (!consentAccepted) {
      router.replace(studyStepHref("consent", slug));
      return;
    }
    if (!instructionsSeen) {
      router.replace(studyStepHref("instructions", slug));
      return;
    }
    if (phase === "trial") {
      router.replace(studyStepHref("trial", slug));
      return;
    }
    if (phase === "debrief") {
      router.replace(studyStepHref("debrief", slug));
    }
  }, [consentAccepted, instructionsSeen, phase, router, slug]);

  return <QuestionnaireScreen onSubmitted={() => router.push(studyStepHref("debrief", slug))} />;
}

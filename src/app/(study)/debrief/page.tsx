"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { DebriefScreen } from "@/components/study/screens/DebriefScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

export default function DebriefPage() {
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
    if (phase === "practice") {
      router.replace(studyStepHref("practice", slug));
      return;
    }
    if (phase === "trial") {
      router.replace(studyStepHref("trial", slug));
      return;
    }
    if (phase === "questionnaire") {
      router.replace(studyStepHref("questionnaire", slug));
    }
  }, [consentAccepted, instructionsSeen, phase, router, slug]);

  return (
    <DebriefScreen
      onNewRun={() => {
        useExperimentStore.getState().reset();
        router.replace(`/?next=${slug}`);
      }}
      onFinish={() => router.replace(`/?next=${slug}`)}
    />
  );
}

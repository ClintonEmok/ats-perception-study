"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { QuestionnaireScreen } from "@/components/study/screens/QuestionnaireScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

function QuestionnairePageContent() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const hasHydrated = useExperimentStore((state) => state.hasHydrated);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const instructionsSeen = useExperimentStore((state) => state.instructionsSeen);
  const phase = useExperimentStore((state) => state.phase);

  useEffect(() => {
    if (!hasHydrated) return;
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
    if (phase === "debrief") {
      router.replace(studyStepHref("debrief", slug));
    }
  }, [hasHydrated, consentAccepted, instructionsSeen, phase, router, slug]);

  if (!hasHydrated) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>;
  }

  return <QuestionnaireScreen onSubmitted={() => router.push(studyStepHref("debrief", slug))} />;
}

export default function QuestionnairePage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>}>
      <QuestionnairePageContent />
    </Suspense>
  );
}

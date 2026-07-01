"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { InstructionsScreen } from "@/components/study/screens/InstructionsScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

function InstructionsPageContent() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const hasHydrated = useExperimentStore((state) => state.hasHydrated);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const instructionsSeen = useExperimentStore((state) => state.instructionsSeen);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!consentAccepted) {
      router.replace(studyStepHref("consent", slug));
      return;
    }
    if (instructionsSeen) {
      router.replace(studyStepHref("practice", slug));
    }
  }, [hasHydrated, consentAccepted, instructionsSeen, router, slug]);

  if (!hasHydrated) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>;
  }

  return <InstructionsScreen onBegin={() => router.push(studyStepHref("practice", slug))} />;
}

export default function InstructionsPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>}>
      <InstructionsPageContent />
    </Suspense>
  );
}

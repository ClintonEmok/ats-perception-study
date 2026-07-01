"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

function ConsentPageContent() {
  const router = useRouter();
  const slug = useStudyExperimentSlug();
  const hasHydrated = useExperimentStore((state) => state.hasHydrated);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);

  useEffect(() => {
    if (!hasHydrated) return;
    if (consentAccepted) {
      router.replace(studyStepHref("instructions", slug));
    }
  }, [hasHydrated, consentAccepted, router, slug]);

  if (!hasHydrated) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>;
  }

  return <ConsentScreen onAccept={() => router.push(studyStepHref("instructions", slug))} />;
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading study…</div>}>
      <ConsentPageContent />
    </Suspense>
  );
}

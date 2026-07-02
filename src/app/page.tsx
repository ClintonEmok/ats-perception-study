"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { NameEntryScreen } from "@/components/study/screens/NameEntryScreen";
import { useStudyExperimentSlug } from "@/hooks/useStudyExperimentSlug";
import { studyStepHref } from "@/lib/ats-study/routes";

function EntryView() {
  const router = useRouter();
  const sessionId = useExperimentStore((state) => state.sessionId);
  const finishedAt = useExperimentStore((state) => state.finishedAt);
  const reset = useExperimentStore((state) => state.reset);
  const slug = useStudyExperimentSlug();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (sessionId !== null && finishedAt !== null) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run already completed</h1>
        <p className="text-sm text-slate-700">
          You have already finished this study. Reset your run to start again.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            router.replace(`/?next=${slug}`);
          }}
          className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Reset and start over
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-8">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ATS Perception Study</h1>
        <p className="mt-3 text-sm text-slate-700">
          I am conducting this study as part of my thesis to understand how people read crime activity
          over time and which timeline view makes peaks, patterns, and comparisons easier to see. You
          will answer 12 questions about two anonymous visualizations. No personally identifying
          information is collected.
        </p>
        <p className="mt-2 text-xs text-slate-500">Clinton Emok</p>
        <p className="mt-2 text-xs text-slate-500">Estimated time: 8–12 minutes. Desktop browser recommended.</p>
      </header>
      <NameEntryScreen onContinue={() => router.push(studyStepHref("consent", slug))} />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <EntryView />
    </Suspense>
  );
}

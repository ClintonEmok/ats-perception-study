"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";
import { ATS_PERCEPTION_SLUG, isValidExperimentSlug, listExperiments } from "@/lib/ats-study/experiments";

function ConsentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = useExperimentStore((state) => state.phase);
  const storeSlug = useExperimentStore((state) => state.experimentSlug);
  const sessionId = useExperimentStore((state) => state.sessionId);
  const acceptConsent = useExperimentStore((state) => state.acceptConsent);
  const reset = useExperimentStore((state) => state.reset);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const requested = searchParams?.get("next") ?? null;
  const fallback = listExperiments()[0]?.slug ?? ATS_PERCEPTION_SLUG;
  const targetSlug = requested && isValidExperimentSlug(requested) ? requested : fallback;
  const slugIsValid = targetSlug !== null;

  useEffect(() => {
    if (!hydrated || !slugIsValid || !targetSlug) return;
    if (storeSlug !== targetSlug) {
      useExperimentStore.setState({ experimentSlug: targetSlug });
    }
  }, [hydrated, slugIsValid, targetSlug, storeSlug]);

  if (!hydrated) return null;

  if (!slugIsValid || !targetSlug) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">No experiment available</h1>
        <p className="text-sm text-slate-700">
          The coordinator has not registered any experiments yet. Contact them for a valid link.
        </p>
      </main>
    );
  }

  if (phase === "debrief" && sessionId !== null) {
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
            router.replace(`/?next=${targetSlug}`);
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
          A short, anonymous web experiment comparing two timeline visualizations. You will see 26 timeline stimuli and answer brief questions about them. No personally identifying information is collected.
        </p>
        <p className="mt-2 text-xs text-slate-500">Estimated time: 8–12 minutes. Desktop browser recommended.</p>
      </header>
      <ConsentScreen
        onAccept={() => {
          acceptConsent();
          router.push(`/experiment/${targetSlug}`);
        }}
      />
      <p className="text-xs text-slate-500">
        Lost? See the <Link href="/" className="underline">study home</Link>.
      </p>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ConsentView />
    </Suspense>
  );
}

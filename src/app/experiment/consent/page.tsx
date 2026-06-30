"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";
import { isValidExperimentSlug, listExperiments } from "@/lib/ats-study/experiments";

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
  const fallback = listExperiments()[0]?.slug ?? null;
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
      <section className="flex flex-col gap-2" data-testid="invalid-slug">
        <h1 className="text-2xl font-semibold">No experiment available</h1>
        <p className="text-sm text-slate-700">
          The coordinator has not registered any experiments yet. Contact them for a valid link.
        </p>
      </section>
    );
  }

  if (phase === "debrief" && sessionId !== null) {
    return (
      <section className="flex flex-col gap-3" data-testid="consent-locked">
        <h1 className="text-2xl font-semibold">Run already completed</h1>
        <p className="text-sm text-slate-700">
          You have already finished this study. Reset your run to start again.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            router.replace(`/experiment/consent?next=${targetSlug}`);
          }}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Reset and start over
        </button>
      </section>
    );
  }

  return (
    <ConsentScreen
      onAccept={() => {
        acceptConsent();
        router.push(`/experiment/${targetSlug}`);
      }}
    />
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentView />
    </Suspense>
  );
}

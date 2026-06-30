"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { isValidExperimentSlug } from "@/lib/ats-study/experiments";
import { InstructionsScreen } from "@/components/study/screens/InstructionsScreen";
import { PracticeScreen } from "@/components/study/screens/PracticeScreen";
import { TrialScreen } from "@/components/study/screens/TrialScreen";
import { QuestionnaireScreen } from "@/components/study/screens/QuestionnaireScreen";
import { DebriefScreen } from "@/components/study/screens/DebriefScreen";

export interface ExperimentPageProps {
  params: Promise<{ slug: string }>;
}

function InvalidSlug({ slug }: { slug: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid="invalid-slug">
      <h1 className="text-2xl font-semibold">Unknown experiment</h1>
      <p className="text-sm text-slate-700">
        No experiment is registered for <code>{slug}</code>. Use the link from the study coordinator.
      </p>
    </section>
  );
}

export default function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const phase = useExperimentStore((state) => state.phase);
  const storeSlug = useExperimentStore((state) => state.experimentSlug);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isValidExperimentSlug(slug)) return;
    if (slug !== storeSlug && phase === "consent") {
      useExperimentStore.setState({ experimentSlug: slug });
    }
  }, [slug, storeSlug, phase]);

  if (!hydrated) return null;

  if (!isValidExperimentSlug(slug)) {
    return <InvalidSlug slug={slug} />;
  }

  if (slug !== storeSlug && phase !== "consent") {
    return (
      <section className="flex flex-col gap-2" data-testid="slug-mismatch">
        <h1 className="text-2xl font-semibold">Switching experiments</h1>
        <p className="text-sm text-slate-700">
          Your current run is for a different experiment. Returning to <code>{storeSlug}</code>…
        </p>
        <button
          type="button"
          onClick={() => router.replace(`/experiment/${storeSlug}`)}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue {storeSlug}
        </button>
      </section>
    );
  }

  if (phase === "consent") {
    return (
      <section className="flex flex-col gap-2" data-testid="phase-consent-redirect">
        <p className="text-sm text-slate-700">
          You have not given consent yet. Redirecting to the consent page…
        </p>
        <button
          type="button"
          onClick={() => router.replace(`/?next=${slug}`)}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Go to consent
        </button>
      </section>
    );
  }

  const path = `/experiment/${slug}`;
  switch (phase) {
    case "instructions":
      return <InstructionsScreen onBegin={() => router.push(path)} />;
    case "practice":
      return <PracticeScreen onFinish={() => router.push(path)} />;
    case "trial":
      return <TrialScreen onFinish={() => router.push(path)} />;
    case "questionnaire":
      return <QuestionnaireScreen onSubmitted={() => router.push(path)} />;
    case "debrief":
      return (
        <DebriefScreen
          onNewRun={() => router.replace(`/?next=${slug}`)}
          onFinish={() => router.replace(`/?next=${slug}`)}
        />
      );
    default:
      return null;
  }
}

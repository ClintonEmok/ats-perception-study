"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useExperimentStore,
  getActiveExperiment,
  getCurrentCondition,
  getCurrentTrialSpec,
} from "@/store/useExperimentStore";
import { isValidExperimentSlug, getExperiment } from "@/lib/ats-study/experiments";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";
import { InstructionsScreen } from "@/components/study/screens/InstructionsScreen";
import { PracticeScreen } from "@/components/study/screens/PracticeScreen";
import { TrialScreen } from "@/components/study/screens/TrialScreen";
import { QuestionnaireScreen } from "@/components/study/screens/QuestionnaireScreen";
import { DebriefScreen } from "@/components/study/screens/DebriefScreen";

export interface ExperimentPageProps {
  params: Promise<{ slug: string }>;
}

function InvalidSlug() {
  return (
    <section className="flex flex-col gap-2" data-testid="invalid-slug">
      <h1 className="text-2xl font-semibold">Unknown experiment</h1>
      <p className="text-sm text-slate-700">
        That experiment slug is not registered. Use the link from the study coordinator.
      </p>
    </section>
  );
}

export default function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const phase = useExperimentStore((state) => state.phase);
  const storeSlug = useExperimentStore((state) => state.experimentSlug);
  const setExperimentSlug = useExperimentStore((state) => state.reset);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isValidExperimentSlug(slug)) return;
    if (slug !== storeSlug && phase === "consent") {
      // Fresh start on a different experiment — adopt the new slug and reset.
      useExperimentStore.setState({ experimentSlug: slug });
    }
  }, [slug, storeSlug, phase]);

  if (!isValidExperimentSlug(slug)) {
    return <InvalidSlug />;
  }

  if (!hydrated) return null;

  // If the user is mid-run on a different experiment, send them back to that one.
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

  const path = `/experiment/${slug}`;
  switch (phase) {
    case "consent":
      return <ConsentScreen onAccept={() => router.push(path)} />;
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
          onNewRun={() => router.push(path)}
          onFinish={() => router.push(path)}
        />
      );
    default:
      return null;
  }
}

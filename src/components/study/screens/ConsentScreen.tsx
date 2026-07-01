"use client";

import { useExperimentStore } from "@/store/useExperimentStore";

export interface ConsentScreenProps {
  onAccept: () => void;
}

export function ConsentScreen({ onAccept }: ConsentScreenProps) {
  const acceptConsent = useExperimentStore((state) => state.acceptConsent);

  return (
    <section className="flex flex-col gap-4" data-testid="consent-screen">
      <h1 className="text-2xl font-semibold">Informed consent</h1>
      <p className="text-sm text-slate-700">
        You will complete 12 questions comparing two anonymous visualizations. No personally identifying
        information is required; your anonymous session ID is generated locally in this browser.
      </p>
      <button
        type="button"
        onClick={() => {
          acceptConsent();
          onAccept();
        }}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        data-testid="consent-accept"
      >
        I consent and want to start
      </button>
    </section>
  );
}

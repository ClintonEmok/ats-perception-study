"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface ConsentScreenProps {
  onAccept: () => void;
}

export function ConsentScreen({ onAccept }: ConsentScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      participantName: state.participantName,
      setParticipantName: state.setParticipantName,
      acceptConsent: state.acceptConsent,
    })),
  );

  return (
    <section className="flex flex-col gap-4" data-testid="consent-screen">
      <h1 className="text-2xl font-semibold">Informed consent</h1>
      <p className="text-sm text-slate-700">
        You will see 26 short timeline stimuli and answer questions about them. No personally identifying
        information is required; your anonymous session ID is generated locally in this browser.
      </p>
      <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor="participant-name">
        Your name (optional — leave blank to stay anonymous)
        <input
          id="participant-name"
          type="text"
          value={view.participantName}
          onChange={(event) => view.setParticipantName(event.target.value)}
          maxLength={50}
          autoComplete="off"
          placeholder="e.g. Alex"
          className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"
          data-testid="participant-name-input"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          view.acceptConsent();
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

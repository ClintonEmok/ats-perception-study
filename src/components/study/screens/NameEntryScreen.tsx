"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface NameEntryScreenProps {
  onContinue: () => void;
}

export function NameEntryScreen({ onContinue }: NameEntryScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      participantName: state.participantName,
      setParticipantName: state.setParticipantName,
    })),
  );

  return (
    <section className="flex flex-col gap-4" data-testid="name-entry-screen">
      <h1 className="text-2xl font-semibold">Start the study</h1>
      <p className="text-sm text-slate-700">
        Enter your name or initials before moving to consent. You can leave it blank to stay anonymous.
      </p>
      <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor="participant-name">
        Name or initials
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
        onClick={onContinue}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        data-testid="continue-to-consent"
      >
        Continue to consent
      </button>
    </section>
  );
}

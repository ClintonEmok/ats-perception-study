"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface InstructionsScreenProps {
  onBegin: () => void;
}

export function InstructionsScreen({ onBegin }: InstructionsScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      completeInstructions: state.completeInstructions,
    })),
  );

  return (
    <section className="flex flex-col gap-4" data-testid="instructions-screen">
      <h1 className="text-2xl font-semibold">Instructions</h1>
      <p className="text-sm text-slate-700">
        You will complete 2 short practice trials, then 24 experimental trials. Each trial shows a single
        timeline and a short question. Press a button to respond as quickly and accurately as you can.
      </p>
      <button
        type="button"
        onClick={() => {
          view.completeInstructions();
          onBegin();
        }}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        data-testid="begin-practice"
      >
        Begin practice
      </button>
    </section>
  );
}

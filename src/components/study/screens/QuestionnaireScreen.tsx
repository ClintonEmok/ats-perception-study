"use client";

import { PostStudyQuestionnaire } from "@/components/study/PostStudyQuestionnaire";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface QuestionnaireScreenProps {
  onSubmitted: () => void;
}

export function QuestionnaireScreen({ onSubmitted }: QuestionnaireScreenProps) {
  const submitQuestionnaire = useExperimentStore((state) => state.submitQuestionnaire);
  return (
    <PostStudyQuestionnaire
      onSubmit={() => {
        void submitQuestionnaire();
        onSubmitted();
      }}
    />
  );
}

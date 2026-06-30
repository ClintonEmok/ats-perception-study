"use client";

import { useRouter } from "next/navigation";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { QuestionnaireScreen } from "@/components/study/screens/QuestionnaireScreen";

export default function QuestionnairePage() {
  const router = useRouter();
  const ready = useRouteGuard("questionnaire");
  if (!ready) return null;
  return <QuestionnaireScreen onSubmitted={() => router.push("/experiment/debrief")} />;
}

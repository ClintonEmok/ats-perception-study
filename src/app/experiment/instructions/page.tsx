"use client";

import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { InstructionsScreen } from "@/components/study/screens/InstructionsScreen";

export default function InstructionsPage() {
  const router = useRouter();
  const ready = useRouteGuard("instructions");
  if (!ready) return null;
  return (
    <InstructionsScreen
      onBegin={() => router.push("/experiment/practice")}
    />
  );
}

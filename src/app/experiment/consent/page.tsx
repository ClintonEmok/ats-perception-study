"use client";

import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { ConsentScreen } from "@/components/study/screens/ConsentScreen";

export default function ConsentPage() {
  const router = useRouter();
  const ready = useRouteGuard("consent");
  const acceptConsent = useExperimentStore((state) => state.acceptConsent);

  if (!ready) return null;

  return (
    <ConsentScreen
      onAccept={() => {
        acceptConsent();
        router.push("/experiment/instructions");
      }}
    />
  );
}

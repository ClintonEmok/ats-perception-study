"use client";

import { useRouter } from "next/navigation";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { DebriefScreen } from "@/components/study/screens/DebriefScreen";

export default function DebriefPage() {
  const router = useRouter();
  const ready = useRouteGuard("debrief");
  if (!ready) return null;
  return (
    <DebriefScreen
      onNewRun={() => router.push("/experiment/consent")}
      onFinish={() => router.push("/experiment/consent")}
    />
  );
}

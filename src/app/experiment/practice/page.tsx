"use client";

import { useRouter } from "next/navigation";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { PracticeScreen } from "@/components/study/screens/PracticeScreen";

export default function PracticePage() {
  const router = useRouter();
  const ready = useRouteGuard("practice");
  if (!ready) return null;
  return <PracticeScreen onFinish={() => router.push("/experiment/block-a")} />;
}

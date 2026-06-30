"use client";

import { useRouter } from "next/navigation";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { BlockScreen } from "@/components/study/screens/BlockScreen";

export default function BlockBPage() {
  const router = useRouter();
  const ready = useRouteGuard("block-b");
  if (!ready) return null;
  return <BlockScreen block="b" onFinish={() => router.push("/experiment/questionnaire")} />;
}

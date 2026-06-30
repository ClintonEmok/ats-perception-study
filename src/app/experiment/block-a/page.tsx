"use client";

import { useRouter } from "next/navigation";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { BlockScreen } from "@/components/study/screens/BlockScreen";

export default function BlockAPage() {
  const router = useRouter();
  const ready = useRouteGuard("block-a");
  if (!ready) return null;
  return <BlockScreen block="a" onFinish={() => router.push("/experiment/block-b")} />;
}

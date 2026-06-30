"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperimentStore } from "@/store/useExperimentStore";

export default function ExperimentIndexPage() {
  const router = useRouter();
  const phase = useExperimentStore((state) => state.phase);
  useEffect(() => {
    router.replace(`/experiment/${phase}`);
  }, [phase, router]);
  return null;
}

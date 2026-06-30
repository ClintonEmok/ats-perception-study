"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!client) {
    if (typeof window !== "undefined") {
      console.warn("[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set; Convex-backed features will be disabled.");
    }
    return <>{children}</>;
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

"use client";

import type { ReactNode } from "react";

interface ConvexProviderProps {
  client: unknown;
  children: ReactNode;
}

const ConvexProvider: React.FC<ConvexProviderProps> = ({ children }) => <>{children}</>;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const client = convexUrl ? ({ url: convexUrl } as unknown) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!client) {
    if (typeof window !== "undefined") {
      console.warn(
        "[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set; Convex-backed features will be disabled.",
      );
    }
    return <>{children}</>;
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

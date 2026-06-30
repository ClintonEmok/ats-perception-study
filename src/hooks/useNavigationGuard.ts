"use client";

import { useEffect } from "react";

export interface NavigationGuardOptions {
  active: boolean;
  message?: string;
}

export function useNavigationGuard({ active, message = "Your study progress will be lost if you leave." }: NavigationGuardOptions): void {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    const onPopState = (event: PopStateEvent) => {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof window.confirm === "function") {
        const ok = window.confirm(message);
        if (!ok) {
          window.history.pushState(null, "", window.location.href);
        }
      }
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active, message]);
}

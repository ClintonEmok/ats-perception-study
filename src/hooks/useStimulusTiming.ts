"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createTimingSource, type TimingSource } from "@/lib/ats-study/timing";

export interface StimulusTiming {
  source: TimingSource;
  onsetAt: number | null;
  responseAt: number | null;
  responseTimeMs: number | null;
  hidden: boolean;
}

export function useStimulusTiming(): StimulusTiming {
  const source = useMemo(() => createTimingSource(), []);
  const [onsetAt, setOnsetAt] = useState<number | null>(null);
  const [responseAt, setResponseAt] = useState<number | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [hidden, setHidden] = useState<boolean>(source.isHidden());
  const onsetRef = useRef<number | null>(null);

  useEffect(() => {
    return source.onVisibilityChange(setHidden);
  }, [source]);

  return {
    source: {
      ...source,
      markOnset: () => {
        const t = source.markOnset();
        onsetRef.current = t;
        setOnsetAt(t);
        return t;
      },
      markResponse: () => {
        const t = source.markResponse();
        setResponseAt(t);
        if (onsetRef.current !== null) {
          setResponseTimeMs(Math.max(0, t - onsetRef.current));
        }
        return t;
      },
    },
    onsetAt,
    responseAt,
    responseTimeMs,
    hidden,
  };
}

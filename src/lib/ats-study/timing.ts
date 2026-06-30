export interface TimingSource {
  now(): number;
  markOnset(): number;
  markResponse(): number;
  getResponseTimeMs(): number | null;
  isHidden(): boolean;
  onVisibilityChange(listener: (hidden: boolean) => void): () => void;
}

export interface TimingSourceOptions {
  performance?: Pick<Performance, "now"> | null;
  document?: Pick<Document, "addEventListener" | "removeEventListener"> | null;
}

export function createTimingSource(options: TimingSourceOptions = {}): TimingSource {
  let perf: Pick<Performance, "now"> | null;
  if ("performance" in options) {
    perf = options.performance ?? null;
  } else {
    perf = typeof performance !== "undefined" ? (performance as Pick<Performance, "now">) : null;
  }
  if (!perf || typeof perf.now !== "function") {
    throw new Error("createTimingSource requires a performance object with `now`");
  }
  const doc = "document" in options
    ? options.document ?? null
    : (typeof document !== "undefined" ? document : null);

  let onset: number | null = null;
  let response: number | null = null;
  const listeners = new Set<(hidden: boolean) => void>();

  function notify(hidden: boolean): void {
    for (const l of listeners) l(hidden);
  }

  if (doc && typeof doc.addEventListener === "function") {
    const handler = () => notify(doc.hidden === true);
    doc.addEventListener("visibilitychange", handler);
  }

  return {
    now: () => perf.now(),
    markOnset: () => {
      onset = perf.now();
      return onset;
    },
    markResponse: () => {
      response = perf.now();
      return response;
    },
    getResponseTimeMs: () => {
      if (onset === null || response === null) return null;
      return Math.max(0, response - onset);
    },
    isHidden: () => (doc ? doc.hidden === true : false),
    onVisibilityChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useExperimentStore } from "@/store/useExperimentStore";

vi.mock("@/components/study/PostStudyQuestionnaire", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/study/PostStudyQuestionnaire")>();
  return {
    ...actual,
    downloadSessionResponses: vi.fn(),
  };
});

import { downloadSessionResponses } from "@/components/study/PostStudyQuestionnaire";
import { DebriefScreen } from "./DebriefScreen";

describe("DebriefScreen", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    useExperimentStore.getState().reset();
    useExperimentStore.setState({
      participantName: "Alex",
      fallbackDownloadQueued: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root?.unmount();
    container?.remove();
    root = null;
    container = null;
    useExperimentStore.getState().reset();
    vi.clearAllMocks();
  });

  it("automatically downloads the fallback JSON when a sync failure is queued", async () => {
    await act(async () => {
      root!.render(<DebriefScreen onNewRun={vi.fn()} onFinish={vi.fn()} />);
    });

    expect(downloadSessionResponses).toHaveBeenCalledTimes(1);
    expect(useExperimentStore.getState().fallbackDownloadQueued).toBe(false);
  });
});

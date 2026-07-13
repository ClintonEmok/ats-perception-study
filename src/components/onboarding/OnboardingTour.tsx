"use client";

/**
 * Phase 80 — Global onboarding tour.
 *
 * The component owns TWO tours:
 *
 *   1. The legacy dashboard tour (auto-runs on `/dashboard*` once per
 *      device via the `hasSeenTour` localStorage key). It targets the
 *      map / cube / timeline panels of the original layout.
 *   2. The evaluation training tour, which is only run on demand from
 *      `/evaluation` via the `gsd:start-evaluation-training-tour` window
 *      event. The shell listens for the event and constructs a dedicated
 *      driver instance with 5 evaluation steps and a dark card popover
 *      theme (per the Phase 80 UI contract). The `EvaluationTrainingGate`
 *      dispatches the event when the researcher clicks
 *      "Start training tour".
 *
 * The component never auto-runs the evaluation tour — researchers are
 * the only ones who decide when training begins for a participant, so
 * the `hasSeenTour` path is intentionally not consulted on the
 * `/evaluation` route.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { cn } from "@/lib/utils";

const EVAL_TRAINING_EVENT = "gsd:start-evaluation-training-tour";
const EVAL_POPOVER_CLASS = "gsd-eval-tour-popover";

const DASHBOARD_STEPS = [
  {
    popover: {
      title: "Welcome to Adaptive Space-Time Cube",
      description:
        "Explore spatiotemporal patterns in Chicago crime data using synchronized 2D, 3D, and timeline views.",
    },
  },
  {
    element: "#tour-toolbar",
    popover: {
      title: "Floating Toolbar",
      description:
        "Use these tools to reset view, toggle context, manage layers, open settings, and filter data.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-map-panel",
    popover: {
      title: "2D Map View",
      description:
        "View spatial distribution of events. Compare spatial patterns with the 3D structure.",
      side: "right",
      align: "center",
    },
  },
  {
    element: "#tour-cube-panel",
    popover: {
      title: "3D Space-Time Cube",
      description:
        "Visualize events in 3D (X/Y=Space, Z=Time). Enable Adaptive Time to see density-based scaling.",
      side: "left",
      align: "center",
    },
  },
  {
    element: "#tour-timeline-panel",
    popover: {
      title: "Interactive Timeline",
      description:
        "Analyze temporal distribution. Select time ranges to filter the Map and Cube views.",
      side: "top",
      align: "center",
    },
  },
] as const;

const EVAL_TRAINING_STEPS = [
  {
    popover: {
      title: "Welcome to the evaluation tour",
      description:
        "We will walk through the five core interactions you will use during the study. There is no time pressure — let the researcher know when you are ready to move on.",
    },
  },
  {
    popover: {
      title: "Rotate the 3D cube",
      description:
        "Switch to the 3D view in the upper right and drag inside the cube to orbit. Try tilting the cube so you can see events stacked along the time axis.",
      side: "over",
    },
  },
  {
    popover: {
      title: "Brush the timeline",
      description:
        "Drag across the timeline at the bottom to select a time range. The map and cube will filter to the brushed window. Release the brush to clear it.",
      side: "over",
    },
  },
  {
    popover: {
      title: "Read slice labels and density color",
      description:
        "Use the Slices tab in the right rail to look at the slice list. Brighter colors mean higher event density. Hover a slice to focus it in the cube.",
      side: "over",
    },
  },
  {
    popover: {
      title: "Try the unlabeled time-scale toggle",
      description:
        "In the header, flip the small unlabeled switch next to the condition badge. Notice how the time axis on the cube changes density. There is no right or wrong answer here — just explore.",
      side: "over",
    },
  },
] as const;

export function OnboardingTour() {
  const pathname = usePathname();
  const dashboardDriverRef = useRef<ReturnType<typeof driver> | null>(null);
  const evalDriverRef = useRef<ReturnType<typeof driver> | null>(null);

  // Legacy dashboard auto-tour (unchanged behavior for `/dashboard*`).
  useEffect(() => {
    const isDashboard = pathname?.startsWith("/dashboard") ?? false;
    if (!isDashboard) {
      if (dashboardDriverRef.current?.isActive()) {
        dashboardDriverRef.current.destroy();
        dashboardDriverRef.current = null;
      }
      return;
    }

    if (typeof window === "undefined") return;
    if (dashboardDriverRef.current?.isActive()) return;
    const hasSeenTour = window.localStorage.getItem("hasSeenTour");
    if (hasSeenTour) return;

    const instance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: "Done",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      onDestroyed: () => {
        window.localStorage.setItem("hasSeenTour", "true");
      },
      steps: DASHBOARD_STEPS.map((step) => ({ ...step })),
    });
    dashboardDriverRef.current = instance;
    instance.drive();

    return () => {
      if (dashboardDriverRef.current?.isActive()) {
        dashboardDriverRef.current.destroy();
      }
      dashboardDriverRef.current = null;
    };
  }, [pathname]);

  // Evaluation training event listener. The training is fully
  // researcher-triggered; we never auto-run it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      // Destroy any prior instance so repeated "Rerun training" presses
      // always start from step 0.
      if (evalDriverRef.current?.isActive()) {
        evalDriverRef.current.destroy();
      }
      const instance = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "#020617",
        overlayOpacity: 0.55,
        smoothScroll: false,
        popoverClass: EVAL_POPOVER_CLASS,
        doneBtnText: "Begin tasks",
        nextBtnText: "Next",
        prevBtnText: "Previous",
        onPopoverRender: (popover) => {
          // The default driver.js theme is light; restyle the popover
          // elements to the dark card language from the UI spec.
          popover.wrapper.classList.add(
            cn(
              "rounded-lg border border-border bg-card text-card-foreground",
              "shadow-xl backdrop-blur",
            ),
          );
          popover.wrapper.style.padding = "16px";
          popover.wrapper.style.maxWidth = "420px";
          popover.title.classList.add("text-base font-semibold text-foreground");
          popover.title.style.marginBottom = "6px";
          popover.description.classList.add("text-sm leading-relaxed text-muted-foreground");
          popover.description.style.fontSize = "14px";
          popover.footer.style.marginTop = "16px";
          popover.footer.classList.add("flex items-center justify-between gap-2");
          for (const button of [popover.nextButton, popover.previousButton]) {
            button.classList.add(
              "rounded-md border border-border bg-muted px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted/80",
            );
            button.style.background = "";
            button.style.color = "";
            button.style.border = "";
          }
          popover.nextButton.classList.add(
            "border-violet-500/70 bg-violet-500/15 text-violet-100",
          );
          popover.closeButton.classList.add("text-muted-foreground hover:text-foreground");
          popover.progress.classList.add("text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground");
          popover.arrow.style.borderTopColor = "rgb(255 255 255 / 1)";
        },
        steps: EVAL_TRAINING_STEPS.map((step) => ({
          popover: { ...step.popover },
        })),
      });
      evalDriverRef.current = instance;
      instance.drive();
    };
    window.addEventListener(EVAL_TRAINING_EVENT, handler);
    return () => {
      window.removeEventListener(EVAL_TRAINING_EVENT, handler);
      if (evalDriverRef.current?.isActive()) {
        evalDriverRef.current.destroy();
      }
      evalDriverRef.current = null;
    };
  }, []);

  return null;
}

import { ATS_PERCEPTION_SLUG, isValidExperimentSlug, listExperiments } from "./experiments";

export type StudyStep = "consent" | "instructions" | "practice" | "trial" | "questionnaire" | "debrief";

const STEP_PATHS: Record<StudyStep, string> = {
  consent: "/consent",
  instructions: "/instructions",
  practice: "/practice",
  trial: "/trial",
  questionnaire: "/questionnaire",
  debrief: "/debrief",
};

export function studyStepHref(step: StudyStep, slug: string): string {
  return `${STEP_PATHS[step]}?next=${encodeURIComponent(slug)}`;
}

export function resolveStudyExperimentSlug(requested: string | null): string {
  const fallback = listExperiments()[0]?.slug ?? ATS_PERCEPTION_SLUG;
  if (!requested || !isValidExperimentSlug(requested)) return fallback;
  return requested;
}

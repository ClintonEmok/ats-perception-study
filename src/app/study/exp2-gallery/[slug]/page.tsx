import { notFound } from "next/navigation";
import { Exp2ComboDetailView } from "@/components/study/Exp2ComboDetailView";
import { loadExp2Data, type Exp2Variant } from "@/lib/ats-study/exp2-data";
import { exp2WindowSlug } from "@/lib/ats-study/exp2-route";

const BASELINE_LABELS = {
  uniform: "Uniform",
  raw_density: "Raw density",
  density_mild: "Raw density (mild)",
  density_firm: "Raw density (firm)",
} as const;

const WARP_LABELS = {
  warp_100: "Warp 100%",
  warp_150: "Warp 150%",
  warp_200: "Warp 200%",
  warp_300: "Warp 300%",
} as const;

function resolveVariant(value: string | string[] | undefined): Exp2Variant {
  if (Array.isArray(value)) return value[0] === "warp" ? "warp" : "baseline";
  return value === "warp" ? "warp" : "baseline";
}

export default async function Exp2GalleryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const [{ slug }, { variant }] = await Promise.all([params, searchParams]);
  const resolvedVariant = resolveVariant(variant);
  console.debug("[exp2-gallery-detail] route", { slug, variant, resolvedVariant });
  const data = loadExp2Data(resolvedVariant);
  if (!data) notFound();

  const windowData = data.windows.find((window) => exp2WindowSlug(window) === slug);
  console.debug("[exp2-gallery-detail] lookup", {
    slug,
    resolvedVariant,
    found: Boolean(windowData),
    available: data.windows.map((window) => exp2WindowSlug(window)),
  });
  if (!windowData) notFound();

  return (
    <Exp2ComboDetailView
      windowData={windowData}
      title={resolvedVariant === "warp" ? "Warp-factor visualization detail" : "ATS visualization detail"}
      backHref="/study/exp2-gallery"
      strategyLabels={resolvedVariant === "warp" ? WARP_LABELS : BASELINE_LABELS}
      rugMode={resolvedVariant === "warp" ? "always" : "uniform-only"}
    />
  );
}

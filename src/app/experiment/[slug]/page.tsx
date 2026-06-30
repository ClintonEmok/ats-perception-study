import { redirect } from "next/navigation";
import { isValidExperimentSlug } from "@/lib/ats-study/experiments";

export interface ExperimentPageProps {
  params: Promise<{ slug: string }>;
}
export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = await params;

  if (!isValidExperimentSlug(slug)) {
    redirect("/");
  }

  redirect(`/consent?next=${slug}`);
}

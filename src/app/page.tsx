import Link from "next/link";
import { ATS_PERCEPTION_SLUG } from "@/lib/ats-study/experiments";

export default function Home() {
  const href = `/experiment/${ATS_PERCEPTION_SLUG}`;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ATS Perception Study</h1>
      <p className="text-sm text-slate-700">
        A short, anonymous web experiment comparing two timeline visualizations. You will see 26 timeline stimuli and answer brief questions about them. No personally identifying information is collected.
      </p>
      <Link
        href={href}
        className="inline-flex min-w-[220px] items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Start the experiment
      </Link>
      <p className="text-xs text-slate-500">Estimated time: 8–12 minutes. Desktop browser recommended.</p>
    </main>
  );
}

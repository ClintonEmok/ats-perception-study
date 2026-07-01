import { Suspense } from "react";
import { TrialRouteClient } from "./TrialRouteClient";

export default function TrialPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading trial…</div>}>
      <TrialRouteClient />
    </Suspense>
  );
}

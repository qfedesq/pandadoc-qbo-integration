"use client";

import { Button } from "@/components/ui/button";

export default function FactoringDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 p-8 text-rose-50">
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
        Dashboard unavailable
      </p>
      <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
        The factoring dashboard could not be loaded.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-rose-100/90">
        {error.message || "An unexpected server error interrupted the dashboard request."}
      </p>
      <Button className="mt-5" onClick={reset} variant="outline">
        Retry
      </Button>
    </div>
  );
}

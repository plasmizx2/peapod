"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-md">
        <h1 className="font-display text-2xl font-semibold text-forest-dark sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-moss">
          This part of the dashboard hit an unexpected error. Try again — if it
          keeps happening, refreshing the page usually helps.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-moss/60">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-forest px-5 py-2.5 text-sm font-semibold text-mint-light shadow transition hover:bg-forest-dark"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-2xl border border-forest/15 px-5 py-2.5 text-sm font-medium text-forest-dark transition hover:bg-sage/10"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

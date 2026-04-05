"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-6">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-forest-dark">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-moss">
            An unexpected error occurred. Try refreshing — if it keeps happening,
            something on our end needs fixing.
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
              href="/"
              className="rounded-2xl border border-forest/15 px-5 py-2.5 text-sm font-medium text-forest-dark transition hover:bg-sage/10"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

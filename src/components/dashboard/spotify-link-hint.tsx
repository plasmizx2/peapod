"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

/**
 * Phase A: prompt to link/reconnect Spotify when the Web API isn’t usable.
 */
export function SpotifyLinkHint() {
  const [state, setState] = useState<
    "loading" | "ok" | "needs_attention"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/spotify/connection");
      const data = (await res.json()) as { ok?: boolean };
      if (cancelled) return;
      if (!res.ok) {
        setState("needs_attention");
        return;
      }
      setState(data.ok === true ? "ok" : "needs_attention");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== "needs_attention") {
    return null;
  }

  return (
    <div
      className="mb-4 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-forest-dark"
      role="status"
    >
      <AlertCircle
        className="h-5 w-5 shrink-0 text-amber-700"
        aria-hidden
      />
      <div>
        <p className="font-medium text-amber-950">
          Link or reconnect Spotify for this device
        </p>
        <p className="mt-1 text-amber-900/90">
          Group search, playlist import, and playback need an up-to-date Spotify
          connection (reconnect after we add new permissions).
        </p>
        <Link
          href="/dashboard/accounts"
          className="mt-2 inline-block font-medium text-forest underline-offset-2 hover:underline"
        >
          Open Music services →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function SpotifySyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        imported?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Sync failed");
        return;
      }
      setMessage(
        `Imported ${data.imported ?? 0} new plays (${data.skipped ?? 0} already had or skipped).`,
      );
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={() => void sync()}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest/20 bg-white px-4 py-2.5 text-sm font-semibold text-forest-dark shadow-sm transition hover:bg-sage/15 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden />
        )}
        {loading ? "Syncing…" : "Sync recent plays"}
      </button>
      {message ? (
        <p className="text-sm text-moss" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

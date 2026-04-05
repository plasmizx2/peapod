"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function JoinButton({
  sessionId,
  joinCode,
}: {
  sessionId: string;
  joinCode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });
      const data = (await res.json()) as { error?: string; sessionId?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not join — try again.");
        return;
      }
      router.push(
        `/dashboard/sessions?session=${data.sessionId ?? sessionId}`,
      );
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleJoin()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3 text-sm font-semibold text-mint-light shadow-lg transition hover:bg-forest-dark disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        Join session
      </button>
      {error ? (
        <p className="text-center text-xs text-rust">{error}</p>
      ) : null}
    </div>
  );
}

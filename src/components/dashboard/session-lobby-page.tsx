"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";

type Member = {
  userId: string;
  role: string;
  displayName: string;
  joinedAt: string;
};

type LobbyState = {
  joinCode: string;
  members: Member[];
  hostUserId: string;
};

export function SessionLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");

  const [joinInput, setJoinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);

  const activeId = sessionFromUrl;

  const fetchLobby = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const data = (await res.json()) as { error?: string; members?: Member[]; joinCode?: string; hostUserId?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load session");
      setLobby(null);
      return;
    }
    if (data.joinCode && data.members && data.hostUserId) {
      setLobby({
        joinCode: data.joinCode,
        members: data.members,
        hostUserId: data.hostUserId,
      });
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setLobby(null);
      setError(null);
      return;
    }
    void fetchLobby(activeId);
    const t = setInterval(() => void fetchLobby(activeId), 2500);
    return () => clearInterval(t);
  }, [activeId, fetchLobby]);

  async function createSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/create", { method: "POST" });
      const data = (await res.json()) as { error?: string; sessionId?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      if (data.sessionId) {
        router.replace(`/dashboard/sessions?session=${data.sessionId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function joinSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinInput }),
      });
      const data = (await res.json()) as { error?: string; sessionId?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      if (data.sessionId) {
        router.replace(`/dashboard/sessions?session=${data.sessionId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-dark">
          Group session
        </h1>
        <p className="mt-2 text-moss">
          Create a lobby or join with a code — shared queue &amp; voting come in
          later phases.
        </p>
      </div>

      {!activeId ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-md">
            <h2 className="font-semibold text-forest-dark">Start a session</h2>
            <p className="mt-2 text-sm text-moss">You&apos;ll get a code to share.</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void createSession()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-forest px-5 py-2.5 text-sm font-medium text-mint-light disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Create session
            </button>
          </div>
          <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md">
            <h2 className="font-semibold text-forest-dark">Join a session</h2>
            <label className="sr-only" htmlFor="join-code">
              Join code
            </label>
            <input
              id="join-code"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="6-character code"
              className="mt-4 w-full rounded-xl border border-forest/15 bg-cream/80 px-3 py-2 text-forest-dark placeholder:text-moss/60 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/25"
            />
            <button
              type="button"
              disabled={loading || joinInput.trim().length < 4}
              onClick={() => void joinSession()}
              className="mt-3 rounded-2xl border border-sage/50 bg-mint/20 px-5 py-2.5 text-sm font-medium text-forest-dark disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {activeId && lobby ? (
        <div className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-md sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-sage" aria-hidden />
            <h2 className="text-lg font-semibold text-forest-dark">Lobby</h2>
          </div>
          <p className="text-sm text-moss">
            Share code:{" "}
            <span className="font-mono text-lg font-semibold tracking-widest text-forest-dark">
              {lobby.joinCode}
            </span>
          </p>
          <p className="mt-1 text-xs text-moss">
            {lobby.members.length} participant
            {lobby.members.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-4 space-y-2">
            {lobby.members.map((m) => (
              <li
                key={m.userId}
                className="flex justify-between text-sm text-forest-dark"
              >
                <span>{m.displayName}</span>
                <span className="text-moss">
                  {m.role === "host" ? "Host" : "Member"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => router.push("/dashboard/sessions")}
            className="mt-6 text-sm font-medium text-sage underline decoration-sage/40 underline-offset-2 hover:text-forest-dark"
          >
            Leave — back to start
          </button>
        </div>
      ) : null}

      {activeId && !lobby && !error ? (
        <p className="text-moss">Loading lobby…</p>
      ) : null}
    </div>
  );
}

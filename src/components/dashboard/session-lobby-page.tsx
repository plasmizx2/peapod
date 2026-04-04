"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Radio, Users } from "lucide-react";
import {
  SessionQueuePanel,
  type QueueItem,
} from "@/components/dashboard/session-queue-panel";

type Member = {
  userId: string;
  role: string;
  displayName: string;
  joinedAt: string;
};

type LobbyState = {
  joinCode: string;
  status: string;
  hostUserId: string;
  isHost: boolean;
  queueMode: string;
  driverUserId: string | null;
  driverSavePlaylistId: string | null;
  members: Member[];
  queue: QueueItem[];
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
    const data = (await res.json()) as {
      error?: string;
      members?: Member[];
      joinCode?: string;
      hostUserId?: string;
      status?: string;
      isHost?: boolean;
      queue?: QueueItem[];
      queueMode?: string;
      driverUserId?: string | null;
      driverSavePlaylistId?: string | null;
    };
    if (!res.ok) {
      setError(data.error ?? "Failed to load session");
      setLobby(null);
      return;
    }
    if (
      data.joinCode &&
      data.members &&
      data.hostUserId &&
      data.status &&
      typeof data.isHost === "boolean"
    ) {
      setLobby({
        joinCode: data.joinCode,
        status: data.status,
        hostUserId: data.hostUserId,
        members: data.members,
        isHost: data.isHost,
        queueMode: data.queueMode ?? "manual",
        driverUserId: data.driverUserId ?? null,
        driverSavePlaylistId: data.driverSavePlaylistId ?? null,
        queue: data.queue ?? [],
      });
      setError(null);
    }
  }, []);

  const patchSession = useCallback(
    async (body: {
      queueMode?: string;
      driverUserId?: string | null;
      driverSavePlaylistId?: string | null;
    }) => {
      if (!activeId) return false;
      const res = await fetch(`/api/sessions/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    },
    [activeId],
  );

  useEffect(() => {
    if (!activeId) {
      setLobby(null);
      setError(null);
      return;
    }

    void fetchLobby(activeId);

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      es = new EventSource(`/api/sessions/${activeId}/stream`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as
            | { type: "gone" }
            | {
                type: "lobby";
                isHost: boolean;
                joinCode: string;
                status: string;
                hostUserId: string;
                members: Member[];
                queue?: QueueItem[];
                queueMode?: string;
                driverUserId?: string | null;
                driverSavePlaylistId?: string | null;
              };
          if (data.type === "gone") {
            setError("You’re not in this session anymore.");
            setLobby(null);
            es?.close();
            return;
          }
          if (data.type === "lobby") {
            setLobby({
              joinCode: data.joinCode,
              status: data.status,
              hostUserId: data.hostUserId,
              members: data.members,
              isHost: data.isHost,
              queueMode: data.queueMode ?? "manual",
              driverUserId: data.driverUserId ?? null,
              driverSavePlaylistId: data.driverSavePlaylistId ?? null,
              queue: data.queue ?? [],
            });
            setError(null);
          }
        } catch {
          /* ignore malformed chunks */
        }
      };
      es.onerror = () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 1200);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
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

  async function leaveSession() {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${activeId}/leave`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not leave");
        return;
      }
      router.push("/dashboard/sessions");
    } finally {
      setLoading(false);
    }
  }

  async function endSession() {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${activeId}/end`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not end session");
        return;
      }
      await fetchLobby(activeId);
    } finally {
      setLoading(false);
    }
  }

  const sessionEnded = lobby?.status === "ended";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-dark">
          Group session
        </h1>
        <p className="mt-2 text-moss">
          Share a code or join a friend — lobby and queue update live. Host
          plays Spotify on their device; everyone can vote and add tracks.
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5 text-sage" aria-hidden />
            <h2 className="text-lg font-semibold text-forest-dark">Lobby</h2>
            {!sessionEnded ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-xs font-medium text-forest-dark">
                <Radio className="h-3.5 w-3.5" aria-hidden />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-moss/20 px-2 py-0.5 text-xs font-medium text-moss">
                Ended
              </span>
            )}
          </div>

          {sessionEnded ? (
            <p className="mb-4 text-sm text-moss">
              This session has ended. You can leave when you&apos;re done.
            </p>
          ) : (
            <p className="text-sm text-moss">
              Share code:{" "}
              <span className="font-mono text-lg font-semibold tracking-widest text-forest-dark">
                {lobby.joinCode}
              </span>
            </p>
          )}

          <p className="mt-1 text-xs text-moss">
            {lobby.members.length} participant
            {lobby.members.length === 1 ? "" : "s"}
            {lobby.isHost ? " · You’re the host" : null}
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

          <div className="mt-6 flex flex-wrap gap-3">
            {lobby.isHost && !sessionEnded ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void endSession()}
                className="rounded-2xl border border-rust/40 bg-rust/15 px-4 py-2 text-sm font-medium text-forest-dark hover:bg-rust/25 disabled:opacity-50"
              >
                End session for everyone
              </button>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void leaveSession()}
              className="rounded-2xl border border-sage/50 bg-mint/20 px-4 py-2 text-sm font-medium text-forest-dark hover:bg-mint/35 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="inline h-4 w-4 animate-spin" aria-hidden />
              ) : null}{" "}
              Leave
            </button>
          </div>

          {activeId ? (
            <SessionQueuePanel
              sessionId={activeId}
              sessionActive={!sessionEnded}
              isHost={lobby.isHost}
              queue={lobby.queue}
              queueMode={lobby.queueMode}
              members={lobby.members.map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
              }))}
              driverUserId={lobby.driverUserId}
              driverSavePlaylistId={lobby.driverSavePlaylistId}
              onRefresh={() => void fetchLobby(activeId)}
              onPatchSession={patchSession}
            />
          ) : null}
        </div>
      ) : null}

      {activeId && !lobby && !error ? (
        <p className="text-moss">Loading lobby…</p>
      ) : null}
    </div>
  );
}

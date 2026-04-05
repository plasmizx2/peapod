"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock,
  Loader2,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Friend = {
  friendshipId: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  direction: "sent" | "received";
  createdAt: string;
};

export function FriendsPageClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setFriends(data.friends ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendRequest = async () => {
    if (!query.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSendResult({ ok: true, msg: "Request sent!" });
        setQuery("");
        void load();
      } else {
        setSendResult({ ok: false, msg: data.error ?? "Something went wrong" });
      }
    } finally {
      setSending(false);
    }
  };

  const respond = async (friendshipId: string, action: "accepted" | "declined") => {
    setActionBusy(friendshipId);
    try {
      await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      void load();
    } finally {
      setActionBusy(null);
    }
  };

  const unfriend = async (friendshipId: string) => {
    setActionBusy(friendshipId);
    try {
      await fetch(`/api/friends?id=${friendshipId}`, { method: "DELETE" });
      void load();
    } finally {
      setActionBusy(null);
    }
  };

  const pending = friends.filter((f) => f.status === "pending");
  const accepted = friends.filter((f) => f.status === "accepted");
  const incomingPending = pending.filter((f) => f.direction === "received");
  const outgoingPending = pending.filter((f) => f.direction === "sent");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="font-display text-3xl font-semibold text-forest-dark sm:text-4xl">
          Friends
        </h1>
        <p className="mt-2 text-base text-moss">
          Add friends to see their listening activity.
        </p>
      </motion.div>

      {/* Add friend form */}
      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-sage" />
          <h2 className="text-lg font-semibold text-forest-dark">Add a friend</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendRequest()}
              placeholder="Email, friend code, or phone number"
              className="w-full rounded-xl border border-forest/15 bg-white py-3 pl-10 pr-4 text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>
          <button
            type="button"
            disabled={sending || !query.trim()}
            onClick={() => void sendRequest()}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 font-medium text-mint-light transition-all hover:bg-forest-dark disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>
        <AnimatePresence>
          {sendResult ? (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 text-sm ${sendResult.ok ? "text-[#1DB954]" : "text-rust"}`}
            >
              {sendResult.msg}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Incoming requests */}
      {incomingPending.length > 0 ? (
        <motion.div
          className="rounded-3xl border border-sage/30 bg-sage/8 p-6 shadow-md sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold text-forest-dark">
              Pending requests
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sage text-xs font-bold text-white">
                {incomingPending.length}
              </span>
            </h2>
          </div>
          <ul className="space-y-3">
            {incomingPending.map((f) => (
              <motion.li
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 rounded-xl border border-forest/10 bg-white/60 px-4 py-3"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20 text-sm font-bold text-forest-dark">
                    {f.displayName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-forest-dark">{f.displayName}</p>
                    <p className="text-xs text-moss">{f.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={actionBusy === f.friendshipId}
                    onClick={() => void respond(f.friendshipId, "accepted")}
                    className="inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-mint-light hover:bg-forest-dark disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy === f.friendshipId}
                    onClick={() => void respond(f.friendshipId, "declined")}
                    className="inline-flex items-center gap-1 rounded-lg border border-forest/15 px-3 py-1.5 text-xs font-medium text-moss hover:bg-rust/10 hover:text-rust disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      {/* Outgoing pending */}
      {outgoingPending.length > 0 ? (
        <motion.div
          className="rounded-3xl border border-forest/10 bg-white/60 p-6 shadow-md sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-semibold text-forest-dark">Sent requests</h2>
          </div>
          <ul className="space-y-2">
            {outgoingPending.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 rounded-xl border border-forest/10 bg-white/40 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-moss/10 text-xs font-bold text-moss">
                    {f.displayName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium text-forest-dark">{f.displayName}</span>
                    <span className="ml-2 text-xs text-moss">Waiting...</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionBusy === f.friendshipId}
                  onClick={() => void unfriend(f.friendshipId)}
                  className="text-xs text-moss hover:text-rust disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      {/* Friends list */}
      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#1DB954]" />
          <h2 className="text-lg font-semibold text-forest-dark">
            Friends
            {accepted.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-moss">
                ({accepted.length})
              </span>
            ) : null}
          </h2>
        </div>
        {accepted.length === 0 ? (
          <p className="py-6 text-center text-sm text-moss">
            No friends yet. Add someone above to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((f, idx) => (
              <motion.li
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 rounded-xl border border-forest/10 bg-white/60 px-4 py-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954]/15 text-sm font-bold text-forest-dark">
                    {f.displayName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-forest-dark">{f.displayName}</p>
                    <p className="text-xs text-moss">{f.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionBusy === f.friendshipId}
                  onClick={() => void unfriend(f.friendshipId)}
                  title="Unfriend"
                  className="rounded-lg p-2 text-moss transition-colors hover:bg-rust/10 hover:text-rust disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}

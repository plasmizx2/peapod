"use client";

import { useState, useRef, useEffect } from "react";
import {
  ExternalLink,
  ListMusic,
  Loader2,
  Send,
  Sparkles,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type MoodTrack = {
  position: number;
  trackName: string;
  artistName: string;
  score: number;
  spotifyId: string;
  isDiscovery?: boolean;
};

type MoodOk = {
  ok: true;
  playlistId: string;
  title: string;
  preset: string;
  explanation: string;
  tracks: MoodTrack[];
  intentLabel: string;
  moodEngine?: "gemini" | "preset" | null;
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  result?: MoodOk;
  isAdjusting?: boolean;
};

const TUNE_ACTIONS = [
  {
    key: "lift" as const,
    label: "More energy",
    hint: "Switches to a higher-energy mix (workout-style picks from your history).",
  },
  {
    key: "stay" as const,
    label: "Same vibe",
    hint: "Keeps the same mood; use after a small prompt change or to confirm you like this direction.",
  },
  {
    key: "shift" as const,
    label: "Different mood",
    hint: "Rotates through other moods (late night → gym → focus → nostalgic).",
  },
];

function spotifyTrackUrl(spotifyId: string) {
  return `https://open.spotify.com/track/${spotifyId}`;
}

export function MoodDjClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "ai",
      text: "What’s the vibe? Describe how you feel or what you’re doing. I’ll rank tracks from your listening history to match (with optional AI discovery when Gemini is enabled). PeaPod doesn’t auto-play in the browser — open tracks in Spotify, or save the full list to your Spotify account.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPlaylistId, setExportingPlaylistId] = useState<string | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastPlaylistWithResult = [...messages]
    .reverse()
    .find((m) => m.result?.tracks && m.result.tracks.length > 0);
  const showGeminiActive =
    lastPlaylistWithResult?.result?.moodEngine === "gemini";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);
    setExportError(null);

    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: data?.ok
          ? data.explanation
          : typeof data?.error === "string"
            ? data.error
            : "Request failed",
        result: data?.ok ? (data as MoodOk) : undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "Network error — I couldn't process that right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function exportToSpotify(playlistId: string) {
    setExportError(null);
    setExportingPlaylistId(playlistId);
    try {
      const res = await fetch(
        `/api/playlists/generated/${encodeURIComponent(playlistId)}/export-spotify`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        spotifyUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.spotifyUrl) {
        setExportError(
          typeof data.error === "string"
            ? data.error
            : "Could not save playlist to Spotify.",
        );
        return;
      }
      window.open(data.spotifyUrl, "_blank", "noopener,noreferrer");
    } catch {
      setExportError("Network error while saving to Spotify.");
    } finally {
      setExportingPlaylistId(null);
    }
  }

  async function adjust(
    msgId: string,
    playlistId: string,
    adjustment: "lift" | "stay" | "shift",
  ) {
    setLoading(true);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isAdjusting: true } : m)),
    );

    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustment,
          lastPlaylistId: playlistId,
        }),
      });
      const data = await res.json();

      if (res.ok && data?.ok) {
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === msgId ? { ...m, isAdjusting: false } : m,
          ),
          {
            id: Date.now().toString(),
            role: "ai",
            text: `Updated the mix: ${data.explanation}`,
            result: data as MoodOk,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === msgId ? { ...m, isAdjusting: false } : m,
          ),
          {
            id: Date.now().toString(),
            role: "ai",
            text:
              typeof data?.error === "string"
                ? data.error
                : "Couldn’t adjust the mix.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === msgId ? { ...m, isAdjusting: false } : m,
        ),
        {
          id: Date.now().toString(),
          role: "ai",
          text: "Network error while adjusting.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden rounded-3xl border border-forest/10 bg-white/80 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-forest/10 bg-mint-light/50 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-forest-dark">
            PeaPod AI
          </h2>
          <p className="text-xs font-medium text-moss">
            Your intelligent DJ. Powered by your patterns.
          </p>
          {showGeminiActive ? (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse"
                aria-hidden
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                PeaPod AI blend active
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chat History */}
      <div className="hide-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex max-w-[85%] flex-col gap-2 ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div className="flex items-center gap-2 px-2">
                {msg.role === "ai" ? (
                  <span className="text-xs font-bold uppercase tracking-wider text-sage">
                    AI DJ
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider text-forest-dark/50">
                    You
                  </span>
                )}
              </div>

              <div
                className={`p-4 text-[15px] leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-tr-sm bg-forest text-mint-light"
                    : "rounded-2xl rounded-tl-sm border border-forest/10 bg-cream text-forest-dark"
                }`}
              >
                {msg.text}
              </div>

              {/* Rich Playlist Card */}
              {msg.result && msg.result.tracks.length > 0 ? (
                <div className="mt-2 w-full min-w-[280px] max-w-sm overflow-hidden rounded-2xl border border-sage/20 bg-mint-light/30 shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-sage/20 bg-sage/10 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-moss/80">
                      {msg.result.intentLabel}
                    </span>
                    <h4 className="leading-tight font-bold text-forest-dark">
                      {msg.result.title}
                    </h4>
                    {msg.result.moodEngine === "gemini" ? (
                      <p className="mt-1 text-[10px] leading-snug text-emerald-900/80">
                        Includes ~20% discovery picks (labeled “New pick”) from
                        Spotify search, chosen to match your vibe.
                      </p>
                    ) : null}
                  </div>

                  <div className="border-b border-sage/15 bg-white/40 px-4 py-3">
                    <p className="text-[11px] leading-relaxed text-moss">
                      <span className="font-medium text-forest-dark">
                        Playback:
                      </span>{" "}
                      This list lives in PeaPod first. Open Spotify to hear
                      tracks, or save the full playlist to your Spotify
                      account (requires Spotify linked under Music services).
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {msg.result.tracks[0]?.spotifyId ? (
                        <a
                          href={spotifyTrackUrl(msg.result.tracks[0].spotifyId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1DB954] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ed760]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Play first song in Spotify
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={
                          exportingPlaylistId === msg.result.playlistId ||
                          loading
                        }
                        onClick={() =>
                          void exportToSpotify(msg.result!.playlistId)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1DB954]/40 bg-white px-3 py-2 text-xs font-semibold text-forest-dark shadow-sm transition hover:bg-mint-light/50 disabled:opacity-40"
                      >
                        {exportingPlaylistId === msg.result.playlistId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ListMusic className="h-3.5 w-3.5 text-[#1DB954]" />
                        )}
                        Save playlist to my Spotify
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <ol className="flex flex-col gap-3">
                      {msg.result.tracks.map((t) => (
                        <li
                          key={`${t.position}-${t.trackName}`}
                          className="flex items-start gap-3"
                        >
                          <span className="w-4 pt-[2px] text-right text-xs font-medium text-moss/50">
                            {t.position}
                          </span>
                          <div className="min-w-0 flex-1 flex-col">
                            <a
                              href={spotifyTrackUrl(t.spotifyId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex flex-wrap items-center gap-1.5 text-[13px] font-semibold leading-tight text-forest-dark underline decoration-sage/30 underline-offset-2 hover:text-sage hover:decoration-sage"
                            >
                              <span className="min-w-0 break-words">
                                {t.trackName}
                              </span>
                              {t.isDiscovery ? (
                                <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-900 no-underline">
                                  New pick
                                </span>
                              ) : null}
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                            </a>
                            <span className="text-[11px] text-moss line-clamp-1">
                              {t.artistName}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="border-t border-sage/20 bg-sage/5 px-4 py-3 pb-4">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-moss/70">
                      Adjust the mix
                    </span>
                    <p className="mb-3 text-[11px] leading-snug text-moss">
                      Fine-tune without typing. This updates the PeaPod list only
                      — it does not change Spotify playback. After Lift or Shift,
                      open a track or save to Spotify again to hear the new mix.
                      Same vibe keeps this exact list.
                    </p>
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      {TUNE_ACTIONS.map(({ key, label, hint }) => (
                        <button
                          key={key}
                          type="button"
                          title={hint}
                          disabled={msg.isAdjusting || loading}
                          onClick={() =>
                            void adjust(msg.id, msg.result!.playlistId, key)
                          }
                          className="flex min-h-[2.75rem] flex-1 flex-col items-center justify-center rounded-xl border border-sage/30 bg-white px-2 py-2 text-center transition hover:bg-sage/10 disabled:opacity-40 disabled:hover:bg-white"
                        >
                          <span className="text-xs font-semibold text-forest-dark">
                            {label}
                          </span>
                          <span className="mt-0.5 hidden text-[10px] leading-tight text-moss/80 sm:block">
                            {key === "lift"
                              ? "Higher energy"
                              : key === "stay"
                                ? "Keep preset"
                                : "Rotate mood"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : msg.result && msg.result.tracks.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-sage/20 bg-mint-light/30 p-4 text-[13px] text-moss italic">
                  No playable tracks matched.
                </div>
              ) : null}
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mr-auto flex max-w-[85%] items-start gap-2"
            >
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-forest/10 bg-cream p-4 text-[15px] text-moss">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Spinning up records...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-forest/10 bg-white/50 px-6 py-5">
        {exportError ? (
          <p className="mb-3 text-center text-[11px] text-rust" role="alert">
            {exportError}
          </p>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(prompt);
          }}
          className="relative flex gap-2 bg-transparent"
        >
          <input
            type="text"
            disabled={loading}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. moody instrumental hip hop to code to..."
            className="h-[52px] w-full rounded-2xl border border-forest/20 bg-white pl-5 pr-14 text-[15px] text-forest-dark shadow-sm transition placeholder:text-moss/60 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="absolute bottom-1.5 right-2 top-1.5 flex w-10 items-center justify-center rounded-xl bg-forest text-mint-light transition hover:bg-forest-dark focus:outline-none focus:ring-2 focus:ring-forest/50 disabled:bg-forest/30 disabled:text-mint-light"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium uppercase tracking-widest text-moss/50">
          <Layers className="h-3 w-3" aria-hidden />
          Saved in PeaPod · open tracks in Spotify to play
        </div>
      </div>
    </div>
  );
}

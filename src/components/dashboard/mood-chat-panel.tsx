"use client";

import { useState } from "react";
import { ExternalLink, ListMusic, Loader2, MessageCircle } from "lucide-react";

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

export function MoodChatPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MoodOk | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function send(promptText: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === "string" ? data.error : "Request failed");
        return;
      }
      setResult(data as MoodOk);
      setExportError(null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function exportToSpotify() {
    if (!result?.playlistId) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(
        `/api/playlists/generated/${encodeURIComponent(result.playlistId)}/export-spotify`,
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
      setExporting(false);
    }
  }

  async function adjust(adjustment: "lift" | "stay" | "shift") {
    if (!result?.playlistId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustment,
          lastPlaylistId: result.playlistId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === "string" ? data.error : "Request failed");
        return;
      }
      setResult(data as MoodOk);
      setExportError(null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-sage" aria-hidden />
        <h3 className="text-lg font-semibold text-forest-dark">Mood chat</h3>
      </div>
      <p className="mb-4 text-sm text-moss">
        Describe how you feel or what you&apos;re doing — we map it to your
        library patterns (with optional Gemini + discovery when configured).
        Lists are saved in PeaPod; open tracks in Spotify or save the full list
        to your Spotify account.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="mood-prompt">
          Mood prompt
        </label>
        <textarea
          id="mood-prompt"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. can’t sleep, need focus for coding, nostalgic Sunday…"
          className="min-h-[72px] flex-1 resize-y rounded-2xl border border-forest/15 bg-cream/80 px-4 py-3 text-sm text-forest-dark placeholder:text-moss/70 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
        <button
          type="button"
          disabled={loading || !prompt.trim()}
          onClick={() => {
            void send(prompt.trim());
          }}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-forest px-6 text-sm font-medium text-mint-light transition hover:bg-forest-dark disabled:opacity-50 sm:self-auto"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Send
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-forest-dark">
            <span className="font-medium">{result.intentLabel}</span>
            {" · "}
            {result.explanation}
          </p>
          <p className="font-medium text-forest-dark">{result.title}</p>
          {result.moodEngine === "gemini" ? (
            <p className="text-xs text-emerald-900/85">
              AI blend: ~20% tracks are discovery — labeled “New pick”.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {result.tracks[0]?.spotifyId ? (
              <a
                href={`https://open.spotify.com/track/${result.tracks[0].spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1DB954] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1ed760]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Play first in Spotify
              </a>
            ) : null}
            <button
              type="button"
              disabled={exporting || loading}
              onClick={() => void exportToSpotify()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#1DB954]/40 bg-white px-3 py-2 text-xs font-semibold text-forest-dark hover:bg-mint-light/50 disabled:opacity-40"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ListMusic className="h-3.5 w-3.5 text-[#1DB954]" />
              )}
              Save to my Spotify
            </button>
          </div>
          {exportError ? (
            <p className="text-xs text-rust" role="alert">
              {exportError}
            </p>
          ) : null}
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-moss">
            {result.tracks.map((t) => (
              <li key={`${t.position}-${t.trackName}`}>
                <a
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest-dark underline decoration-sage/40 underline-offset-2 hover:text-sage"
                >
                  {t.trackName}
                </a>
                {t.isDiscovery ? (
                  <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                    New pick
                  </span>
                ) : null}
                <span> — {t.artistName}</span>
              </li>
            ))}
          </ol>
          {result.tracks.length === 0 ? (
            <p className="text-sm text-moss">No tracks to rank yet.</p>
          ) : null}
          <div className="flex flex-col gap-2 border-t border-forest/10 pt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-moss">
              Adjust the mix
            </span>
            <p className="text-[11px] text-moss">
              Updates the PeaPod list only — not Spotify playback. After Lift or
              Shift, open a track or save to Spotify again. Same vibe keeps this
              exact list.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["lift", "More energy", "Higher-energy mix"],
                  ["stay", "Same vibe", "Keep this mood"],
                  ["shift", "Different mood", "Try another preset"],
                ] as const
              ).map(([key, label, sub]) => (
                <button
                  key={key}
                  type="button"
                  title={sub}
                  disabled={loading}
                  onClick={() => adjust(key)}
                  className="rounded-xl border border-sage/40 bg-mint/15 px-3 py-2 text-left text-sm font-medium text-forest-dark hover:bg-mint/30 disabled:opacity-50"
                >
                  <span className="block">{label}</span>
                  <span className="block text-[10px] font-normal text-moss">
                    {sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

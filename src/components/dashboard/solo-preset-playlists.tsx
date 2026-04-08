"use client";

import { useState } from "react";
import { ExternalLink, ListMusic, Loader2 } from "lucide-react";
import { SOLO_PRESETS } from "@/lib/playlists/presets";
import type { GeneratePlaylistResponse } from "@/types/playlists";

export function SoloPresetPlaylists() {
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratePlaylistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function run(preset: string) {
    setLoadingPreset(preset);
    setError(null);
    try {
      const res = await fetch("/api/playlists/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = (await res.json()) as
        | GeneratePlaylistResponse
        | { error?: string };
      if (!res.ok || !("ok" in data) || !data.ok) {
        setError(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not generate playlist",
        );
        setResult(null);
        return;
      }
      setResult(data);
      setExportError(null);
    } catch {
      setError("Something went wrong — try again.");
      setResult(null);
    } finally {
      setLoadingPreset(null);
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

  return (
    <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <ListMusic className="h-5 w-5 text-[#1DB954]" aria-hidden />
        <h3 className="text-lg font-semibold text-forest-dark">
          Solo presets
        </h3>
      </div>
      <p className="mb-4 text-sm text-moss">
        Ranked from your library stats — same taste picture you see above, in
        playlist form. Open tracks in Spotify or save the full list to your
        account.
      </p>
      <div className="flex flex-wrap gap-2">
        {SOLO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={loadingPreset !== null}
            onClick={() => run(p.id)}
            className="inline-flex items-center gap-2 rounded-2xl border border-sage/40 bg-mint/20 px-4 py-2 text-sm font-medium text-forest-dark transition hover:border-sage hover:bg-mint/40 disabled:opacity-60"
          >
            {loadingPreset === p.id ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {p.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-4 text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-6 rounded-2xl border border-forest/10 bg-cream/80 p-4">
          <p className="mb-3 font-medium text-forest-dark">{result.title}</p>
          <div className="mb-3 flex flex-wrap gap-2">
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
              disabled={exporting || loadingPreset !== null}
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
            <p className="mb-3 text-xs text-rust" role="alert">
              {exportError}
            </p>
          ) : null}
          <ol className="list-decimal space-y-2 pl-5 text-sm text-moss">
            {result.tracks.map((t) => (
              <li key={`${t.position}-${t.trackName}`} className="pl-1">
                <a
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest-dark underline decoration-sage/40 underline-offset-2 hover:text-sage"
                >
                  {t.trackName}
                </a>
                <span> — {t.artistName}</span>
              </li>
            ))}
          </ol>
          {result.tracks.length === 0 ? (
            <p className="text-sm text-moss">No tracks to rank yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

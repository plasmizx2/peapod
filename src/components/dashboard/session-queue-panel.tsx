"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  ListPlus,
  Loader2,
  Play,
  Plus,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";

export type QueueItem = {
  id: string;
  position: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  spotifyId: string;
  addedByDisplayName: string;
  playedAt: string | null;
  score: number | null;
  voteTotal: number;
  myVote: number | null;
};

type SearchHit = {
  id: string;
  name: string;
  artistName: string;
  albumName: string | null;
};

export function SessionQueuePanel({
  sessionId,
  sessionActive,
  isHost,
  queue,
  queueMode,
  members,
  driverUserId,
  driverSavePlaylistId,
  onRefresh,
  onPatchSession,
}: {
  sessionId: string;
  sessionActive: boolean;
  isHost: boolean;
  queue: QueueItem[];
  queueMode: string;
  members: { userId: string; displayName: string }[];
  driverUserId: string | null;
  driverSavePlaylistId: string | null;
  onRefresh: () => void;
  onPatchSession: (body: {
    queueMode?: string;
    driverUserId?: string | null;
    driverSavePlaylistId?: string | null;
  }) => Promise<boolean>;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [playbackBusy, setPlaybackBusy] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [playlistImportUrl, setPlaylistImportUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importInterleave, setImportInterleave] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [hostPlaylists, setHostPlaylists] = useState<
    { id: string; name: string; tracksTotal: number }[]
  >([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [spotifyDevices, setSpotifyDevices] = useState<
    { id: string; name: string; is_active: boolean; type: string }[]
  >([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);

  const runSearch = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/spotify/search?${new URLSearchParams({ q: t })}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        tracks?: SearchHit[];
        error?: string;
      };
      if (!res.ok) {
        setHits([]);
        setSearchError(data.error ?? "Search failed");
        return;
      }
      setHits(data.tracks ?? []);
    } catch {
      setSearchError("Network error");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void runSearch(q), 320);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const loadSpotifyDevices = useCallback(async () => {
    if (!isHost || !sessionActive) return;
    setDevicesLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/devices`);
      const data = (await res.json()) as {
        devices?: { id: string; name: string; is_active: boolean; type: string }[];
        error?: string;
      };
      if (res.ok && data.devices) {
        setSpotifyDevices(data.devices);
        setSelectedDeviceId((prev) => {
          if (prev && data.devices!.some((d) => d.id === prev)) {
            return prev;
          }
          try {
            const stored = localStorage.getItem(
              `peapod_spotify_device_${sessionId}`,
            );
            if (stored && data.devices!.some((d) => d.id === stored)) {
              return stored;
            }
          } catch {
            /* ignore */
          }
          const active = data.devices!.find((d) => d.is_active);
          return active?.id ?? data.devices![0]?.id ?? "";
        });
      } else {
        setSpotifyDevices([]);
      }
    } catch {
      setSpotifyDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, [isHost, sessionActive, sessionId]);

  useEffect(() => {
    if (!isHost || !sessionActive) {
      setSpotifyDevices([]);
      setSelectedDeviceId("");
      return;
    }
    try {
      const stored = localStorage.getItem(`peapod_spotify_device_${sessionId}`);
      if (stored) {
        setSelectedDeviceId(stored);
      }
    } catch {
      /* ignore */
    }
    void loadSpotifyDevices();
  }, [isHost, sessionActive, sessionId, loadSpotifyDevices]);

  useEffect(() => {
    if (!isHost || !sessionActive) {
      setHostPlaylists([]);
      setPlaylistsLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/spotify/playlists");
      const data = (await res.json()) as {
        playlists?: { id: string; name: string; tracksTotal: number }[];
        error?: string;
      };
      if (cancelled) return;
      if (res.ok && data.playlists) {
        setHostPlaylists(data.playlists);
      } else {
        setHostPlaylists([]);
      }
      setPlaylistsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isHost, sessionActive]);

  async function addTrack(spotifyTrackId: string) {
    setAddingId(spotifyTrackId);
    setSearchError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyTrackId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSearchError(data.error ?? "Could not add track");
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Could not add track");
    } finally {
      setAddingId(null);
    }
  }

  function persistDeviceId(id: string) {
    setSelectedDeviceId(id);
    try {
      if (id) {
        localStorage.setItem(`peapod_spotify_device_${sessionId}`, id);
      } else {
        localStorage.removeItem(`peapod_spotify_device_${sessionId}`);
      }
    } catch {
      /* ignore */
    }
  }

  async function activateSpotifyDevice() {
    if (!selectedDeviceId) return;
    setTransferBusy(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDeviceId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSearchError(data.error ?? "Could not switch device");
        return;
      }
      await loadSpotifyDevices();
    } catch {
      setSearchError("Could not switch device");
    } finally {
      setTransferBusy(false);
    }
  }

  async function playback(action: "next" | "all") {
    setPlaybackBusy(action);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(selectedDeviceId ? { deviceId: selectedDeviceId } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; hint?: string };
      if (!res.ok) {
        const main =
          data.error ?? "Playback failed — open Spotify on the host device.";
        setSearchError(
          data.hint ? `${main} ${data.hint}` : main,
        );
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Playback request failed");
    } finally {
      setPlaybackBusy(null);
    }
  }

  async function vote(queueItemId: string, value: -1 | 0 | 1) {
    setVoteBusy(queueItemId);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/queue/${queueItemId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSearchError(data.error ?? "Vote failed");
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Vote failed");
    } finally {
      setVoteBusy(null);
    }
  }

  async function removeItem(queueItemId: string) {
    setVoteBusy(queueItemId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/queue/${queueItemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSearchError(data.error ?? "Could not remove");
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Could not remove");
    } finally {
      setVoteBusy(null);
    }
  }

  async function applyOrder(nextIds: string[]) {
    setReorderBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedQueueItemIds: nextIds }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSearchError(data.error ?? "Could not reorder");
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Could not reorder");
    } finally {
      setReorderBusy(false);
    }
  }

  function moveItem(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= queue.length) return;
    const ids = queue.map((x) => x.id);
    const t = ids[index];
    ids[index] = ids[j];
    ids[j] = t;
    void applyOrder(ids);
  }

  async function rebalance() {
    setSettingsBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rebalance`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSearchError(data.error ?? "Rebalance failed");
        return;
      }
      onRefresh();
    } catch {
      setSearchError("Rebalance failed");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function setMode(mode: string) {
    setSettingsBusy(true);
    const ok = await onPatchSession({ queueMode: mode });
    setSettingsBusy(false);
    if (!ok) {
      setSearchError("Could not update mode");
    } else {
      onRefresh();
    }
  }

  async function setDriver(userId: string | null) {
    setSettingsBusy(true);
    const ok = await onPatchSession({ driverUserId: userId });
    setSettingsBusy(false);
    if (!ok) {
      setSearchError("Could not set driver");
    } else {
      onRefresh();
    }
  }

  async function importPlaylist() {
    setImportBusy(true);
    setSearchError(null);
    setImportFeedback(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/queue/import-playlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistUrlOrId: playlistImportUrl,
            interleave: importInterleave,
          }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        imported?: number;
        skippedDuplicates?: number;
        scannedFromPlaylist?: number;
        interleaved?: boolean;
        message?: string;
      };
      if (!res.ok) {
        setSearchError(data.error ?? "Import failed");
        return;
      }
      setPlaylistImportUrl("");
      const imported = data.imported ?? 0;
      if (imported === 0) {
        setImportFeedback(
          data.message ??
            "No new tracks added — they may already be in the unplayed queue.",
        );
      } else {
        const parts = [
          `Added ${imported} track${imported === 1 ? "" : "s"}`,
        ];
        const skip = data.skippedDuplicates ?? 0;
        if (skip > 0) {
          parts.push(
            `· skipped ${skip} duplicate${skip === 1 ? "" : "s"}`,
          );
        }
        const scanned = data.scannedFromPlaylist ?? 0;
        if (scanned > 0) {
          parts.push(`· ${scanned} seen in playlist`);
        }
        if (data.interleaved) {
          parts.push("· interleaved with the current queue");
        }
        setImportFeedback(parts.join(" "));
      }
      onRefresh();
    } catch {
      setSearchError("Import failed");
    } finally {
      setImportBusy(false);
    }
  }

  async function createDrivingLogPlaylist() {
    setSettingsBusy(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/driver-playlist`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSearchError(data.error ?? "Could not create playlist");
        return;
      }
      const plRes = await fetch("/api/spotify/playlists");
      const plData = (await plRes.json()) as {
        playlists?: { id: string; name: string; tracksTotal: number }[];
      };
      if (plRes.ok && plData.playlists) {
        setHostPlaylists(plData.playlists);
      }
      onRefresh();
    } catch {
      setSearchError("Could not create playlist");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function setDriverSavePlaylist(spotifyPlaylistId: string | null) {
    setSettingsBusy(true);
    const ok = await onPatchSession({
      driverSavePlaylistId: spotifyPlaylistId,
    });
    setSettingsBusy(false);
    if (!ok) {
      setSearchError("Could not update driving log playlist");
    } else {
      onRefresh();
    }
  }

  const unplayedCount = queue.filter((x) => !x.playedAt).length;

  return (
    <div className="mt-8 border-t border-forest/10 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <ListMusic className="h-5 w-5 text-[#1DB954]" aria-hidden />
        <h3 className="text-lg font-semibold text-forest-dark">Queue</h3>
      </div>
      <p className="mb-4 text-sm text-moss">
        Playback uses the <strong className="font-medium text-forest-dark">host&apos;s</strong>{" "}
        Spotify on their active device. Everyone can add songs or merge a playlist;
        the host can save songs that play to a Spotify playlist (driving log).
      </p>

      {isHost && sessionActive ? (
        <div className="mb-4 space-y-3 rounded-xl border border-forest/10 bg-white/60 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-moss">Mode</span>
            <select
              disabled={settingsBusy}
              value={queueMode}
              onChange={(e) => void setMode(e.target.value)}
              className="rounded-lg border border-forest/15 bg-white px-2 py-1 text-forest-dark"
            >
              <option value="manual">Manual</option>
              <option value="equal_play">Equal play</option>
              <option value="lean_driver">Lean driver</option>
              <option value="hype">Hype (votes)</option>
            </select>
            {queueMode !== "manual" ? (
              <button
                type="button"
                disabled={settingsBusy || reorderBusy}
                onClick={() => void rebalance()}
                className="rounded-lg bg-sage/30 px-2 py-1 text-xs font-medium text-forest-dark hover:bg-sage/45 disabled:opacity-50"
              >
                Rebalance queue
              </button>
            ) : null}
          </div>
          {queueMode === "lean_driver" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-moss">Driver (2× taste)</span>
              <select
                disabled={settingsBusy}
                value={driverUserId ?? ""}
                onChange={(e) =>
                  void setDriver(e.target.value ? e.target.value : null)
                }
                className="max-w-full rounded-lg border border-forest/15 bg-white px-2 py-1 text-forest-dark"
              >
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="border-t border-forest/10 pt-3">
            <p className="mb-2 text-xs font-medium text-forest-dark">
              Driving log (Spotify)
            </p>
            <p className="mb-2 text-xs text-moss">
              When you use Play next / Play all, those tracks append to this playlist
              on your Spotify account.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={settingsBusy}
                onClick={() => void createDrivingLogPlaylist()}
                className="rounded-lg bg-forest/10 px-2 py-1 text-xs font-medium text-forest-dark hover:bg-forest/20 disabled:opacity-50"
              >
                Create &quot;PeaPod · Driving log&quot;
              </button>
              {playlistsLoaded ? (
                <select
                  disabled={settingsBusy}
                  value={driverSavePlaylistId ?? ""}
                  onChange={(e) =>
                    void setDriverSavePlaylist(
                      e.target.value ? e.target.value : null,
                    )
                  }
                  className="max-w-[min(100%,220px)] rounded-lg border border-forest/15 bg-white px-2 py-1 text-xs text-forest-dark"
                >
                  <option value="">Off — don&apos;t save</option>
                  {hostPlaylists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tracksTotal} tracks)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-moss">Loading playlists…</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {sessionActive ? (
        <div className="mb-4 rounded-xl border border-forest/10 bg-white/50 p-3 text-sm">
          <div className="mb-2 flex items-center gap-2 text-forest-dark">
            <ListPlus className="h-4 w-4 text-[#1DB954]" aria-hidden />
            <span className="font-medium">Merge a Spotify playlist</span>
          </div>
          <p className="mb-2 text-xs text-moss">
            Paste a playlist link or ID — up to 200 tracks (your Spotify access).
            Songs already in the <strong className="font-medium text-forest-dark">unplayed</strong>{" "}
            queue are skipped. Long lists may take a few seconds.
          </p>
          <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs text-moss">
            <input
              type="checkbox"
              checked={importInterleave}
              onChange={(e) => setImportInterleave(e.target.checked)}
              className="mt-0.5 rounded border-forest/30"
            />
            <span>
              <strong className="font-medium text-forest-dark">Interleave</strong>{" "}
              with the current unplayed queue (round-robin: yours, mine, yours…)
              instead of appending the whole playlist at the end.
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={playlistImportUrl}
              onChange={(e) => setPlaylistImportUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              className="min-w-0 flex-1 rounded-lg border border-forest/15 bg-white px-3 py-2 text-xs text-forest-dark placeholder:text-moss/60"
            />
            <button
              type="button"
              disabled={importBusy || playlistImportUrl.trim().length < 8}
              onClick={() => void importPlaylist()}
              className="shrink-0 rounded-lg bg-forest px-3 py-2 text-xs font-medium text-mint-light hover:bg-forest-dark disabled:opacity-50"
            >
              {importBusy ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Importing…
                </span>
              ) : (
                "Import to queue"
              )}
            </button>
          </div>
          {importFeedback ? (
            <p className="mt-2 text-xs text-sage" role="status">
              {importFeedback}
            </p>
          ) : null}
        </div>
      ) : null}

      {isHost && sessionActive ? (
        <div className="mb-4 rounded-xl border border-forest/10 bg-white/50 p-3 text-sm">
          <p className="text-xs font-medium text-forest-dark">
            Spotify device (host)
          </p>
          <p className="mt-1 text-xs text-moss">
            Pick a Connect device for Play next / Play all, or use Spotify&apos;s
            current active player when none is selected.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => persistDeviceId(e.target.value)}
              disabled={devicesLoading}
              className="max-w-[min(100%,280px)] rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-xs text-forest-dark"
            >
              <option value="">
                {devicesLoading ? "Loading devices…" : "Default (active player)"}
              </option>
              {spotifyDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.is_active ? " · active" : ""} ({d.type})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={devicesLoading}
              onClick={() => void loadSpotifyDevices()}
              className="rounded-lg border border-forest/20 bg-white/80 px-2 py-1 text-xs font-medium text-forest-dark hover:bg-white disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={transferBusy || !selectedDeviceId}
              onClick={() => void activateSpotifyDevice()}
              className="rounded-lg bg-forest/10 px-2 py-1 text-xs font-medium text-forest-dark hover:bg-forest/20 disabled:opacity-50"
            >
              {transferBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                "Activate"
              )}
            </button>
          </div>
        </div>
      ) : null}

      {sessionActive ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={playbackBusy !== null || unplayedCount === 0}
            onClick={() => void playback("next")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1DB954] px-3 py-2 text-sm font-medium text-white hover:bg-[#1ed760] disabled:opacity-50"
          >
            {playbackBusy === "next" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SkipForward className="h-4 w-4" aria-hidden />
            )}
            Play next
          </button>
          <button
            type="button"
            disabled={playbackBusy !== null || unplayedCount === 0}
            onClick={() => void playback("all")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white/80 px-3 py-2 text-sm font-medium text-forest-dark hover:bg-white disabled:opacity-50"
          >
            {playbackBusy === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            Play all unplayed
          </button>
        </div>
      ) : null}

      {sessionActive ? (
        <>
          <label className="sr-only" htmlFor="queue-search">
            Search tracks
          </label>
          <input
            id="queue-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs on Spotify…"
            className="mb-3 w-full rounded-xl border border-forest/15 bg-white/90 px-3 py-2 text-sm text-forest-dark placeholder:text-moss/60 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/25"
          />
          {searching ? (
            <p className="mb-2 text-xs text-moss">Searching…</p>
          ) : null}
          {searchError ? (
            <p className="mb-2 text-sm text-rust" role="alert">
              {searchError}
            </p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="mb-6 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-forest/10 bg-white/60 p-2">
              {hits.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-forest-dark">{h.name}</p>
                    <p className="text-xs text-moss">
                      {h.artistName}
                      {h.albumName ? ` · ${h.albumName}` : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={addingId !== null}
                    onClick={() => void addTrack(h.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-forest px-2 py-1 text-xs font-medium text-mint-light hover:bg-forest-dark disabled:opacity-50"
                  >
                    {addingId === h.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mb-4 text-sm text-moss">
          Session ended — queue is read-only below.
        </p>
      )}

      {queue.length === 0 ? (
        <p className="text-sm text-moss">No songs in the queue yet.</p>
      ) : (
        <ol className="list-decimal space-y-3 pl-5 text-sm text-forest-dark">
          {queue.map((item, index) => (
            <li
              key={item.id}
              className={`pl-1 ${item.playedAt ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{item.trackName}</span>
                  <span className="text-moss"> — {item.artistName}</span>
                  <span className="block text-xs text-moss">
                    Added by {item.addedByDisplayName}
                    {item.playedAt ? " · Played" : null}
                  </span>
                  {item.score != null && queueMode !== "manual" ? (
                    <span className="text-xs text-moss">
                      Score {item.score.toFixed(1)} · votes {item.voteTotal}
                    </span>
                  ) : (
                    <span className="text-xs text-moss">
                      Votes {item.voteTotal}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {sessionActive ? (
                    <>
                      <button
                        type="button"
                        title="Upvote"
                        disabled={voteBusy === item.id}
                        onClick={() =>
                          void vote(
                            item.id,
                            item.myVote === 1 ? 0 : 1,
                          )
                        }
                        className={`rounded p-1 ${
                          item.myVote === 1
                            ? "bg-sage/40 text-forest-dark"
                            : "text-moss hover:bg-sage/20"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Downvote"
                        disabled={voteBusy === item.id}
                        onClick={() =>
                          void vote(
                            item.id,
                            item.myVote === -1 ? 0 : -1,
                          )
                        }
                        className={`rounded p-1 ${
                          item.myVote === -1
                            ? "bg-rust/25 text-forest-dark"
                            : "text-moss hover:bg-rust/15"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        disabled={voteBusy === item.id}
                        onClick={() => void removeItem(item.id)}
                        className="rounded p-1 text-moss hover:bg-rust/15 hover:text-rust"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {isHost && sessionActive ? (
                    <>
                      <button
                        type="button"
                        title="Move up"
                        disabled={reorderBusy || index === 0}
                        onClick={() => moveItem(index, -1)}
                        className="rounded p-1 text-moss hover:bg-sage/20 disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={reorderBusy || index >= queue.length - 1}
                        onClick={() => moveItem(index, 1)}
                        className="rounded p-1 text-moss hover:bg-sage/20 disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

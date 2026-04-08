import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  generatedPlaylistTracks,
  generatedPlaylists,
  tracks,
  userTrackStats,
} from "@/db/schema";
import { upsertCatalogTrack } from "@/lib/spotify/catalog-track";
import { searchSpotifyTracksInternal } from "@/lib/spotify/search-tracks-internal";
import type { SoloPresetId } from "@/lib/playlists/presets";
import { presetTitle } from "@/lib/playlists/presets";

type Row = {
  trackId: string;
  playCount: number;
  nightPlayCount: number;
  lastListenedAt: Date;
  trackName: string;
  artistName: string;
};

function daysSince(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

function scorePreset(row: Row, preset: SoloPresetId): number {
  const plays = row.playCount;
  const rec = 1 / (1 + daysSince(row.lastListenedAt) / 14);
  const night = row.nightPlayCount;

  switch (preset) {
    case "late_night":
      return 2.1 * Math.log1p(night) + Math.log1p(plays) + 0.4 * rec;
    case "gym":
      return 1.9 * Math.log1p(plays) + 0.7 * rec;
    case "focus": {
      const mid = plays >= 2 && plays <= 80;
      const fam = Math.log1p(plays);
      const penalty = plays > 120 ? 0.65 : 1;
      return fam * (mid ? 1.25 : 1) * penalty;
    }
    case "nostalgic": {
      const d = daysSince(row.lastListenedAt);
      return Math.log1p(plays) * Math.min(d / 4, 45);
    }
    case "drive": {
      // Balanced energy: mid-high play counts, not too niche, recent relevance
      const familiarity = Math.log1p(plays);
      const recency = 1 / (1 + daysSince(row.lastListenedAt) / 30);
      return 1.5 * familiarity + 0.8 * recency;
    }
    case "sad": {
      // Slower tracks, night + low-energy bias
      const nightWeight = Math.log1p(night) * 1.8;
      const deepFam = Math.log1p(plays) * 0.9;
      return nightWeight + deepFam;
    }
    case "chill": {
      // Moderate plays, relaxed but not sleepy — penalize extremes
      const midRange = plays >= 3 && plays <= 60;
      const base = Math.log1p(plays);
      const dayPenalty = night > plays * 0.6 ? 0.7 : 1; // penalize heavy night-only tracks
      return base * (midRange ? 1.3 : 0.8) * dayPenalty + 0.3 * rec;
    }
    case "hype_up": {
      // Highest energy: most replayed, most recent, not night-leaning
      const highEnergy = Math.log1p(plays) * 2.2;
      const recencyBoost = rec * 1.5;
      const nightPenalty = night > plays * 0.5 ? 0.6 : 1;
      return highEnergy * nightPenalty + recencyBoost;
    }
    default:
      return Math.log1p(plays);
  }
}

export type MoodEngine = "gemini" | "preset" | null;

export type GeneratedTrackRow = {
  position: number;
  trackName: string;
  artistName: string;
  score: number;
  spotifyId: string;
  /** Discovery picks from Spotify search (Gemini blend); always false for stats-only playlists */
  isDiscovery: boolean;
};

export type RankedCatalogRow = {
  trackId: string;
  spotifyId: string;
  trackName: string;
  artistName: string;
  score: number;
};

const PLAYLIST_LEN = 28;
const CHAT_FAMILIAR = 22;
const CHAT_DISCOVERY = 6;

/**
 * Ranks catalog tracks for a preset (no DB write).
 */
export async function rankCatalogTracksForPreset(
  userId: string,
  preset: SoloPresetId,
  limit: number,
): Promise<RankedCatalogRow[]> {
  const rows = await db
    .select({
      trackId: userTrackStats.trackId,
      playCount: userTrackStats.playCount,
      nightPlayCount: userTrackStats.nightPlayCount,
      lastListenedAt: userTrackStats.lastListenedAt,
      spotifyId: tracks.spotifyId,
      trackName: tracks.name,
      artistName: artists.name,
    })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(userTrackStats.userId, userId))
    .orderBy(desc(userTrackStats.playCount));

  return rows
    .map((r) => ({
      trackId: r.trackId,
      spotifyId: r.spotifyId,
      trackName: r.trackName,
      artistName: r.artistName,
      score: scorePreset(
        {
          trackId: r.trackId,
          playCount: r.playCount,
          nightPlayCount: r.nightPlayCount,
          lastListenedAt: r.lastListenedAt,
          trackName: r.trackName,
          artistName: r.artistName,
        },
        preset,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * ~80% tracks from your stats for this preset, ~20% from Spotify search using Gemini queries.
 */
export async function generateChatBlendedPlaylist(
  userId: string,
  preset: SoloPresetId,
  opts: {
    titleOverride: string;
    discoveryQueries: string[];
  },
): Promise<{
  playlistId: string;
  title: string;
  moodEngine: MoodEngine;
  tracks: GeneratedTrackRow[];
}> {
  const title = opts.titleOverride;
  const pool = await rankCatalogTracksForPreset(
    userId,
    preset,
    Math.max(PLAYLIST_LEN * 2, 40),
  );
  const familiar = pool.slice(0, CHAT_FAMILIAR);
  const usedSpotify = new Set(familiar.map((f) => f.spotifyId));
  const usedTrackIds = new Set(familiar.map((f) => f.trackId));

  const discovery: RankedCatalogRow[] = [];

  async function searchSafe(q: string) {
    try {
      return await searchSpotifyTracksInternal(userId, q, 8);
    } catch {
      return [];
    }
  }

  outer: for (const q of opts.discoveryQueries) {
    if (discovery.length >= CHAT_DISCOVERY) break;
    const hits = await searchSafe(q);
    for (const hit of hits) {
      if (discovery.length >= CHAT_DISCOVERY) break outer;
      if (usedSpotify.has(hit.id)) continue;
      const tid = await upsertCatalogTrack(hit);
      if (!tid || usedTrackIds.has(tid)) continue;
      usedSpotify.add(hit.id);
      usedTrackIds.add(tid);
      discovery.push({
        trackId: tid,
        spotifyId: hit.id,
        trackName: hit.name,
        artistName: hit.artists[0]?.name ?? "Unknown",
        score: 0,
      });
    }
  }

  const discoveryTrackIds = new Set(discovery.map((d) => d.trackId));

  const merged: RankedCatalogRow[] = [...familiar, ...discovery];
  let poolIdx = CHAT_FAMILIAR;
  while (merged.length < PLAYLIST_LEN && poolIdx < pool.length) {
    const r = pool[poolIdx]!;
    poolIdx += 1;
    if (usedTrackIds.has(r.trackId)) continue;
    usedTrackIds.add(r.trackId);
    merged.push(r);
  }

  const [pl] = await db
    .insert(generatedPlaylists)
    .values({
      userId,
      sourceType: "chatbot",
      moodEngine: "gemini",
      preset,
      title,
    })
    .returning({ id: generatedPlaylists.id });

  if (!pl) {
    throw new Error("Could not create playlist");
  }

  const finalSlice = merged.slice(0, PLAYLIST_LEN);
  if (finalSlice.length > 0) {
    await db.insert(generatedPlaylistTracks).values(
      finalSlice.map((r, i) => ({
        playlistId: pl.id,
        position: i + 1,
        trackId: r.trackId,
        score: r.score,
        isDiscovery: discoveryTrackIds.has(r.trackId),
      })),
    );
  }

  return {
    playlistId: pl.id,
    title,
    moodEngine: "gemini",
    tracks: finalSlice.map((r, i) => ({
      position: i + 1,
      trackName: r.trackName,
      artistName: r.artistName,
      score: r.score,
      spotifyId: r.spotifyId,
      isDiscovery: discoveryTrackIds.has(r.trackId),
    })),
  };
}

/**
 * Ranks tracks from materialized stats, persists a `generated_playlists` row + tracks.
 */
export async function generatePresetPlaylist(
  userId: string,
  preset: SoloPresetId,
  opts?: {
    sourceType?: "solo" | "chatbot";
    titleOverride?: string;
    moodEngine?: MoodEngine;
  },
): Promise<{
  playlistId: string;
  title: string;
  moodEngine: MoodEngine;
  tracks: GeneratedTrackRow[];
}> {
  const sourceType = opts?.sourceType ?? "solo";
  const title = opts?.titleOverride ?? presetTitle(preset);
  const moodEngine: MoodEngine =
    opts?.moodEngine !== undefined
      ? opts.moodEngine
      : sourceType === "chatbot"
        ? "preset"
        : null;

  const scored = await rankCatalogTracksForPreset(userId, preset, PLAYLIST_LEN);

  const [pl] = await db
    .insert(generatedPlaylists)
    .values({
      userId,
      sourceType,
      moodEngine,
      preset,
      title,
    })
    .returning({ id: generatedPlaylists.id });

  if (!pl) {
    throw new Error("Could not create playlist");
  }

  if (scored.length > 0) {
    await db.insert(generatedPlaylistTracks).values(
      scored.map((r, i) => ({
        playlistId: pl.id,
        position: i + 1,
        trackId: r.trackId,
        score: r.score,
        isDiscovery: false,
      })),
    );
  }

  return {
    playlistId: pl.id,
    title,
    moodEngine,
    tracks: scored.map((r, i) => ({
      position: i + 1,
      trackName: r.trackName,
      artistName: r.artistName,
      score: r.score,
      spotifyId: r.spotifyId,
      isDiscovery: false,
    })),
  };
}

export async function generateSoloPlaylist(
  userId: string,
  preset: SoloPresetId,
): Promise<{
  playlistId: string;
  title: string;
  moodEngine: MoodEngine;
  tracks: GeneratedTrackRow[];
}> {
  return generatePresetPlaylist(userId, preset, { sourceType: "solo" });
}

export async function loadGeneratedPlaylistForUser(
  userId: string,
  playlistId: string,
): Promise<{
  playlistId: string;
  title: string;
  preset: SoloPresetId;
  moodEngine: MoodEngine;
  tracks: GeneratedTrackRow[];
} | null> {
  const [pl] = await db
    .select({
      id: generatedPlaylists.id,
      title: generatedPlaylists.title,
      preset: generatedPlaylists.preset,
      moodEngine: generatedPlaylists.moodEngine,
    })
    .from(generatedPlaylists)
    .where(
      and(
        eq(generatedPlaylists.id, playlistId),
        eq(generatedPlaylists.userId, userId),
      ),
    )
    .limit(1);

  if (!pl) return null;

  const rows = await db
    .select({
      position: generatedPlaylistTracks.position,
      trackName: tracks.name,
      artistName: artists.name,
      score: generatedPlaylistTracks.score,
      spotifyId: tracks.spotifyId,
      isDiscovery: generatedPlaylistTracks.isDiscovery,
    })
    .from(generatedPlaylistTracks)
    .innerJoin(tracks, eq(generatedPlaylistTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(generatedPlaylistTracks.playlistId, playlistId))
    .orderBy(asc(generatedPlaylistTracks.position));

  const me = pl.moodEngine;
  const moodEngine: MoodEngine =
    me === "gemini" || me === "preset" ? me : null;

  return {
    playlistId: pl.id,
    title: pl.title,
    preset: pl.preset as SoloPresetId,
    moodEngine,
    tracks: rows.map((r) => ({
      position: r.position,
      trackName: r.trackName,
      artistName: r.artistName,
      score: r.score,
      spotifyId: r.spotifyId,
      isDiscovery: r.isDiscovery,
    })),
  };
}

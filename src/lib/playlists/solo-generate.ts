import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  generatedPlaylistTracks,
  generatedPlaylists,
  tracks,
  userTrackStats,
} from "@/db/schema";
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
    default:
      return Math.log1p(plays);
  }
}

export type GeneratedTrackRow = {
  position: number;
  trackName: string;
  artistName: string;
  score: number;
};

/**
 * Ranks tracks from materialized stats, persists a `generated_playlists` row + tracks.
 */
export async function generateSoloPlaylist(
  userId: string,
  preset: SoloPresetId,
): Promise<{
  playlistId: string;
  title: string;
  tracks: GeneratedTrackRow[];
}> {
  const rows = await db
    .select({
      trackId: userTrackStats.trackId,
      playCount: userTrackStats.playCount,
      nightPlayCount: userTrackStats.nightPlayCount,
      lastListenedAt: userTrackStats.lastListenedAt,
      trackName: tracks.name,
      artistName: artists.name,
    })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(userTrackStats.userId, userId))
    .orderBy(desc(userTrackStats.playCount));

  const scored = rows
    .map((r) => ({
      ...r,
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
    .slice(0, 28);

  const title = presetTitle(preset);

  const [pl] = await db
    .insert(generatedPlaylists)
    .values({
      userId,
      sourceType: "solo",
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
      })),
    );
  }

  return {
    playlistId: pl.id,
    title,
    tracks: scored.map((r, i) => ({
      position: i + 1,
      trackName: r.trackName,
      artistName: r.artistName,
      score: r.score,
    })),
  };
}

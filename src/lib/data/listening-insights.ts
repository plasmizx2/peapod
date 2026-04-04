import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  listeningEvents,
  tracks,
  userArtistStats,
  userTrackStats,
} from "@/db/schema";
import type { RecentPlay, TopArtist, TopTrack } from "@/types/listening";

export type { RecentPlay, TopArtist, TopTrack } from "@/types/listening";

export async function getRecentPlays(
  userId: string,
  limit: number,
): Promise<RecentPlay[]> {
  const rows = await db
    .select({
      listenedAt: listeningEvents.listenedAt,
      trackName: tracks.name,
      albumName: tracks.albumName,
      artistName: artists.name,
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(listeningEvents.userId, userId))
    .orderBy(desc(listeningEvents.listenedAt))
    .limit(limit);

  return rows.map((r) => ({
    trackName: r.trackName,
    artistName: r.artistName,
    albumName: r.albumName,
    listenedAtIso: r.listenedAt.toISOString(),
  }));
}

export async function getTopTracks(
  userId: string,
  limit: number,
): Promise<TopTrack[]> {
  const fromStats = await db
    .select({
      trackName: tracks.name,
      artistName: artists.name,
      plays: userTrackStats.playCount,
    })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(userTrackStats.userId, userId))
    .orderBy(desc(userTrackStats.playCount))
    .limit(limit);

  if (fromStats.length > 0) {
    return fromStats.map((r) => ({
      trackName: r.trackName,
      artistName: r.artistName,
      plays: r.plays,
    }));
  }

  const rows = await db
    .select({
      trackName: tracks.name,
      artistName: artists.name,
      plays: count(listeningEvents.id).mapWith(Number),
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(listeningEvents.userId, userId))
    .groupBy(tracks.id, tracks.name, artists.id, artists.name)
    .orderBy(desc(count(listeningEvents.id)))
    .limit(limit);

  return rows.map((r) => ({
    trackName: r.trackName,
    artistName: r.artistName,
    plays: r.plays,
  }));
}

export async function getTopArtists(
  userId: string,
  limit: number,
): Promise<TopArtist[]> {
  const fromStats = await db
    .select({
      artistName: artists.name,
      plays: userArtistStats.playCount,
    })
    .from(userArtistStats)
    .innerJoin(artists, eq(userArtistStats.artistId, artists.id))
    .where(eq(userArtistStats.userId, userId))
    .orderBy(desc(userArtistStats.playCount))
    .limit(limit);

  if (fromStats.length > 0) {
    return fromStats.map((r) => ({
      artistName: r.artistName,
      plays: r.plays,
    }));
  }

  const rows = await db
    .select({
      artistName: artists.name,
      plays: count(listeningEvents.id).mapWith(Number),
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(listeningEvents.userId, userId))
    .groupBy(artists.id, artists.name)
    .orderBy(desc(count(listeningEvents.id)))
    .limit(limit);

  return rows.map((r) => ({
    artistName: r.artistName,
    plays: r.plays,
  }));
}

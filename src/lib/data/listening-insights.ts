import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, listeningEvents, tracks } from "@/db/schema";
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

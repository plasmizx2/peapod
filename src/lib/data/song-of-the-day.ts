import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, songOfTheDay, tracks, userTrackStats } from "@/db/schema";
import { spotifyUserGet } from "@/lib/spotify/user-api";
import { upsertCatalogTrack } from "@/lib/spotify/catalog-track";

export type SongOfTheDayResult = {
  trackName: string;
  artistName: string;
  reason: string | null;
  dateStr: string;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Picks a "song of the day" for a user dynamically utilizing the Spotify 
 * Recommendations algorithm initialized by their most played tracks.
 */
export async function getSongOfTheDay(
  userId: string,
): Promise<SongOfTheDayResult | null> {
  const today = todayStr();

  // 1. Check if already computed today
  const [existing] = await db
    .select({
      trackName: tracks.name,
      artistName: artists.name,
      reason: songOfTheDay.reason,
      dateStr: songOfTheDay.dateStr,
    })
    .from(songOfTheDay)
    .innerJoin(tracks, eq(songOfTheDay.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        eq(songOfTheDay.userId, userId),
        eq(songOfTheDay.dateStr, today),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  // 2. We don't have one for today. Get 3 top-played tracks to use as seeds.
  const seedRows = await db
    .select({ trackSpotifyId: tracks.spotifyId, artistName: artists.name })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(userTrackStats.userId, userId))
    .orderBy(desc(userTrackStats.playCount))
    .limit(3);

  // If no seeds available, fallback to a null state
  if (seedRows.length === 0) return null;

  const seedIds = seedRows.map(r => r.trackSpotifyId);
  
  // 3. Hit Spotify `/v1/recommendations`
  const url = new URL("https://api.spotify.com/v1/recommendations");
  url.searchParams.set("seed_tracks", seedIds.join(","));
  url.searchParams.set("limit", "15");

  const res = await spotifyUserGet(userId, url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.tracks || data.tracks.length === 0) return null;

  // 4. Select a random recommended track and catalog it
  const pickedSpotifyTrack = data.tracks[Math.floor(Math.random() * data.tracks.length)];
  
  const internalTrackId = await upsertCatalogTrack({
    id: pickedSpotifyTrack.id,
    name: pickedSpotifyTrack.name,
    artists: pickedSpotifyTrack.artists.map((a: any) => ({
      id: a.id,
      name: a.name,
    })),
    album: { name: pickedSpotifyTrack.album.name },
  });

  if (!internalTrackId) return null;

  // 5. Build intelligent reasoning text based on their seeds
  const primaryArtist = seedRows[0]!.artistName;
  const reasons = [
    `PeaPod picked this track because you've been listening to a lot of ${primaryArtist} lately.`,
    `A fresh AI discovery inspired by your recent listening phase.`,
    `Hand-picked by PeaPod because it matches your recent energy.`,
    `Since you've been deep into ${primaryArtist}, we thought you might like this.`
  ];
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const reason = reasons[(dayOfYear + hash) % reasons.length]!;

  // 6. Save the AI pick for today
  await db
    .insert(songOfTheDay)
    .values({
      userId,
      trackId: internalTrackId,
      dateStr: today,
      reason,
    })
    .onConflictDoNothing();

  return {
    trackName: pickedSpotifyTrack.name,
    artistName: pickedSpotifyTrack.artists[0]?.name ?? "Unknown Artist",
    reason,
    dateStr: today,
  };
}

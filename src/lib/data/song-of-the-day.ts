import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, songOfTheDay, tracks, userTrackStats } from "@/db/schema";

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
 * Picks a "song of the day" for a user.
 * If one already exists for today, returns it.
 * Otherwise, selects a semi-random track from their top plays
 * using a day-seeded rotation through their library.
 */
export async function getSongOfTheDay(
  userId: string,
): Promise<SongOfTheDayResult | null> {
  const today = todayStr();

  // Check if already computed today
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

  // Get user's top tracks (by play count)
  const topTracks = await db
    .select({
      trackId: userTrackStats.trackId,
      playCount: userTrackStats.playCount,
      trackName: tracks.name,
      artistName: artists.name,
    })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(eq(userTrackStats.userId, userId))
    .orderBy(desc(userTrackStats.playCount))
    .limit(50);

  if (topTracks.length === 0) return null;

  // Day-seeded rotation: use day-of-year + userId hash to pick
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = (dayOfYear + hash) % topTracks.length;
  const picked = topTracks[idx];

  const reasons = [
    `Played ${picked.playCount} times — a staple in your rotation.`,
    `One of your most-played. ${picked.playCount} listens and counting.`,
    `You've come back to this ${picked.playCount} times. Must be good.`,
    `A reliable favorite — ${picked.playCount} plays strong.`,
  ];
  const reason = reasons[(dayOfYear + hash) % reasons.length];

  // Persist
  await db
    .insert(songOfTheDay)
    .values({
      userId,
      trackId: picked.trackId,
      dateStr: today,
      reason,
    })
    .onConflictDoNothing();

  return {
    trackName: picked.trackName,
    artistName: picked.artistName,
    reason,
    dateStr: today,
  };
}

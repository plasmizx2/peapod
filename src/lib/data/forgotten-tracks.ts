import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, tracks, userTrackStats } from "@/db/schema";

export type ForgottenTrack = {
  trackName: string;
  artistName: string;
  playCount: number;
  daysSinceLastListen: number;
};

/**
 * Returns tracks with high play counts but no recent listens (60+ days).
 * These are "forgotten favorites" for nostalgic resurfacing.
 */
export async function getForgottenFavorites(
  userId: string,
  limit = 5,
): Promise<ForgottenTrack[]> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);

  const rows = await db
    .select({
      trackName: tracks.name,
      artistName: artists.name,
      playCount: userTrackStats.playCount,
      lastListenedAt: userTrackStats.lastListenedAt,
    })
    .from(userTrackStats)
    .innerJoin(tracks, eq(userTrackStats.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        eq(userTrackStats.userId, userId),
        sql`${userTrackStats.lastListenedAt} < ${sixtyDaysAgo}`,
        sql`${userTrackStats.playCount} >= 5`,
      ),
    )
    .orderBy(desc(userTrackStats.playCount))
    .limit(limit);

  return rows.map((r) => ({
    trackName: r.trackName,
    artistName: r.artistName,
    playCount: r.playCount,
    daysSinceLastListen: Math.floor(
      (Date.now() - r.lastListenedAt.getTime()) / 86_400_000,
    ),
  }));
}

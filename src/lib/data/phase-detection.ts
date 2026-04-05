import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, listeningEvents, tracks, userArtistStats } from "@/db/schema";

export type PhaseInfo = {
  phase: string;
  topArtistsRecent: string[];
  topArtistsHistoric: string[];
  similarity: number;
  daysSinceShift: number | null;
};

/**
 * Detects the user's "current phase" by comparing recent (14-day) top artists
 * to historical (90-day) top artists using Jaccard similarity.
 */
export async function detectCurrentPhase(
  userId: string,
): Promise<PhaseInfo | null> {
  // Recent top artists (last 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const recentRows = await db
    .select({
      artistName: artists.name,
      plays: sql<number>`count(*)`.mapWith(Number),
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        eq(listeningEvents.userId, userId),
        sql`${listeningEvents.listenedAt} >= ${fourteenDaysAgo}`,
      ),
    )
    .groupBy(artists.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  if (recentRows.length < 2) return null;

  // Historical top artists (all time from materialized stats)
  const historicRows = await db
    .select({
      artistName: artists.name,
      plays: userArtistStats.playCount,
    })
    .from(userArtistStats)
    .innerJoin(artists, eq(userArtistStats.artistId, artists.id))
    .where(eq(userArtistStats.userId, userId))
    .orderBy(desc(userArtistStats.playCount))
    .limit(10);

  if (historicRows.length < 2) return null;

  const recentSet = new Set(recentRows.slice(0, 5).map((r) => r.artistName));
  const historicSet = new Set(historicRows.slice(0, 5).map((r) => r.artistName));

  // Jaccard similarity
  const intersection = new Set([...recentSet].filter((x) => historicSet.has(x)));
  const union = new Set([...recentSet, ...historicSet]);
  const similarity = union.size > 0 ? intersection.size / union.size : 1;

  // Build phase label from top 3 recent artists
  const topRecent = recentRows.slice(0, 3).map((r) => r.artistName);
  const phaseLabel =
    similarity < 0.5
      ? `In a ${topRecent.join(" + ")} phase`
      : `Consistent ${topRecent.slice(0, 2).join(" & ")} listener`;

  return {
    phase: phaseLabel,
    topArtistsRecent: recentRows.map((r) => r.artistName),
    topArtistsHistoric: historicRows.map((r) => r.artistName),
    similarity,
    daysSinceShift: similarity < 0.5 ? 14 : null,
  };
}

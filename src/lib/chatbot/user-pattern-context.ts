import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, userArtistStats, userPatternProfiles } from "@/db/schema";

/**
 * Text block for LLM calls: vibe summary + top artists from materialized stats.
 */
export async function buildUserPatternContextBlock(
  userId: string,
): Promise<string> {
  const [profile] = await db
    .select({
      totalPlays: userPatternProfiles.totalPlays,
      peakHourUtc: userPatternProfiles.peakHourUtc,
      vibeLine: userPatternProfiles.vibeLine,
    })
    .from(userPatternProfiles)
    .where(eq(userPatternProfiles.userId, userId))
    .limit(1);

  const topArtists = await db
    .select({
      name: artists.name,
      plays: userArtistStats.playCount,
    })
    .from(userArtistStats)
    .innerJoin(artists, eq(userArtistStats.artistId, artists.id))
    .where(eq(userArtistStats.userId, userId))
    .orderBy(desc(userArtistStats.playCount))
    .limit(14);

  const lines: string[] = [];
  if (profile?.vibeLine?.trim()) {
    lines.push(`Listening summary: ${profile.vibeLine.trim()}`);
  }
  if (profile?.totalPlays != null) {
    lines.push(`Tracks with stats: ${profile.totalPlays}`);
  }
  if (profile?.peakHourUtc != null) {
    lines.push(`Peak listening hour (UTC): ${profile.peakHourUtc}`);
  }
  if (topArtists.length > 0) {
    lines.push(
      `Top artists by your play count: ${topArtists.map((a) => a.name).join(", ")}`,
    );
  } else {
    lines.push("Top artists: (not enough data yet)");
  }
  return lines.join("\n");
}

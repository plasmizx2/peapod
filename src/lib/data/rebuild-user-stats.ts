import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  listeningEvents,
  userArtistStats,
  userPatternProfiles,
  userTrackStats,
} from "@/db/schema";
import { getTimePatterns } from "@/lib/data/listening-time-insights";

function buildVibeLine(
  peakHourUtc: number | null,
  peakWeekdayDow: number | null,
  weekdayLabels: string[],
  totalPlays: number,
): string | null {
  if (totalPlays < 3) return null;
  const parts: string[] = [];
  if (peakHourUtc !== null) {
    const h = peakHourUtc;
    if (h >= 5 && h <= 11) parts.push("Morning listener");
    else if (h >= 12 && h <= 17) parts.push("Afternoon lean");
    else if (h >= 18 && h <= 21) parts.push("Evening listener");
    else parts.push("Night owl");
  }
  if (peakWeekdayDow !== null) {
    const label = weekdayLabels[peakWeekdayDow];
    if (label) parts.push(`${label} peaks`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Recomputes `user_track_stats`, `user_artist_stats`, and `user_pattern_profiles`
 * from `listening_events` for one user.
 */
export async function rebuildUserListeningStats(userId: string): Promise<void> {
  const [{ n: eventCount }] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, userId));

  const total = Number(eventCount ?? 0);

  await db.delete(userTrackStats).where(eq(userTrackStats.userId, userId));
  await db.delete(userArtistStats).where(eq(userArtistStats.userId, userId));

  if (total === 0) {
    await db
      .delete(userPatternProfiles)
      .where(eq(userPatternProfiles.userId, userId));
    return;
  }

  await db.execute(sql`
    INSERT INTO user_track_stats (
      user_id,
      track_id,
      play_count,
      last_listened_at,
      night_play_count
    )
    SELECT
      user_id,
      track_id,
      COUNT(*)::int,
      MAX(listened_at),
      COALESCE(
        SUM(
          CASE
            WHEN (
              EXTRACT(HOUR FROM (listened_at AT TIME ZONE 'UTC'))::int >= 22
              OR EXTRACT(HOUR FROM (listened_at AT TIME ZONE 'UTC'))::int <= 6
            ) THEN 1
            ELSE 0
          END
        ),
        0
      )::int
    FROM listening_events
    WHERE user_id = ${userId}::uuid
    GROUP BY user_id, track_id
  `);

  await db.execute(sql`
    INSERT INTO user_artist_stats (user_id, artist_id, play_count, last_listened_at)
    SELECT
      le.user_id,
      t.primary_artist_id,
      COUNT(*)::int,
      MAX(le.listened_at)
    FROM listening_events le
    INNER JOIN tracks t ON t.id = le.track_id
    WHERE le.user_id = ${userId}::uuid
    GROUP BY le.user_id, t.primary_artist_id
  `);

  const tp = await getTimePatterns(userId);
  const weekdayLabels = tp.weekdayUtc.map((w) => w.label);
  const vibeLine = buildVibeLine(
    tp.peakHourUtc,
    tp.peakWeekdayDow,
    weekdayLabels,
    total,
  );

  await db
    .insert(userPatternProfiles)
    .values({
      userId,
      totalPlays: total,
      peakHourUtc: tp.peakHourUtc,
      peakDowUtc: tp.peakWeekdayDow,
      vibeLine,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPatternProfiles.userId,
      set: {
        totalPlays: total,
        peakHourUtc: tp.peakHourUtc,
        peakDowUtc: tp.peakWeekdayDow,
        vibeLine,
        computedAt: new Date(),
      },
    });
}

/** If the user has events but no materialized stats yet, rebuild once. */
export async function ensureUserListeningStats(userId: string): Promise<void> {
  const [{ n: ev }] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, userId));
  if (Number(ev ?? 0) === 0) return;

  const [{ n: st }] = await db
    .select({ n: count() })
    .from(userTrackStats)
    .where(eq(userTrackStats.userId, userId));
  if (Number(st ?? 0) === 0) {
    await rebuildUserListeningStats(userId);
  }
}

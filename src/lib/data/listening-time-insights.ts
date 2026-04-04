import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listeningEvents } from "@/db/schema";
import type { TimePatterns } from "@/types/listening";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Hour-of-day (0–23) and day-of-week (0=Sun … 6=Sat) counts in **UTC**
 * from stored `listened_at` timestamps.
 */
export async function getTimePatterns(userId: string): Promise<TimePatterns> {
  const hourExpr = sql`(EXTRACT(HOUR FROM (${listeningEvents.listenedAt} AT TIME ZONE 'UTC')))::int`;
  const hourRows = await db
    .select({
      hour: hourExpr.mapWith(Number),
      n: count(listeningEvents.id).mapWith(Number),
    })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, userId))
    .groupBy(hourExpr);

  const hourlyUtc = Array.from({ length: 24 }, () => 0);
  for (const row of hourRows) {
    if (row.hour >= 0 && row.hour < 24) {
      hourlyUtc[row.hour] = row.n;
    }
  }

  const dowExpr = sql`(EXTRACT(DOW FROM (${listeningEvents.listenedAt} AT TIME ZONE 'UTC')))::int`;
  const dowRows = await db
    .select({
      dow: dowExpr.mapWith(Number),
      n: count(listeningEvents.id).mapWith(Number),
    })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, userId))
    .groupBy(dowExpr);

  const weekdayUtc = WEEKDAY_LABELS.map((label, dow) => ({
    dow,
    label,
    count: dowRows.find((r) => r.dow === dow)?.n ?? 0,
  }));

  const peakHourUtc = hourlyUtc.reduce(
    (best, n, h) => (n > hourlyUtc[best] ? h : best),
    0,
  );
  const maxH = Math.max(...hourlyUtc, 0);
  const peakHour =
    maxH > 0 && hourlyUtc[peakHourUtc] === maxH ? peakHourUtc : null;

  const peakDow = weekdayUtc.reduce(
    (best, w, i, arr) => (w.count > arr[best].count ? i : best),
    0,
  );
  const maxD = Math.max(...weekdayUtc.map((w) => w.count), 0);
  const peakWeekdayDow =
    maxD > 0 && weekdayUtc[peakDow].count === maxD ? peakDow : null;

  return {
    hourlyUtc,
    weekdayUtc,
    peakHourUtc: peakHour,
    peakWeekdayDow,
  };
}

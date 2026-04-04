import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  listeningSessions,
  sessionMembers,
  sessionQueue,
  sessionVotes,
  userTrackStats,
} from "@/db/schema";

const MODES = new Set(["manual", "equal_play", "lean_driver", "hype"]);

export async function rebalanceSessionQueue(
  sessionId: string,
  hostUserId: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "forbidden"
        | "ended"
        | "manual_mode"
        | "bad_mode";
    }
> {
  const [session] = await db
    .select({
      hostUserId: listeningSessions.hostUserId,
      queueMode: listeningSessions.queueMode,
      status: listeningSessions.status,
      driverUserId: listeningSessions.driverUserId,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return { ok: false, reason: "not_found" };
  }
  if (session.hostUserId !== hostUserId) {
    return { ok: false, reason: "forbidden" };
  }
  if (session.status !== "active") {
    return { ok: false, reason: "ended" };
  }
  if (!MODES.has(session.queueMode)) {
    return { ok: false, reason: "bad_mode" };
  }
  if (session.queueMode === "manual") {
    return { ok: false, reason: "manual_mode" };
  }

  const members = await db
    .select({ userId: sessionMembers.userId })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, sessionId));

  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) {
    return { ok: true };
  }

  const queueRows = await db
    .select({
      id: sessionQueue.id,
      trackId: sessionQueue.trackId,
      queuePosition: sessionQueue.queuePosition,
    })
    .from(sessionQueue)
    .where(eq(sessionQueue.sessionId, sessionId))
    .orderBy(asc(sessionQueue.queuePosition));

  if (queueRows.length <= 1) {
    return { ok: true };
  }

  const trackIds = [...new Set(queueRows.map((q) => q.trackId))];

  const statsRows =
    memberIds.length && trackIds.length
      ? await db
          .select({
            userId: userTrackStats.userId,
            trackId: userTrackStats.trackId,
            playCount: userTrackStats.playCount,
          })
          .from(userTrackStats)
          .where(
            and(
              inArray(userTrackStats.userId, memberIds),
              inArray(userTrackStats.trackId, trackIds),
            ),
          )
      : [];

  const playMap = new Map<string, number>();
  for (const s of statsRows) {
    const k = `${s.userId}:${s.trackId}`;
    playMap.set(k, s.playCount);
  }

  const voteAgg = await db
    .select({
      queueItemId: sessionVotes.queueItemId,
      total: sql<number>`coalesce(sum(${sessionVotes.value}), 0)`.mapWith(
        Number,
      ),
    })
    .from(sessionVotes)
    .where(eq(sessionVotes.sessionId, sessionId))
    .groupBy(sessionVotes.queueItemId);

  const voteMap = new Map<string, number>();
  for (const v of voteAgg) {
    voteMap.set(v.queueItemId, v.total);
  }

  const driverId = session.driverUserId;

  function scoreForQueueItem(id: string, trackId: string): number {
    const votes = voteMap.get(id) ?? 0;

    if (session.queueMode === "hype") {
      let playSum = 0;
      for (const uid of memberIds) {
        playSum += playMap.get(`${uid}:${trackId}`) ?? 0;
      }
      return votes * 1000 + playSum;
    }

    if (session.queueMode === "equal_play") {
      let s = 0;
      for (const uid of memberIds) {
        s += playMap.get(`${uid}:${trackId}`) ?? 0;
      }
      return s;
    }

    // lean_driver
    if (driverId && memberIds.includes(driverId)) {
      const driverPlays = playMap.get(`${driverId}:${trackId}`) ?? 0;
      let others = 0;
      for (const uid of memberIds) {
        if (uid === driverId) continue;
        others += playMap.get(`${uid}:${trackId}`) ?? 0;
      }
      return driverPlays * 2 + others;
    }

    let s = 0;
    for (const uid of memberIds) {
      s += playMap.get(`${uid}:${trackId}`) ?? 0;
    }
    return s;
  }

  const scored = queueRows.map((q) => ({
    ...q,
    score: scoreForQueueItem(q.id, q.trackId),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.queuePosition - b.queuePosition;
  });

  await db.transaction(async (tx) => {
    const OFFSET = 1_000_000;
    for (let i = 0; i < scored.length; i++) {
      await tx
        .update(sessionQueue)
        .set({
          queuePosition: OFFSET + i,
        })
        .where(eq(sessionQueue.id, scored[i].id));
    }
    for (let i = 0; i < scored.length; i++) {
      await tx
        .update(sessionQueue)
        .set({
          queuePosition: i + 1,
          score: scored[i].score,
        })
        .where(eq(sessionQueue.id, scored[i].id));
    }
  });

  return { ok: true };
}

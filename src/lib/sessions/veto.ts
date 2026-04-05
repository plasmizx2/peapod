import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  listeningSessions,
  sessionMembers,
  sessionQueue,
  sessionVetoes,
} from "@/db/schema";

/**
 * Democratic veto: any session member can veto a queue item.
 * - ≥50% of members veto → hard_vetoed (removed from active queue).
 * - <50% → soft_vetoed (pushed to end, dimmed).
 */
export async function vetoQueueItem(
  sessionId: string,
  userId: string,
  queueItemId: string,
): Promise<
  | { ok: true; status: "soft_vetoed" | "hard_vetoed"; vetoCount: number; memberCount: number }
  | { ok: false; reason: "not_member" | "ended" | "not_found" | "already_played" }
> {
  // Verify membership
  const [membership] = await db
    .select({ userId: sessionMembers.userId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) return { ok: false, reason: "not_member" };

  // Verify session active
  const [session] = await db
    .select({ status: listeningSessions.status })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== "active") return { ok: false, reason: "ended" };

  // Verify queue item exists and not played
  const [qItem] = await db
    .select({
      id: sessionQueue.id,
      playedAt: sessionQueue.playedAt,
      status: sessionQueue.status,
    })
    .from(sessionQueue)
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        eq(sessionQueue.id, queueItemId),
      ),
    )
    .limit(1);
  if (!qItem) return { ok: false, reason: "not_found" };
  if (qItem.playedAt) return { ok: false, reason: "already_played" };

  // Upsert the veto
  await db
    .insert(sessionVetoes)
    .values({ sessionId, queueItemId, userId })
    .onConflictDoNothing();

  // Count vetoes and members
  const [vetoRow] = await db
    .select({ n: count() })
    .from(sessionVetoes)
    .where(eq(sessionVetoes.queueItemId, queueItemId));
  const vetoCount = Number(vetoRow?.n ?? 0);

  const [memberRow] = await db
    .select({ n: count() })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, sessionId));
  const memberCount = Number(memberRow?.n ?? 0);

  // Determine status
  const threshold = Math.ceil(memberCount / 2);
  const newStatus = vetoCount >= threshold ? "hard_vetoed" : "soft_vetoed";

  await db
    .update(sessionQueue)
    .set({ status: newStatus, vetoedAt: new Date() })
    .where(eq(sessionQueue.id, queueItemId));

  // If soft_vetoed, push to end of queue
  if (newStatus === "soft_vetoed") {
    const [maxPos] = await db
      .select({ m: sql<number>`coalesce(max(${sessionQueue.queuePosition}), 0)`.mapWith(Number) })
      .from(sessionQueue)
      .where(eq(sessionQueue.sessionId, sessionId));
    await db
      .update(sessionQueue)
      .set({ queuePosition: (maxPos?.m ?? 0) + 1 })
      .where(eq(sessionQueue.id, queueItemId));
  }

  return { ok: true, status: newStatus, vetoCount, memberCount };
}

/**
 * Remove a veto — recalculates threshold.
 */
export async function removeVeto(
  sessionId: string,
  userId: string,
  queueItemId: string,
): Promise<
  | { ok: true; status: "queued" | "soft_vetoed"; vetoCount: number; memberCount: number }
  | { ok: false; reason: "not_member" | "ended" | "not_found" | "already_played" }
> {
  const [membership] = await db
    .select({ userId: sessionMembers.userId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) return { ok: false, reason: "not_member" };

  const [session] = await db
    .select({ status: listeningSessions.status })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== "active") return { ok: false, reason: "ended" };

  const [qItem] = await db
    .select({ id: sessionQueue.id, playedAt: sessionQueue.playedAt })
    .from(sessionQueue)
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        eq(sessionQueue.id, queueItemId),
      ),
    )
    .limit(1);
  if (!qItem) return { ok: false, reason: "not_found" };
  if (qItem.playedAt) return { ok: false, reason: "already_played" };

  // Delete the veto
  await db
    .delete(sessionVetoes)
    .where(
      and(
        eq(sessionVetoes.sessionId, sessionId),
        eq(sessionVetoes.userId, userId),
        eq(sessionVetoes.queueItemId, queueItemId),
      ),
    );

  // Recount
  const [vetoRow] = await db
    .select({ n: count() })
    .from(sessionVetoes)
    .where(eq(sessionVetoes.queueItemId, queueItemId));
  const vetoCount = Number(vetoRow?.n ?? 0);

  const [memberRow] = await db
    .select({ n: count() })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, sessionId));
  const memberCount = Number(memberRow?.n ?? 0);

  const threshold = Math.ceil(memberCount / 2);
  const newStatus = vetoCount >= threshold ? "soft_vetoed" : vetoCount > 0 ? "soft_vetoed" : "queued";

  await db
    .update(sessionQueue)
    .set({
      status: newStatus,
      vetoedAt: newStatus === "queued" ? null : new Date(),
    })
    .where(eq(sessionQueue.id, queueItemId));

  return { ok: true, status: newStatus as "queued" | "soft_vetoed", vetoCount, memberCount };
}

import { and, asc, count, eq, max, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  listeningSessions,
  sessionMembers,
  sessionQueue,
  sessionVetoes,
  sessionVotes,
  tracks,
  users,
} from "@/db/schema";

async function getMembershipAndStatus(
  sessionId: string,
  userId: string,
): Promise<{ member: boolean; active: boolean }> {
  const [m] = await db
    .select({ sessionId: sessionMembers.sessionId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!m) {
    return { member: false, active: false };
  }

  const [s] = await db
    .select({ status: listeningSessions.status })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  return {
    member: true,
    active: s?.status === "active",
  };
}

export async function isSessionHost(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const [s] = await db
    .select({ hostUserId: listeningSessions.hostUserId })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);
  return s?.hostUserId === userId;
}

export type SessionQueueRow = {
  id: string;
  position: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  spotifyId: string;
  addedByDisplayName: string;
  playedAt: string | null;
  score: number | null;
  voteTotal: number;
  myVote: number | null;
  status: string;
  vetoCount: number;
  myVeto: boolean;
};

export async function getSessionQueue(
  sessionId: string,
  userId: string,
): Promise<SessionQueueRow[] | null> {
  const gate = await getMembershipAndStatus(sessionId, userId);
  if (!gate.member) {
    return null;
  }

  const rows = await db
    .select({
      id: sessionQueue.id,
      position: sessionQueue.queuePosition,
      trackName: tracks.name,
      albumName: tracks.albumName,
      spotifyId: tracks.spotifyId,
      artistName: artists.name,
      adderName: users.name,
      adderEmail: users.email,
      playedAt: sessionQueue.playedAt,
      score: sessionQueue.score,
      status: sessionQueue.status,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .leftJoin(users, eq(sessionQueue.addedByUserId, users.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        ne(sessionQueue.status, "hard_vetoed"),
      ),
    )
    .orderBy(asc(sessionQueue.queuePosition));

  const voteTotals = await db
    .select({
      queueItemId: sessionVotes.queueItemId,
      total: sql<number>`coalesce(sum(${sessionVotes.value}), 0)`.mapWith(
        Number,
      ),
    })
    .from(sessionVotes)
    .where(eq(sessionVotes.sessionId, sessionId))
    .groupBy(sessionVotes.queueItemId);

  const voteByItem = new Map<string, number>();
  for (const v of voteTotals) {
    voteByItem.set(v.queueItemId, v.total);
  }

  const myVotes = await db
    .select({
      queueItemId: sessionVotes.queueItemId,
      value: sessionVotes.value,
    })
    .from(sessionVotes)
    .where(
      and(
        eq(sessionVotes.sessionId, sessionId),
        eq(sessionVotes.userId, userId),
      ),
    );

  const myByItem = new Map<string, number>();
  for (const v of myVotes) {
    myByItem.set(v.queueItemId, v.value);
  }

  // Veto counts per queue item
  const vetoCounts = await db
    .select({
      queueItemId: sessionVetoes.queueItemId,
      total: count(),
    })
    .from(sessionVetoes)
    .where(eq(sessionVetoes.sessionId, sessionId))
    .groupBy(sessionVetoes.queueItemId);

  const vetoByItem = new Map<string, number>();
  for (const v of vetoCounts) {
    vetoByItem.set(v.queueItemId, Number(v.total));
  }

  // My vetoes
  const myVetoes = await db
    .select({ queueItemId: sessionVetoes.queueItemId })
    .from(sessionVetoes)
    .where(
      and(
        eq(sessionVetoes.sessionId, sessionId),
        eq(sessionVetoes.userId, userId),
      ),
    );
  const myVetoSet = new Set(myVetoes.map((v) => v.queueItemId));

  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    trackName: r.trackName,
    artistName: r.artistName,
    albumName: r.albumName,
    spotifyId: r.spotifyId,
    addedByDisplayName:
      r.adderName?.trim() ||
      r.adderEmail?.split("@")[0] ||
      "Someone",
    playedAt: r.playedAt ? r.playedAt.toISOString() : null,
    score: r.score,
    voteTotal: voteByItem.get(r.id) ?? 0,
    myVote: myByItem.get(r.id) ?? null,
    status: r.status,
    vetoCount: vetoByItem.get(r.id) ?? 0,
    myVeto: myVetoSet.has(r.id),
  }));
}

export async function appendSessionQueueTrack(
  sessionId: string,
  userId: string,
  trackId: string,
): Promise<
  | { ok: true; queueItemId: string; position: number }
  | { ok: false; reason: "not_member" | "ended" }
> {
  const gate = await getMembershipAndStatus(sessionId, userId);
  if (!gate.member) {
    return { ok: false, reason: "not_member" };
  }
  if (!gate.active) {
    return { ok: false, reason: "ended" };
  }

  const out = await db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ m: max(sessionQueue.queuePosition) })
      .from(sessionQueue)
      .where(eq(sessionQueue.sessionId, sessionId));

    const position = (agg?.m ?? 0) + 1;

    const [inserted] = await tx
      .insert(sessionQueue)
      .values({
        sessionId,
        trackId,
        queuePosition: position,
        sourceType: "member_add",
        addedByUserId: userId,
      })
      .returning({
        id: sessionQueue.id,
        queuePosition: sessionQueue.queuePosition,
      });

    if (!inserted) {
      return null;
    }

    return {
      queueItemId: inserted.id,
      position: inserted.queuePosition,
    };
  });

  if (!out) {
    return { ok: false, reason: "not_member" };
  }

  return { ok: true, ...out };
}

export async function removeSessionQueueItem(
  sessionId: string,
  userId: string,
  queueItemId: string,
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_member" | "ended" | "not_found" }
> {
  const gate = await getMembershipAndStatus(sessionId, userId);
  if (!gate.member) {
    return { ok: false, reason: "not_member" };
  }
  if (!gate.active) {
    return { ok: false, reason: "ended" };
  }

  const [row] = await db
    .select({ id: sessionQueue.id })
    .from(sessionQueue)
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        eq(sessionQueue.id, queueItemId),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(sessionQueue)
      .where(
        and(
          eq(sessionQueue.sessionId, sessionId),
          eq(sessionQueue.id, queueItemId),
        ),
      );

    const remaining = await tx
      .select({ id: sessionQueue.id })
      .from(sessionQueue)
      .where(eq(sessionQueue.sessionId, sessionId))
      .orderBy(asc(sessionQueue.queuePosition));

    const OFFSET = 1_000_000;
    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(sessionQueue)
        .set({ queuePosition: OFFSET + i })
        .where(eq(sessionQueue.id, remaining[i].id));
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(sessionQueue)
        .set({ queuePosition: i + 1 })
        .where(eq(sessionQueue.id, remaining[i].id));
    }
  });

  return { ok: true };
}

export async function reorderSessionQueue(
  sessionId: string,
  userId: string,
  orderedQueueItemIds: string[],
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_member"
        | "ended"
        | "not_host"
        | "bad_order"
        | "duplicate_ids";
    }
> {
  const gate = await getMembershipAndStatus(sessionId, userId);
  if (!gate.member) {
    return { ok: false, reason: "not_member" };
  }
  if (!gate.active) {
    return { ok: false, reason: "ended" };
  }
  if (!(await isSessionHost(sessionId, userId))) {
    return { ok: false, reason: "not_host" };
  }

  const uniq = new Set(orderedQueueItemIds);
  if (uniq.size !== orderedQueueItemIds.length) {
    return { ok: false, reason: "duplicate_ids" };
  }

  const existing = await db
    .select({ id: sessionQueue.id })
    .from(sessionQueue)
    .where(eq(sessionQueue.sessionId, sessionId))
    .orderBy(asc(sessionQueue.queuePosition));

  const ids = existing.map((e) => e.id);
  if (ids.length !== orderedQueueItemIds.length) {
    return { ok: false, reason: "bad_order" };
  }
  const setWant = new Set(orderedQueueItemIds);
  for (const id of ids) {
    if (!setWant.has(id)) {
      return { ok: false, reason: "bad_order" };
    }
  }

  await db.transaction(async (tx) => {
    const OFFSET = 1_000_000;
    for (let i = 0; i < orderedQueueItemIds.length; i++) {
      await tx
        .update(sessionQueue)
        .set({ queuePosition: OFFSET + i })
        .where(
          and(
            eq(sessionQueue.sessionId, sessionId),
            eq(sessionQueue.id, orderedQueueItemIds[i]),
          ),
        );
    }
    for (let i = 0; i < orderedQueueItemIds.length; i++) {
      await tx
        .update(sessionQueue)
        .set({ queuePosition: i + 1 })
        .where(
          and(
            eq(sessionQueue.sessionId, sessionId),
            eq(sessionQueue.id, orderedQueueItemIds[i]),
          ),
        );
    }
  });

  return { ok: true };
}

export async function upsertSessionVote(
  sessionId: string,
  userId: string,
  queueItemId: string,
  value: -1 | 0 | 1,
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_member" | "ended" | "not_found" | "bad_value" }
> {
  if (value !== -1 && value !== 0 && value !== 1) {
    return { ok: false, reason: "bad_value" };
  }

  const gate = await getMembershipAndStatus(sessionId, userId);
  if (!gate.member) {
    return { ok: false, reason: "not_member" };
  }
  if (!gate.active) {
    return { ok: false, reason: "ended" };
  }

  const [q] = await db
    .select({ id: sessionQueue.id })
    .from(sessionQueue)
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        eq(sessionQueue.id, queueItemId),
      ),
    )
    .limit(1);

  if (!q) {
    return { ok: false, reason: "not_found" };
  }

  if (value === 0) {
    await db
      .delete(sessionVotes)
      .where(
        and(
          eq(sessionVotes.sessionId, sessionId),
          eq(sessionVotes.userId, userId),
          eq(sessionVotes.queueItemId, queueItemId),
        ),
      );
    return { ok: true };
  }

  await db
    .insert(sessionVotes)
    .values({
      sessionId,
      queueItemId,
      userId,
      value,
    })
    .onConflictDoUpdate({
      target: [
        sessionVotes.sessionId,
        sessionVotes.userId,
        sessionVotes.queueItemId,
      ],
      set: {
        value,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}

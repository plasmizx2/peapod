import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { listeningSessions, sessionMembers, users } from "@/db/schema";
import { generateJoinCode } from "@/lib/sessions/join-code";

const MAX_ATTEMPTS = 12;

export async function createListeningSession(hostUserId: string): Promise<{
  sessionId: string;
  joinCode: string;
}> {
  for (let a = 0; a < MAX_ATTEMPTS; a++) {
    const joinCode = generateJoinCode();
    try {
      const [row] = await db
        .insert(listeningSessions)
        .values({
          hostUserId,
          joinCode,
        })
        .returning({
          id: listeningSessions.id,
          joinCode: listeningSessions.joinCode,
        });

      if (!row) continue;

      await db.insert(sessionMembers).values({
        sessionId: row.id,
        userId: hostUserId,
        role: "host",
      });

      return { sessionId: row.id, joinCode: row.joinCode };
    } catch {
      // unique join_code collision — retry
    }
  }

  throw new Error("Could not create session — try again.");
}

export async function joinSessionByCode(
  userId: string,
  joinCode: string,
): Promise<
  | { ok: true; sessionId: string; alreadyMember: boolean }
  | { ok: false; reason: "not_found" | "ended" }
> {
  const [session] = await db
    .select({
      id: listeningSessions.id,
      status: listeningSessions.status,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.joinCode, joinCode))
    .limit(1);

  if (!session) {
    return { ok: false, reason: "not_found" };
  }
  if (session.status !== "active") {
    return { ok: false, reason: "ended" };
  }

  const [existing] = await db
    .select({ userId: sessionMembers.userId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, session.id),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    return { ok: true, sessionId: session.id, alreadyMember: true };
  }

  await db.insert(sessionMembers).values({
    sessionId: session.id,
    userId,
    role: "member",
  });

  return { ok: true, sessionId: session.id, alreadyMember: false };
}

export async function getSessionLobbyForUser(
  sessionId: string,
  userId: string,
): Promise<{
  joinCode: string;
  status: string;
  hostUserId: string;
  queueMode: string;
  driverUserId: string | null;
  /** Spotify playlist id on the host account for auto-saving played tracks. */
  driverSavePlaylistId: string | null;
  driverSaveMode: string;
  driverSaveVoteThreshold: number;
  driverRejectPlaylistId: string | null;
  driverRejectVoteThreshold: number;
  members: {
    userId: string;
    role: string;
    joinedAt: Date;
    displayName: string;
  }[];
} | null> {
  const [membership] = await db
    .select({ sessionId: sessionMembers.sessionId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  const [session] = await db
    .select({
      joinCode: listeningSessions.joinCode,
      status: listeningSessions.status,
      hostUserId: listeningSessions.hostUserId,
      queueMode: listeningSessions.queueMode,
      driverUserId: listeningSessions.driverUserId,
      driverSavePlaylistId: listeningSessions.driverSavePlaylistId,
      driverSaveMode: listeningSessions.driverSaveMode,
      driverSaveVoteThreshold: listeningSessions.driverSaveVoteThreshold,
      driverRejectPlaylistId: listeningSessions.driverRejectPlaylistId,
      driverRejectVoteThreshold: listeningSessions.driverRejectVoteThreshold,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return null;
  }

  const rows = await db
    .select({
      userId: sessionMembers.userId,
      role: sessionMembers.role,
      joinedAt: sessionMembers.joinedAt,
      name: users.name,
      email: users.email,
    })
    .from(sessionMembers)
    .innerJoin(users, eq(sessionMembers.userId, users.id))
    .where(eq(sessionMembers.sessionId, sessionId))
    .orderBy(asc(sessionMembers.joinedAt));

  return {
    joinCode: session.joinCode,
    status: session.status,
    hostUserId: session.hostUserId,
    queueMode: session.queueMode,
    driverUserId: session.driverUserId,
    driverSavePlaylistId: session.driverSavePlaylistId ?? null,
    driverSaveMode: session.driverSaveMode ?? "playback",
    driverSaveVoteThreshold: session.driverSaveVoteThreshold ?? 2,
    driverRejectPlaylistId: session.driverRejectPlaylistId ?? null,
    driverRejectVoteThreshold: session.driverRejectVoteThreshold ?? -2,
    members: rows.map((r) => ({
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      displayName: r.name?.trim() || r.email?.split("@")[0] || "Listener",
    })),
  };
}

/**
 * Removes the user from the session. Host alone → session ends.
 * Host with others → earliest joiner becomes host.
 */
export async function leaveSession(
  userId: string,
  sessionId: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "not_member" | "not_found" }
> {
  const [session] = await db
    .select({
      id: listeningSessions.id,
      status: listeningSessions.status,
      hostUserId: listeningSessions.hostUserId,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return { ok: false, error: "not_found" };
  }

  const [member] = await db
    .select({ role: sessionMembers.role })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    return { ok: false, error: "not_member" };
  }

  if (session.status !== "active") {
    await db
      .delete(sessionMembers)
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, userId),
        ),
      );
    return { ok: true };
  }

  if (member.role !== "host") {
    await db
      .delete(sessionMembers)
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, userId),
        ),
      );
    return { ok: true };
  }

  const others = await db
    .select({
      userId: sessionMembers.userId,
      joinedAt: sessionMembers.joinedAt,
    })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        ne(sessionMembers.userId, userId),
      ),
    )
    .orderBy(asc(sessionMembers.joinedAt))
    .limit(1);

  const nextHost = others[0];

  await db.transaction(async (tx) => {
    if (!nextHost) {
      await tx
        .delete(sessionMembers)
        .where(eq(sessionMembers.sessionId, sessionId));
      await tx
        .update(listeningSessions)
        .set({
          status: "ended",
          endedAt: new Date(),
        })
        .where(eq(listeningSessions.id, sessionId));
      return;
    }

    await tx
      .update(sessionMembers)
      .set({ role: "host" })
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, nextHost.userId),
        ),
      );

    await tx
      .update(listeningSessions)
      .set({ hostUserId: nextHost.userId })
      .where(eq(listeningSessions.id, sessionId));

    await tx
      .delete(sessionMembers)
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, userId),
        ),
      );
  });

  return { ok: true };
}

/** Host-only: ends session for everyone; members remain until they leave. */
export async function endSessionAsHost(
  userId: string,
  sessionId: string,
): Promise<
  { ok: true } | { ok: false; error: "not_found" | "forbidden" | "already_ended" }
> {
  const [session] = await db
    .select({
      hostUserId: listeningSessions.hostUserId,
      status: listeningSessions.status,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return { ok: false, error: "not_found" };
  }
  if (session.hostUserId !== userId) {
    return { ok: false, error: "forbidden" };
  }
  if (session.status !== "active") {
    return { ok: false, error: "already_ended" };
  }

  await db
    .update(listeningSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
    })
    .where(eq(listeningSessions.id, sessionId));

  return { ok: true };
}

const QUEUE_MODES = new Set([
  "manual",
  "equal_play",
  "lean_driver",
  "hype",
]);

const DRIVER_SAVE_MODES = new Set([
  "playback",
  "play_next_only",
  "vote_threshold",
]);

export async function updateSessionQueueSettings(
  userId: string,
  sessionId: string,
  input: {
    queueMode?: string;
    driverUserId?: string | null;
    driverSavePlaylistId?: string | null;
    driverSaveMode?: string;
    driverSaveVoteThreshold?: number;
    driverRejectPlaylistId?: string | null;
    driverRejectVoteThreshold?: number;
  },
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "ended"
        | "bad_mode"
        | "bad_driver_save"
        | "driver_not_member";
    }
> {
  const [session] = await db
    .select({
      hostUserId: listeningSessions.hostUserId,
      status: listeningSessions.status,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return { ok: false, error: "not_found" };
  }
  if (session.hostUserId !== userId) {
    return { ok: false, error: "forbidden" };
  }
  if (session.status !== "active") {
    return { ok: false, error: "ended" };
  }

  if (input.queueMode !== undefined && !QUEUE_MODES.has(input.queueMode)) {
    return { ok: false, error: "bad_mode" };
  }

  if (
    input.driverSaveMode !== undefined &&
    !DRIVER_SAVE_MODES.has(input.driverSaveMode)
  ) {
    return { ok: false, error: "bad_driver_save" };
  }

  if (input.driverSaveVoteThreshold !== undefined) {
    const n = Number(input.driverSaveVoteThreshold);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      return { ok: false, error: "bad_driver_save" };
    }
  }

  if (input.driverRejectVoteThreshold !== undefined) {
    const n = Number(input.driverRejectVoteThreshold);
    if (!Number.isFinite(n) || n > -1 || n < -50) {
      return { ok: false, error: "bad_driver_save" };
    }
  }

  if (input.driverUserId !== undefined && input.driverUserId !== null) {
    const [m] = await db
      .select({ userId: sessionMembers.userId })
      .from(sessionMembers)
      .where(
        and(
          eq(sessionMembers.sessionId, sessionId),
          eq(sessionMembers.userId, input.driverUserId),
        ),
      )
      .limit(1);
    if (!m) {
      return { ok: false, error: "driver_not_member" };
    }
  }

  const patch: {
    queueMode?: string;
    driverUserId?: string | null;
    driverSavePlaylistId?: string | null;
    driverSaveMode?: string;
    driverSaveVoteThreshold?: number;
    driverRejectPlaylistId?: string | null;
    driverRejectVoteThreshold?: number;
  } = {};
  if (input.queueMode !== undefined) {
    patch.queueMode = input.queueMode;
  }
  if (input.driverUserId !== undefined) {
    patch.driverUserId = input.driverUserId;
  }
  if (input.driverSavePlaylistId !== undefined) {
    patch.driverSavePlaylistId = input.driverSavePlaylistId;
  }
  if (input.driverSaveMode !== undefined) {
    patch.driverSaveMode = input.driverSaveMode;
  }
  if (input.driverSaveVoteThreshold !== undefined) {
    patch.driverSaveVoteThreshold = Math.round(
      Number(input.driverSaveVoteThreshold),
    );
  }
  if (input.driverRejectPlaylistId !== undefined) {
    patch.driverRejectPlaylistId =
      input.driverRejectPlaylistId === null ||
      input.driverRejectPlaylistId === ""
        ? null
        : String(input.driverRejectPlaylistId);
  }
  if (input.driverRejectVoteThreshold !== undefined) {
    patch.driverRejectVoteThreshold = Math.round(
      Number(input.driverRejectVoteThreshold),
    );
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  await db
    .update(listeningSessions)
    .set(patch)
    .where(eq(listeningSessions.id, sessionId));

  return { ok: true };
}

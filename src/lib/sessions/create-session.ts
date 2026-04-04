import { and, asc, eq } from "drizzle-orm";
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
    members: rows.map((r) => ({
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      displayName: r.name?.trim() || r.email?.split("@")[0] || "Listener",
    })),
  };
}

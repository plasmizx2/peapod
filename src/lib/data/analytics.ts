import { count, eq, sql, avg } from "drizzle-orm";
import { db } from "@/db";
import {
  chatbotRequests,
  generatedPlaylists,
  listeningEvents,
  listeningSessions,
  sessionMembers,
  sessionQueue,
  syncJobs,
} from "@/db/schema";

export type UserAnalytics = {
  totalPlaysSynced: number;
  totalSessions: number;
  totalSessionsHosted: number;
  playlistsGenerated: number;
  chatbotPromptsUsed: number;
  totalSyncJobs: number;
  avgSessionDurationMins: number | null;
  avgSessionMembers: number | null;
  mostUsedQueueMode: string | null;
  totalTracksQueued: number;
};

export async function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  // Total plays synced
  const [playsRow] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, userId));

  // Sessions as member
  const [sessionsRow] = await db
    .select({ n: count() })
    .from(sessionMembers)
    .where(eq(sessionMembers.userId, userId));

  // Sessions as host
  const [hostedRow] = await db
    .select({ n: count() })
    .from(listeningSessions)
    .where(eq(listeningSessions.hostUserId, userId));

  // Playlists generated
  const [playlistsRow] = await db
    .select({ n: count() })
    .from(generatedPlaylists)
    .where(eq(generatedPlaylists.userId, userId));

  // Chatbot prompts
  const [chatbotRow] = await db
    .select({ n: count() })
    .from(chatbotRequests)
    .where(eq(chatbotRequests.userId, userId));

  // Sync jobs
  const [syncRow] = await db
    .select({ n: count() })
    .from(syncJobs)
    .where(eq(syncJobs.userId, userId));

  // Avg session duration (for sessions user participated in)
  const durationRows = await db
    .select({
      avgMins: sql<number | null>`
        avg(
          extract(epoch from (${listeningSessions.endedAt} - ${listeningSessions.createdAt})) / 60
        )
      `.mapWith(Number),
    })
    .from(sessionMembers)
    .innerJoin(listeningSessions, eq(sessionMembers.sessionId, listeningSessions.id))
    .where(
      sql`${sessionMembers.userId} = ${userId} and ${listeningSessions.endedAt} is not null`,
    );
  const avgSessionDurationMins = durationRows[0]?.avgMins
    ? Math.round(durationRows[0].avgMins)
    : null;

  // Avg members per session user hosted
  const avgMemberRows = await db
    .select({
      avgMembers: sql<number | null>`avg(member_count)`.mapWith(Number),
    })
    .from(
      db
        .select({
          sessionId: sessionMembers.sessionId,
          member_count: count().as("member_count"),
        })
        .from(sessionMembers)
        .innerJoin(listeningSessions, eq(sessionMembers.sessionId, listeningSessions.id))
        .where(eq(listeningSessions.hostUserId, userId))
        .groupBy(sessionMembers.sessionId)
        .as("sub"),
    );
  const avgSessionMembers = avgMemberRows[0]?.avgMembers
    ? Math.round(avgMemberRows[0].avgMembers * 10) / 10
    : null;

  // Most used queue mode
  const modeRows = await db
    .select({
      mode: listeningSessions.queueMode,
      n: count(),
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.hostUserId, userId))
    .groupBy(listeningSessions.queueMode)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  const mostUsedQueueMode = modeRows[0]?.mode ?? null;

  // Total tracks queued across all sessions user was in
  const [queuedRow] = await db
    .select({ n: count() })
    .from(sessionQueue)
    .innerJoin(sessionMembers, eq(sessionQueue.sessionId, sessionMembers.sessionId))
    .where(eq(sessionMembers.userId, userId));

  return {
    totalPlaysSynced: Number(playsRow?.n ?? 0),
    totalSessions: Number(sessionsRow?.n ?? 0),
    totalSessionsHosted: Number(hostedRow?.n ?? 0),
    playlistsGenerated: Number(playlistsRow?.n ?? 0),
    chatbotPromptsUsed: Number(chatbotRow?.n ?? 0),
    totalSyncJobs: Number(syncRow?.n ?? 0),
    avgSessionDurationMins,
    avgSessionMembers,
    mostUsedQueueMode,
    totalTracksQueued: Number(queuedRow?.n ?? 0),
  };
}

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  friendships,
  listeningEvents,
  listeningSessions,
  sessionMembers,
  songOfTheDay,
  tracks,
  userProfiles,
  users,
} from "@/db/schema";

export type TimelineEvent = {
  id: string;
  type: "listen" | "session" | "song_of_day";
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  timestamp: string;
  data: Record<string, unknown>;
};

/**
 * Build a privacy-respecting activity feed from accepted friends.
 * Only shows data from friends with public or friends_only visibility.
 */
export async function getFriendTimeline(
  userId: string,
  limit = 20,
): Promise<TimelineEvent[]> {
  // Get accepted friend IDs
  const friendRows = await db
    .select({ id: friendships.id, requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        sql`(${friendships.requesterId} = ${userId} OR ${friendships.addresseeId} = ${userId})`,
      ),
    );

  const friendIds = friendRows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId,
  );

  if (friendIds.length === 0) return [];

  // Filter by privacy: only friends with public or friends_only visibility
  const visibleProfiles = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(
      and(
        inArray(userProfiles.userId, friendIds),
        sql`${userProfiles.listeningVisibility} IN ('public', 'friends_only')`,
      ),
    );
  const visibleIds = visibleProfiles.map((p) => p.userId);

  // Also include friends who have NO profile (default is friends_only)
  const profiledIds = new Set(visibleProfiles.map((p) => p.userId));
  const noProfileIds = friendIds.filter((id) => !profiledIds.has(id));
  // Friends without a profile row default to friends_only (visible)
  const allVisibleIds = [...visibleIds, ...noProfileIds];

  if (allVisibleIds.length === 0) return [];

  // Build user display map
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(inArray(users.id, allVisibleIds));

  const userMap = new Map(
    userRows.map((u) => [
      u.id,
      {
        displayName:
          u.displayName?.trim() || u.name?.trim() || u.email?.split("@")[0] || "Someone",
        avatarUrl: u.avatarUrl,
      },
    ]),
  );

  const events: TimelineEvent[] = [];

  // Recent listens (last 24h, up to 3 per friend)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentListens = await db
    .select({
      id: listeningEvents.id,
      userId: listeningEvents.userId,
      trackName: tracks.name,
      artistName: artists.name,
      listenedAt: listeningEvents.listenedAt,
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        inArray(listeningEvents.userId, allVisibleIds),
        sql`${listeningEvents.listenedAt} >= ${oneDayAgo}`,
      ),
    )
    .orderBy(desc(listeningEvents.listenedAt))
    .limit(limit);

  for (const r of recentListens) {
    const u = userMap.get(r.userId);
    events.push({
      id: r.id,
      type: "listen",
      userId: r.userId,
      displayName: u?.displayName ?? "Someone",
      avatarUrl: u?.avatarUrl ?? null,
      timestamp: r.listenedAt.toISOString(),
      data: { trackName: r.trackName, artistName: r.artistName },
    });
  }

  // Recent sessions (last 7 days)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = await db
    .select({
      sessionId: listeningSessions.id,
      hostUserId: listeningSessions.hostUserId,
      joinCode: listeningSessions.joinCode,
      status: listeningSessions.status,
      createdAt: listeningSessions.createdAt,
    })
    .from(listeningSessions)
    .where(
      and(
        inArray(listeningSessions.hostUserId, allVisibleIds),
        sql`${listeningSessions.createdAt} >= ${oneWeekAgo}`,
      ),
    )
    .orderBy(desc(listeningSessions.createdAt))
    .limit(5);

  for (const s of recentSessions) {
    // Get member count
    const [memberRow] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, s.sessionId));

    const u = userMap.get(s.hostUserId);
    events.push({
      id: `session-${s.sessionId}`,
      type: "session",
      userId: s.hostUserId,
      displayName: u?.displayName ?? "Someone",
      avatarUrl: u?.avatarUrl ?? null,
      timestamp: s.createdAt.toISOString(),
      data: {
        joinCode: s.joinCode,
        memberCount: memberRow?.n ?? 0,
        status: s.status,
      },
    });
  }

  // Song of the day from friends (today)
  const today = new Date().toISOString().slice(0, 10);
  const friendSotd = await db
    .select({
      id: songOfTheDay.id,
      odUserId: songOfTheDay.userId,
      trackName: tracks.name,
      artistName: artists.name,
      reason: songOfTheDay.reason,
      createdAt: songOfTheDay.createdAt,
    })
    .from(songOfTheDay)
    .innerJoin(tracks, eq(songOfTheDay.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        inArray(songOfTheDay.userId, allVisibleIds),
        eq(songOfTheDay.dateStr, today),
      ),
    );

  for (const s of friendSotd) {
    const u = userMap.get(s.odUserId);
    events.push({
      id: s.id,
      type: "song_of_day",
      userId: s.odUserId,
      displayName: u?.displayName ?? "Someone",
      avatarUrl: u?.avatarUrl ?? null,
      timestamp: s.createdAt.toISOString(),
      data: {
        trackName: s.trackName,
        artistName: s.artistName,
        reason: s.reason,
      },
    });
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, limit);
}

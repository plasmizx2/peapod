import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  listeningSessions,
  sessionMembers,
  sessionQueue,
  sessionVotes,
  tracks,
  users,
} from "@/db/schema";

export type RecapTrackRow = {
  queueItemId: string;
  playedAt: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  spotifyId: string;
  addedByDisplayName: string;
  addedByUserId: string | null;
  voteTotal: number;
};

export type SessionRecapData = {
  sessionId: string;
  joinCode: string;
  hostDisplayName: string;
  createdAt: string;
  endedAt: string | null;
  status: string;
  durationLabel: string;
  memberCount: number;
  members: { userId: string; displayName: string; tracksAdded: number }[];
  playedTracks: RecapTrackRow[];
  topVotedTracks: RecapTrackRow[];
  totalQueued: number;
};

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return "ongoing";
  const ms = end.getTime() - start.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "< 1 min";
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours > 0) return `${hours}h ${rem}m`;
  return `${mins}m`;
}

export async function getSessionRecap(
  sessionId: string,
  viewerUserId: string,
): Promise<SessionRecapData | null> {
  // Verify viewer is a member
  const [membership] = await db
    .select({ userId: sessionMembers.userId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, viewerUserId),
      ),
    )
    .limit(1);

  if (!membership) return null;

  // Session header
  const [session] = await db
    .select({
      id: listeningSessions.id,
      joinCode: listeningSessions.joinCode,
      status: listeningSessions.status,
      hostUserId: listeningSessions.hostUserId,
      createdAt: listeningSessions.createdAt,
      endedAt: listeningSessions.endedAt,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  // All members with display names
  const memberRows = await db
    .select({
      userId: sessionMembers.userId,
      name: users.name,
      email: users.email,
    })
    .from(sessionMembers)
    .innerJoin(users, eq(sessionMembers.userId, users.id))
    .where(eq(sessionMembers.sessionId, sessionId))
    .orderBy(asc(sessionMembers.joinedAt));

  const memberMap = new Map(
    memberRows.map((m) => [
      m.userId,
      m.name?.trim() || m.email?.split("@")[0] || "Listener",
    ]),
  );

  const hostDisplayName = memberMap.get(session.hostUserId) ?? "Host";

  // Played tracks
  const played = await db
    .select({
      id: sessionQueue.id,
      playedAt: sessionQueue.playedAt,
      trackName: tracks.name,
      artistName: artists.name,
      albumName: tracks.albumName,
      spotifyId: tracks.spotifyId,
      addedByUserId: sessionQueue.addedByUserId,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.primaryArtistId, artists.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        isNotNull(sessionQueue.playedAt),
      ),
    )
    .orderBy(asc(sessionQueue.playedAt));

  // Total queued (played + unplayed)
  const [totalRow] = await db
    .select({ n: count() })
    .from(sessionQueue)
    .where(eq(sessionQueue.sessionId, sessionId));

  // Vote totals
  const voteAgg = await db
    .select({
      queueItemId: sessionVotes.queueItemId,
      total: sql<number>`coalesce(sum(${sessionVotes.value}), 0)`.mapWith(Number),
    })
    .from(sessionVotes)
    .where(eq(sessionVotes.sessionId, sessionId))
    .groupBy(sessionVotes.queueItemId);

  const voteMap = new Map<string, number>(
    voteAgg.map((v) => [v.queueItemId, v.total]),
  );

  // Track contributions per member
  const tracksAddedByUser = new Map<string, number>();
  for (const row of played) {
    if (row.addedByUserId) {
      tracksAddedByUser.set(
        row.addedByUserId,
        (tracksAddedByUser.get(row.addedByUserId) ?? 0) + 1,
      );
    }
  }

  const playedTracks: RecapTrackRow[] = played.map((r) => ({
    queueItemId: r.id,
    playedAt: r.playedAt!.toISOString(),
    trackName: r.trackName,
    artistName: r.artistName,
    albumName: r.albumName,
    spotifyId: r.spotifyId,
    addedByDisplayName: r.addedByUserId
      ? (memberMap.get(r.addedByUserId) ?? "Someone")
      : "Someone",
    addedByUserId: r.addedByUserId,
    voteTotal: voteMap.get(r.id) ?? 0,
  }));

  const topVotedTracks = [...playedTracks]
    .sort((a, b) => b.voteTotal - a.voteTotal)
    .slice(0, 3)
    .filter((t) => t.voteTotal > 0);

  const members = memberRows.map((m) => ({
    userId: m.userId,
    displayName: memberMap.get(m.userId) ?? "Listener",
    tracksAdded: tracksAddedByUser.get(m.userId) ?? 0,
  }));

  return {
    sessionId: session.id,
    joinCode: session.joinCode,
    hostDisplayName,
    createdAt: session.createdAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    status: session.status,
    durationLabel: formatDuration(session.createdAt, session.endedAt),
    memberCount: memberRows.length,
    members,
    playedTracks,
    topVotedTracks,
    totalQueued: Number(totalRow?.n ?? 0),
  };
}

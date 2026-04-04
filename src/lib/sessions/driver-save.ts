import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listeningSessions, sessionQueue, sessionVotes, tracks } from "@/db/schema";
import { appendSpotifyUrisToPlaylist } from "@/lib/spotify/append-playlist-tracks";

export type DriverSaveMode = "playback" | "play_next_only" | "vote_threshold";

type SessionDriverSettings = {
  hostUserId: string;
  driverSavePlaylistId: string | null;
  driverSaveMode: DriverSaveMode;
  driverSaveVoteThreshold: number;
  driverRejectPlaylistId: string | null;
  driverRejectVoteThreshold: number;
};

async function loadSessionDriverSettings(
  sessionId: string,
): Promise<SessionDriverSettings | null> {
  const [row] = await db
    .select({
      hostUserId: listeningSessions.hostUserId,
      driverSavePlaylistId: listeningSessions.driverSavePlaylistId,
      driverSaveMode: listeningSessions.driverSaveMode,
      driverSaveVoteThreshold: listeningSessions.driverSaveVoteThreshold,
      driverRejectPlaylistId: listeningSessions.driverRejectPlaylistId,
      driverRejectVoteThreshold: listeningSessions.driverRejectVoteThreshold,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  const mode = row.driverSaveMode;
  const normalizedMode: DriverSaveMode =
    mode === "play_next_only" || mode === "vote_threshold"
      ? mode
      : "playback";

  return {
    hostUserId: row.hostUserId,
    driverSavePlaylistId: row.driverSavePlaylistId ?? null,
    driverSaveMode: normalizedMode,
    driverSaveVoteThreshold: row.driverSaveVoteThreshold ?? 2,
    driverRejectPlaylistId: row.driverRejectPlaylistId ?? null,
    driverRejectVoteThreshold: row.driverRejectVoteThreshold ?? -2,
  };
}

async function voteTotalForQueueItem(
  sessionId: string,
  queueItemId: string,
): Promise<number> {
  const rows = await db
    .select({ value: sessionVotes.value })
    .from(sessionVotes)
    .where(
      and(
        eq(sessionVotes.sessionId, sessionId),
        eq(sessionVotes.queueItemId, queueItemId),
      ),
    );
  return rows.reduce((s, r) => s + r.value, 0);
}

/**
 * After Play next / Play all: append to driving log when mode allows.
 * Failures are logged only — playback should still succeed.
 */
export async function appendPlayedTracksToDriverSavePlaylist(
  sessionId: string,
  hostUserId: string,
  items: { queueItemId: string; spotifyId: string }[],
  source: "play_next" | "play_all",
): Promise<void> {
  if (items.length === 0) return;

  const s = await loadSessionDriverSettings(sessionId);
  if (!s || s.hostUserId !== hostUserId) return;

  if (s.driverSaveMode === "vote_threshold") {
    return;
  }
  if (s.driverSaveMode === "play_next_only" && source === "play_all") {
    return;
  }
  if (!s.driverSavePlaylistId) {
    return;
  }

  const ids = items.map((x) => x.queueItemId);
  const rows = await db
    .select({
      id: sessionQueue.id,
      spotifyId: tracks.spotifyId,
      driverPositiveLoggedAt: sessionQueue.driverPositiveLoggedAt,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        inArray(sessionQueue.id, ids),
      ),
    );

  const pending: { queueItemId: string; spotifyId: string }[] = [];
  for (const it of items) {
    const row = rows.find((r) => r.id === it.queueItemId);
    if (!row?.driverPositiveLoggedAt) {
      pending.push({ queueItemId: it.queueItemId, spotifyId: it.spotifyId });
    }
  }
  if (pending.length === 0) return;

  const spotifyIds = pending.map((p) => p.spotifyId);
  const out = await appendSpotifyUrisToPlaylist(
    hostUserId,
    s.driverSavePlaylistId,
    spotifyIds,
  );
  if (!out.ok) {
    console.error("[driver-save]", out.error, out.status);
    return;
  }

  const now = new Date();
  for (const p of pending) {
    await db
      .update(sessionQueue)
      .set({ driverPositiveLoggedAt: now })
      .where(eq(sessionQueue.id, p.queueItemId));
  }
}

/**
 * After a vote change: maybe append to main log (vote_threshold mode) or reject playlist.
 */
export async function processDriverLogAfterVote(
  sessionId: string,
  queueItemId: string,
): Promise<void> {
  const s = await loadSessionDriverSettings(sessionId);
  if (!s) return;

  const hostUserId = s.hostUserId;
  const total = await voteTotalForQueueItem(sessionId, queueItemId);

  const [qrow] = await db
    .select({
      id: sessionQueue.id,
      spotifyId: tracks.spotifyId,
      driverPositiveLoggedAt: sessionQueue.driverPositiveLoggedAt,
      driverRejectLoggedAt: sessionQueue.driverRejectLoggedAt,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        eq(sessionQueue.id, queueItemId),
      ),
    )
    .limit(1);

  if (!qrow) return;

  if (
    s.driverSavePlaylistId &&
    s.driverSaveMode === "vote_threshold" &&
    !qrow.driverPositiveLoggedAt &&
    total >= s.driverSaveVoteThreshold
  ) {
    const out = await appendSpotifyUrisToPlaylist(
      hostUserId,
      s.driverSavePlaylistId,
      [qrow.spotifyId],
    );
    if (!out.ok) {
      console.error("[driver-save] vote threshold", out.error, out.status);
    } else {
      await db
        .update(sessionQueue)
        .set({ driverPositiveLoggedAt: new Date() })
        .where(eq(sessionQueue.id, queueItemId));
    }
  }

  if (
    s.driverRejectPlaylistId &&
    !qrow.driverRejectLoggedAt &&
    total <= s.driverRejectVoteThreshold
  ) {
    const out = await appendSpotifyUrisToPlaylist(
      hostUserId,
      s.driverRejectPlaylistId,
      [qrow.spotifyId],
    );
    if (!out.ok) {
      console.error("[driver-save] reject playlist", out.error, out.status);
    } else {
      await db
        .update(sessionQueue)
        .set({ driverRejectLoggedAt: new Date() })
        .where(eq(sessionQueue.id, queueItemId));
    }
  }
}

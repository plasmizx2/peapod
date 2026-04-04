import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { listeningSessions, sessionQueue, tracks } from "@/db/schema";
import { appendPlayedTracksToDriverSavePlaylist } from "@/lib/sessions/driver-save";
import { spotifyUserPut } from "@/lib/spotify/user-api";

const SPOTIFY_PLAY_URL = "https://api.spotify.com/v1/me/player/play";
const MAX_URIS = 50;

async function getHostUserId(sessionId: string): Promise<string | null> {
  const [s] = await db
    .select({ hostUserId: listeningSessions.hostUserId })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);
  return s?.hostUserId ?? null;
}

/**
 * Playback uses the **host**'s Spotify account (their active device).
 */
export async function playNextFromSessionQueue(sessionId: string): Promise<
  | { ok: true }
  | { ok: false; error: string; status?: number }
> {
  const hostUserId = await getHostUserId(sessionId);
  if (!hostUserId) {
    return { ok: false, error: "Session not found" };
  }

  const [row] = await db
    .select({
      id: sessionQueue.id,
      spotifyId: tracks.spotifyId,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        isNull(sessionQueue.playedAt),
      ),
    )
    .orderBy(asc(sessionQueue.queuePosition))
    .limit(1);

  if (!row) {
    return { ok: false, error: "No unplayed tracks in queue" };
  }

  const res = await spotifyUserPut(hostUserId, SPOTIFY_PLAY_URL, {
    uris: [`spotify:track:${row.spotifyId}`],
  });

  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      error: t.slice(0, 200) || "Spotify playback failed",
      status: res.status,
    };
  }

  await db
    .update(sessionQueue)
    .set({ playedAt: new Date() })
    .where(eq(sessionQueue.id, row.id));

  await appendPlayedTracksToDriverSavePlaylist(sessionId, hostUserId, [
    row.spotifyId,
  ]);

  return { ok: true };
}

export async function playAllUnplayedFromSessionQueue(sessionId: string): Promise<
  | { ok: true; count: number }
  | { ok: false; error: string; status?: number }
> {
  const hostUserId = await getHostUserId(sessionId);
  if (!hostUserId) {
    return { ok: false, error: "Session not found" };
  }

  const rows = await db
    .select({
      id: sessionQueue.id,
      spotifyId: tracks.spotifyId,
    })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        isNull(sessionQueue.playedAt),
      ),
    )
    .orderBy(asc(sessionQueue.queuePosition))
    .limit(MAX_URIS);

  if (rows.length === 0) {
    return { ok: false, error: "No unplayed tracks in queue" };
  }

  const uris = rows.map((r) => `spotify:track:${r.spotifyId}`);
  const res = await spotifyUserPut(hostUserId, SPOTIFY_PLAY_URL, { uris });

  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      error: t.slice(0, 200) || "Spotify playback failed",
      status: res.status,
    };
  }

  const now = new Date();
  for (const r of rows) {
    await db
      .update(sessionQueue)
      .set({ playedAt: now })
      .where(eq(sessionQueue.id, r.id));
  }

  await appendPlayedTracksToDriverSavePlaylist(
    sessionId,
    hostUserId,
    rows.map((r) => r.spotifyId),
  );

  return { ok: true, count: rows.length };
}

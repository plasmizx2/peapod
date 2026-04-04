import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listeningSessions } from "@/db/schema";
import { appendSpotifyUrisToPlaylist } from "@/lib/spotify/append-playlist-tracks";

/**
 * If the session has a driver save playlist, append played tracks (host token).
 * Failures are logged only — playback should still succeed.
 */
export async function appendPlayedTracksToDriverSavePlaylist(
  sessionId: string,
  hostUserId: string,
  spotifyTrackIds: string[],
): Promise<void> {
  if (spotifyTrackIds.length === 0) return;

  const [row] = await db
    .select({ pid: listeningSessions.driverSavePlaylistId })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!row?.pid) return;

  const out = await appendSpotifyUrisToPlaylist(
    hostUserId,
    row.pid,
    spotifyTrackIds,
  );
  if (!out.ok) {
    console.error("[driver-save]", out.error, out.status);
  }
}

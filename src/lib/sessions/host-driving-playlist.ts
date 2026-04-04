import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listeningSessions } from "@/db/schema";
import { spotifyUserGet, spotifyUserPost } from "@/lib/spotify/user-api";

/**
 * Creates a private Spotify playlist on the host account and attaches it to the session.
 */
export async function createAndAssignDriverSavePlaylist(
  hostUserId: string,
  sessionId: string,
): Promise<
  | { ok: true; playlistId: string }
  | { ok: false; error: "not_found" | "forbidden" | "ended" | "spotify" }
> {
  const [s] = await db
    .select({
      hostUserId: listeningSessions.hostUserId,
      status: listeningSessions.status,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!s) {
    return { ok: false, error: "not_found" };
  }
  if (s.hostUserId !== hostUserId) {
    return { ok: false, error: "forbidden" };
  }
  if (s.status !== "active") {
    return { ok: false, error: "ended" };
  }

  const meRes = await spotifyUserGet(
    hostUserId,
    "https://api.spotify.com/v1/me",
  );
  if (!meRes.ok) {
    return { ok: false, error: "spotify" };
  }

  const me = (await meRes.json()) as { id: string };
  const createRes = await spotifyUserPost(
    hostUserId,
    `https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`,
    {
      name: "PeaPod · Driving log",
      public: false,
      description: "Tracks played from your PeaPod group session.",
    },
  );

  if (!createRes.ok) {
    return { ok: false, error: "spotify" };
  }

  const pl = (await createRes.json()) as { id: string };

  await db
    .update(listeningSessions)
    .set({ driverSavePlaylistId: pl.id })
    .where(eq(listeningSessions.id, sessionId));

  return { ok: true, playlistId: pl.id };
}

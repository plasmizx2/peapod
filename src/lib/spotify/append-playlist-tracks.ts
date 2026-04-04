import { spotifyUserPost } from "@/lib/spotify/user-api";

const BATCH = 100;

/**
 * Appends tracks to a playlist owned by the given PeaPod user (their Spotify token).
 */
export async function appendSpotifyUrisToPlaylist(
  userId: string,
  playlistId: string,
  spotifyTrackIds: string[],
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (spotifyTrackIds.length === 0) {
    return { ok: true };
  }

  const uris = spotifyTrackIds.map((id) => `spotify:track:${id}`);
  const base = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`;

  for (let i = 0; i < uris.length; i += BATCH) {
    const chunk = uris.slice(i, i + BATCH);
    const res = await spotifyUserPost(userId, base, { uris: chunk });
    if (!res.ok) {
      const t = await res.text();
      return {
        ok: false,
        error: t.slice(0, 200) || "Could not add to playlist",
        status: res.status,
      };
    }
  }

  return { ok: true };
}

import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { appendSpotifyUrisToPlaylist } from "@/lib/spotify/append-playlist-tracks";
import { spotifyUserGet, spotifyUserPost } from "@/lib/spotify/user-api";
import { loadGeneratedPlaylistForUser } from "@/lib/playlists/solo-generate";

const NAME_MAX = 100;

/**
 * Creates a private Spotify playlist on the user's account and fills it with
 * the same tracks (order preserved) as a PeaPod generated playlist.
 */
export async function exportGeneratedPlaylistToSpotify(
  userId: string,
  playlistId: string,
): Promise<
  | {
      ok: true;
      spotifyPlaylistId: string;
      spotifyUrl: string;
    }
  | {
      ok: false;
      error: "not_found" | "empty" | "not_linked" | "spotify";
    }
> {
  const loaded = await loadGeneratedPlaylistForUser(userId, playlistId);

  if (!loaded) {
    return { ok: false, error: "not_found" };
  }
  if (loaded.tracks.length === 0) {
    return { ok: false, error: "empty" };
  }

  try {
    const meRes = await spotifyUserGet(
      userId,
      "https://api.spotify.com/v1/me",
    );
    if (!meRes.ok) {
      return { ok: false, error: "spotify" };
    }

    const me = (await meRes.json()) as { id: string };
    const rawName = loaded.title.trim() || "PeaPod playlist";
    const name =
      rawName.length > NAME_MAX ? `${rawName.slice(0, NAME_MAX - 1)}…` : rawName;

    const createRes = await spotifyUserPost(
      userId,
      `https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`,
      {
        name,
        public: false,
        description: "Created in PeaPod (Mood DJ / solo generator).",
      },
    );

    if (!createRes.ok) {
      return { ok: false, error: "spotify" };
    }

    const created = (await createRes.json()) as {
      id: string;
      external_urls?: { spotify?: string };
    };

    const ids = loaded.tracks.map((t) => t.spotifyId).filter(Boolean);
    const append = await appendSpotifyUrisToPlaylist(userId, created.id, ids);
    if (!append.ok) {
      return { ok: false, error: "spotify" };
    }

    const spotifyUrl =
      created.external_urls?.spotify ??
      `https://open.spotify.com/playlist/${created.id}`;

    return {
      ok: true,
      spotifyPlaylistId: created.id,
      spotifyUrl,
    };
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return { ok: false, error: "not_linked" };
    }
    if (e instanceof SpotifyTokenError) {
      return { ok: false, error: "spotify" };
    }
    throw e;
  }
}

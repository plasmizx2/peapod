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
      detail?: string;
    }
> {
  const loaded = await loadGeneratedPlaylistForUser(userId, playlistId);

  if (!loaded) {
    return { ok: false, error: "not_found" };
  }
  if (loaded.tracks.length === 0) {
    return { ok: false, error: "empty" };
  }

  function normalizeSpotifyError(status: number, body: string): string {
    const t = body.trim();
    const prefix = `Spotify error (HTTP ${status}).`;
    if (!t) return prefix;
    if (/insufficient client scope/i.test(t)) {
      return `${prefix} Missing permission scope — reconnect Spotify (force consent) under Music services.`;
    }
    if (/invalid access token|token expired|invalid_grant/i.test(t)) {
      return `${prefix} Token rejected — reconnect Spotify under Music services.`;
    }
    if (status === 429 || /rate limit/i.test(t)) {
      return `${prefix} Rate limited — try again in a minute.`;
    }
    return `${prefix} ${t.slice(0, 200)}`;
  }

  try {
    const meRes = await spotifyUserGet(
      userId,
      "https://api.spotify.com/v1/me",
    );
    if (!meRes.ok) {
      const t = await meRes.text().catch(() => "");
      console.error("[export-spotify] /me failed", meRes.status, t.slice(0, 300));
      return {
        ok: false,
        error: "spotify",
        detail: normalizeSpotifyError(meRes.status, t),
      };
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
      const t = await createRes.text().catch(() => "");
      console.error(
        "[export-spotify] create failed",
        createRes.status,
        t.slice(0, 500),
      );
      return {
        ok: false,
        error: "spotify",
        detail: normalizeSpotifyError(createRes.status, t),
      };
    }

    const created = (await createRes.json()) as {
      id: string;
      external_urls?: { spotify?: string };
    };

    const ids = loaded.tracks.map((t) => t.spotifyId).filter(Boolean);
    const append = await appendSpotifyUrisToPlaylist(userId, created.id, ids);
    if (!append.ok) {
      const detail = append.status
        ? normalizeSpotifyError(append.status, append.error)
        : append.error.slice(0, 200);
      console.error(
        "[export-spotify] append failed",
        append.status ?? "unknown",
        append.error.slice(0, 500),
      );
      return { ok: false, error: "spotify", detail };
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
      return { ok: false, error: "spotify", detail: e.message.slice(0, 200) };
    }
    throw e;
  }
}

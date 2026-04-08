import { spotifyUserGet } from "@/lib/spotify/user-api";
import type { SpotifyTrackPayload } from "@/lib/spotify/catalog-track";

type SearchJson = {
  tracks?: {
    items?: {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album?: { name?: string };
    }[];
  };
};

/**
 * Server-side Spotify track search (same API as /api/spotify/search).
 * limit is capped at 10 per Spotify Search API rules.
 */
export async function searchSpotifyTracksInternal(
  userId: string,
  q: string,
  limit: number,
): Promise<SpotifyTrackPayload[]> {
  const t = q.trim();
  if (t.length < 2) return [];

  const cap = Math.min(10, Math.max(1, limit));
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q: t,
    type: "track",
    limit: String(cap),
  })}`;

  const res = await spotifyUserGet(userId, url);
  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as SearchJson;
  const items = json.tracks?.items ?? [];
  const out: SpotifyTrackPayload[] = [];
  for (const it of items) {
    if (!it?.id || !it.name || !it.artists?.length) continue;
    out.push({
      id: it.id,
      name: it.name,
      artists: it.artists.map((a) => ({
        id: a.id,
        name: a.name,
      })),
      album: it.album?.name ? { name: it.album.name } : undefined,
    });
  }
  return out;
}

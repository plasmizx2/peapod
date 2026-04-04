import { sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, tracks } from "@/db/schema";

export type SpotifyTrackPayload = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album?: { name?: string };
};

/**
 * Upserts normalized artist + track rows (no listening event).
 * Used when adding tracks to a group queue from Spotify IDs.
 */
export async function upsertCatalogTrack(
  spotifyTrack: SpotifyTrackPayload,
): Promise<string | null> {
  const track = spotifyTrack;
  if (!track?.id || !track.name || !track.artists?.length) {
    return null;
  }

  const primary = track.artists[0]!;

  const [artistRow] = await db
    .insert(artists)
    .values({
      spotifyId: primary.id,
      name: primary.name,
    })
    .onConflictDoUpdate({
      target: artists.spotifyId,
      set: {
        name: sql`excluded.name`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: artists.id });

  if (!artistRow) {
    return null;
  }

  const [trackRow] = await db
    .insert(tracks)
    .values({
      spotifyId: track.id,
      name: track.name,
      albumName: track.album?.name ?? null,
      primaryArtistId: artistRow.id,
    })
    .onConflictDoUpdate({
      target: tracks.spotifyId,
      set: {
        name: sql`excluded.name`,
        albumName: sql`excluded.album_name`,
        primaryArtistId: sql`excluded.primary_artist_id`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: tracks.id });

  return trackRow?.id ?? null;
}

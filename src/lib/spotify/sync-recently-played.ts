import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  listeningEvents,
  providerAccounts,
  tracks,
} from "@/db/schema";
import { getSpotifyAccessToken } from "./access-token";

type SpotifyArtist = { id: string; name: string };
type SpotifyTrack = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album?: { name?: string };
};

type RecentlyPlayedItem = {
  track: SpotifyTrack;
  played_at: string;
};

type RecentlyPlayedResponse = {
  items: RecentlyPlayedItem[];
};

/**
 * Pulls Spotify recently played (up to 50 per request) and upserts catalog + listening_events.
 */
export async function syncRecentlyPlayed(userId: string): Promise<{
  imported: number;
  skipped: number;
}> {
  const { accessToken, providerAccountId } = await getSpotifyAccessToken(userId);

  const res = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const t = await res.text();
    console.error("[spotify] recently-played failed", res.status, t.slice(0, 500));
    throw new Error(`Spotify recently-played failed: ${res.status}`);
  }

  const body = (await res.json()) as RecentlyPlayedResponse;
  const items = body.items ?? [];

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const track = item.track;
    if (!track?.id || !track.name || !track.artists?.length) {
      skipped++;
      continue;
    }

    const primary = track.artists[0]!;
    const playedAt = new Date(item.played_at);
    if (Number.isNaN(playedAt.getTime())) {
      skipped++;
      continue;
    }

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
      skipped++;
      continue;
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

    if (!trackRow) {
      skipped++;
      continue;
    }

    const ins = await db
      .insert(listeningEvents)
      .values({
        userId,
        providerAccountId,
        trackId: trackRow.id,
        listenedAt: playedAt,
      })
      .onConflictDoNothing({
        target: [
          listeningEvents.userId,
          listeningEvents.listenedAt,
          listeningEvents.trackId,
        ],
      })
      .returning({ id: listeningEvents.id });

    if (ins.length > 0) {
      imported++;
    } else {
      skipped++;
    }
  }

  await db
    .update(providerAccounts)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(providerAccounts.id, providerAccountId));

  return { imported, skipped };
}

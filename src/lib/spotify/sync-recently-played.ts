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
  next: string | null;
};

const DEFAULT_LIMIT = 50;
/** Max Spotify pages per sync (50 plays each) — keeps serverless requests bounded. */
const MAX_PAGES = 25;

const RECENTLY_PLAYED_FIRST = `https://api.spotify.com/v1/me/player/recently-played?limit=${DEFAULT_LIMIT}`;

async function ingestItem(
  userId: string,
  providerAccountId: string,
  item: RecentlyPlayedItem,
): Promise<"imported" | "skipped"> {
  const track = item.track;
  if (!track?.id || !track.name || !track.artists?.length) {
    return "skipped";
  }

  const primary = track.artists[0]!;
  const playedAt = new Date(item.played_at);
  if (Number.isNaN(playedAt.getTime())) {
    return "skipped";
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
    return "skipped";
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
    return "skipped";
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

  return ins.length > 0 ? "imported" : "skipped";
}

/**
 * Pulls Spotify recently played using cursor pagination (`next` URLs) until
 * Spotify runs out of history or we hit MAX_PAGES (50 × 25 = 1,250 plays max per run).
 */
export async function syncRecentlyPlayed(userId: string): Promise<{
  imported: number;
  skipped: number;
  pagesFetched: number;
}> {
  let { accessToken, providerAccountId } = await getSpotifyAccessToken(userId);

  let imported = 0;
  let skipped = 0;
  let pagesFetched = 0;
  let nextUrl: string | null = RECENTLY_PLAYED_FIRST;

  for (let page = 0; page < MAX_PAGES && nextUrl; page++) {
    let res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      ({ accessToken, providerAccountId } = await getSpotifyAccessToken(userId, {
        forceRefresh: true,
      }));
      res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    if (!res.ok) {
      const t = await res.text();
      console.error("[spotify] recently-played failed", res.status, t.slice(0, 500));
      throw new Error(`Spotify recently-played failed: ${res.status}`);
    }

    const body = (await res.json()) as RecentlyPlayedResponse;
    const items = body.items ?? [];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const r = await ingestItem(userId, providerAccountId, item);
      if (r === "imported") imported++;
      else skipped++;
    }

    pagesFetched++;
    nextUrl = body.next ?? null;
  }

  await db
    .update(providerAccounts)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(providerAccounts.id, providerAccountId));

  return { imported, skipped, pagesFetched };
}

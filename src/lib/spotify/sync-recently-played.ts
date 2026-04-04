import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artists,
  listeningEvents,
  providerAccounts,
  syncJobs,
  tracks,
} from "@/db/schema";
import { rebuildUserListeningStats } from "@/lib/data/rebuild-user-stats";
import { getSpotifyAccessToken } from "./access-token";

const MAX_429_ATTEMPTS = 8;

function parseRetryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get("Retry-After");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetches one recently-played page, refreshing OAuth on 401 and backing off on 429
 * (Retry-After when present).
 */
async function fetchRecentlyPlayedPage(
  userId: string,
  url: string,
  state: { accessToken: string; providerAccountId: string },
): Promise<Response> {
  let attempt429 = 0;

  for (;;) {
    let res = await fetch(url, {
      headers: { Authorization: `Bearer ${state.accessToken}` },
    });

    if (res.status === 401) {
      const t = await getSpotifyAccessToken(userId, { forceRefresh: true });
      state.accessToken = t.accessToken;
      state.providerAccountId = t.providerAccountId;
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${state.accessToken}` },
      });
    }

    if (res.status === 429) {
      attempt429 += 1;
      if (attempt429 > MAX_429_ATTEMPTS) {
        return res;
      }
      const sec =
        parseRetryAfterSeconds(res) ?? Math.min(120, 2 ** attempt429);
      await sleep(sec * 1000);
      continue;
    }

    return res;
  }
}

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
  syncJobId: string;
}> {
  const tokenState = await getSpotifyAccessToken(userId);

  const [job] = await db
    .insert(syncJobs)
    .values({
      userId,
      status: "running",
      kind: "spotify_recently_played",
    })
    .returning({ id: syncJobs.id });

  if (!job) {
    throw new Error("Could not create sync job");
  }

  let imported = 0;
  let skipped = 0;
  let pagesFetched = 0;
  let nextUrl: string | null = RECENTLY_PLAYED_FIRST;

  const finishJob = async (opts: {
    status: "ok" | "error";
    errorMessage?: string;
  }) => {
    await db
      .update(syncJobs)
      .set({
        status: opts.status,
        imported,
        skipped,
        pagesFetched,
        errorMessage: opts.errorMessage ?? null,
        finishedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));
  };

  try {
    for (let page = 0; page < MAX_PAGES && nextUrl; page++) {
      const res = await fetchRecentlyPlayedPage(
        userId,
        nextUrl,
        tokenState,
      );

      if (!res.ok) {
        const t = await res.text();
        console.error(
          "[spotify] recently-played failed",
          res.status,
          t.slice(0, 500),
        );
        const msg =
          res.status === 429
            ? "Spotify rate limit (429); try again later"
            : `Spotify recently-played failed: ${res.status}`;
        throw new Error(msg);
      }

      const body = (await res.json()) as RecentlyPlayedResponse;
      const items = body.items ?? [];

      if (items.length === 0) {
        break;
      }

      for (const item of items) {
        const r = await ingestItem(userId, tokenState.providerAccountId, item);
        if (r === "imported") imported++;
        else skipped++;
      }

      pagesFetched++;
      nextUrl = body.next ?? null;
    }

    await db
      .update(providerAccounts)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(providerAccounts.id, tokenState.providerAccountId));

    await finishJob({ status: "ok" });

    try {
      await rebuildUserListeningStats(userId);
    } catch (e) {
      console.error("[stats] rebuild after sync failed", e);
    }

    return {
      imported,
      skipped,
      pagesFetched,
      syncJobId: job.id,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finishJob({
      status: "error",
      errorMessage: message.slice(0, 2000),
    });
    throw e;
  }
}
